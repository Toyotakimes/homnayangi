import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDishName, verifyMealImage, resolveDishImage, getAvailableDishImage, dishImageCacheKey } from './dishImageResolver.js'

const meal = { idMeal: '123', strMeal: 'Phở bò tái', strInstructions: 'Cook and serve.',
  strIngredient1: 'Beef', strMealThumb: 'https://www.themealdb.com/images/media/meals/test.jpg' }
test('preserves cooking methods and dish variants', () => {
  assert.equal(normalizeDishName('Đậu phụ chiên'), 'dau phu chien')
  assert.ok(verifyMealImage({ name: 'Phở bò tái' }, meal))
  for (const name of ['Phở bò chín', 'Phở gà', 'Phở', 'Phở bò tái nạm']) {
    assert.equal(verifyMealImage({ name }, meal), null)
  }
})
test('preserves existing unverified URLs before any cache or network search', async () => {
  const original = globalThis.fetch
  globalThis.fetch = () => { throw new Error('Must not search') }
  try {
    assert.equal((await resolveDishImage({ id: 'existing', name: 'Món cũ', image: 'https://example.com/old.jpg' })).url, 'https://example.com/old.jpg')
    assert.equal(getAvailableDishImage({ imageUrl: '/homnayangi/food.jpg' }).url, '/homnayangi/food.jpg')
    assert.equal(getAvailableDishImage({ image: 'javascript:alert(1)' }), null)
  } finally { globalThis.fetch = original }
})
test('migrates v2/v3/v4 raw URLs and objects without deleting or changing verification', async () => {
  const originalStorage = globalThis.localStorage
  const originalFetch = globalThis.fetch
  const values = new Map()
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  globalThis.fetch = () => { throw new Error('Must not search cached dishes') }
  try {
    for (const version of [2, 3, 4]) {
      const dish = { id: `legacy${version}`, name: 'Món cũ' }
      const key = `foodimg_v${version}_${dish.id}`
      const value = version === 2 ? 'https://example.com/old.jpg' : JSON.stringify({ url: 'https://example.com/old.jpg', verified: false })
      values.set(key, value)
      values.set(dishImageCacheKey(dish), JSON.stringify({ image: null, expires: Date.now() + 99999, version: 5 }))
      assert.equal((await resolveDishImage(dish)).url, 'https://example.com/old.jpg')
      assert.equal(values.get(key), value)
      assert.ok(values.has(`foodimg_migrated_${dish.id}`))
    }
  } finally { globalThis.localStorage = originalStorage; globalThis.fetch = originalFetch }
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
