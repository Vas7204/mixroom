import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import catalog from './catalog.json' with { type: 'json' };

test('Catalog is a deduplicated offline snapshot with two sourced brands', () => {
  const products = catalog.products;
  assert.equal(products.length, 176);
  assert.equal(products.filter(p => p.brand === 'MUSTHAVE').length, 99);
  assert.equal(products.filter(p => p.brand === 'DARKSIDE').length, 77);
  assert.equal(new Set(products.map(p => p.id)).size, products.length);
  assert.ok(products.every(p => p.name && p.url.startsWith('https://')));
  assert.ok(products.some(p => p.name.includes('Vanilla Cream')));
  assert.ok(products.some(p => p.name.toLowerCase().includes('blackcurrant')));
});
