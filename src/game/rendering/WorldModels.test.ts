import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CITY_BUILDINGS,
  INTERACTABLES,
  MAJOR_X_ROADS,
  MAJOR_Z_ROADS,
  ROAD_WIDTH,
  type StaticBuildingDef,
} from '../world/WorldConfig';
import { DISTRICTS, getDistrictAt } from '../world/Districts';
import { SOLARA_ROAD_GRAPH } from '../world/RoadGraph';
import {
  buildArchitecturalBuilding,
  buildAtcControlTower,
  buildPanamaxContainerShip,
  buildPassengerAirliner,
  buildResidentialBackyard,
  buildSocialMediaBillboard,
  createArchitecturalPalette,
} from './BuildingArchitect';
import {
  animateCharacterRig,
  buildCharacterRig,
  type CharacterStyleConfig,
} from './RealisticHumanBuilder';

function assertValid3DGroup(group: THREE.Group, minMeshes: number, label: string, minExtent = 0.5) {
  group.updateMatrixWorld(true);
  let meshCount = 0;
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      meshCount++;
      const pos = obj.geometry.getAttribute('position');
      assert.ok(pos && pos.count > 0, `${label}: mesh "${obj.name}" must have vertices`);
      for (let i = 0; i < Math.min(pos.count, 48); i++) {
        assert.ok(
          Number.isFinite(pos.getX(i)) &&
            Number.isFinite(pos.getY(i)) &&
            Number.isFinite(pos.getZ(i)),
          `${label}: non-finite vertex coordinate detected`
        );
      }
    }
  });
  assert.ok(
    meshCount >= minMeshes,
    `${label}: expected at least ${minMeshes} meshes, found ${meshCount}`
  );
  const box = new THREE.Box3().setFromObject(group);
  assert.ok(!box.isEmpty(), `${label}: bounding box must not be empty`);
  const size = new THREE.Vector3();
  box.getSize(size);
  assert.ok(
    size.x > minExtent && size.y > minExtent && size.z > minExtent,
    `${label}: degenerate bounding box (${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)})`
  );
  return { meshCount, box, size };
}

describe('Solara Bay 3D Models, Interiors & Full Map Integrity', () => {
  const palette = createArchitecturalPalette(
    new THREE.MeshStandardMaterial({ color: '#d8e9fa', roughness: 0.16, metalness: 0.72 }),
    new THREE.MeshStandardMaterial({ color: '#e879f9', emissive: '#d946ef' })
  );

  it('builds every architectural building style with both interior rooms/objects and exterior details', () => {
    const styles: StaticBuildingDef['style'][] = [
      'glass_tower',
      'city_hall',
      'art_deco',
      'residential',
      'warehouse',
      'nightclub',
      'garage',
      'boutique',
      'container',
      'airport_terminal',
      'airport_hangar',
    ];

    for (const style of styles) {
      const sample: StaticBuildingDef = {
        id: `test_${style}`,
        x: 0,
        z: 0,
        w: style === 'container' ? 12 : 24,
        d: style === 'container' ? 5 : 20,
        h: style === 'glass_tower' ? 48 : style === 'container' ? 5.5 : 14,
        style,
        color: '#e2e8f0',
        accent: '#38bdf8',
        district: 'downtown',
      };
      const built = buildArchitecturalBuilding(sample, palette);
      const { box } = assertValid3DGroup(built, style === 'container' ? 3 : 8, `Building[${style}]`);

      let interiorCount = 0;
      let exteriorCount = 0;
      built.traverse((obj) => {
        if (obj.userData?.role === 'interior') interiorCount++;
        if (obj.userData?.role === 'exterior') exteriorCount++;
      });

      assert.ok(interiorCount >= 1, `Building[${style}] must contain interior rooms/objects`);
      assert.ok(exteriorCount >= 2, `Building[${style}] must contain exterior architectural parts`);
      assert.ok(box.min.y >= -0.15, `Building[${style}] must sit flush on ground (min.y=${box.min.y})`);
    }
  });

  it('builds composite 3D models for Backyards, Airliner, ATC Tower, Cargo Ship & Social Billboards', () => {
    const yardDef = CITY_BUILDINGS.find((b) => b.hasBackyard && b.hasPool);
    assert.ok(yardDef, 'Expected at least one residential building with a backyard pool');
    const yard = buildResidentialBackyard(yardDef);
    assertValid3DGroup(yard, 10, 'ResidentialBackyard');

    const jet = buildPassengerAirliner('#0284c7', 1.0);
    const { size: jetSize } = assertValid3DGroup(jet, 14, 'PassengerAirliner');
    assert.ok(jetSize.x >= 25 && jetSize.z >= 30, 'Airliner wingspan and fuselage length must be full-scale');

    const { group: atc, radarDish } = buildAtcControlTower(palette);
    assertValid3DGroup(atc, 10, 'AtcControlTower');
    assert.ok(radarDish.children.length >= 3, 'ATC radar dish must have rotating mast, bar & beacon');

    const ship = buildPanamaxContainerShip();
    const { size: shipSize } = assertValid3DGroup(ship, 25, 'PanamaxContainerShip');
    assert.ok(shipSize.z >= 80, 'Panamax container ship must be full-scale (>= 80m long)');

    const billboard = buildSocialMediaBillboard(palette, '#ec4899');
    assertValid3DGroup(billboard, 6, 'SocialMediaBillboard');
  });

  it('verifies full map layout: zero building-on-road overlaps, all districts defined, and A* Airport routing', () => {
    const halfRoad = ROAD_WIDTH * 0.5;
    for (const b of CITY_BUILDINGS) {
      for (const rx of MAJOR_X_ROADS) {
        const overlapsX = b.x + b.w * 0.5 > rx - halfRoad + 0.5 && b.x - b.w * 0.5 < rx + halfRoad - 0.5;
        // East road x=210 only runs up to z=-160..160
        const withinRoadZ = rx === 210 ? b.z >= -168 && b.z <= 168 : b.z >= -170 && b.z <= 255;
        assert.ok(
          !(overlapsX && withinRoadZ),
          `Building ${b.id} (${b.x},${b.z}) overlaps major X road ${rx}`
        );
      }
      for (const rz of MAJOR_Z_ROADS) {
        const overlapsZ = b.z + b.d * 0.5 > rz - halfRoad + 0.5 && b.z - b.d * 0.5 < rz + halfRoad - 0.5;
        const withinRoadX = b.x >= -220 && b.x <= 310;
        assert.ok(
          !(overlapsZ && withinRoadX),
          `Building ${b.id} (${b.x},${b.z}) overlaps major Z road ${rz}`
        );
      }
    }

    // All 8 map districts are well-defined and playable
    assert.equal(DISTRICTS.length, 8);
    assert.ok(DISTRICTS.every((d) => d.playable), 'All full-map districts should be active/playable');

    // Verify Airport, Shipment Port, Backyards & Social Photo Spots exist and route cleanly via A*
    assert.equal(getDistrictAt(248, -136).id, 'coastline_airport');
    assert.equal(getDistrictAt(344, 40).id, 'ironport_docks');
    assert.ok(
      INTERACTABLES.filter((i) => i.type === 'social_spot').length >= 5,
      'Expected at least 5 SolaraPulse social photo spots across the full map'
    );

    const routeToAirport = SOLARA_ROAD_GRAPH.findRoute(-39.5, 29.2, 248, -136);
    assert.ok(routeToAirport.nodes.length >= 4 && routeToAirport.totalDistance > 250);
  });

  it('builds realistic anatomical human characters (Marco, Lena, Sofia, Jalen, Elliot) with grounded feet, articulated limbs, eyelids & valid kinematics', () => {
    const dummyShadow = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    const cast: Array<{ name: string; cfg: CharacterStyleConfig }> = [
      {
        name: 'Marco Vega',
        cfg: {
          skinColor: '#d9a484',
          hairColor: '#231c18',
          eyeColor: '#5c4028',
          jacketColor: '#3a2c24',
          shirtColor: '#e2e8f0',
          pantsColor: '#1e293b',
          bootsColor: '#1f1b18',
          accentColor: '#f59e0b',
          heightScale: 1.02,
          bodyType: 'athletic_male',
          hairStyle: 'swept_rugged',
          facialHair: 'stubble',
          hasGoldChain: true,
          hasWatch: true,
          isLeatherJacket: true,
        },
      },
      {
        name: 'Lena Park',
        cfg: {
          skinColor: '#e6be9e',
          hairColor: '#16161d',
          eyeColor: '#2c1e18',
          lipColor: '#b86e68',
          jacketColor: '#1e1b4b',
          shirtColor: '#f1f5f9',
          pantsColor: '#18181b',
          bootsColor: '#18181b',
          accentColor: '#a855f7',
          heightScale: 0.96,
          bodyType: 'athletic_female',
          hairStyle: 'sleek_ponytail',
          facialHair: 'none',
          hasGlasses: true,
          hasHeadphones: true,
          hasBackpack: true,
        },
      },
      {
        name: 'Sofia Ramirez',
        cfg: {
          skinColor: '#d8a282',
          hairColor: '#1f1715',
          eyeColor: '#3b2416',
          lipColor: '#b91c1c',
          jacketColor: '#7f1d1d',
          shirtColor: '#f8fafc',
          pantsColor: '#58111a',
          bootsColor: '#1c1917',
          accentColor: '#fbbf24',
          heightScale: 0.98,
          bodyType: 'athletic_female',
          hairStyle: 'wavy_long',
          isSuit: true,
        },
      },
      {
        name: 'Jalen Carter',
        cfg: {
          skinColor: '#7c4d34',
          hairColor: '#141414',
          eyeColor: '#261a12',
          jacketColor: '#27272a',
          shirtColor: '#3f3f46',
          pantsColor: '#1f2937',
          bootsColor: '#18181b',
          accentColor: '#f59e0b',
          heightScale: 1.06,
          bodyType: 'muscular_male',
          hairStyle: 'short_fade',
          facialHair: 'trimmed_beard',
          hasGoldChain: true,
          hasWatch: true,
          isMuscular: true,
        },
      },
      {
        name: 'Elliot Rhodes',
        cfg: {
          skinColor: '#dfb091',
          hairColor: '#5b4636',
          eyeColor: '#3f6212',
          jacketColor: '#6b705c',
          shirtColor: '#a5a58d',
          pantsColor: '#4a4e3d',
          bootsColor: '#3d2c1e',
          accentColor: '#556b2f',
          heightScale: 1.03,
          bodyType: 'rugged_male',
          hairStyle: 'cap_outdoor',
          facialHair: 'trimmed_beard',
          hasCap: true,
          hasBackpack: true,
        },
      },
    ];

    for (const member of cast) {
      const rig = buildCharacterRig(member.cfg, dummyShadow);
      const { meshCount, box, size } = assertValid3DGroup(rig.bodyPivot, 45, `Human[${member.name}]`, 0.22);
      assert.ok(meshCount >= 45, `${member.name} should have high anatomical mesh fidelity`);
      assert.ok(
        size.x >= 0.34 && size.x <= 0.78 && size.z >= 0.22 && size.z <= 0.65,
        `${member.name} shoulder/depth proportions out of range: ${size.x.toFixed(2)}m x ${size.z.toFixed(2)}m`
      );
      assert.ok(
        size.y >= 1.62 && size.y <= 2.02,
        `${member.name} realistic human height out of range: ${size.y.toFixed(3)}m`
      );
      assert.ok(
        box.min.y >= -0.05 && box.min.y <= 0.06,
        `${member.name} feet must sit flush on ground (min.y=${box.min.y.toFixed(3)})`
      );
      assert.equal(rig.eyelids.length, 2, `${member.name} must have 2 animated eyelids`);

      // Exercise idle, walk, sprint, airborne, and blink animation states
      for (const [speed, phase, grounded, t, squash] of [
        [0, 0, true, 0.07, 1.0],
        [4.5, 1.2, true, 2.0, 1.0],
        [9.5, 2.7, true, 3.9, 1.0],
        [6.0, 3.1, false, 4.5, 1.08],
      ] as const) {
        animateCharacterRig(rig, speed, phase, grounded, t, squash);
        assert.ok(Number.isFinite(rig.leftLeg.rotation.x), `${member.name} leftLeg NaN`);
        assert.ok(Number.isFinite(rig.leftFoot.rotation.x), `${member.name} leftFoot NaN`);
        assert.ok(Number.isFinite(rig.torsoGroup.rotation.y), `${member.name} torso NaN`);
        assert.ok(Number.isFinite(rig.eyelids[0].rotation.x), `${member.name} eyelid NaN`);
      }
    }
  });
});
