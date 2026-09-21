import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import catalog from './tng-catalog.json' with { type: 'json' };

test('TNG-related catalog contains all imported brand palettes', () => {
  const counts = Object.groupBy(catalog.products, product => product.brand);
  assert.equal(catalog.products.length, 354);
  assert.equal(counts.Tangiers.length, 157);
  assert.equal(counts.Bonche.length, 75);
  assert.equal(counts.Dogma.length, 20);
  assert.equal(counts.BLANSH.length, 20);
  assert.equal(counts.Azure.length, 26);
  assert.equal(counts["Trofimoff's"].length, 56);
  assert.equal(new Set(catalog.products.map(product => product.id)).size, catalog.products.length);
  assert.ok(catalog.products.every(product => product.name && product.url.startsWith('https://')));
});
