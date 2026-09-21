import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { chooseRecipe, profiles, recipes, recipeText } from './recipes.ts';

test('Every recipe has positive proportions totalling 100%', () => {
  assert.equal(new Set(recipes.map(r => r.id)).size, recipes.length);
  for (const r of recipes) {
    assert.equal(r.ingredients.reduce((sum, [,percent]) => sum + percent, 0), 100);
    assert.ok(r.ingredients.every(([,p]) => p > 0));
    for (const [name,percent] of r.ingredients) assert.ok(recipeText(r).includes(`${name} — ${percent}%`));
  }
});
test('Every profile can randomize without repeating the previous recipe', () => {
  for (const profile of profiles) {
    for (const previous of recipes.filter(r => profile === 'Все' || r.profile === profile)) {
      for (const sample of [0,.25,.5,.75,.999999]) {
        const next = chooseRecipe(profile, previous.id, () => sample);
        assert.notEqual(next.id,previous.id);
        assert.ok(profile === 'Все' || next.profile === profile);
      }
    }
  }
});
test('Every taste profile offers enough variety', () => {
  for (const profile of profiles.filter(profile => profile !== 'Все')) {
    assert.ok(recipes.filter(recipe => recipe.profile === profile).length >= 5);
  }
});
test('Attributed recipes use public sources with complete metadata', () => {
  for (const recipe of recipes.filter(recipe => recipe.source)) {
    assert.match(recipe.source.url, /^https:\/\//);
    assert.ok(recipe.source.author.length > 2);
    assert.match(recipe.source.checkedAt, /^\d{2}\.\d{2}\.\d{4}$/);
  }
});
