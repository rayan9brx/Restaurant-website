import { useState } from 'react'
import burger from '../assets/bestsellers/beef-burger.png'
import pizza from '../assets/bestsellers/margherita-pizza.png'
import { categories, normalizeCategory } from './menuCategories'

const originalPhotos = { 'beef burger': burger, 'margherita pizza': pizza }

export default function DishPhoto({ dish }) {
  const [failedUrls, setFailedUrls] = useState([])
  const category = categories.find((item) => item.id !== 'all' && item.id === normalizeCategory(dish.category))
  const categoryUrl = category ? `/images/categories/${category.id}.png` : null
  // Prefer the upload; each failed URL is attempted only once per mounted photo.
  const exactUrl = dish.photoUrl?.trim() || originalPhotos[dish.name?.trim().toLowerCase()]
  const photoUrl = [exactUrl, categoryUrl].find((url) => url && !failedUrls.includes(url))
  const isCategory = photoUrl && photoUrl === categoryUrl

  return (
    <div className="dish-photo-frame">
      {photoUrl ? <img className="dish-photo" src={photoUrl}
        alt={isCategory ? `${category.name} category illustration` : dish.name} loading="lazy"
        onError={() => setFailedUrls((urls) => urls.includes(photoUrl) ? urls : [...urls, photoUrl])} />
        : <div className="dish-photo dish-photo-fallback" role="img" aria-label={`No photo available for ${dish.name}`}>Photo unavailable</div>}
      {isCategory && <span className="dish-photo-label">Category image</span>}
    </div>
  )
}
