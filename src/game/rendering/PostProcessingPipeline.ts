import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { GraphicsPreset } from '../save/SaveManager';
import type { WeatherRenderParams } from '../weather/WeatherManager';
import {
  computePostProcessGrade,
  stepPostProcessGrade,
  type PostProcessGrade,
} from './PostProcessGrade';

/**
 * Custom linear-space color grading, contrast, split-toning, vignette, and optional
 * lightweight single-pass bloom shader (used on software WebGL / low preset when multi-pass
 * UnrealBloomPass is bypassed for performance).
 */
const SolaraColorGradeShader = {
  name: 'SolaraColorGradeShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTexelSize: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uExposureTrim: { value: 1.0 },
    uContrast: { value: 1.08 },
    uSaturation: { value: 1.1 },
    uTemperature: { value: 0.2 },
    uTint: { value: 0.04 },
    uShadowTint: { value: new THREE.Vector3(0.92, 0.96, 1.05) },
    uHighlightTint: { value: new THREE.Vector3(1.08, 1.01, 0.91) },
    uVignette: { value: 0.22 },
    uSoftBloomStrength: { value: 0.0 },
    uSoftBloomThreshold: { value: 0.78 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uTexelSize;
    uniform float uExposureTrim;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uTemperature;
    uniform float uTint;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    uniform float uVignette;
    uniform float uSoftBloomStrength;
    uniform float uSoftBloomThreshold;
    varying vec2 vUv;

    float getLuma(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }

    vec3 extractBright(vec3 c, float thresh) {
      float l = getLuma(c);
      float knee = thresh * 0.35 + 0.0001;
      float soft = clamp(l - thresh + knee, 0.0, 2.0 * knee);
      soft = (soft * soft) / (4.0 * knee);
      float contrib = max(soft, l - thresh) / max(l, 0.0001);
      return c * max(contrib, 0.0);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col = texel.rgb;

      // Dual-ring 9-tap soft-knee HDR glow when UnrealBloomPass is bypassed on Software WebGL / low preset
      if (uSoftBloomStrength > 0.001) {
        vec2 o1 = uTexelSize * 2.5;
        vec2 o2 = uTexelSize * 6.5;
        vec3 b = extractBright(col, uSoftBloomThreshold) * 0.24;
        b += extractBright(texture2D(tDiffuse, vUv + vec2(o1.x, 0.0)).rgb, uSoftBloomThreshold) * 0.12;
        b += extractBright(texture2D(tDiffuse, vUv + vec2(-o1.x, 0.0)).rgb, uSoftBloomThreshold) * 0.12;
        b += extractBright(texture2D(tDiffuse, vUv + vec2(0.0, o1.y)).rgb, uSoftBloomThreshold) * 0.12;
        b += extractBright(texture2D(tDiffuse, vUv + vec2(0.0, -o1.y)).rgb, uSoftBloomThreshold) * 0.12;
        b += extractBright(texture2D(tDiffuse, vUv + vec2(o2.x, o2.y)).rgb, uSoftBloomThreshold) * 0.07;
        b += extractBright(texture2D(tDiffuse, vUv + vec2(-o2.x, o2.y)).rgb, uSoftBloomThreshold) * 0.07;
        b += extractBright(texture2D(tDiffuse, vUv + vec2(o2.x, -o2.y)).rgb, uSoftBloomThreshold) * 0.07;
        b += extractBright(texture2D(tDiffuse, vUv + vec2(-o2.x, -o2.y)).rgb, uSoftBloomThreshold) * 0.07;
        col += b * uSoftBloomStrength;
      }

      // 1. Subtle atmospheric exposure trim
      col *= uExposureTrim;

      // 2. White balance temperature & tint shift (warm coastal gold <-> cool storm/night)
      col.r *= 1.0 + uTemperature * 0.22;
      col.g *= 1.0 + uTemperature * 0.04 - uTint * 0.09;
      col.b *= 1.0 - uTemperature * 0.24 + uTint * 0.08;

      // 3. Split-tone shadows & highlights by luminance
      float luma = getLuma(max(col, vec3(0.0)));
      float shadowMask = 1.0 - smoothstep(0.02, 0.45, luma);
      float highMask = smoothstep(0.28, 0.90, luma);
      col = mix(col, col * uShadowTint, shadowMask * 0.72);
      col = mix(col, col * uHighlightTint, highMask * 0.65);

      // 4. Filmic contrast around linear mid-grey pivot (0.18)
      vec3 pivot = vec3(0.18);
      col = max(vec3(0.0), (col - pivot) * uContrast + pivot);

      // 5. Perceptual saturation adjustment
      float postLuma = getLuma(col);
      col = mix(vec3(postLuma), col, uSaturation);

      // 6. Soft cinematic optical vignette
      vec2 centered = vUv - 0.5;
      float distSq = dot(centered, centered);
      float vig = smoothstep(0.68, 0.16, distSq);
      col *= mix(1.0 - uVignette, 1.0, vig);

      gl_FragColor = vec4(max(col, vec3(0.0)), texel.a);
    }
  `,
};

/**
 * Dynamic post-processing shader pipeline for Solara Bay:
 * RenderPass -> half-res UnrealBloomPass (GPU medium/high) -> SolaraColorGradeShader -> OutputPass (ACES + sRGB).
 */
export class PostProcessingPipeline {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;

  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private gradePass: ShaderPass;
  private outputPass: OutputPass;

  private enabled = true;
  private preset: GraphicsPreset = 'medium';
  private currentGrade: PostProcessGrade;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    isSoftwareGl: boolean,
    initialHours: number,
    initialWeather: WeatherRenderParams
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.isSoftwareGl = isSoftwareGl;
    this.currentGrade = computePostProcessGrade(initialHours, initialWeather);

    const size = new THREE.Vector2();
    renderer.getSize(size);
    const w = Math.max(1, size.x);
    const h = Math.max(1, size.y);

    // Use HalfFloat render target on WebGL2 (including SwiftShader) for true HDR bloom headroom without 8-bit banding
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType,
      samples: isSoftwareGl ? 0 : 2,
    });

    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Half-resolution UnrealBloomPass for crisp glow without GPU bottleneck
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.5))),
      this.currentGrade.bloomStrength,
      this.currentGrade.bloomRadius,
      this.currentGrade.bloomThreshold
    );
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(SolaraColorGradeShader);
    this.gradePass.uniforms.uTexelSize.value.set(1 / w, 1 / h);
    this.composer.addPass(this.gradePass);

    // OutputPass applies renderer's ACESFilmicToneMapping + SRGBColorSpace conversion cleanly once
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.applyUniforms();
    this.configure(true, 'medium');
  }

  public configure(enabled: boolean, preset: GraphicsPreset): void {
    this.enabled = enabled;
    this.preset = preset;

    // On hardware GPUs: full UnrealBloomPass on medium/high; low disables heavy blur pass.
    // On Software WebGL (SwiftShader): bypass multi-mip UnrealBloomPass and activate single-pass soft bloom.
    const useHardwareBloom = this.enabled && !this.isSoftwareGl && preset !== 'low';
    this.bloomPass.enabled = useHardwareBloom;
    this.applyUniforms();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getCurrentGrade(): PostProcessGrade {
    return this.currentGrade;
  }

  public update(dt: number, timeOfDayHours: number, weather: WeatherRenderParams, immediate = false): void {
    const target = computePostProcessGrade(timeOfDayHours, weather);
    this.currentGrade = immediate ? target : stepPostProcessGrade(this.currentGrade, target, dt);
    this.applyUniforms();
  }

  private applyUniforms(): void {
    const g = this.currentGrade;
    const presetBloomScale = this.preset === 'high' ? 1.1 : this.preset === 'medium' ? 0.92 : 0.65;

    this.bloomPass.strength = g.bloomStrength * presetBloomScale;
    this.bloomPass.radius = g.bloomRadius;
    this.bloomPass.threshold = g.bloomThreshold;

    const u = this.gradePass.uniforms;
    u.uExposureTrim.value = g.exposureTrim;
    u.uContrast.value = g.contrast;
    u.uSaturation.value = g.saturation;
    u.uTemperature.value = g.temperature;
    u.uTint.value = g.tint;
    (u.uShadowTint.value as THREE.Vector3).set(g.shadowTint.r, g.shadowTint.g, g.shadowTint.b);
    (u.uHighlightTint.value as THREE.Vector3).set(g.highlightTint.r, g.highlightTint.g, g.highlightTint.b);
    u.uVignette.value = g.vignetteIntensity;

    // Dual-ring 9-tap soft-knee HDR highlight bloom when multi-pass UnrealBloomPass is bypassed
    const useFallbackBloom = this.enabled && !this.bloomPass.enabled;
    u.uSoftBloomStrength.value = useFallbackBloom ? g.bloomStrength * 0.85 : 0.0;
    u.uSoftBloomThreshold.value = g.bloomThreshold;
  }

  public setSize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.5)));
    (this.gradePass.uniforms.uTexelSize.value as THREE.Vector2).set(1 / w, 1 / h);
  }

  public render(): void {
    if (this.enabled) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public dispose(): void {
    this.bloomPass.dispose();
    this.gradePass.dispose();
    this.outputPass.dispose();
    this.composer.dispose();
  }
}
