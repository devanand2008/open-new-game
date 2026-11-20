import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SOCIAL_POSTS,
  addPostComment,
  createUserSocialPost,
  togglePostLike,
  togglePostRepost,
} from './SocialFeed';

describe('SolaraPulse SocialFeed', () => {
  it('toggles likes and reposts deterministically without mutating source array', () => {
    const targetId = INITIAL_SOCIAL_POSTS[0].id;
    const baseLikes = INITIAL_SOCIAL_POSTS[0].likes;

    const liked = togglePostLike(INITIAL_SOCIAL_POSTS, targetId);
    assert.equal(liked[0].likedByUser, true);
    assert.equal(liked[0].likes, baseLikes + 1);
    assert.equal(INITIAL_SOCIAL_POSTS[0].likedByUser, false);

    const unliked = togglePostLike(liked, targetId);
    assert.equal(unliked[0].likedByUser, false);
    assert.equal(unliked[0].likes, baseLikes);

    const reposted = togglePostRepost(unliked, targetId);
    assert.equal(reposted[0].repostedByUser, true);
    assert.equal(reposted[0].reposts, INITIAL_SOCIAL_POSTS[0].reposts + 1);
  });

  it('appends trimmed comments and ignores blank text', () => {
    const targetId = INITIAL_SOCIAL_POSTS[1].id;
    const ignored = addPostComment(INITIAL_SOCIAL_POSTS, targetId, 'Marco Vega', '@MarcoVega', '   ');
    assert.equal(ignored[1].comments.length, 0);

    const updated = addPostComment(
      INITIAL_SOCIAL_POSTS,
      targetId,
      'Marco Vega',
      '@MarcoVega',
      'Heading over to Berth 3 now!'
    );
    assert.equal(updated[1].comments.length, 1);
    assert.equal(updated[1].comments[0].text, 'Heading over to Berth 3 now!');
  });

  it('creates a geo-tagged photo post with automatic district and weather hashtags', () => {
    const post = createUserSocialPost({
      author: 'Marco Vega',
      handle: '@MarcoVega',
      avatarColor: '#f59e0b',
      district: 'Coastline Airport',
      worldX: 294.4,
      worldZ: -145.8,
      caption: 'Checking out Runway 27 at sunset!',
      weather: 'rain',
      photoDataUrl: 'data:image/jpeg;base64,TEST',
    });

    assert.equal(post.district, 'Coastline Airport');
    assert.equal(post.worldX, 294);
    assert.equal(post.worldZ, -146);
    assert.ok(post.hashtags.includes('#CoastlineAirport'));
    assert.ok(post.hashtags.includes('#SolaraStorm'));
    assert.equal(post.photoDataUrl, 'data:image/jpeg;base64,TEST');
  });
});
