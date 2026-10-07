import React, { useEffect, useMemo, useState } from 'react'
import dishes from './data/dishes.js'
import RecipeDetail from './components/RecipeDetail'
import FoodImage from './components/FoodImage'
import { getDishRecipe, getScaledRecipeItems } from './utils/recipeScaler'
import { averageDishCost, estimateDishCost, formatMoney } from './utils/costCalculator'
import { generateWeekPlan } from './utils/mealGenerator'
import deployVersion from './deploy-version.json'
import { PAGE_SIZE, costRange, filterDishes, createTray, shuffle, typeOptions } from './dishLogic.mjs'
import { verifiedImages, imageUrl } from './imageLogic.mjs'

const fallbackImage = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#fff7ed"/><stop offset="1" stop-color="#fed7aa"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><circle cx="400" cy="270" r="135" fill="#fff" stroke="#fb923c" stroke-width="18"/><circle cx="400" cy="270" r="70" fill="#fdba74"/><path d="M220 90v160M190 90v70M250 90v70M580 90v160" stroke="#9a3412" stroke-width="22" stroke-linecap="round"/><text x="400" y="455" text-anchor="middle" font-size="42" font-family="Arial" fill="#9a3412">Hôm Nay Ăn Gì?</text></svg>`)
const meals = ['Sáng', 'Trưa', 'Tối', 'Ăn vặt', 'Tất cả']
const moneyOptions = [30000, 50000, 80000, 100000, 120000, 180000, Infinity]
const money = value => `${value.toLocaleString('vi-VN')}đ`
const budgetLabel = value => value === Infinity ? 'Tất cả' : `≤ ${value / 1000}k/người`
function readSaved(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}
function DishImage({ dish }) {
  const sources = useMemo(() => verifiedImages(dish), [dish])
  const [index, setIndex] = useState(0)
  const source = sources[index]
  if (!sources.length) return <FoodImage dish={dish} />
  return <><img src={source ? imageUrl(source.url) : fallbackImage} alt={source ? dish.name : `${dish.name} — chưa có ảnh xác minh`} loading="lazy" onError={() => { if (source) setIndex(i => i + 1) }} />{source && <small className="image-credit"><a href={source.sourcePage} target="_blank" rel="noreferrer">Ảnh: {source.author}</a> · <a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a></small>}</>
}
function DishCard({ dish, onLike, liked, people = 1, compact = false }) {
  const price = costRange(dish)
  const recipe = getDishRecipe(dish)
  const cookingTime = recipe.prepTime + recipe.cookTime
  return <article className={`dish-card ${compact ? 'compact' : ''}`}>
    <div className="dish-photo"><DishImage key={dish.id} dish={dish} /></div>
    <div className="dish-body"><div className="dish-top"><span className="pill">{dish.category || 'Chưa phân nhóm'}</span><button className={`heart ${liked ? 'active' : ''}`} aria-label={`${liked ? 'Bỏ yêu thích' : 'Yêu thích'} ${dish.name}`} aria-pressed={liked} onClick={() => onLike(dish)}>♥</button></div>
      <h3>{dish.name}</h3><p className="muted">{dish.meal || 'Chưa có bữa ăn'} · {dish.costText || 'Chưa có giá'}</p>
      <p className="dish-estimate">Dự kiến {people} người: <b>{dish.estimatedCostPerPerson != null ? money(dish.estimatedCostPerPerson * people) : price ? `${money(price.min * people)}–${money(price.max * people)}` : 'Chưa có giá'}</b></p>
      <p className="muted">Thời gian nấu: {cookingTime ? `${cookingTime} phút (ước tính)` : 'Chưa có dữ liệu'}</p>
      <details><summary>Xem nguyên liệu & cách nấu</summary><RecipeDetail dish={dish} people={people}/></details>
    </div></article>
}
const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const moneyRange = cost => `${formatMoney(cost.min)}–${formatMoney(cost.max)}`
function aggregateIngredients(selectedDishes, people) {
  const totals = new Map()
  selectedDishes.filter(Boolean).forEach(dish => {
    const { ingredients, seasoning } = getScaledRecipeItems(dish, people)
    ;[...ingredients, ...seasoning].forEach(item => {
      if (!Number.isFinite(item.scaledAmount)) return
      const key = `${item.name.trim().toLocaleLowerCase('vi')}|${item.unit}`
      if (!totals.has(key)) totals.set(key, { name: item.name, amount: 0, unit: item.unit })
      totals.get(key).amount += item.scaledAmount
    })
  })
  return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

function quantityText(amount, unit) {
  if (unit === 'g' && amount >= 1000) return `${(amount / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg`
  const rounded = Number.isInteger(amount) ? amount : Number(amount.toFixed(2))
  return `${rounded.toLocaleString('vi-VN')} ${unit}`
}


function App() {
  const [meal, setMeal] = useState('Trưa'), [people, setPeople] = useState(2), [budget, setBudget] = useState(80000), [mode, setMode] = useState('Món đơn')
  const [tab, setTab] = useState('Hôm nay')
  const [weekPlan, setWeekPlan] = useState(() => readSaved('homnayangi_week'))
  const [checkedShopping, setCheckedShopping] = useState(() => { try { return JSON.parse(localStorage.getItem('homnayangi_checked_shopping') || '{}') } catch { return {} } })
  useEffect(() => localStorage.setItem('homnayangi_week', JSON.stringify(weekPlan)), [weekPlan])
  useEffect(() => localStorage.setItem('homnayangi_checked_shopping', JSON.stringify(checkedShopping)), [checkedShopping])
  const generateWeek = () => { setWeekPlan(generateWeekPlan({ people, budget })); setCheckedShopping({}) }
  const plannedDishes = weekPlan.flatMap(day => [day.breakfast, ...(day.lunch || []), ...(day.dinner || [])].filter(Boolean))
  const weekTotal = plannedDishes.reduce((sum, dish) => sum + averageDishCost(dish, people), 0)
  const shopping = useMemo(() => aggregateIngredients(plannedDishes, people), [weekPlan, people])
  const toggleShoppingItem = name => setCheckedShopping(prev => ({ ...prev, [name]: !prev[name] }))
  const [likes, setLikes] = useState(() => readSaved('homnayangi_likes')), [history, setHistory] = useState(() => readSaved('homnayangi_history'))
  const [result, setResult] = useState(() => ({ meal: 'Trưa', people: 2, budget: 80000, mode: 'Món đơn', pool: shuffle(filterDishes(dishes, { meal: 'Trưa', budget: 80000 })), index: 0, tray: [] }))
  const [resultVisible, setResultVisible] = useState(PAGE_SIZE)
  const [search, setSearch] = useState(''), [catalogMeal, setCatalogMeal] = useState('Tất cả'), [catalogBudget, setCatalogBudget] = useState(Infinity), [catalogType, setCatalogType] = useState('Tất cả'), [catalogVisible, setCatalogVisible] = useState(PAGE_SIZE)
  useEffect(() => localStorage.setItem('homnayangi_likes', JSON.stringify(likes)), [likes])
  useEffect(() => localStorage.setItem('homnayangi_history', JSON.stringify(history.slice(0, 50))), [history])
  useEffect(() => setCatalogVisible(PAGE_SIZE), [search, catalogMeal, catalogBudget, catalogType])
  const catalog = useMemo(() => filterDishes(dishes, { search, meal: catalogMeal, budget: catalogBudget, type: catalogType }), [search, catalogMeal, catalogBudget, catalogType])
  const categories = [...new Set(dishes.map(d => d.category))]
  const like = dish => setLikes(prev => prev.includes(dish.id) ? prev.filter(id => id !== dish.id) : [...prev, dish.id])
  const remember = selected => setHistory(prev => [...selected.map(d => ({ id: d.id, name: d.name, at: new Date().toLocaleString('vi-VN') })), ...prev.filter(item => !selected.some(d => d.id === item.id))].slice(0, 50))
  const choose = () => {
    const pool = shuffle(filterDishes(dishes, { meal, budget }))
    const trayDeck = shuffle(dishes)
    const tray = mode === 'Mâm cơm' ? createTray(trayDeck, { meal, budget, people }, null) : []
    setResult({ meal, people, budget, mode, pool, tray, trayDeck, index: 0 }); setResultVisible(PAGE_SIZE)
    remember(mode === 'Mâm cơm' ? tray : pool.slice(0, 1))
  }
  const next = () => {
    if (result.mode === 'Mâm cơm') {
      const used = new Set(result.tray.map(d => d.id))
      const trayDeck = [...result.trayDeck.filter(d => !used.has(d.id)), ...result.trayDeck.filter(d => used.has(d.id))]
      const tray = createTray(trayDeck, result, null)
      setResult({ ...result, tray, trayDeck }); remember(tray)
    }
    else if (result.pool.length) { const index = (result.index + 1) % result.pool.length; setResult({ ...result, index }); remember([result.pool[index]]) }
  }
  const card = (dish, compact = true, count = people) => <DishCard key={dish.id} dish={dish} onLike={like} liked={likes.includes(dish.id)} compact={compact} people={count} />
  const more = (visible, total, setter) => <><p className="center muted">Đang hiển thị {Math.min(visible, total)} / {total} món phù hợp.</p>{visible < total && <div className="center"><button className="ghost" onClick={() => setter(n => n + PAGE_SIZE)}>Xem thêm</button></div>}</>
  const trayPrice = result.tray.reduce((sum, d) => sum + d.estimatedCostPerPerson * result.people, 0)
  const pending = meal !== result.meal || budget !== result.budget || people !== result.people || mode !== result.mode
  return <div className="app">
    <header className="site-header"><div className="brand" onClick={() => setTab('Hôm nay')}><span className="logo">🍜</span><div><b>homnayangi</b><small>Đỡ phải nghĩ, ăn ngon mỗi ngày</small></div></div><nav>{['Hôm nay', 'Món ăn', '7 ngày', 'Đi chợ', 'Yêu thích', 'Lịch sử'].map(x => <button className={tab === x ? 'active' : ''} onClick={() => setTab(x)} key={x}>{x}</button>)}</nav></header>
    {tab === 'Hôm nay' && <>
      <section className="hero"><div><span className="eyebrow">GỢI Ý THÔNG MINH</span><h1>Hôm nay <em>ăn gì?</em></h1><p>Chọn bữa, số người và ngân sách. Web sẽ chọn món giúp bạn.</p></div><div className="hero-badge"><strong>{dishes.length.toLocaleString('vi-VN')}</strong><span>món Việt</span></div></section>
      <section className="control-card">
        <div className="field"><label>Bữa ăn</label><div className="segmented">{meals.map(x => <button className={meal === x ? 'selected' : ''} onClick={() => setMeal(x)} key={x}>{x}</button>)}</div></div>
        <div className="field"><label>Số người</label><div className="counter"><button aria-label="Giảm số người" onClick={() => setPeople(Math.max(1, people - 1))}>−</button><b>{people}</b><button aria-label="Tăng số người" onClick={() => setPeople(Math.min(12, people + 1))}>+</button></div></div>
        <div className="field"><label htmlFor="budget">Ngân sách/người</label><select id="budget" value={budget} onChange={e => setBudget(Number(e.target.value))}>{moneyOptions.map(x => <option key={x} value={x}>{budgetLabel(x)}</option>)}</select></div>
        <div className="field"><label>Kiểu gợi ý</label><div className="segmented">{['Món đơn', 'Mâm cơm'].map(x => <button className={mode === x ? 'selected' : ''} onClick={() => setMode(x)} key={x}>{x}</button>)}</div></div>
        <button className="primary" onClick={choose}>🎲 Chọn cho tôi</button>
      </section>
      <section className="result-section" aria-live="polite">
        {pending && <p className="muted">Bấm “Chọn cho tôi” để áp dụng điều kiện mới.</p>}
        <div className="section-title"><div><span className="eyebrow">ĐỀ XUẤT HÔM NAY</span><h2>{result.mode === 'Mâm cơm' ? `Mâm cơm cho ${result.people} người` : 'Món dành cho bạn'}</h2></div><button className="ghost" onClick={next} disabled={result.mode === 'Món đơn' && result.pool.length < 2}>↻ Đổi món</button></div>
        <p className="muted">{result.meal} · {result.people} người · {budgetLabel(result.budget)}</p>
        {result.mode === 'Món đơn' ? (result.pool.length ? card(result.pool[result.index], false, result.people) : <div className="empty">Không có món phù hợp. Hãy thử bữa hoặc ngân sách khác.</div>) : (result.tray.length ? <><p>Tổng dự kiến tối đa: <b>{money(trayPrice)}</b>{Number.isFinite(result.budget) && ` / ngân sách ${money(result.budget * result.people)}`}</p><div className="grid">{result.tray.map(d => card(d, true, result.people))}</div></> : <div className="empty">Chưa đủ món mặn, rau và canh trong ngân sách cho bữa này. Hãy tăng ngân sách hoặc chọn Trưa/Tối.</div>)}
        <div className="section-title list-title"><div><h2>Danh sách món phù hợp</h2></div></div>
        {result.mode === 'Mâm cơm' && <p className="muted">Các món riêng để tham khảo; mâm cơm phía trên đã tính tổng ngân sách.</p>}
        <div className="grid">{result.pool.slice(0, resultVisible).map(d => card(d, true, result.people))}</div>{more(resultVisible, result.pool.length, setResultVisible)}
      </section>
    </>}
    {tab === 'Món ăn' && <section className="page"><div className="section-title"><div><span className="eyebrow">KHO MÓN</span><h2>{dishes.length.toLocaleString('vi-VN')} món Việt</h2></div></div>
      <input className="search" aria-label="Tìm tên món" placeholder="Tìm phở, bún, ga, ca, banh..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="catalog-filters"><div className="field"><label htmlFor="catalog-meal">Bữa</label><select id="catalog-meal" value={catalogMeal} onChange={e => setCatalogMeal(e.target.value)}>{['Tất cả', ...meals.filter(x => x !== 'Tất cả')].map(x => <option key={x}>{x}</option>)}</select></div><div className="field"><label htmlFor="catalog-type">Loại món</label><select id="catalog-type" value={catalogType} onChange={e => setCatalogType(e.target.value)}>{[...new Set([...typeOptions, ...categories])].map(x => <option key={x}>{x}</option>)}</select></div><div className="field"><label htmlFor="catalog-budget">Giá/người</label><select id="catalog-budget" value={catalogBudget} onChange={e => setCatalogBudget(Number(e.target.value))}>{[Infinity, 30000, 50000, 80000, 100000].map(x => <option key={x} value={x}>{budgetLabel(x)}</option>)}</select></div></div>
      {catalog.length ? <div className="grid">{catalog.slice(0, catalogVisible).map(d => card(d))}</div> : <div className="empty">Không tìm thấy món phù hợp.</div>}{more(catalogVisible, catalog.length, setCatalogVisible)}
    </section>}
    {tab === '7 ngày' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">THỰC ĐƠN TUẦN</span><h2>Ăn gì trong 7 ngày?</h2></div>
        <button className="primary" onClick={generateWeek}>{weekPlan.length ? '↻ Tạo lại' : '✨ Tạo thực đơn'}</button></div>
      <p className="muted intro">Theo {people} người, ngân sách tối đa {formatMoney(budget)}/người/bữa. Thực đơn cố gắng xen kẽ nhóm đạm và tránh lặp món.</p>
      {weekPlan.length ? <>
        <div className="week-total"><span>Chi phí ước tính cả tuần · {people} người<br/><small>{formatMoney(weekTotal / people)} / người / tuần</small></span><strong>{formatMoney(weekTotal)}</strong></div>
        <div className="week-grid">{weekPlan.map((day, dayIndex) => {
          const dayDishes = [day.breakfast, ...(day.lunch || []), ...(day.dinner || [])].filter(Boolean)
          const dayTotal = dayDishes.reduce((sum, dish) => sum + averageDishCost(dish, people), 0)
          const renderRecipe = dish => dish && <details className="week-recipe" key={dish.id}>
            <summary>{dish.name}<span>{moneyRange(estimateDishCost(dish, people))}</span></summary>
            <RecipeDetail dish={dish} people={people}/>
          </details>
          return <article className="day-card" key={day.day || dayNames[dayIndex]}>
            <h3>{day.day || dayNames[dayIndex]}<strong>{formatMoney(dayTotal)}</strong></h3>
            <div className="day-meal"><b>🌅 Sáng</b>{renderRecipe(day.breakfast) || <span>—</span>}</div>
            <div className="day-meal"><b>☀️ Trưa</b>{day.lunch?.length ? day.lunch.map(renderRecipe) : <span>—</span>}</div>
            <div className="day-meal"><b>🌙 Tối</b>{day.dinner?.length ? day.dinner.map(renderRecipe) : <span>—</span>}</div>
          </article>
        })}</div>
      </> : <div className="empty">Bấm “Tạo thực đơn” để web lên thực đơn cả tuần cho bạn.</div>}
    </section>}

    {tab === 'Đi chợ' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">DANH SÁCH MUA</span><h2>Đi chợ cho cả tuần</h2></div>
        <button className="ghost" onClick={() => setTab('7 ngày')}>← Xem thực đơn</button></div>
      {weekPlan.length ? <div className="shopping-card">
        <p className="muted">Gộp nguyên liệu và định lượng từ thực đơn 7 ngày cho {people} người. Lượng mua chỉ là dự kiến.</p>
        <div className="shopping-list">{shopping.map(item => {
          const key = `${item.name}|${item.unit}`
          return <label className={checkedShopping[key] ? 'checked' : ''} key={key}>
            <input type="checkbox" checked={Boolean(checkedShopping[key])} onChange={() => toggleShoppingItem(key)}/>
            <span>{item.name}<small>{quantityText(item.amount, item.unit)}</small></span>
          </label>
        })}</div>
      </div> : <div className="empty">Hãy tạo “Thực đơn 7 ngày” trước, danh sách đi chợ sẽ tự xuất hiện ở đây.</div>}
    </section>}

    {tab === 'Yêu thích' && <section className="page"><div className="section-title"><div><span className="eyebrow">ĐÃ LƯU</span><h2>Món yêu thích</h2></div></div>{likes.length ? <div className="grid">{dishes.filter(d => likes.includes(d.id)).map(d => card(d))}</div> : <div className="empty">Chưa có món yêu thích.</div>}</section>}
    {tab === 'Lịch sử' && <section className="page"><div className="section-title"><div><span className="eyebrow">GẦN ĐÂY</span><h2>Lịch sử món đã chọn</h2></div><button className="ghost" onClick={() => setHistory([])}>Xóa lịch sử</button></div><div className="history">{history.map(x => <div key={`${x.id}-${x.at}`}><b>{x.name}</b><span>{x.at}</span></div>)}</div></section>}
    <footer>homnayangi · MVP V1 · Database {dishes.length.toLocaleString('vi-VN')} món · <small>Version: Deploy {deployVersion.deploy}</small></footer>
  </div>
}
export default App
