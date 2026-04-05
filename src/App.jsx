import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plants, setPlants] = useState([])
  const [entries, setEntries] = useState([])
  const [allEntries, setAllEntries] = useState([])
  const [newPlantName, setNewPlantName] = useState('')
  const [selectedPlant, setSelectedPlant] = useState(null)
  const [newMemo, setNewMemo] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [photo, setPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [view, setView] = useState('plants')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  useEffect(() => {
    if (session) { fetchPlants(); fetchAllEntries() }
  }, [session])

  async function fetchPlants() {
    const { data } = await supabase.from('plants').select('*').order('created_at', { ascending: false })
    setPlants(data || [])
  }

  async function fetchAllEntries() {
    const { data } = await supabase.from('diary_entries').select('*, plants(name)').order('entry_date', { ascending: false })
    setAllEntries(data || [])
  }

  async function fetchEntries(plantId) {
    const { data } = await supabase.from('diary_entries').select('*').eq('plant_id', plantId).order('entry_date', { ascending: false })
    setEntries(data || [])
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert('確認メールを送りました。メールを確認してください。')
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert('メールアドレスまたはパスワードが違います')
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function addPlant() {
    if (!newPlantName) return
    await supabase.from('plants').insert({ name: newPlantName, user_id: session.user.id })
    setNewPlantName('')
    fetchPlants()
  }

  async function addEntry() {
    if (!newMemo || !selectedPlant) return
    setUploading(true)
    let photo_url = null
    if (photo) {
      const fileExt = photo.name.split('.').pop()
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, photo)
      if (!uploadError) {
        const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
        photo_url = data.publicUrl
      }
    }
    await supabase.from('diary_entries').insert({
      plant_id: selectedPlant.id,
      user_id: session.user.id,
      entry_date: newDate,
      memo: newMemo,
      photo_url
    })
    setNewMemo('')
    setPhoto(null)
    setNewDate(new Date().toISOString().split('T')[0])
    setUploading(false)
    fetchEntries(selectedPlant.id)
    fetchAllEntries()
  }

  async function confirmDeletePlant() {
    await supabase.from('plants').delete().eq('id', deleteTarget.id)
    setDeleteTarget(null)
    fetchPlants()
    fetchAllEntries()
    setSelectedPlant(null)
    setView('plants')
  }

  async function deleteEntry(id) {
    await supabase.from('diary_entries').delete().eq('id', id)
    fetchEntries(selectedPlant.id)
    fetchAllEntries()
  }

  // カレンダー関連
  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function getEntriesForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return allEntries.filter(e => e.entry_date === dateStr)
  }

  function prevMonth() {
    setCalendarDate(new Date(year, month - 1, 1))
    setSelectedCalendarDay(null)
  }

  function nextMonth() {
    setCalendarDate(new Date(year, month + 1, 1))
    setSelectedCalendarDay(null)
  }

  if (!session) return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>🌱 水耕栽培日記</h1>
      <input placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }} />
      <input placeholder="パスワード" type="password" value={password} onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 10, boxSizing: 'border-box' }} />
      <button onClick={signIn} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>ログイン</button>
      <button onClick={signUp} style={{ width: '100%', padding: 10, background: '#888', color: 'white', border: 'none', cursor: 'pointer' }}>新規登録</button>
    </div>
  )

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 8, maxWidth: 350, width: '90%' }}>
            <h3 style={{ marginTop: 0 }}>⚠️ 本当に削除しますか？</h3>
            <p>「{deleteTarget.name}」を削除すると、すべての記録が消えてしまいます。この操作は取り消せません。</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: 10, cursor: 'pointer', border: '1px solid #ddd' }}>キャンセル</button>
              <button onClick={confirmDeletePlant}
                style={{ flex: 1, padding: 10, background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🌱 水耕栽培日記</h1>
        <button onClick={signOut} style={{ padding: '5px 10px', cursor: 'pointer' }}>ログアウト</button>
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
        {['plants', 'calendar'].map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ flex: 1, padding: 10, background: view === v ? '#4CAF50' : '#eee', color: view === v ? 'white' : 'black', border: 'none', cursor: 'pointer', borderRadius: 4 }}>
            {v === 'plants' ? '🌿 植物一覧' : '📅 カレンダー'}
          </button>
        ))}
      </div>

      {/* 植物一覧 */}
      {view === 'plants' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input placeholder="植物名を入力" value={newPlantName} onChange={e => setNewPlantName(e.target.value)}
              style={{ flex: 1, padding: 10 }} />
            <button onClick={addPlant} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>追加</button>
          </div>
          {plants.map(plant => (
            <div key={plant.id} style={{ padding: 15, border: '1px solid #ddd', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18 }}>{plant.name}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setSelectedPlant(plant); fetchEntries(plant.id); setView('diary') }}
                  style={{ padding: '5px 15px', background: '#2196F3', color: 'white', border: 'none', cursor: 'pointer' }}>日記を見る</button>
                <button onClick={() => setDeleteTarget(plant)}
                  style={{ padding: '5px 15px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 日記 */}
      {view === 'diary' && selectedPlant && (
        <div>
          <button onClick={() => setView('plants')} style={{ marginBottom: 15, cursor: 'pointer' }}>← 戻る</button>
          <h2>{selectedPlant.name} の日記</h2>
          <div style={{ marginBottom: 20, padding: 15, border: '1px solid #ddd' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>📅 日付</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                style={{ width: '100%', padding: 10, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>📝 メモ</label>
              <textarea placeholder="今日の様子を記録..." value={newMemo} onChange={e => setNewMemo(e.target.value)}
                style={{ width: '100%', padding: 10, height: 80, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', marginBottom: 5 }}>📷 写真</label>
              <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} style={{ width: '100%' }} />
            </div>
            <button onClick={addEntry} disabled={uploading}
              style={{ width: '100%', padding: 10, background: uploading ? '#aaa' : '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}>
              {uploading ? '保存中...' : '記録する'}
            </button>
          </div>
          {entries.map(entry => (
            <div key={entry.id} style={{ padding: 15, border: '1px solid #ddd', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#888' }}>📅 {entry.entry_date}</span>
                <button onClick={() => deleteEntry(entry.id)}
                  style={{ padding: '2px 10px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12 }}>削除</button>
              </div>
              <div style={{ marginBottom: 8 }}>{entry.memo}</div>
              {entry.photo_url && <img src={entry.photo_url} alt="記録写真" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 4 }} />}
            </div>
          ))}
        </div>
      )}

      {/* カレンダー */}
      {view === 'calendar' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <button onClick={prevMonth} style={{ padding: '5px 15px', cursor: 'pointer' }}>←</button>
            <strong>{year}年{month + 1}月</strong>
            <button onClick={nextMonth} style={{ padding: '5px 15px', cursor: 'pointer' }}>→</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 15 }}>
            {['日','月','火','水','木','金','土'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', padding: 5, fontSize: 12 }}>{d}</div>
            ))}
            {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1
              const dayEntries = getEntriesForDay(day)
              const hasEntries = dayEntries.length > 0
              const isSelected = selectedCalendarDay === day
              return (
                <div key={day} onClick={() => setSelectedCalendarDay(isSelected ? null : day)}
                  style={{ textAlign: 'center', padding: 8, border: isSelected ? '2px solid #4CAF50' : '1px solid #eee', cursor: hasEntries ? 'pointer' : 'default', background: hasEntries ? '#f0fff0' : 'white', borderRadius: 4, minHeight: 40 }}>
                  <div style={{ fontSize: 13 }}>{day}</div>
                  {hasEntries && <div style={{ fontSize: 10, color: '#4CAF50' }}>●</div>}
                </div>
              )
            })}
          </div>

          {selectedCalendarDay && (
            <div>
              <h3>{year}年{month + 1}月{selectedCalendarDay}日の記録</h3>
              {getEntriesForDay(selectedCalendarDay).length === 0 ? (
                <p style={{ color: '#888' }}>この日の記録はありません</p>
              ) : (
                getEntriesForDay(selectedCalendarDay).map(entry => (
                  <div key={entry.id} style={{ padding: 15, border: '1px solid #ddd', marginBottom: 10 }}>
                    <div style={{ fontWeight: 'bold', color: '#4CAF50', marginBottom: 5 }}>🌿 {entry.plants?.name}</div>
                    <div style={{ marginBottom: 8 }}>{entry.memo}</div>
                    {entry.photo_url && <img src={entry.photo_url} alt="記録写真" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 4 }} />}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}