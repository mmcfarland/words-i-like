import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './Root'
import './styles/index.css'

// Load Umami analytics script (no-op if env vars not set)
const umamiUrl = import.meta.env.VITE_UMAMI_URL
const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID
if (umamiUrl && umamiWebsiteId) {
  const script = document.createElement('script')
  script.defer = true
  script.src = `${umamiUrl}/script.js`
  script.dataset.websiteId = umamiWebsiteId
  document.head.appendChild(script)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
