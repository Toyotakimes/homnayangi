import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
const rawBytes = await fs.readFile('src/data/dishes.json')
assert.equal(crypto.createHash('sha256').update(rawBytes).digest('hex'), '705f7f8dc103c4aa6ffef41e4ef39e194f5bfe3d3b04acf8d06e3179e9ede8d3', 'Original dish data must remain byte-for-byte unchanged')
const raw = JSON.parse(rawBytes)
await build({ stdin: { contents: "export {default as dishes} from './src/data/dishes.js'; export {getDishRecipe,getScaledRecipeItems} from './src/utils/recipeScaler.js'; export {estimateDishCost} from './src/utils/costCalculator.js'; export {getAvailableDishImage} from './src/utils/dishImageResolver.js'", resolveDir: process.cwd() }, bundle:true, platform:'node', format:'esm', outfile:'reports/qa-data.mjs', define:{'import.meta.env.BASE_URL':JSON.stringify('/homnayangi/')} })
const { dishes,getDishRecipe,getScaledRecipeItems,estimateDishCost,getAvailableDishImage } = await import(pathToFileURL(path.resolve('reports/qa-data.mjs')))
assert.equal(dishes.length,1000)
for (let i=0;i<dishes.length;i++) {
  assert.equal(dishes[i].id,raw[i].id)
  assert.equal(dishes[i].name,raw[i].name)
  assert.equal(dishes[i].category,raw[i].category)
  assert.equal(dishes[i].method,raw[i].method)
  const recipe=getDishRecipe(dishes[i])
  assert.ok(recipe.steps.length, dishes[i].name)
  assert.ok(getScaledRecipeItems(dishes[i],2).ingredients.length, dishes[i].name)
  assert.ok(Number.isFinite(recipe.prepTime + recipe.cookTime), dishes[i].name)
  const cost=estimateDishCost(dishes[i],2)
  assert.ok(Number.isFinite(cost.min)&&Number.isFinite(cost.max),dishes[i].name)
}
const manifest=JSON.parse(await fs.readFile('src/data/dish-images.json','utf8'))
const hashes = new Set()
for(const [id,image] of Object.entries(manifest)) {
  const source=await fs.readFile('public/'+image.url)
  const built=await fs.readFile('dist/'+image.url)
  assert.ok(source.equals(built),'Built image content must match '+id)
  assert.equal(crypto.createHash('sha256').update(built).digest('hex'),image.sha256)
  assert.ok(!hashes.has(image.sha256),'No reused photos between distinct dishes')
  hashes.add(image.sha256)
  const metadata=await sharp(built).metadata()
  assert.ok(metadata.width>=400&&metadata.height>=300)
  assert.ok(getAvailableDishImage(dishes.find(d=>d.id===Number(id))),'All manifest images must pass runtime policy: '+id)
}
const distRoot=path.resolve('dist')
const server=http.createServer(async (req,res)=>{
  try {
    const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
    if(!requestPath.startsWith('/homnayangi/')) {res.writeHead(404);res.end();return}
    const relative=requestPath.slice('/homnayangi/'.length)||'index.html'
    const file=path.resolve(distRoot,relative)
    if(!file.startsWith(distRoot+path.sep)) {res.writeHead(403);res.end();return}
    const body=await fs.readFile(file)
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(body)
  }catch {res.writeHead(404);res.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const base='http://127.0.0.1:'+server.address().port+'/homnayangi/'
const browser=await chromium.launch({headless:true})
const results=[]
const errors=[]
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}})
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  // Provider misses are deterministic; bundled images are actually loaded from the built website.
  await page.route('https://www.themealdb.com/**',route=>route.fulfill({contentType:'application/json',body:'{"meals":null}'}))
  await page.goto(base)
  const version=JSON.parse(await fs.readFile('src/deploy-version.json','utf8'))
  assert.ok((await page.locator('footer').textContent()).includes('Version: Deploy '+version.deploy))
  const catalog=page.locator('.dish-catalog')
  await page.waitForSelector('.dish-catalog .dish-card')
  assert.equal(await catalog.locator('.dish-card').count(),20)
  assert.match(await catalog.locator('[role="status"]').textContent(),/1000/)
  await catalog.getByRole('button',{name:'Tải thêm 20 món',exact:true}).click()
  assert.equal(await catalog.locator('.dish-card').count(),40)
  results.push('Hôm nay/Món đơn: default 20 cards, load another 20, full 1000-row dataset')
  const input=catalog.getByRole('searchbox',{name:'Tìm tên món ăn'})
  await input.fill('phở bò')
  await page.waitForTimeout(100)
  const accented=await catalog.locator('.dish-title-button').allTextContents()
  await input.fill('pho bo')
  await page.waitForTimeout(100)
  assert.deepEqual(await catalog.locator('.dish-title-button').allTextContents(),accented)
  assert.ok(accented.length>1)
  await input.fill('suom chua')
  await page.waitForTimeout(100)
  assert.ok(await catalog.locator('.dish-card').count()>0)
  results.push('Accented/unaccented search returns identical lists; near-word typo works')
  await input.fill('zzzzzzzzzzz')
  assert.match(await catalog.locator('.empty').textContent(),/Không tìm thấy/)
  await input.fill('')
  await catalog.getByRole('combobox',{name:'Ẩm thực',exact:true}).selectOption('Nước ngoài')
  assert.match(await catalog.locator('.empty').textContent(),/chưa có món/)
  await catalog.getByRole('combobox',{name:'Ẩm thực',exact:true}).selectOption('Tất cả')
  await catalog.getByRole('button',{name:'Xào',exact:true}).click()
  assert.ok(await catalog.locator('.dish-card').count()>0)
  await catalog.getByRole('button',{name:'Tất cả',exact:true}).click()
  results.push('Empty-state, foreign-cuisine empty-state and cooking-method filter')
  await page.getByRole('navigation').getByRole('button',{name:'Món ăn',exact:true}).click()
  assert.equal(await catalog.locator('.dish-card').count(),20)
  while (await catalog.locator('.dish-card').count() < 1000) {
    await catalog.getByRole('button', { name: /Tải thêm/ }).click()
  }
  assert.deepEqual(await catalog.locator('.dish-title-button').allTextContents(),raw.map(d=>d.name))
  results.push('Loaded and compared the names and order of all 1000 cards')
  await input.fill('bun rieu cua')
  const card=catalog.locator('.dish-card').first()
  await card.getByRole('button',{name:'Xem chi tiết công thức',exact:true}).click()
  assert.equal(await card.locator('details').evaluate(el=>el.open),true)
  assert.ok(await card.locator('.recipe-detail').isVisible())
  const name=await card.locator('.dish-title-button').textContent()
  await card.getByRole('button',{name:'Chọn món',exact:true}).click()
  assert.equal(await page.locator('#selected-dish .dish-title-button').textContent(),name)
  await page.locator('#selected-dish img').scrollIntoViewIfNeeded()
  await page.locator('#selected-dish img').evaluate(img=>img.complete?null:new Promise(resolve=>{img.onload=resolve;img.onerror=resolve}))
  assert.ok(await page.locator('#selected-dish img').evaluate(img=>img.naturalWidth>0))
  results.push('Món ăn: recipe details and selecting a dish update Hôm nay; real built image loads')
  await page.screenshot({path:'reports/website-desktop.png',fullPage:true})
  for(const image of Object.values(manifest)) {
    const response=await page.request.get(base+image.url)
    assert.equal(response.status(),200)
    assert.ok(/^image\//.test(response.headers()['content-type']))
  }
  results.push('All '+Object.keys(manifest).length+' bundled photos return HTTP 200 under /homnayangi/')
  await page.getByRole('navigation').getByRole('button',{name:'7 ngày',exact:true}).click()
  await page.getByRole('button',{name:'Tạo thực đơn',exact:false}).click()
  assert.equal(await page.locator('.day-card').count(),7)
  await page.getByRole('navigation').getByRole('button',{name:'Đi chợ',exact:true}).click()
  assert.ok(await page.locator('.shopping-list input').count()>0)
  results.push('Existing weekly menu and shopping list still work')
  const mobile=await browser.newPage({viewport:{width:390,height:844}})
  await mobile.route('https://www.themealdb.com/**',route=>route.fulfill({contentType:'application/json',body:'{"meals":null}'}))
  mobile.on('pageerror',error=>errors.push(error.message))
  mobile.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  await mobile.addInitScript(()=>{ Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError')} })
  await mobile.goto(base)
  await mobile.getByRole('navigation').getByRole('button',{name:'Món ăn',exact:true}).click()
  await mobile.getByRole('searchbox',{name:'Tìm tên món ăn'}).fill('bun thang')
  assert.ok(await mobile.locator('.dish-catalog .dish-card').count()>0)
  await mobile.screenshot({path:'reports/website-mobile.png',fullPage:true})
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No horizontal page overflow')
  results.push('Mobile navigation/search works when localStorage writes are blocked')
  const failedPage=await browser.newPage()
  const failedPhoto=manifest[7]
  let failedRequests=0
  await failedPage.route('https://www.themealdb.com/**',route=>route.fulfill({contentType:'application/json',body:'{"meals":null}'}))
  await failedPage.route('**/'+failedPhoto.url,route=>{failedRequests++;return route.fulfill({status:404,body:'missing'})})
  await failedPage.goto(base)
  await failedPage.getByRole('searchbox',{name:'Tìm tên món ăn'}).fill('bun rieu cua')
  await failedPage.locator('.dish-catalog .dish-card').first().scrollIntoViewIfNeeded()
  await failedPage.locator('.dish-catalog .image-missing-label').first().waitFor()
  assert.ok(await failedPage.locator('.dish-catalog img').first().evaluate(img=>img.src.startsWith('data:image/svg+xml')))
  const issue=await failedPage.evaluate(()=>JSON.parse(localStorage.getItem('homnayangi_image_issues_v6'))?.[7])
  assert.equal(issue.reason,'load-error')
  const requestsBeforeReload=failedRequests
  await failedPage.reload()
  await failedPage.getByRole('searchbox',{name:'Tìm tên món ăn'}).fill('bun rieu cua')
  await failedPage.locator('.dish-catalog .dish-card').first().scrollIntoViewIfNeeded()
  await failedPage.locator('.dish-catalog .image-missing-label').first().waitFor()
  assert.equal(failedRequests,requestsBeforeReload,'Failed photo must not be reused after reload')
  results.push('Image failure shows placeholder, records the dish and blocks the failed URL after reload')
  assert.deepEqual(errors,[])
  await fs.writeFile('reports/website-verification.json',JSON.stringify({passed:true,totalDishes:dishes.length,originalDataUnchanged:true,bundledPhotos:Object.keys(manifest).length,results,errors,deploymentVerified:false},null,2))
  console.log(JSON.stringify({passed:true,totalDishes:dishes.length,bundledPhotos:Object.keys(manifest).length,results}))
}finally {await browser.close();await new Promise(resolve=>server.close(resolve))}
