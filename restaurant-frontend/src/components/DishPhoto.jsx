import { useState } from 'react'
import burger from '../assets/bestsellers/beef-burger.png'
import pizza from '../assets/bestsellers/margherita-pizza.png'

const originalPhotos = { 'beef burger': burger, 'margherita pizza': pizza }

export default function DishPhoto({ dish }) {
  const [failedUrl, setFailedUrl] = useState(null)
  const photoUrl = dish.photoUrl || originalPhotos[dish.name?.trim().toLowerCase()]
  return photoUrl && failedUrl !== photoUrl
    ? <img className="dish-photo" src={photoUrl} alt={dish.name} loading="lazy" onError={() => setFailedUrl(photoUrl)} />
    : <div className="dish-photo dish-photo-fallback" role="img" aria-label={`No photo available for ${dish.name}`}>Photo coming soon</div>
}
