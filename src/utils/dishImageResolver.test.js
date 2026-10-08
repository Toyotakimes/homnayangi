import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDishName, verifyMealImage, resolveDishImage, getAvailableDishImage, dishImageCacheKey, invalidateDishImage, IMAGE_POLICY_VERSION } from './dishImageResolver.js'
const meal = { idMeal: '123', strMeal: 'Phở bò tái', strInstructions: 'Cook and serve.', strIngredient1: 'Beef', strMealThumb: 'https://www.themealdb.com/images/media/meals/test.jpg' }
test('exact names preserve protein and cooking variants', () => {
  assert.equal(normalizeDishName('Đậu phụ chiên'), 'dau phu chien')
  assert.ok(verifyMealImage({ name: meal.strMeal }, meal))
  for (const name of ['Phở bò chín', 'Phở gà', 'Phở', 'Phở bò tái nạm']) assert.equal(verifyMealImage({ name }, meal), null)
})
test('unverified URLs, legacy caches and expired hits cannot be displayed', () => {
  const original = globalThis.localStorage
  const values = new Map()
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  try {
    const dish = { id: 'legacy-test', name: meal.strMeal }
    for (const version of [2,3,4,5]) values.set('foodimg_v' + version + '_' + dish.id, JSON.stringify({ url: meal.strMealThumb }))
    assert.equal(getAvailableDishImage(dish), null)
    assert.equal(getAvailableDishImage({ ...dish, image: { url: meal.strMealThumb, verified: false } }), null)
    const image = verifyMealImage(dish, meal)
    values.set(dishImageCacheKey(dish), JSON.stringify({ version: IMAGE_POLICY_VERSION, image, expires: Date.now() - 1 }))
    assert.equal(getAvailableDishImage(dish), null)
    values.set(dishImageCacheKey(dish), JSON.stringify({ version: IMAGE_POLICY_VERSION, image, expires: Date.now() + 99999 }))
    assert.ok(getAvailableDishImage(dish))
    invalidateDishImage(dish, image.url)
    assert.equal(getAvailableDishImage(dish), null)
    assert.ok(values.has('foodimg_v2_' + dish.id), 'old data is preserved but not reused')
  } finally { globalThis.localStorage = original }
})
test('loaded failure also blocks a bundled image across repeated renders', () => {
  const dish = { id: 'static-failure', name: meal.strMeal, image: verifyMealImage({}, null) }
  dish.image = verifyMealImage(dish, meal)
  assert.ok(getAvailableDishImage(dish))
  invalidateDishImage(dish, dish.image.url)
  assert.equal(getAvailableDishImage(dish), null)
})
test('only curated whole-name aliases can match other languages', () => {
  const english = { ...meal, strMeal: 'Beef Pho' }
  assert.equal(verifyMealImage({ name: 'Phở bò tái' }, english), null)
  assert.ok(verifyMealImage({ name: 'Phở bò', imageAliases: ['Beef Pho'] }, english))
})
test('rejects ingredient pictures, foreign hosts and missing recipe evidence', () => {
  for (const change of [{ strMealThumb: 'https://www.themealdb.com/images/ingredients/beef.png' }, { strMealThumb: 'https://example.com/pho.jpg' }, { strMealThumb: 'http://www.themealdb.com/images/media/meals/test.jpg' }, { strInstructions: '' }, { strIngredient1: '' }, { strMeal: 'Phở bò tái restaurant' }]) assert.equal(verifyMealImage({ name: meal.strMeal }, { ...meal, ...change }), null)
})
test('deduplicates provider requests and tolerates unavailable storage', async () => {
  const originalFetch = globalThis.fetch
  const originalStorage = globalThis.localStorage
  let calls = 0
  globalThis.localStorage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('full') } }
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ({ meals: [meal] }) } }
  try {
    const dish = { id: 'network-test', name: meal.strMeal }
    assert.ok((await Promise.all([resolveDishImage(dish), resolveDishImage(dish)])).every(Boolean))
    assert.ok(await resolveDishImage(dish))
    assert.equal(calls, 1)
    assert.equal(await resolveDishImage({ id: 'wrong', name: 'Phở gà' }), null)
  } finally { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage }
})
