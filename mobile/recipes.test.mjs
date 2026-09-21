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
