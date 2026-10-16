import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { categories, normalizeCategory } from '../components/menuCategories'
import DishPrice from '../components/DishPrice'
import DishPhoto from '../components/DishPhoto'
import { isBestseller } from '../components/bestsellerSelection'
import './MenuManagement.css'

export default function MenuManagement({ onCreated }) {
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formVersion, setFormVersion] = useState(0)
  const [selected, setSelected] = useState('all')
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [onSale, setOnSale] = useState(false)
  const form = useRef(null)

  function showForm(dish = null) {
    setEditing(dish)
    setFormVersion((current) => current + 1)
    setOpen(true)
    setOnSale(dish?.salePrice != null)
    setPhoto(null); setPreview(''); setErrors({}); setMessage(''); setFailure('')
    requestAnimationFrame(() => document.getElementById('dish-form-heading')?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }

  function cancel() {
    setOpen(false); setEditing(null); setPhoto(null); setPreview(''); setOnSale(false); setErrors({}); setFailure('')
  }

  async function deleteDish(dish) {
    if (saving.current) return
    saving.current = true
    setBusy(true); setDeleteError(''); setMessage('')
    try {
      const csrf = await api('/api/auth/csrf')
      await api(`/api/admin/dishes/${dish.id}`, { method: 'DELETE', headers: { [csrf.headerName]: csrf.token } })
      setDishes((current) => current.filter((item) => item.id !== dish.id))
      if (editing?.id === dish.id) cancel()
      setPendingDelete(null)
      setMessage(`${dish.name} was deleted.`)
      onCreated()
    } catch (error) { setDeleteError(error.message) }
    finally { saving.current = false; setBusy(false) }
  }

  useEffect(() => {
    let active = true
    api('/api/admin/dishes').then(
      (data) => { if (active) { setDishes(data); setLoadError(''); setLoading(false) } },
      (error) => { if (active) { setLoadError(error.message); setLoading(false) } },
    )
    return () => { active = false }
  }, [attempt])

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  function choosePhoto(event) {
    const file = event.target.files[0]
    setPhoto(null)
    setPreview('')
    const error = file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      ? 'Choose a JPEG, PNG or WebP photo.' : file.size > 5 * 1024 * 1024 ? 'Photo must be at most 5 MB.' : '')
    setErrors((current) => ({ ...current, photo: error || '' }))
    if (file && !error) {
      setPhoto(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  async function save(event) {
    event.preventDefault()
    if (saving.current) return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const nextErrors = {}
    if (!photo && !editing) nextErrors.photo = 'Choose a JPEG, PNG or WebP photo up to 5 MB.'
    if (errors.photo) nextErrors.photo = errors.photo
    if (!/^\d+(\.\d{1,2})?$/.test(values.price) || Number(values.price) <= 0 || Number(values.price) > 99999999.99)
      nextErrors.price = 'Enter a price greater than zero, with at most 2 decimal places (maximum €99,999,999.99).'
    if (onSale && (!/^\d+(\.\d{1,2})?$/.test(values.salePrice) || Number(values.salePrice) <= 0 || Number(values.salePrice) >= Number(values.price)))
      nextErrors.salePrice = 'Enter a sale price greater than zero and lower than the regular price, with at most 2 decimal places.'
    setErrors(nextErrors)
    setMessage('')
    setFailure('')
    if (Object.keys(nextErrors).length) return
    saving.current = true
    setBusy(true)
    try {
      const dish = { ...values, salePrice: onSale ? values.salePrice : null, bestseller: values.bestseller === 'on', available: values.available === 'on', vegetarian: values.vegetarian === 'on', vegan: values.vegan === 'on' }
      delete dish.onSale
      delete dish.photo
      const body = new FormData()
      body.append('dish', new Blob([JSON.stringify(dish)], { type: 'application/json' }))
      if (photo) body.append('photo', photo)
      // Keep the browser-generated multipart boundary and use the existing session CSRF token.
      const csrf = await api('/api/auth/csrf')
      const saved = await api(editing ? `/api/admin/dishes/${editing.id}` : '/api/admin/dishes', { method: editing ? 'PUT' : 'POST', headers: { [csrf.headerName]: csrf.token }, body })
      setDishes((current) => editing ? current.map((dish) => dish.id === saved.id ? saved : dish) : [...current, saved])
      // Reveal the saved dish even when its new name or category no longer matches the filters.
      setSelected('all'); setSearch('')
      onCreated()
      form.current.reset()
      setPhoto(null)
      setPreview('')
      setOnSale(false)
      setOpen(false)
      setEditing(null)
      setMessage(`${saved.name} was ${editing ? 'updated' : 'added to the menu'}.`)
    } catch (error) {
      setErrors(error.fields || {})
      setFailure(error.message)
    } finally { saving.current = false; setBusy(false) }
  }

  const fieldProps = (name) => ({ 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `dish-${name}-error` : undefined })
  const fieldError = (name) => errors[name] && <span className="auth-field-error" id={`dish-${name}-error`}>{errors[name]}</span>
  const groups = categories.filter((category) => category.id !== 'all')
  const visibleDishes = dishes.filter((dish) => dish.name.toLowerCase().includes(search.trim().toLowerCase())
    && (selected === 'all' || (selected === 'other' ? !groups.some((category) => normalizeCategory(dish.category) === category.id) : normalizeCategory(dish.category) === selected)))
  const otherDishes = visibleDishes.filter((dish) => !groups.some((category) => normalizeCategory(dish.category) === category.id))
  const currentCategory = groups.find((category) => category.id === normalizeCategory(editing?.category))?.name || editing?.category || ''

  return (
    <div className="menu-management">
      <div className="management-heading">
        <h2>Menu Management</h2>
        <button className="auth-submit" type="button" disabled={busy} onClick={() => showForm()}>Add Dish</button>
      </div>
      {message && <p className="auth-success" role="status">{message}</p>}
      {deleteError && <p className="auth-error" role="alert">{deleteError}</p>}
      {open && <form key={formVersion} className="dish-form" ref={form} onSubmit={save} aria-labelledby="dish-form-heading">
        <h3 id="dish-form-heading">{editing ? `Edit Dish: ${editing.name}` : 'Add Dish'}</h3>
        <p>All fields are required unless marked optional.{editing ? ' Leave the replacement photo empty to keep the current photo.' : ''}</p>
        {failure && <p className="auth-error" role="alert">{failure}</p>}
        <fieldset disabled={busy}>
          <div className="dish-form-grid">
            <label>Name<input name="name" required maxLength={255} defaultValue={editing?.name || ''} {...fieldProps('name')} />{fieldError('name')}</label>
            <label>Category<select name="category" required defaultValue={currentCategory} {...fieldProps('category')}>
              <option value="" disabled>Choose a category</option>
              {currentCategory && !groups.some((category) => category.name === currentCategory) && <option value={currentCategory} disabled>{currentCategory} (choose an existing category)</option>}
              {groups.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
            </select>{fieldError('category')}</label>
            <label>Regular price in euros<input name="price" type="number" inputMode="decimal" required min="0.01" max="99999999.99" step="0.01" placeholder="9.50" defaultValue={editing?.price ?? ''} {...fieldProps('price')} />{fieldError('price')}</label>
            <label className="dish-check"><input type="checkbox" name="available" role="switch" defaultChecked={editing ? editing.available : true} />Available (switch off for sold out)</label>
          </div>
          <div className="dish-form-options">
            <label className="dish-check"><input name="onSale" type="checkbox" checked={onSale} onChange={(event) => setOnSale(event.target.checked)} />Put this dish on sale (optional)</label>
            <label className="dish-check"><input name="bestseller" type="checkbox" defaultChecked={editing ? isBestseller(editing) : false} />Show in Bestsellers (optional)</label>
          </div>
          {onSale && <label>Sale price in euros<input name="salePrice" type="number" inputMode="decimal" required min="0.01" max="99999999.99" step="0.01" placeholder="7.50" defaultValue={editing?.salePrice ?? ''} {...fieldProps('salePrice')} />{fieldError('salePrice')}<span className="auth-hint">Must be lower than the regular price.</span></label>}
          <label>Description<textarea name="description" required maxLength={1000} rows={3} defaultValue={editing?.description || ''} {...fieldProps('description')} />{fieldError('description')}</label>
          {editing && <div className="dish-current-photo"><p>Current photo</p><DishPhoto dish={editing} /></div>}
          <label>{editing ? 'Replacement photo (optional)' : 'Photo'}<input name="photo" type="file" required={!editing} accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} {...fieldProps('photo')} />{fieldError('photo')}</label>
          <p className="auth-hint">JPEG, PNG or WebP, up to 5 MB. Maximum 6000 pixels per side and 16 megapixels.</p>
          {preview && <img className="dish-preview" src={preview} alt="Selected dish preview" />}
          <div className="dish-form-grid">
            <label>Ingredients (optional)<textarea name="ingredients" rows={3} maxLength={2000} defaultValue={editing?.ingredients || ''} {...fieldProps('ingredients')} />{fieldError('ingredients')}</label>
            <label>Allergens (optional)<textarea name="allergens" rows={3} maxLength={1000} defaultValue={editing?.allergens || ''} {...fieldProps('allergens')} />{fieldError('allergens')}</label>
          </div>
          <div className="dish-form-options">
            <label className="dish-check"><input name="vegetarian" type="checkbox" defaultChecked={!!editing?.vegetarian} />Vegetarian (optional)</label>
            <label className="dish-check"><input name="vegan" type="checkbox" defaultChecked={!!editing?.vegan} />Vegan (optional)</label>
          </div>
          <div className="dish-form-options">
            <button className="auth-submit" type="submit">{busy ? 'Saving…' : editing ? 'Save Changes' : 'Save Dish'}</button>
            <button className="menu-retry" type="button" onClick={cancel}>Cancel</button>
          </div>
        </fieldset>
      </form>}
      <div className="management-filters">
        <label>Filter by category<select value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="all">All</option>
          {groups.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          {dishes.some((dish) => !groups.some((category) => normalizeCategory(dish.category) === category.id)) && <option value="other">Other categories</option>}
        </select></label>
        <label>Search dishes by name<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dish names…" /></label>
      </div>
      {loading && <p role="status">Loading dishes…</p>}
      {loadError && <p role="alert">{loadError} <button type="button" onClick={() => { setLoading(true); setAttempt((current) => current + 1) }}>Retry</button></p>}
      {!loading && !loadError && visibleDishes.length === 0 && <p role="status">No dishes match your search or category.</p>}
      {!loading && !loadError && [...groups, ...(otherDishes.length ? [{ id: 'other', name: 'Other categories' }] : [])].filter((category) => selected === 'all' || selected === category.id).map((category) => {
        const items = category.id === 'other' ? otherDishes : visibleDishes.filter((dish) => normalizeCategory(dish.category) === category.id)
        if (!items.length && (search || selected !== 'all')) return null
        return <section className="management-category" key={category.id} aria-labelledby={`management-${category.id}`}>
          <h3 id={`management-${category.id}`}>{category.name}</h3>
          {items.length === 0 ? <p>No dishes in this category yet.</p> : <div className="menu-dish-grid">{items.map((dish) => <article className="menu-dish" key={dish.id}>
            <DishPhoto dish={dish} />
            <h4>{dish.name}</h4><p>{dish.description}</p>
            <p className="menu-dish-category">{dish.category || 'Uncategorized'}</p>
            <p><DishPrice dish={dish} /> · {dish.available ? 'Available' : 'Sold out'}</p>
            {dish.bestseller && <p>Bestseller</p>}
            {(dish.vegan || dish.vegetarian) && <p>{dish.vegan ? 'Vegan' : 'Vegetarian'}</p>}
            {dish.ingredients && <p>Ingredients: {dish.ingredients}</p>}
            {dish.allergens && <p>Allergens: {dish.allergens}</p>}
            <div className="dish-card-actions">
              <button className="menu-retry" type="button" disabled={busy} aria-label={`Edit ${dish.name}`} onClick={() => showForm(dish)}>Edit</button>
              <button className="dish-delete-button" type="button" disabled={busy} aria-label={`Delete ${dish.name}`} onClick={() => { setPendingDelete(dish.id); setDeleteError('') }}>Delete</button>
            </div>
            {pendingDelete === dish.id && <div className="dish-delete-confirmation" role="group" aria-label={`Confirm deletion of ${dish.name}`}>
              <p>Delete {dish.name} permanently? This cannot be undone.</p>
              <div className="dish-card-actions">
                <button className="dish-delete-button" type="button" disabled={busy} onClick={() => deleteDish(dish)}>{busy ? 'Deleting…' : 'Confirm Delete'}</button>
                <button className="menu-retry" type="button" disabled={busy} onClick={() => { setPendingDelete(null); setDeleteError('') }}>Cancel</button>
              </div>
            </div>}
          </article>)}</div>}
        </section>
      })}
    </div>
  )
}
