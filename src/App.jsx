import React, { useEffect, useMemo, useState } from 'react'
import dishes from './data/dishes.json'

const fallbackImage =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#fed7aa"/>
    </linearGradient></defs>
    <rect width="800" height="520" fill="url(#g)"/>
    <circle cx="400" cy="250" r="135" fill="#fff" stroke="#fb923c" stroke-width="18"/>
    <circle cx="400" cy="250" r="70" fill="#fdba74"/>
    <path d="M220 75v160M190 75v70M250 75v70M580 75v160" stroke="#9a3412" stroke-width="22" stroke-linecap="round"/>
    <text x="400" y="445" text-anchor="middle" font-size="42" font-family="Arial" fill="#9a3412">Hôm Nay Ăn Gì?</text>
  </svg>`)

const moneyOptions = [
  { label: '≤ 50k/người', max: 50000 },
  { label: '≤ 80k/người', max: 80000 },
  { label: '≤ 120k/người', max: 120000 },
  { label: '≤ 180k/người', max: 180000 },
  { label: 'Không giới hạn', max: 999999 }
]

const days = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật']
const mainCategories = ['Món mặn','Món kho/rim','Món xào','Món chiên/rán','Món nướng','Món hấp/luộc']
const fmt = n => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ'

function parseCostRange(text='') {
  const nums = [...text.matchAll(/([\\d.]+)\\s*đ/g)].map(m => Number(m[1].replaceAll('.', '')))
  if (!nums.length) return [30000, 60000]
  if (nums.length === 1) return [nums[0], nums[0]]
  return [Math.min(...nums), Math.max(...nums)]
}
function avgCost(dish) {
  const [min,max] = parseCostRange(dish.costText)
  return Math.round((min + max) / 2)
}
function randomOne(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null }
function mealMatches(dish, meal) {
  if (meal === 'Tất cả') return true
  const m = dish.meal || ''
  if (meal === 'Sáng') return m.includes('Sáng')
  if (meal === 'Trưa') return m.includes('Trưa')
  if (meal === 'Tối') return m.includes('Tối')
  if (meal === 'Ăn vặt') return m.includes('Ăn vặt') || dish.category.includes('Ăn vặt')
  return true
}

function dishIngredients(dish, people=2) {
  const base = Math.max(1, people)
  const ingredient = (dish.mainIngredient || 'nguyên liệu chính').replace(/^Theo món$/i, dish.name)
  const category = dish.category || ''
  const items = []
  if (/thịt|bò|gà|vịt|cá|tôm|mực|cua|ghẹ|ốc|ngao|hến|lươn|ếch|dê|bê/i.test(ingredient + ' ' + dish.name)) {
    items.push({name: ingredient, qty: `${150*base}–${220*base}g`})
  } else if (/đậu|trứng/i.test(ingredient + ' ' + dish.name)) {
    items.push({name: ingredient, qty: `${base + 1} phần/quả`})
  } else if (/rau|cải|bí|mướp|nấm|su su|bắp cải/i.test(ingredient + ' ' + dish.name)) {
    items.push({name: ingredient, qty: `${200 + 80*base}g`})
  } else {
    items.push({name: ingredient, qty: `${base} phần`})
  }
  if (category === 'Canh') items.push({name:'Nước dùng', qty:`${350 + 180*base}ml`})
  if (/Ăn sáng|Món nước|Bún|Phở|Miến|Bánh canh/i.test(category + ' ' + dish.name)) items.push({name:'Bún/phở/mì hoặc tinh bột', qty:`${120*base}g`})
  items.push({name:'Hành/tỏi/gừng/rau thơm', qty:'vừa đủ'})
  items.push({name:'Nước mắm, muối, đường, tiêu', qty:'vừa ăn'})
  return items
}

function cookingSteps(dish) {
  const raw = (dish.method || '').split(';').map(x=>x.trim()).filter(Boolean)
  if (raw.length >= 3) return raw
  return [
    `Sơ chế ${dish.mainIngredient && dish.mainIngredient !== 'Theo món' ? dish.mainIngredient : 'nguyên liệu'} sạch và để ráo.`,
    'Ướp/nêm gia vị vừa ăn trong 10–15 phút.',
    dish.method || 'Chế biến đến khi nguyên liệu chín vừa.',
    'Nếm lại, hoàn thiện và dùng khi còn nóng.'
  ]
}

async function lookupWikiImage(dish) {
  const key = 'foodimg_' + dish.id
  const saved = localStorage.getItem(key)
  if (saved) return saved === 'NONE' ? '' : saved
  const searches = [dish.name, dish.imageKeyword].filter(Boolean)
  for (const q of searches) {
    try {
      const url = 'https://vi.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
        encodeURIComponent(q) + '&gsrlimit=4&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&origin=*'
      const res = await fetch(url)
      const json = await res.json()
      const pages = Object.values(json?.query?.pages || {})
      const found = pages.find(p => p.thumbnail?.source)
      if (found?.thumbnail?.source) {
        localStorage.setItem(key, found.thumbnail.source)
        return found.thumbnail.source
      }
    } catch {}
  }
  localStorage.setItem(key, 'NONE')
  return ''
}

function FoodImage({dish, className=''}) {
  const [src,setSrc] = useState(dish.image || '')
  useEffect(()=>{
    let active = true
    if (!dish.image) lookupWikiImage(dish).then(x=>active && setSrc(x))
    return ()=>{ active=false }
  },[dish.id, dish.image])
  return <img className={className} loading="lazy" src={src || fallbackImage} alt={dish.name}
    onError={e=>{ e.currentTarget.src=fallbackImage }} />
}

function IngredientList({dish, people}) {
  return <div className="ingredients">
    {dishIngredients(dish,people).map((x,i)=><div key={i}><span>{x.name}</span><b>{x.qty}</b></div>)}
  </div>
}

function DishCard({ dish, onLike, liked, people=2, compact=false }) {
  if (!dish) return null
  const total = avgCost(dish) * people
  return <article className={`dish-card ${compact ? 'compact' : ''}`}>
    <FoodImage dish={dish} />
    <div className="dish-body">
      <div className="dish-top">
        <span className="pill">{dish.category}</span>
        <button aria-label="Yêu thích" className={`heart ${liked ? 'active' : ''}`} onClick={() => onLike(dish)}>♥</button>
      </div>
      <h3>{dish.name}</h3>
      <p className="muted">{dish.meal} · {dish.costText}</p>
      <div className="cost-box"><span>Dự kiến cho {people} người</span><strong>{fmt(total)}</strong></div>
      <details>
        <summary>Nguyên liệu & cách nấu</summary>
        <IngredientList dish={dish} people={people}/>
        <ol className="steps">{cookingSteps(dish).map((s,i)=><li key={i}>{s}</li>)}</ol>
      </details>
    </div>
  </article>
}

function chooseTray(meal,budget,people,avoidIds=new Set()) {
  const eligible = dishes.filter(d => mealMatches(d, meal) && !avoidIds.has(d.id))
  const mains = eligible.filter(d => mainCategories.includes(d.category))
  const soups = eligible.filter(d => d.category === 'Canh')
  const vegs = eligible.filter(d => d.category === 'Rau/Củ')
  let best = []
  let bestCost = Infinity
  const maxTotal = budget * people
  for (let i=0;i<60;i++) {
    const combo = [randomOne(mains),randomOne(soups),randomOne(vegs)].filter(Boolean)
    const unique = [...new Map(combo.map(x=>[x.id,x])).values()]
    const cost = unique.reduce((s,d)=>s + avgCost(d)*people,0)
    if (cost <= maxTotal && unique.length >= 2) return unique
    if (cost < bestCost) { best = unique; bestCost = cost }
  }
  return best
}

function App() {
  const [meal, setMeal] = useState('Trưa')
  const [people, setPeople] = useState(2)
  const [budget, setBudget] = useState(80000)
  const [mode, setMode] = useState('Món đơn')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [tray, setTray] = useState([])
  const [tab, setTab] = useState('Hôm nay')
  const [likes, setLikes] = useState(() => JSON.parse(localStorage.getItem('homnayangi_likes') || '[]'))
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('homnayangi_history') || '[]'))
  const [weekPlan, setWeekPlan] = useState(() => JSON.parse(localStorage.getItem('homnayangi_week') || '[]'))

  useEffect(() => localStorage.setItem('homnayangi_likes', JSON.stringify(likes)), [likes])
  useEffect(() => localStorage.setItem('homnayangi_history', JSON.stringify(history.slice(0, 50))), [history])
  useEffect(() => localStorage.setItem('homnayangi_week', JSON.stringify(weekPlan)), [weekPlan])

  const filtered = useMemo(() => dishes.filter(d => {
    const q = search.toLowerCase().trim()
    return mealMatches(d, meal)
      && avgCost(d) <= budget
      && (!q || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || (d.style||'').toLowerCase().includes(q))
  }), [meal, budget, search])

  const like = dish => setLikes(prev => prev.includes(dish.id) ? prev.filter(x => x !== dish.id) : [...prev, dish.id])
  const remember = dish => setHistory(prev => [{ id: dish.id, name: dish.name, at: new Date().toLocaleString('vi-VN') }, ...prev.filter(x => x.id !== dish.id)])

  const pickDish = () => {
    const recentIds = new Set(history.slice(0, 10).map(x => x.id))
    const pool = filtered.filter(x => !recentIds.has(x.id))
    const dish = randomOne(pool.length ? pool : filtered)
    setSelected(dish); setTray([])
    if (dish) remember(dish)
  }

  const pickTray = () => {
    const avoid = new Set(history.slice(0, 10).map(x=>x.id))
    const picks = chooseTray(meal,budget,people,avoid)
    setTray(picks); setSelected(null)
    picks.forEach(remember)
  }

  const generateWeek = () => {
    const used = new Set()
    const plan = days.map(day => {
      const breakfast = randomOne(dishes.filter(d=>mealMatches(d,'Sáng') && avgCost(d)<=budget && !used.has(d.id)))
      if (breakfast) used.add(breakfast.id)
      const lunch = chooseTray('Trưa',budget,people,used); lunch.forEach(d=>used.add(d.id))
      const dinner = chooseTray('Tối',budget,people,used); dinner.forEach(d=>used.add(d.id))
      return {day, breakfast, lunch, dinner}
    })
    setWeekPlan(plan)
  }

  useEffect(() => { if (!selected && tray.length === 0) pickDish() }, [])

  const likedDishes = dishes.filter(d => likes.includes(d.id))
  const trayTotal = tray.reduce((s,d)=>s+avgCost(d)*people,0)
  const weekTotal = weekPlan.reduce((sum,d)=>sum +
    (d.breakfast ? avgCost(d.breakfast)*people : 0) +
    d.lunch.reduce((s,x)=>s+avgCost(x)*people,0) +
    d.dinner.reduce((s,x)=>s+avgCost(x)*people,0), 0)

  const shopping = useMemo(()=>{
    const map = new Map()
    const addDish = d => dishIngredients(d,people).slice(0,2).forEach(x=>{
      const k=x.name.toLowerCase()
      if (!map.has(k)) map.set(k,{name:x.name, count:0})
      map.get(k).count++
    })
    weekPlan.forEach(d=>{ if(d.breakfast)addDish(d.breakfast); d.lunch.forEach(addDish); d.dinner.forEach(addDish) })
    return [...map.values()]
  },[weekPlan,people])

  return <div className="app">
    <header className="site-header">
      <div className="brand" onClick={() => setTab('Hôm nay')}>
        <span className="logo">🍜</span><div><b>homnayangi</b><small>Đỡ phải nghĩ, ăn ngon mỗi ngày</small></div>
      </div>
      <nav>
        {['Hôm nay','Món ăn','7 ngày','Đi chợ','Yêu thích','Lịch sử'].map(x =>
          <button className={tab===x ? 'active' : ''} onClick={() => setTab(x)} key={x}>{x}</button>)}
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
          {['Sáng','Trưa','Tối','Ăn vặt','Tất cả'].map(x=><button className={meal===x?'selected':''} onClick={()=>setMeal(x)} key={x}>{x}</button>)}
        </div></div>
        <div className="field"><label>Số người</label><div className="counter">
          <button onClick={()=>setPeople(Math.max(1,people-1))}>−</button><b>{people}</b><button onClick={()=>setPeople(Math.min(12,people+1))}>+</button>
        </div></div>
        <div className="field"><label>Ngân sách</label><select value={budget} onChange={e=>setBudget(Number(e.target.value))}>
          {moneyOptions.map(x=><option key={x.max} value={x.max}>{x.label}</option>)}
        </select></div>
        <div className="field"><label>Kiểu gợi ý</label><div className="segmented">
          {['Món đơn','Mâm cơm'].map(x=><button className={mode===x?'selected':''} onClick={()=>setMode(x)} key={x}>{x}</button>)}
        </div></div>
        <button className="primary" onClick={mode==='Mâm cơm'?pickTray:pickDish}>🎲 Chọn cho tôi</button>
      </section>

      <section className="result-section">
        <div className="section-title"><div><span className="eyebrow">ĐỀ XUẤT HÔM NAY</span>
          <h2>{mode==='Mâm cơm'? `Mâm cơm cho ${people} người` : 'Món dành cho bạn'}</h2></div>
          <button className="ghost" onClick={mode==='Mâm cơm'?pickTray:pickDish}>↻ Đổi món</button></div>
        {tray.length>0 && <div className="budget-summary"><div><span>Tổng mâm dự kiến</span><strong>{fmt(trayTotal)}</strong></div>
          <div><span>Ngân sách bạn chọn</span><strong>{fmt(budget*people)}</strong></div>
          <div className={trayTotal<=budget*people?'ok':'warn'}><span>Chênh lệch</span><strong>{fmt(Math.abs(budget*people-trayTotal))}</strong></div></div>}
        {selected && <DishCard dish={selected} onLike={like} liked={likes.includes(selected.id)} people={people}/>}
        {tray.length>0 && <div className="grid">{tray.map(d=><DishCard key={d.id} dish={d} onLike={like} liked={likes.includes(d.id)} people={people} compact/>)}</div>}
      </section>
    </>}

    {tab === 'Món ăn' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">KHO MÓN</span><h2>1.000 món Việt</h2></div></div>
      <div className="catalog-tools">
        <input className="search" placeholder="Tìm phở, bún, gà, cá, đặc sản..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select value={meal} onChange={e=>setMeal(e.target.value)}>{['Tất cả','Sáng','Trưa','Tối','Ăn vặt'].map(x=><option key={x}>{x}</option>)}</select>
      </div>
      <div className="grid">{filtered.slice(0,150).map(d=><DishCard key={d.id} dish={d} onLike={like} liked={likes.includes(d.id)} people={people} compact/>)}</div>
      <p className="center muted">Đang hiển thị {Math.min(filtered.length,150)} / {filtered.length} món phù hợp.</p>
    </section>}

    {tab === '7 ngày' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">THỰC ĐƠN TUẦN</span><h2>Ăn gì trong 7 ngày?</h2></div>
        <button className="primary" onClick={generateWeek}>{weekPlan.length?'↻ Tạo lại':'✨ Tạo thực đơn'}</button></div>
      <p className="muted intro">Theo {people} người, ngân sách tối đa {fmt(budget)}/người/bữa. Hệ thống hạn chế lặp món trong tuần.</p>
      {weekPlan.length ? <>
        <div className="week-total"><span>Chi phí ước tính cả tuần</span><strong>{fmt(weekTotal)}</strong></div>
        <div className="week-grid">{weekPlan.map(d=><article className="day-card" key={d.day}>
          <h3>{d.day}</h3>
          <div><b>🌅 Sáng</b><span>{d.breakfast?.name || '—'}</span></div>
          <div><b>☀️ Trưa</b><span>{d.lunch.map(x=>x.name).join(' · ') || '—'}</span></div>
          <div><b>🌙 Tối</b><span>{d.dinner.map(x=>x.name).join(' · ') || '—'}</span></div>
        </article>)}</div>
      </> : <div className="empty">Bấm “Tạo thực đơn” để web lên thực đơn cả tuần cho bạn.</div>}
    </section>}

    {tab === 'Đi chợ' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">DANH SÁCH MUA</span><h2>Đi chợ cho cả tuần</h2></div>
        <button className="ghost" onClick={()=>setTab('7 ngày')}>← Xem thực đơn</button></div>
      {weekPlan.length ? <div className="shopping-card">
        <p className="muted">Gộp từ thực đơn 7 ngày cho {people} người. Định lượng là gợi ý, nên điều chỉnh theo sức ăn thực tế.</p>
        <div className="shopping-list">{shopping.map((x,i)=><label key={i}><input type="checkbox"/><span>{x.name}</span><em>xuất hiện {x.count} bữa</em></label>)}</div>
      </div> : <div className="empty">Hãy tạo “Thực đơn 7 ngày” trước, danh sách đi chợ sẽ tự xuất hiện ở đây.</div>}
    </section>}

    {tab === 'Yêu thích' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">ĐÃ LƯU</span><h2>Món yêu thích</h2></div></div>
      {likedDishes.length ? <div className="grid">{likedDishes.map(d=><DishCard key={d.id} dish={d} onLike={like} liked people={people}/>)}</div> : <div className="empty">Chưa có món yêu thích.</div>}
    </section>}

    {tab === 'Lịch sử' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">GẦN ĐÂY</span><h2>Lịch sử món đã chọn</h2></div>
        <button className="ghost" onClick={()=>setHistory([])}>Xóa lịch sử</button></div>
      <div className="history">{history.map(x=><div key={`${x.id}-${x.at}`}><b>{x.name}</b><span>{x.at}</span></div>)}</div>
    </section>}

    <footer>homnayangi · Database {dishes.length.toLocaleString('vi-VN')} món · Ảnh tự lấy từ Wikimedia khi có</footer>
  </div>
}

export default App
