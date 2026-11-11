import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockApi, renderRoute } from '../test/utils'
import { useBag } from './bag'
import { BagDrawer } from './BagDrawer'

function Page() {
  const bag = useBag()
  return (
    <>
      <button type="button" onClick={() => bag.open()}>
        Open bag
      </button>
      <BagDrawer />
    </>
  )
}

describe('bag drawer', () => {
  it('slides in, then stays mounted while it slides out before unmounting', async () => {
    mockApi({})
    renderRoute(<Page />)
    expect(screen.queryByRole('dialog', { name: 'Shopping bag' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Open bag' }))
    const dialog = screen.getByRole('dialog', { name: 'Shopping bag' })
    const panel = dialog.querySelector('aside')!
    // Starts off screen and moves in on the next frames (ease-out).
    await waitFor(() => expect(panel).toHaveClass('translate-x-0'))

    await userEvent.click(screen.getByRole('button', { name: 'Close bag' }))
    // Still in the DOM, sliding out (ease-in), hidden from assistive tech and not clickable.
    const closing = document.querySelector('[aria-label="Shopping bag"]')!
    expect(closing.querySelector('aside')).toHaveClass('translate-x-full')
    expect(closing).toHaveAttribute('aria-hidden', 'true')
    await waitFor(() => expect(document.querySelector('[aria-label="Shopping bag"]')).toBeNull())
  })
})
