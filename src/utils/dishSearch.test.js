import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSearch, matchesDishSearch, dishCuisine, searchDishList } from './dishSearch.js'
test('Vietnamese accented, unaccented, mixed case and reversed keywords', () => {
  const dish = { name: 'Phở bò tái' }
  for (const query of ['phở bò', 'pho bo', 'PHO BÒ', 'bo pho', 'pho']) assert.ok(matchesDishSearch(dish, query), query)
  assert.equal(normalizeSearch('Đậu phụ'), 'dau phu')
  assert.equal(matchesDishSearch(dish, 'pho ga'), false)
})
test('partial words and one-character typo in longer words', () => {
  assert.ok(matchesDishSearch({ name: 'Sườn xào chua ngọt' }, 'suon xao chua ngot'))
  assert.ok(matchesDishSearch({ name: 'Sườn xào chua ngọt' }, 'suom chua'))
  assert.ok(matchesDishSearch({ name: 'Gà nướng' }, 'ga nuogn'))
  assert.equal(matchesDishSearch({ name: 'Phở bò' }, 'zzzzzz'), false)
})
test('origin uses explicit metadata, existing Vietnamese rows retain origin', () => {
  assert.equal(dishCuisine({ name: 'Cơm gà', style: 'Toàn quốc' }), 'Việt Nam')
  assert.equal(dishCuisine({ cuisine: 'Vietnamese' }), 'Việt Nam')
  assert.equal(dishCuisine({ country: 'Japan' }), 'Nước ngoài')
})

test('exact matches take precedence; typo matching remains available when needed', () => {
  const dishes = [{name:'Bún thang'},{name:'Bún thang Hà Nội'},{name:'Bún cá Nha Trang'}]
  assert.deepEqual(searchDishList(dishes, 'bun thang').map(d=>d.name),['Bún thang','Bún thang Hà Nội'])
  assert.ok(searchDishList([{name:'Sườn xào chua ngọt'}], 'suom chua').length)
})
