import React, { useEffect, useMemo, useState } from 'react'
import deployVersion from './deploy-version.json'
import dishes from './data/dishes.js'
import DishCard from './components/DishCard'
import RecipeDetail from './components/RecipeDetail'
import { averageDishCost, estimateDishCost, formatMoney } from './utils/costCalculator'
import { getDishRecipe, getScaledRecipeItems } from './utils/recipeScaler'
import { chooseTray, generateWeekPlan } from './utils/mealGenerator'
import DishCatalog from './components/DishCatalog'

const moneyOptions = [
  { label: '≤ 50k/người', max: 50000 },
  { label: '≤ 80k/người', max: 80000 },
  { label: '≤ 120k/người', max: 120000 },
  { label: '≤ 180k/người', max: 180000 },
  { label: 'Không giới hạn', max: 999999 },
]
const meals = ['Sáng', 'Trưa', 'Tối', 'Ăn vặt', 'Tất cả']
const tabs = ['Hôm nay', 'Món ăn', '7 ngày', 'Đi chợ', 'Yêu thích', 'Lịch sử']
const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']
const moneyRange = cost => `${formatMoney(cost.min)}–${formatMoney(cost.max)}`

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return Array.isArray(fallback) ? (Array.isArray(value) ? value : fallback)
      : value && typeof value === 'object' && !Array.isArray(value) ? value : fallback
  }
  catch { return fallback }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep the UI usable when storage is blocked or full. */ }
}

function mealMatches(dish, meal) {
  if (meal === 'Tất cả') return true
  const dishMeals = dish.meal || ''
  if (meal === 'Ăn vặt') return dishMeals.includes('Ăn vặt') || dish.category.includes('Ăn vặt')
  return dishMeals.includes(meal)
}

function randomOne(items) {
  return items.length ? items[Math.floor(Math.random() * items.length)] : null
}

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
  const [meal, setMeal] = useState('Trưa')
  const [people, setPeople] = useState(2)
  const [budget, setBudget] = useState(80000)
  const [mode, setMode] = useState('Món đơn')
  const [selected, setSelected] = useState(null)
  const [tray, setTray] = useState([])
  const [tab, setTab] = useState('Hôm nay')
  const [likes, setLikes] = useState(() => readStorage('homnayangi_likes', []))
  const [history, setHistory] = useState(() => readStorage('homnayangi_history', []))
  const [weekPlan, setWeekPlan] = useState(() => readStorage('homnayangi_week', []))
  const [checkedShopping, setCheckedShopping] = useState(() => readStorage('homnayangi_checked_shopping', {}))

  useEffect(() => writeStorage('homnayangi_likes', likes), [likes])
  useEffect(() => writeStorage('homnayangi_history', history.slice(0, 50)), [history])
  useEffect(() => writeStorage('homnayangi_week', weekPlan), [weekPlan])
  useEffect(() => writeStorage('homnayangi_checked_shopping', checkedShopping), [checkedShopping])

  const filtered = useMemo(() => dishes.filter(dish => mealMatches(dish, meal) && averageDishCost(dish, 1) <= budget), [meal, budget])

  const like = dish => setLikes(previous => previous.includes(dish.id)
    ? previous.filter(id => id !== dish.id)
    : [...previous, dish.id])
  const remember = dish => setHistory(previous => [
    { id: dish.id, name: dish.name, at: new Date().toLocaleString('vi-VN') },
    ...previous.filter(item => item.id !== dish.id),
  ])

  const selectDish = dish => {
    setSelected(dish)
    setTray([])
    setMode('Món đơn')
    setTab('Hôm nay')
    remember(dish)
    requestAnimationFrame(() => document.getElementById('selected-dish')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const pickDish = () => {
    const recentIds = new Set(history.slice(0, 10).map(item => item.id))
    const pool = filtered.filter(dish => !recentIds.has(dish.id))
    const dish = randomOne(pool.length ? pool : filtered)
    setSelected(dish)
    setTray([])
    if (dish) remember(dish)
  }

  const pickTray = () => {
    const recentIds = new Set(history.slice(0, 10).map(item => item.id))
    const picks = chooseTray(meal, budget, people, recentIds)
    setTray(picks)
    setSelected(null)
    picks.forEach(remember)
  }

  const generateWeek = () => {
    setWeekPlan(generateWeekPlan({ people, budget }))
    setCheckedShopping({})
  }

  useEffect(() => {
    if (!selected && tray.length === 0) pickDish()
  }, [])

  const likedDishes = dishes.filter(dish => likes.includes(dish.id))
  const trayCost = tray.reduce((total, dish) => {
    const cost = estimateDishCost(dish, people)
    return { min: total.min + cost.min, max: total.max + cost.max }
  }, { min: 0, max: 0 })
  const trayCookTime = tray.reduce((sum, dish) => {
    const recipe = getDishRecipe(dish)
    return sum + (recipe.prepTime || 0) + (recipe.cookTime || 0)
  }, 0)
  const weekTotal = weekPlan.reduce((total, day) => {
    const dishesForDay = [day.breakfast, ...(day.lunch || []), ...(day.dinner || [])].filter(Boolean)
    return dishesForDay.reduce((sum, dish) => sum + averageDishCost(dish, people), total)
  }, 0)
  const plannedDishes = weekPlan.flatMap(day => [day.breakfast, ...(day.lunch || []), ...(day.dinner || [])].filter(Boolean))
  const shopping = useMemo(() => aggregateIngredients(plannedDishes, people), [weekPlan, people])

  const toggleShoppingItem = name => setCheckedShopping(previous => ({ ...previous, [name]: !previous[name] }))

  return <div className="app">
    <header className="site-header">
      <div className="brand" onClick={() => setTab('Hôm nay')} role="button" tabIndex={0}>
        <span className="logo">🍜</span><div><b>homnayangi</b><small>Đỡ phải nghĩ, ăn ngon mỗi ngày</small></div>
      </div>
      <nav aria-label="Điều hướng chính">
        {tabs.map(name => <button className={tab === name ? 'active' : ''} onClick={() => setTab(name)} key={name}>{name}</button>)}
      </nav>
    </header>

    {tab === 'Hôm nay' && <>
      <section className="hero">
        <div><span className="eyebrow">GỢI Ý THÔNG MINH</span><h1>Hôm nay <em>ăn gì?</em></h1>
          <p>Chọn bữa, số người và ngân sách. Web tự chọn món, tính tiền và gợi ý cách nấu.</p></div>
        <div className="hero-badge"><strong>1.000+</strong><span>món Việt</span></div>
      </section>

      <section className="control-card">
        <div className="field"><label>Bữa ăn</label><div className="segmented">
          {meals.map(item => <button className={meal === item ? 'selected' : ''} onClick={() => setMeal(item)} key={item}>{item}</button>)}
        </div></div>
        <div className="field"><label>Số người</label><div className="counter">
          <button aria-label="Giảm số người" onClick={() => setPeople(Math.max(1, people - 1))}>−</button><b>{people}</b>
          <button aria-label="Tăng số người" onClick={() => setPeople(Math.min(12, people + 1))}>+</button>
        </div></div>
        <div className="field"><label>Ngân sách / người</label><select value={budget} onChange={event => setBudget(Number(event.target.value))}>
          {moneyOptions.map(option => <option key={option.max} value={option.max}>{option.label}</option>)}
        </select></div>
        <div className="field"><label>Kiểu gợi ý</label><div className="segmented">
          {['Món đơn', 'Mâm cơm'].map(item => <button className={mode === item ? 'selected' : ''} onClick={() => setMode(item)} key={item}>{item}</button>)}
        </div></div>
        <button className="primary" onClick={mode === 'Mâm cơm' ? pickTray : pickDish}>🎲 Chọn cho tôi</button>
      </section>

      <section className="result-section" id="selected-dish">
        <div className="section-title"><div><span className="eyebrow">ĐỀ XUẤT HÔM NAY</span>
          <h2>{mode === 'Mâm cơm' ? `Mâm cơm cho ${people} người` : 'Món dành cho bạn'}</h2></div>
          <button className="ghost" onClick={mode === 'Mâm cơm' ? pickTray : pickDish}>↻ Đổi món</button></div>
        {tray.length > 0 && <>
          <div className="budget-summary"><div><span>Tổng mâm dự kiến</span><strong>{moneyRange(trayCost)}</strong></div>
            <div><span>Số người</span><strong>{people} người</strong></div>
            <div><span>Thời gian nấu ước tính</span><strong>{trayCookTime} phút</strong></div></div>
          <div className="tray-ingredients"><b>Nguyên liệu mâm cơm</b><div>{aggregateIngredients(tray, people).map(item =>
            <span key={`${item.name}-${item.unit}`}>{item.name}: {quantityText(item.amount, item.unit)}</span>)}</div></div>
        </>}
        {selected && <DishCard dish={selected} onLike={like} liked={likes.includes(selected.id)} people={people}/>}
        {tray.length > 0 && <div className="grid">{tray.map(dish => <DishCard key={dish.id} dish={dish} onLike={like} liked={likes.includes(dish.id)} people={people} compact/>)}</div>}
      </section>
      {mode === 'Món đơn' && <section className="page today-catalog"><DishCatalog today people={people} likes={likes} onLike={like} onSelect={selectDish}/></section>}
    </>}

    {tab === 'Món ăn' && <section className="page"><DishCatalog people={people} likes={likes} onLike={like} onSelect={selectDish}/></section>}

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

    {tab === 'Yêu thích' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">ĐÃ LƯU</span><h2>Món yêu thích</h2></div></div>
      {likedDishes.length ? <div className="grid">{likedDishes.map(dish => <DishCard key={dish.id} dish={dish} onLike={like} liked people={people}/>)}</div> : <div className="empty">Chưa có món yêu thích.</div>}
    </section>}

    {tab === 'Lịch sử' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">GẦN ĐÂY</span><h2>Lịch sử món đã chọn</h2></div>
        <button className="ghost" onClick={() => setHistory([])}>Xóa lịch sử</button></div>
      {history.length ? <div className="history">{history.map(item => <div key={`${item.id}-${item.at}`}><b>{item.name}</b><span>{item.at}</span></div>)}</div> : <div className="empty">Chưa có món trong lịch sử.</div>}
    </section>}

    <footer>homnayangi · Database {dishes.length.toLocaleString('vi-VN')} món · Ảnh chỉ hiện khi có metadata xác minh đúng món · <small>Version: Deploy {deployVersion.deploy}</small></footer>
  </div>
}

export default App
