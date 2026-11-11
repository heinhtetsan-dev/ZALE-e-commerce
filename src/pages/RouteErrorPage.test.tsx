import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RouteErrorPage } from './RouteErrorPage'

const renderWithError = (error: Error) => {
  const Boom = () => {
    throw error
  }
  const router = createMemoryRouter([{ path: '/', element: <Boom />, errorElement: <RouteErrorPage /> }])
  render(<RouterProvider router={router} />)
}

describe('RouteErrorPage', () => {
  it('asks for a reload when a page chunk failed to load', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWithError(new TypeError('Failed to fetch dynamically imported module: /assets/PaymentPage-abc.js'))
    expect(screen.getByText('This page needs a refresh')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
  })

  it('shows a friendly message for other errors instead of the developer screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderWithError(new Error('boom'))
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText(/Hey developer/)).not.toBeInTheDocument()
  })
})
