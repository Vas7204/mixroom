import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';

const raw = JSON.parse(await readFile(new URL('./catalog.json', import.meta.url), 'utf8'));
const tngRaw = JSON.parse(await readFile(new URL('./tng-catalog.json', import.meta.url), 'utf8'));
const tngBrands = new Set(['Tangiers', "Trofimoff's", 'Bonche', 'Dogma', 'BLANSH', 'Azure']);
const catalog = [...raw.products, ...tngRaw.products].map(product => ({ ...product, tng: tngBrands.has(product.brand) }));
const profiles = ['Все', 'Фруктовый', 'Ягодный', 'Цитрусовый', 'Десертный', 'Свежий'];
const generatorSource = (await readFile(new URL('./generator.ts', import.meta.url), 'utf8'))
  .replace("import { catalog, CatalogProduct } from './catalog';", `type CatalogProduct = { id: string; brand: string; name: string; shortName: string; url: string; tng: boolean };\nconst catalog = ${JSON.stringify(catalog)};`)
  .replace("import type { Profile, Recipe } from './recipes';", "type Profile = 'Все' | 'Фруктовый' | 'Ягодный' | 'Цитрусовый' | 'Десертный' | 'Свежий'; type Recipe = { id: number | string };");
const compiledSource = stripTypeScriptTypes(generatorSource, { mode: 'transform' });
const { generateRecipe, productProfiles, scoreRecipeProducts } = await import(`data:text/javascript;base64,${Buffer.from(compiledSource).toString('base64')}`);

test('Catalog classifier covers enough real products for generation', () => {
  const classified = catalog.filter(product => productProfiles(product).length > 0);
  assert.ok(classified.length >= 250, `Only ${classified.length} products were classified`);
});

test('Generator creates valid, varied recipes for every profile', () => {
  for (const profile of profiles) {
    let previous;
    for (const sample of [0.01, 0.19, 0.37, 0.61, 0.89]) {
      const recipe = generateRecipe(profile, { components: 3, tngOnly: false }, previous, () => sample);
      assert.equal(recipe.ingredients.reduce((sum, [, percent]) => sum + percent, 0), 100);
      assert.equal(new Set(recipe.generated.catalogIds).size, 3);
      assert.notEqual(recipe.id, previous);
      previous = recipe.id;
    }
  }
});

test('Scoring prefers a balanced mix over stacked cooling and dominant notes', () => {
  const product = (id, shortName) => ({ id, brand: 'DARKSIDE', name: shortName, shortName, url: '', tng: false });
  const balanced = [product('mango', 'Mango'), product('raspberry', 'Raspberry'), product('lime', 'Lime')];
  const overloaded = [product('mint', 'Mint'), product('ice', 'Ice'), product('eucalyptus', 'Eucalyptus')];
  assert.ok(scoreRecipeProducts(balanced, 'Фруктовый') > scoreRecipeProducts(overloaded, 'Свежий'));
});

test('Generator avoids an exact repeat even with a deterministic random source', () => {
  const first = generateRecipe('Ягодный', { components: 3, tngOnly: false }, undefined, () => 0.35);
  const second = generateRecipe('Ягодный', { components: 3, tngOnly: false }, first.id, () => 0.35);
  assert.notEqual(second.id, first.id);
});

test('TNG mode only uses products linked to TNG brands', () => {
  const recipe = generateRecipe('Фруктовый', { components: 2, tngOnly: true }, undefined, () => 0.42);
  assert.ok(recipe.generated.catalogIds.every(id => catalog.find(product => product.id === id)?.tng));
});
