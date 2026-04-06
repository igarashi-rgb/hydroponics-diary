import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'

const COLORS = {
  primary: '#5c8a5a',
  primaryLight: '#f0f7ee',
  primaryDark: '#3d6b3b',
  bg: '#fdf8f0',
  card: '#ffffff',
  border: '#e0d5c5',
  text: '#3a2e1e',
  textLight: '#8a7a6a',
  danger: '#c0392b',
}

export default function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [plants, setPlants] = useState([])
  const [entries, setEntries] = useState([])
  const [allEntries, setAllEntries] = useState([])
  const [newPlantName, setNewPlantName] = useState('')
  const [newPlantPhoto, setNewPlantPhoto] = useState(null)
  const [selectedPlant, setSelectedPlant] = useState(null)
  const [newMemo, setNewMemo] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [photo, setPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [view, setView] = useState('plants')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteEntryTarget, setDeleteEntryTarget] = useState(null)
  const [editPhotoTarget, setEditPhotoTarget] = useState(null)
  const [editPhoto, setEditPhoto] = useState(null)
  const [editUploading, setEditUploading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  useEffect(() => {
    if (session) { fetchPlants(); fetchAllEntries() }
  }, [session])

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchPlants() {
    const { data } = await supabase.from('plants').select('*').order('created_at', { ascending: true })
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
    setUploading(true)
    let photo_url = null
    if (newPlantPhoto) {
      const fileExt = newPlantPhoto.name.split('.').pop()
      const fileName = `plants/${session.user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, newPlantPhoto)
      if (!uploadError) {
        const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
        photo_url = data.publicUrl
      }
    }
    await supabase.from('plants').insert({ name: newPlantName, user_id: session.user.id, photo_url })
    setNewPlantName('')
    setNewPlantPhoto(null)
    setUploading(false)
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

  async function confirmDeleteEntry() {
    await supabase.from('diary_entries').delete().eq('id', deleteEntryTarget.id)
    setDeleteEntryTarget(null)
    if (selectedPlant) fetchEntries(selectedPlant.id)
    fetchAllEntries()
  }

  async function updatePlantPhoto() {
    if (!editPhoto) return
    setEditUploading(true)
    const fileExt = editPhoto.name.split('.').pop()
    const fileName = `plants/${session.user.id}/${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, editPhoto)
    if (!uploadError) {
      const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
      await supabase.from('plants').update({ photo_url: data.publicUrl }).eq('id', editPhotoTarget.id)
      setEditPhotoTarget(null)
      setEditPhoto(null)
      fetchPlants()
      if (selectedPlant?.id === editPhotoTarget.id) {
        setSelectedPlant({ ...selectedPlant, photo_url: data.publicUrl })
      }
    }
    setEditUploading(false)
  }

  async function deletePlantPhoto() {
    await supabase.from('plants').update({ photo_url: null }).eq('id', editPhotoTarget.id)
    setEditPhotoTarget(null)
    setEditPhoto(null)
    fetchPlants()
    if (selectedPlant?.id === editPhotoTarget.id) {
      setSelectedPlant({ ...selectedPlant, photo_url: null })
    }
  }

  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function getEntriesForDay(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return allEntries.filter(e => e.entry_date === dateStr)
  }

  const s = {
    page: { minHeight: '100vh', background: COLORS.bg, fontFamily: '"Hiragino Kaku Gothic Pro", "Noto Sans JP", sans-serif', color: COLORS.text },
    inner: { maxWidth: 600, margin: '0 auto', padding: '16px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid ${COLORS.border}` },
    h1: { margin: 0, fontSize: 22, color: COLORS.primaryDark },
    tabs: { display: 'flex', gap: 8, marginBottom: 20 },
    tab: (active) => ({ flex: 1, padding: '10px 0', background: active ? COLORS.primary : COLORS.card, color: active ? 'white' : COLORS.textLight, border: `1px solid ${active ? COLORS.primary : COLORS.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: active ? 'bold' : 'normal', fontSize: 14 }),
    card: { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginBottom: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
    input: { width: '100%', padding: '10px 12px', border: `1px solid ${COLORS.border}`, borderRadius: 8, boxSizing: 'border-box', fontSize: 15, background: COLORS.card, color: COLORS.text },
    btnPrimary: { padding: '10px 20px', background: COLORS.primary, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 },
    btnDanger: { padding: '6px 12px', background: COLORS.danger, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
    btnSecondary: { padding: '6px 12px', background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 },
    label: { display: 'block', marginBottom: 6, fontSize: 13, color: COLORS.textLight, fontWeight: 'bold' },
    plantImage: { width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 10 },
    plantImagePlaceholder: { width: '100%', height: 140, background: COLORS.primaryLight, borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 },
  }

  if (!session) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: 32, background: COLORS.card, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', color: COLORS.primaryDark, marginBottom: 24 }}>🌱 水耕栽培日記</h1>
        <input placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} style={{ ...s.input, marginBottom: 12 }} />
        <input placeholder="パスワード" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...s.input, marginBottom: 16 }} />
        <button onClick={signIn} style={{ ...s.btnPrimary, width: '100%', marginBottom: 10, padding: 12 }}>ログイン</button>
        <button onClick={signUp} style={{ width: '100%', padding: 12, background: COLORS.card, color: COLORS.textLight, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: 'pointer' }}>新規登録</button>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* 植物削除確認 */}
        {deleteTarget && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: COLORS.card, padding: 28, borderRadius: 12, maxWidth: 340, width: '90%' }}>
              <h3 style={{ marginTop: 0, color: COLORS.danger }}>⚠️ 本当に削除しますか？</h3>
              <p style={{ color: COLORS.textLight }}>「{deleteTarget.name}」を削除すると、すべての記録が消えてしまいます。この操作は取り消せません。</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteTarget(null)} style={{ ...s.btnSecondary, flex: 1, padding: 10 }}>キャンセル</button>
                <button onClick={confirmDeletePlant} style={{ ...s.btnDanger, flex: 1, padding: 10 }}>削除する</button>
              </div>
            </div>
          </div>
        )}

        {/* 日記削除確認 */}
        {deleteEntryTarget && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: COLORS.card, padding: 28, borderRadius: 12, maxWidth: 340, width: '90%' }}>
              <h3 style={{ marginTop: 0, color: COLORS.danger }}>⚠️ 本当に削除しますか？</h3>
              <p style={{ color: COLORS.textLight }}>「{deleteEntryTarget.entry_date}」の記録を削除します。この操作は取り消せません。</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteEntryTarget(null)} style={{ ...s.btnSecondary, flex: 1, padding: 10 }}>キャンセル</button>
                <button onClick={confirmDeleteEntry} style={{ ...s.btnDanger, flex: 1, padding: 10 }}>削除する</button>
              </div>
            </div>
          </div>
        )}

        {/* 植物画像編集ダイアログ */}
        {editPhotoTarget && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: COLORS.card, padding: 28, borderRadius: 12, maxWidth: 340, width: '90%' }}>
              <h3 style={{ marginTop: 0, color: COLORS.primaryDark }}>📷 画像を編集</h3>
              <p style={{ color: COLORS.textLight }}>「{editPhotoTarget.name}」の画像を変更または削除します。</p>
              {editPhotoTarget.photo_url && (
                <img src={editPhotoTarget.photo_url} alt={editPhotoTarget.name}
                  style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
              )}
              <input type="file" accept="image/*" onChange={e => setEditPhoto(e.target.files[0])} style={{ marginBottom: 12, width: '100%' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={updatePlantPhoto} disabled={!editPhoto || editUploading}
                  style={{ ...s.btnPrimary, opacity: !editPhoto || editUploading ? 0.5 : 1 }}>
                  {editUploading ? '更新中...' : '画像を更新する'}
                </button>
                {editPhotoTarget.photo_url && (
                  <button onClick={deletePlantPhoto} style={s.btnDanger}>画像を削除する</button>
                )}
                <button onClick={() => { setEditPhotoTarget(null); setEditPhoto(null) }} style={s.btnSecondary}>キャンセル</button>
              </div>
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <div style={s.header}>
          <h1 style={s.h1}>🌱 水耕栽培日記</h1>
          <button onClick={signOut} style={s.btnSecondary}>ログアウト</button>
        </div>

        {/* タブ */}
        <div style={s.tabs}>
          <button style={s.tab(view === 'plants' || view === 'diary')} onClick={() => setView('plants')}>🌿 植物一覧</button>
          <button style={s.tab(view === 'calendar')} onClick={() => setView('calendar')}>🗓 カレンダー</button>
        </div>

        {/* 植物一覧 */}
        {view === 'plants' && (
          <div>
            <div style={{ ...s.card, background: COLORS.primaryLight }}>
              <label style={s.label}>植物名</label>
              <input placeholder="例：ネギ、ミニトマト" value={newPlantName} onChange={e => setNewPlantName(e.target.value)} style={{ ...s.input, marginBottom: 10 }} />
              <label style={s.label}>植物の写真（任意）</label>
              <input type="file" accept="image/*" onChange={e => setNewPlantPhoto(e.target.files[0])} style={{ marginBottom: 12, width: '100%' }} />
              <button onClick={addPlant} disabled={uploading} style={{ ...s.btnPrimary, width: '100%' }}>
                {uploading ? '追加中...' : '＋ 植物を追加'}
              </button>
            </div>

            {/* 2列グリッド */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} ref={menuRef}>
              {plants.map(plant => (
                <div key={plant.id} style={{ ...s.card, marginBottom: 0, padding: 12, position: 'relative' }}>
                  {/* ⋯ メニューボタン */}
                  <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === plant.id ? null : plant.id)}
                      style={{ padding: '2px 8px', background: 'rgba(0,0,0,0.45)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
                      ···
                    </button>
                    {openMenuId === plant.id && (
                      <div style={{ position: 'absolute', right: 0, top: 30, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 140, zIndex: 100 }}>
                        <button onClick={() => { setEditPhotoTarget(plant); setOpenMenuId(null) }}
                          style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 14, color: COLORS.text }}>
                          📷 画像を編集
                        </button>
                        <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
                        <button onClick={() => { setDeleteTarget(plant); setOpenMenuId(null) }}
                          style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 14, color: COLORS.danger }}>
                          🗑 削除する
                        </button>
                      </div>
                    )}
                  </div>

                  {plant.photo_url
                    ? <img src={plant.photo_url} alt={plant.name} style={s.plantImage} />
                    : <div style={s.plantImagePlaceholder}>🌿</div>
                  }
                  <p style={{ margin: '0 0 10px', fontWeight: 'bold', color: COLORS.primaryDark, fontSize: 15 }}>{plant.name}</p>
                  <button onClick={() => { setSelectedPlant(plant); fetchEntries(plant.id); setView('diary') }}
                    style={{ ...s.btnPrimary, padding: '8px 0', width: '100%', fontSize: 13 }}>日記を見る</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 日記 */}
        {view === 'diary' && selectedPlant && (
          <div>
            <button onClick={() => setView('plants')} style={{ ...s.btnSecondary, marginBottom: 16 }}>← 戻る</button>
            <div style={{ position: 'relative' }}>
              {selectedPlant.photo_url
                ? <img src={selectedPlant.photo_url} alt={selectedPlant.name} style={{ ...s.plantImage, height: 200 }} />
                : <div style={{ ...s.plantImagePlaceholder, height: 120 }}>🌿</div>
              }
              <button onClick={() => setEditPhotoTarget(selectedPlant)}
                style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
                ✏️ 画像を編集
              </button>
            </div>
            <h2 style={{ color: COLORS.primaryDark, marginTop: 0 }}>{selectedPlant.name} の日記</h2>

            <div style={{ ...s.card, background: COLORS.primaryLight }}>
              <label style={s.label}>日付</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ ...s.input, marginBottom: 10 }} />
              <label style={s.label}>メモ</label>
              <textarea placeholder="今日の様子を記録..." value={newMemo} onChange={e => setNewMemo(e.target.value)}
                style={{ ...s.input, height: 80, resize: 'vertical', marginBottom: 10 }} />
              <label style={s.label}>写真</label>
              <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} style={{ marginBottom: 12, width: '100%' }} />
              <button onClick={addEntry} disabled={uploading} style={{ ...s.btnPrimary, width: '100%' }}>
                {uploading ? '保存中...' : '記録する'}
              </button>
            </div>

            {entries.map(entry => (
              <div key={entry.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: COLORS.textLight, fontSize: 13 }}>{entry.entry_date}</span>
                  <button onClick={() => setDeleteEntryTarget(entry)} style={s.btnDanger}>削除</button>
                </div>
                <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>{entry.memo}</p>
                {entry.photo_url && <img src={entry.photo_url} alt="記録写真" style={{ width: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'cover' }} />}
              </div>
            ))}
          </div>
        )}

        {/* カレンダー */}
        {view === 'calendar' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <button onClick={() => { setCalendarDate(new Date(year, month - 1, 1)); setSelectedCalendarDay(null) }} style={s.btnSecondary}>←</button>
              <strong style={{ fontSize: 16 }}>{year}年{month + 1}月</strong>
              <button onClick={() => { setCalendarDate(new Date(year, month + 1, 1)); setSelectedCalendarDay(null) }} style={s.btnSecondary}>→</button>
            </div>
            <div style={{ ...s.card, padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {['日','月','火','水','木','金','土'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px 0', fontSize: 12, color: COLORS.textLight }}>{d}</div>
                ))}
                {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const day = i + 1
                  const dayEntries = getEntriesForDay(day)
                  const hasEntries = dayEntries.length > 0
                  const isSelected = selectedCalendarDay === day
                  return (
                    <div key={day} onClick={() => hasEntries && setSelectedCalendarDay(isSelected ? null : day)}
                      style={{ textAlign: 'center', padding: '6px 2px', border: isSelected ? `2px solid ${COLORS.primary}` : '1px solid #eee', cursor: hasEntries ? 'pointer' : 'default', background: isSelected ? COLORS.primaryLight : hasEntries ? '#f5fff4' : 'white', borderRadius: 6, minHeight: 44 }}>
                      <div style={{ fontSize: 13 }}>{day}</div>
                      {hasEntries && <div style={{ fontSize: 14 }}>🌱</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedCalendarDay && (
              <div>
                <h3 style={{ color: COLORS.primaryDark }}>{year}年{month + 1}月{selectedCalendarDay}日の記録</h3>
                {getEntriesForDay(selectedCalendarDay).map(entry => (
                  <div key={entry.id} style={s.card}>
                    <div style={{ fontWeight: 'bold', color: COLORS.primary, marginBottom: 6 }}>🌿 {entry.plants?.name}</div>
                    <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>{entry.memo}</p>
                    {entry.photo_url && <img src={entry.photo_url} alt="記録写真" style={{ width: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'cover' }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}