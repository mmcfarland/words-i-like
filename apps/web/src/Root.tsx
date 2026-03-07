import { App } from './App'
import { SharedList } from './pages/SharedList'
import { SharedWord } from './pages/SharedWord'

function decodeRouteSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

export function Root() {
  const path = window.location.pathname
  const sharedWordMatch = path.match(/^\/shared\/word\/([^/]+)/)
  if (sharedWordMatch) {
    return <SharedWord token={decodeRouteSegment(sharedWordMatch[1])} />
  }

  const sharedMatch = path.match(/^\/shared\/([^/]+)/)
  if (sharedMatch) {
    return <SharedList token={decodeRouteSegment(sharedMatch[1])} />
  }

  const listMatch = path.match(/^\/lists\/([^/]+)/)
  if (listMatch) {
    return <App initialListId={decodeRouteSegment(listMatch[1])} />
  }
  return <App initialListId={null} />
}
