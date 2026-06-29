import { App } from './App'
import { Flashcards } from './pages/Flashcards'
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

  if (path.match(/^\/flashcards\/?$/)) {
    const listParam = new URLSearchParams(window.location.search).get('list')
    return <Flashcards initialListId={listParam} />
  }

  const listMatch = path.match(/^\/lists\/([^/]+)/)
  if (listMatch) {
    return <App initialListId={decodeRouteSegment(listMatch[1])} />
  }
  return <App initialListId={null} />
}
