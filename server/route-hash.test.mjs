import test from 'node:test';
import assert from 'node:assert/strict';

/** Mirrors js/app.js hash routing (keep in sync). */
function hashRouteRaw(hash) {
  let raw = String(hash || '').replace(/^#/, '') || '/';
  const q = raw.indexOf('?');
  if (q !== -1) raw = raw.slice(0, q);
  let pathPart = raw;
  const anchorIdx = pathPart.indexOf('#');
  if (anchorIdx !== -1) pathPart = pathPart.slice(0, anchorIdx);
  if (pathPart.length > 1 && pathPart.endsWith('/')) {
    pathPart = pathPart.replace(/\/+$/, '');
    raw = anchorIdx === -1 ? pathPart : pathPart + raw.slice(anchorIdx);
  }
  return raw;
}

function hashAnchor(hash) {
  const raw = hashRouteRaw(hash);
  const i = raw.indexOf('#');
  return i === -1 ? '' : raw.slice(i + 1);
}

function route(hash) {
  let raw = hashRouteRaw(hash);
  const anchorIdx = raw.indexOf('#');
  if (anchorIdx !== -1) raw = raw.slice(0, anchorIdx);
  if (raw.startsWith('/')) return { path: raw, section: null };
  return { path: '/', section: raw };
}

test('route strips in-hash anchor for subscriptions', () => {
  const r = route('#/office/subscriptions#leadgen');
  assert.equal(r.path, '/office/subscriptions');
  assert.equal(hashAnchor('#/office/subscriptions#leadgen'), 'leadgen');
});

test('route normalizes trailing slash on office paths', () => {
  assert.equal(route('#/office/tools/').path, '/office/tools');
  assert.equal(route('#/office/tools/leadgen-vk/').path, '/office/tools/leadgen-vk');
});

test('landing public path keeps slug anchor separate', () => {
  assert.equal(route('#/p/abc123#lead-form').path, '/p/abc123');
  assert.equal(hashAnchor('#/p/abc123#lead-form'), 'lead-form');
  assert.equal(hashAnchor('#/l/my-slug#lead-form'), 'lead-form');
});
