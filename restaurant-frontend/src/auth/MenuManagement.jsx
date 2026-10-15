import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { categories, normalizeCategory } from '../components/menuCategories'
import DishPrice from '../components/DishPrice'
import DishPhoto from '../components/DishPhoto'
import './MenuManagement.css'

export default function MenuManagement({ onCreated }) {
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState('')
  const [onSale, setOnSale] = useState(false)
  const form = useRef(null)

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
    if (!photo) nextErrors.photo = 'Choose a JPEG, PNG or WebP photo up to 5 MB.'
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
      body.append('photo', photo)
      // Keep the browser-generated multipart boundary and use the existing session CSRF token.
      const csrf = await api('/api/auth/csrf')
      const created = await api('/api/admin/dishes', { method: 'POST', headers: { [csrf.headerName]: csrf.token }, body })
      setDishes((current) => [...current, created])
      onCreated()
      form.current.reset()
      setPhoto(null)
      setPreview('')
      setOnSale(false)
      setOpen(false)
      setMessage(`${created.name} was added to the menu.`)
    } catch (error) {
      setErrors(error.fields || {})
      setFailure(error.message)
    } finally { saving.current = false; setBusy(false) }
  }

  const fieldProps = (name) => ({ 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `dish-${name}-error` : undefined })
  const fieldError = (name) => errors[name] && <span className="auth-field-error" id={`dish-${name}-error`}>{errors[name]}</span>
  const groups = categories.filter((category) => category.id !== 'all')
  const otherDishes = dishes.filter((dish) => !groups.some((category) => normalizeCategory(dish.category) === category.id))

  return (
    <div className="menu-management">
      <div className="management-heading">
        <h3>Menu Management</h3>
        <button className="auth-submit" type="button" disabled={busy} onClick={() => {
          setOpen(true); setErrors({}); setMessage(''); setFailure('')
        }}>Add Dish</button>
      </div>
      {message && <p className="auth-success" role="status">{message}</p>}
      {open && <form className="dish-form" ref={form} onSubmit={save} aria-labelledby="add-dish-heading">
        <h4 id="add-dish-heading">Add Dish</h4>
        <p>All fields are required unless marked optional.</p>
        {failure && <p className="auth-error" role="alert">{failure}</p>}
        <fieldset disabled={busy}>
          <div className="dish-form-grid">
            <label>Name<input name="name" required maxLength={255} {...fieldProps('name')} />{fieldError('name')}</label>
            <label>Category<select name="category" required defaultValue="" {...fieldProps('category')}>
              <option value="" disabled>Choose a category</option>
              {groups.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
            </select>{fieldError('category')}</label>
            <label>Regular price in euros<input name="price" type="number" inputMode="decimal" required min="0.01" max="99999999.99" step="0.01" placeholder="9.50" {...fieldProps('price')} />{fieldError('price')}</label>
            <label className="dish-check"><input type="checkbox" name="available" role="switch" defaultChecked />Available (switch off for sold out)</label>
          </div>
          <div className="dish-form-options">
            <label className="dish-check"><input name="onSale" type="checkbox" checked={onSale} onChange={(event) => setOnSale(event.target.checked)} />Put this dish on sale (optional)</label>
            <label className="dish-check"><input name="bestseller" type="checkbox" />Show in Bestsellers (optional)</label>
          </div>
          {onSale && <label>Sale price in euros<input name="salePrice" type="number" inputMode="decimal" required min="0.01" max="99999999.99" step="0.01" placeholder="7.50" {...fieldProps('salePrice')} />{fieldError('salePrice')}<span className="auth-hint">Must be lower than the regular price.</span></label>}
          <label>Description<textarea name="description" required maxLength={1000} rows={3} {...fieldProps('description')} />{fieldError('description')}</label>
          <label>Photo<input name="photo" type="file" required accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} {...fieldProps('photo')} />{fieldError('photo')}</label>
          <p className="auth-hint">JPEG, PNG or WebP, up to 5 MB. Maximum 6000 pixels per side and 16 megapixels.</p>
          {preview && <img className="dish-preview" src={preview} alt="Selected dish preview" />}
          <div className="dish-form-grid">
            <label>Ingredients (optional)<textarea name="ingredients" rows={3} maxLength={2000} {...fieldProps('ingredients')} />{fieldError('ingredients')}</label>
            <label>Allergens (optional)<textarea name="allergens" rows={3} maxLength={1000} {...fieldProps('allergens')} />{fieldError('allergens')}</label>
          </div>
          <div className="dish-form-options">
            <label className="dish-check"><input name="vegetarian" type="checkbox" />Vegetarian (optional)</label>
            <label className="dish-check"><input name="vegan" type="checkbox" />Vegan (optional)</label>
          </div>
          <div className="dish-form-options">
            <button className="auth-submit" type="submit">{busy ? 'Saving…' : 'Save Dish'}</button>
            <button className="menu-retry" type="button" onClick={() => { setOpen(false); setPhoto(null); setPreview(''); setOnSale(false) }}>Cancel</button>
          </div>
        </fieldset>
      </form>}
      {loading && <p role="status">Loading dishes…</p>}
      {loadError && <p role="alert">{loadError} <button type="button" onClick={() => { setLoading(true); setAttempt((current) => current + 1) }}>Retry</button></p>}
      {!loading && !loadError && [...groups, ...(otherDishes.length ? [{ id: 'other', name: 'Other categories' }] : [])].map((category) => {
        const items = category.id === 'other' ? otherDishes : dishes.filter((dish) => normalizeCategory(dish.category) === category.id)
        return <section className="management-category" key={category.id} aria-labelledby={`management-${category.id}`}>
          <h4 id={`management-${category.id}`}>{category.name}</h4>
          {items.length === 0 ? <p>No dishes in this category yet.</p> : <div className="menu-dish-grid">{items.map((dish) => <article className="menu-dish" key={dish.id}>
            <DishPhoto dish={dish} />
            <h5>{dish.name}</h5><p>{dish.description}</p>
            <p><DishPrice dish={dish} /> · {dish.available ? 'Available' : 'Sold out'}</p>
            {dish.bestseller && <p>Bestseller</p>}
            {(dish.vegan || dish.vegetarian) && <p>{dish.vegan ? 'Vegan' : 'Vegetarian'}</p>}
            {dish.ingredients && <p>Ingredients: {dish.ingredients}</p>}
            {dish.allergens && <p>Allergens: {dish.allergens}</p>}
          </article>)}</div>}
        </section>
      })}
    </div>
  )
}
