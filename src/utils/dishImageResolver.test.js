import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDishName, verifyMealImage, resolveDishImage } from './dishImageResolver.js'

const meal = { idMeal: '123', strMeal: 'Phở bò tái', strInstructions: 'Cook and serve.',
  strIngredient1: 'Beef', strMealThumb: 'https://www.themealdb.com/images/media/meals/test.jpg' }
test('preserves cooking methods and dish variants', () => {
  assert.equal(normalizeDishName('Đậu phụ chiên'), 'dau phu chien')
  assert.ok(verifyMealImage({ name: 'Phở bò tái' }, meal))
  for (const name of ['Phở bò chín', 'Phở gà', 'Phở', 'Phở bò tái nạm']) {
    assert.equal(verifyMealImage({ name }, meal), null)
  }
})
test('only curated whole-name aliases are accepted', () => {
  const english = { ...meal, strMeal: 'Beef Pho' }
  assert.equal(verifyMealImage({ name: 'Phở bò tái' }, english), null)
  assert.ok(verifyMealImage({ name: 'Phở bò', imageAliases: ['Beef Pho'] }, english))
})
test('rejects ingredients, foreign hosts and missing recipe evidence', () => {
  for (const change of [
    { strMealThumb: 'https://www.themealdb.com/images/ingredients/beef.png' },
    { strMealThumb: 'https://example.com/pho.jpg' },
    { strMealThumb: 'http://www.themealdb.com/images/media/meals/test.jpg' },
    { strInstructions: '' }, { strIngredient1: '' }, { strMeal: 'Phở bò tái restaurant' },
  ]) assert.equal(verifyMealImage({ name: meal.strMeal }, { ...meal, ...change }), null)
})
test('deduplicates requests and caches evidence despite unavailable storage', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ({ meals: [meal] }) } }
  try {
    const dish = { id: 'test', name: meal.strMeal }
    const images = await Promise.all([resolveDishImage(dish), resolveDishImage(dish)])
    assert.ok(images.every(Boolean))
    assert.ok(await resolveDishImage(dish))
    assert.equal(calls, 1)
    assert.equal(await resolveDishImage({ id: 'wrong', name: 'Phở gà' }), null)
  } finally { globalThis.fetch = original }
})
