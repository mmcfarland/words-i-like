import { App } from './App'
import { SharedList } from './pages/SharedList'

export function Root() {
  const path = window.location.pathname
  const sharedMatch = path.match(/^\/shared\/([^/]+)/)
  if (sharedMatch) {
    return <SharedList token={sharedMatch[1]} />
  }
  return <App />
}
