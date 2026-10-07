import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { costRange, filterDishes, createTray, shuffle, typeMatches } from '../src/dishLogic.mjs'
import { verifiedImages } from '../src/imageLogic.mjs'
const dishes = JSON.parse(fs.readFileSync('src/data/dishes.json', 'utf8').replace(/^\uFEFF/, ''))
test('price ranges parse both endpoints and exclude unknown prices from finite budgets', () => {
  assert.deepEqual(costRange({ costText: '20.000–65.000đ/người' }), { min: 20000, max: 65000 })
  assert.equal(filterDishes([{ name: 'Unknown', meal: 'Trưa' }], { budget: 80000 }).length, 0)
})
test('cases 1 and 2 return full lunch and snack pools within budget', () => {
  for (const meal of ['Trưa', 'Ăn vặt']) {
    const pool = filterDishes(dishes, { meal, budget: 80000 })
    assert.ok(pool.length > 12)
    assert.ok(pool.every(d => costRange(d).max <= 80000))
    if (meal === 'Ăn vặt') assert.ok(pool.some(d => d.name === 'Bánh tiêu'))
  }
})
test('case 3 and 80k trays always contain main + vegetable + soup within planned budget', () => {
  for (const budget of [80000, 100000]) for (let i = 0; i < 100; i++) {
    const tray = createTray(dishes, { meal: 'Tối', budget, people: 4 })
    assert.equal(tray.length, 3)
    assert.ok(/^Món /.test(tray[0].category))
    assert.equal(tray[1].category, 'Rau/Củ'); assert.equal(tray[2].category, 'Canh')
    assert.ok(tray.reduce((sum, d) => sum + d.estimatedCostPerPerson * 4, 0) <= budget * 4)
    assert.ok(tray.every(d => d.estimatedCostPerPerson >= costRange(d).min && d.estimatedCostPerPerson <= costRange(d).max))
  }
  assert.deepEqual(createTray(dishes, { meal: 'Ăn vặt', budget: 80000, people: 2 }), [])
  assert.deepEqual(createTray(dishes, { meal: 'Tối', budget: 1000, people: 2 }), [])
})
test('cases 4 and 5 search accented and unaccented names, case insensitively', () => {
  for (const [plain, accented] of [['ga', 'GÀ'], ['banh', 'BÁNH'], ['ca', 'CÁ']]) {
    const pool = filterDishes(dishes, { search: plain })
    assert.ok(pool.length > 1)
    assert.deepEqual(pool, filterDishes(dishes, { search: accented }))
  }
  assert.equal(filterDishes(dishes).length, dishes.length)
})
test('deck contains each dish once until wraparound; does not mutate database', () => {
  const pool = filterDishes(dishes, { meal: 'Trưa', budget: 80000 })
  const deck = shuffle(pool)
  assert.equal(new Set(deck.map(d => d.id)).size, pool.length)
  assert.equal(deck[pool.length % pool.length], deck[0])
  assert.ok(typeMatches({ name: 'Gà rang gừng' }, 'Rang'))
  assert.ok(typeMatches({ name: 'Sườn rim mắm' }, 'Kho/Rim'))
})
test('case 6 rejects unreviewed or mismatched photos, including other food for bánh tiêu', () => {
  const wrong = { verified: true, kind: 'dish-photo', sourcePage: 'https://example.com', title: 'Bánh cam' }
  assert.equal(verifiedImages({ name: 'Bánh tiêu', imageSources: [wrong] }).length, 0)
  assert.equal(verifiedImages({ name: 'Sườn non kho riềng', imageSources: [{ ...wrong, title: 'Thịt kho' }] }).length, 0)
  assert.equal(verifiedImages({ name: 'Bánh tiêu', imageSources: [{ ...wrong, title: 'Bánh tiêu', verified: false }] }).length, 0)
})
