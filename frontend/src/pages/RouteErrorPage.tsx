import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { EmptyState } from '../components/ui'

/**
 * Shown instead of React Router's developer error screen. A failed lazy
 * import usually means a new version was deployed while the tab was open.
 */
export function RouteErrorPage() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : ''
  const staleBundle = /dynamically imported module|Importing a module script failed|Loading chunk/i.test(message)

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <EmptyState title="Page not found" action={<Link to="/" className="btn-primary">Back to the shop</Link>}>
        The page you are looking for does not exist.
      </EmptyState>
    )
  }

  return (
    <EmptyState
      title={staleBundle ? 'This page needs a refresh' : 'Something went wrong'}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <Link to="/" className="btn-secondary">
            Back to the shop
          </Link>
        </div>
      }
    >
      {staleBundle
        ? 'The shop was updated while this tab was open, or your connection dropped. Reloading will fix it.'
        : 'An unexpected error occurred. Please reload the page or try again in a moment.'}
    </EmptyState>
  )
}
