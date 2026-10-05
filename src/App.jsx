import React, { useEffect, useMemo, useState } from 'react'
import dishes from './data/dishes.json'

const fallbackImage =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff7ed"/><stop offset="1" stop-color="#fed7aa"/>
    </linearGradient></defs>
    <rect width="800" height="520" fill="url(#g)"/>
    <circle cx="400" cy="270" r="135" fill="#fff" stroke="#fb923c" stroke-width="18"/>
    <circle cx="400" cy="270" r="70" fill="#fdba74"/>
    <path d="M220 90v160M190 90v70M250 90v70M580 90v160" stroke="#9a3412" stroke-width="22" stroke-linecap="round"/>
    <text x="400" y="455" text-anchor="middle" font-size="42" font-family="Arial" fill="#9a3412">Hôm Nay Ăn Gì?</text>
  </svg>`)

const moneyOptions = [
  { label: '≤ 50k/người', max: 50000 },
  { label: '≤ 80k/người', max: 80000 },
  { label: '≤ 120k/người', max: 120000 },
  { label: 'Không giới hạn', max: 999999 }
]

function parseMaxCost(text='') {
  const nums = [...text.matchAll(/([\\d.]+)\\s*đ/g)].map(m => Number(m[1].replaceAll('.', '')))
  return nums.length ? Math.max(...nums) : 999999
}

function randomOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function mealMatches(dish, meal) {
  if (meal === 'Tất cả') return true
  const m = dish.meal || ''
  if (meal === 'Sáng') return m.includes('Sáng')
  if (meal === 'Trưa') return m.includes('Trưa')
  if (meal === 'Tối') return m.includes('Tối')
  if (meal === 'Ăn vặt') return m.includes('Ăn vặt') || dish.category.includes('Ăn vặt')
  return true
}

function DishCard({ dish, onLike, liked, compact=false }) {
  if (!dish) return null
  return <article className={`dish-card ${compact ? 'compact' : ''}`}>
    <img
      src={dish.image || fallbackImage}
      alt={dish.name}
      onError={e => { e.currentTarget.src = fallbackImage }}
    />
    <div className="dish-body">
      <div className="dish-top">
        <span className="pill">{dish.category}</span>
        <button className={`heart ${liked ? 'active' : ''}`} onClick={() => onLike(dish)}>♥</button>
      </div>
      <h3>{dish.name}</h3>
      <p className="muted">{dish.meal} · {dish.costText}</p>
      <details>
        <summary>Xem nguyên liệu & cách nấu</summary>
        <p><b>Nguyên liệu chính:</b> {dish.mainIngredient}</p>
        <p><b>Cách làm:</b> {dish.method}</p>
      </details>
    </div>
  </article>
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

  useEffect(() => localStorage.setItem('homnayangi_likes', JSON.stringify(likes)), [likes])
  useEffect(() => localStorage.setItem('homnayangi_history', JSON.stringify(history.slice(0, 50))), [history])

  const filtered = useMemo(() => dishes.filter(d => {
    const q = search.toLowerCase().trim()
    return mealMatches(d, meal)
      && parseMaxCost(d.costText) <= budget
      && (!q || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q))
  }), [meal, budget, search])

  const like = dish => setLikes(prev =>
    prev.includes(dish.id) ? prev.filter(x => x !== dish.id) : [...prev, dish.id]
  )

  const remember = dish => {
    setHistory(prev => [{ id: dish.id, name: dish.name, at: new Date().toLocaleString('vi-VN') }, ...prev.filter(x => x.id !== dish.id)])
  }

  const pickDish = () => {
    const recentIds = new Set(history.slice(0, 7).map(x => x.id))
    const pool = filtered.filter(x => !recentIds.has(x.id))
    const dish = randomOne(pool.length ? pool : filtered)
    setSelected(dish)
    setTray([])
    if (dish) remember(dish)
  }

  const pickTray = () => {
    const lunchDinner = dishes.filter(d => mealMatches(d, meal) && parseMaxCost(d.costText) <= budget)
    const main = lunchDinner.filter(d => ['Món mặn','Món kho/rim','Món xào','Món chiên/rán','Món nướng','Món hấp/luộc'].includes(d.category))
    const soup = lunchDinner.filter(d => d.category === 'Canh')
    const veg = lunchDinner.filter(d => d.category === 'Rau/Củ')
    const picks = [randomOne(main), randomOne(soup), randomOne(veg)].filter(Boolean)
    const unique = [...new Map(picks.map(x => [x.id, x])).values()]
    setTray(unique)
    setSelected(null)
    unique.forEach(remember)
  }

  useEffect(() => {
    if (!selected && tray.length === 0) pickDish()
    // eslint-disable-next-line
  }, [])

  const likedDishes = dishes.filter(d => likes.includes(d.id))

  return <div className="app">
    <header className="site-header">
      <div className="brand" onClick={() => setTab('Hôm nay')}>
        <span className="logo">🍜</span>
        <div><b>homnayangi</b><small>Đỡ phải nghĩ, ăn ngon mỗi ngày</small></div>
      </div>
      <nav>
        {['Hôm nay','Món ăn','Yêu thích','Lịch sử'].map(x =>
          <button className={tab===x ? 'active' : ''} onClick={() => setTab(x)} key={x}>{x}</button>
        )}
      </nav>
    </header>

    {tab === 'Hôm nay' && <>
      <section className="hero">
        <div>
          <span className="eyebrow">GỢI Ý THÔNG MINH</span>
          <h1>Hôm nay <em>ăn gì?</em></h1>
          <p>Chọn bữa, số người và ngân sách. Web sẽ chọn món giúp bạn.</p>
        </div>
        <div className="hero-badge"><strong>1.000+</strong><span>món Việt</span></div>
      </section>

      <section className="control-card">
        <div className="field"><label>Bữa ăn</label><div className="segmented">
          {['Sáng','Trưa','Tối','Ăn vặt','Tất cả'].map(x =>
            <button className={meal===x?'selected':''} onClick={() => setMeal(x)} key={x}>{x}</button>)}
        </div></div>

        <div className="field"><label>Số người</label>
          <div className="counter"><button onClick={()=>setPeople(Math.max(1,people-1))}>−</button><b>{people}</b><button onClick={()=>setPeople(Math.min(12,people+1))}>+</button></div>
        </div>

        <div className="field"><label>Ngân sách</label>
          <select value={budget} onChange={e=>setBudget(Number(e.target.value))}>
            {moneyOptions.map(x => <option key={x.max} value={x.max}>{x.label}</option>)}
          </select>
        </div>

        <div className="field"><label>Kiểu gợi ý</label><div className="segmented">
          {['Món đơn','Mâm cơm'].map(x =>
            <button className={mode===x?'selected':''} onClick={()=>setMode(x)} key={x}>{x}</button>)}
        </div></div>

        <button className="primary" onClick={mode==='Mâm cơm' ? pickTray : pickDish}>
          🎲 Chọn cho tôi
        </button>
      </section>

      <section className="result-section">
        <div className="section-title">
          <div><span className="eyebrow">ĐỀ XUẤT HÔM NAY</span><h2>{mode === 'Mâm cơm' ? `Mâm cơm cho ${people} người` : 'Món dành cho bạn'}</h2></div>
          <button className="ghost" onClick={mode==='Mâm cơm' ? pickTray : pickDish}>↻ Đổi món</button>
        </div>
        {selected && <DishCard dish={selected} onLike={like} liked={likes.includes(selected.id)} />}
        {tray.length > 0 && <div className="grid">
          {tray.map(d => <DishCard key={d.id} dish={d} onLike={like} liked={likes.includes(d.id)} compact />)}
        </div>}
      </section>
    </>}

    {tab === 'Món ăn' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">KHO MÓN</span><h2>1.000 món Việt</h2></div></div>
      <input className="search" placeholder="Tìm phở, bún, gà, cá..." value={search} onChange={e=>setSearch(e.target.value)} />
      <div className="grid">{filtered.slice(0, 120).map(d => <DishCard key={d.id} dish={d} onLike={like} liked={likes.includes(d.id)} compact />)}</div>
      <p className="center muted">Đang hiển thị {Math.min(filtered.length,120)} / {filtered.length} món phù hợp.</p>
    </section>}

    {tab === 'Yêu thích' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">ĐÃ LƯU</span><h2>Món yêu thích</h2></div></div>
      {likedDishes.length ? <div className="grid">{likedDishes.map(d => <DishCard key={d.id} dish={d} onLike={like} liked />)}</div> : <div className="empty">Chưa có món yêu thích.</div>}
    </section>}

    {tab === 'Lịch sử' && <section className="page">
      <div className="section-title"><div><span className="eyebrow">GẦN ĐÂY</span><h2>Lịch sử món đã chọn</h2></div><button className="ghost" onClick={()=>setHistory([])}>Xóa lịch sử</button></div>
      <div className="history">{history.map(x => <div key={`${x.id}-${x.at}`}><b>{x.name}</b><span>{x.at}</span></div>)}</div>
    </section>}

    <footer>homnayangi · MVP V1 · Database {dishes.length.toLocaleString('vi-VN')} món</footer>
  </div>
}

export default App
