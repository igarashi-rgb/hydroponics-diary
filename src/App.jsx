import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plants, setPlants] = useState([])
  const [entries, setEntries] = useState([])
  const [newPlantName, setNewPlantName] = useState('')
  const [selectedPlant, setSelectedPlant] = useState(null)
  const [newMemo, setNewMemo] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [photo, setPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [view, setView] = useState('plants')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  useEffect(() => {
    if (session) fetchPlants()
  }, [session])

  async function fetchPlants() {
    const { data } = await supabase.from('plants').select('*').order('created_at', { ascending: false })
    setPlants(data || [])
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
  }

  async function deletePlant(id) {
    await supabase.from('plants').delete().eq('id', id)
    fetchPlants()
    setSelectedPlant(null)
    setView('plants')
  }

  async function deleteEntry(id) {
    await supabase.from('diary_entries').delete().eq('id', id)
    fetchEntries(selectedPlant.id)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🌱 水耕栽培日記</h1>
        <button onClick={signOut} style={{ padding: '5px 10px', cursor: 'pointer' }}>ログアウト</button>
      </div>

      {view === 'plants' && (
        <div>
          <h2>植物一覧</h2>
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
                <button onClick={() => deletePlant(plant.id)}
                  style={{ padding: '5px 15px', background: '#f44336', color: 'white', border: 'none', cursor: 'pointer' }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      )}

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
              <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])}
                style={{ width: '100%' }} />
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
              {entry.photo_url && (
                <img src={entry.photo_url} alt="記録写真"
                  style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 4 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}