import { Link } from 'react-router'
import { EmptyState } from '../components/ui'

export function NotFoundPage() {
  return (
    <EmptyState title="Page not found" action={<Link to="/" className="btn-primary">Back to the shop</Link>}>
      The page you are looking for does not exist.
    </EmptyState>
  )
}
