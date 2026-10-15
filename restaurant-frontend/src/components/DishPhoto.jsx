import { useState } from 'react'

export default function DishPhoto({ dish }) {
  const [failedUrl, setFailedUrl] = useState(null)
  return dish.photoUrl && failedUrl !== dish.photoUrl
    ? <img className="dish-photo" src={dish.photoUrl} alt={dish.name} loading="lazy" onError={() => setFailedUrl(dish.photoUrl)} />
    : <div className="dish-photo dish-photo-fallback" role="img" aria-label={`No photo available for ${dish.name}`}>Photo coming soon</div>
}
