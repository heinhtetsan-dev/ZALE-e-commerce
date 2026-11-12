import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LAST_ADDRESS_KEY } from '../checkout/savedAddress'
import { loginAs, mockApi, renderRoute } from '../test/utils'
import { useAuth } from './context'

function Account() {
  const { user, logout } = useAuth()
  if (!user) return <p>Signed out</p>
  return (
    <button type="button" onClick={logout}>
      Log out {user.name}
    </button>
  )
}

describe('logout', () => {
  it('forgets the token and the saved shipping address', async () => {
    mockApi(loginAs())
    localStorage.setItem(LAST_ADDRESS_KEY, JSON.stringify({ fullName: 'Casey', line1: '1 Private Road' }))
    renderRoute(<Account />)

    await userEvent.click(await screen.findByRole('button', { name: 'Log out Casey' }))
    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument())
    expect(localStorage.getItem('shoeshop.token')).toBeNull()
    expect(localStorage.getItem(LAST_ADDRESS_KEY)).toBeNull()
  })
})
