import fs from 'node:fs/promises'
import { auditData, filterDishes, normalize, costRange } from '../src/dishLogic.mjs'
import { verifiedImages, IMAGE_VERSION } from '../src/imageLogic.mjs'
import { getDishRecipe } from '../src/utils/recipeScaler.js'
const dishes = JSON.parse(await fs.readFile('src/data/dishes.json', 'utf8'))
let validImages = 0
for (const dish of dishes) {
  const photos = verifiedImages(dish)
  for (const photo of photos) {
    await fs.access(`public${photo.url}`)
    validImages++; break
  }
}
const summary = { ...auditData(dishes), validImages, placeholders: dishes.length - validImages, imageCacheVersion: IMAGE_VERSION,
  enrichedRecipes: { curated: dishes.filter(d => !getDishRecipe(d).isEstimated).length, estimated: dishes.filter(d => getDishRecipe(d).isEstimated).length },
  cases: { lunch80k: filterDishes(dishes, { meal: 'Trưa', budget: 80000 }).length, snacks80k: filterDishes(dishes, { meal: 'Ăn vặt', budget: 80000 }).length, searchGa: filterDishes(dishes, { search: 'ga' }).length, searchBanh: filterDishes(dishes, { search: 'banh' }).length },
  imageDiscovery: 'Exact Commons file-title lookup for all 1,000 records; 15 of 25 metadata batches returned HTTP 429. Unverified records retain placeholders.',
  trayPricing: 'Estimates are allocated within the existing min–max ranges, starting at their lower bounds and moving toward midpoints while keeping the combined estimate within budget. These are estimates, not guaranteed maximum market prices.' }
await fs.writeFile('reports/data-audit.json', JSON.stringify(summary, null, 2) + '\n')
const rows = dishes.map(d => [d.id, d.name, verifiedImages(d).length ? 'verified-photo' : 'placeholder', !costRange(d), !d.mainIngredient || normalize(d.mainIngredient) === 'theo mon', !d.method, !d.category || !d.meal].map(v => '"' + String(v).replaceAll('"', '""') + '"').join(','))
await fs.writeFile('reports/dish-audit.csv', '\uFEFFid,name,imageStatus,missingPrice,missingIngredients,missingMethod,missingCategoryOrMeal\n' + rows.join('\n'))
console.log(JSON.stringify(summary, null, 2))
