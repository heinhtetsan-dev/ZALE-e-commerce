import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { mockApi, renderRoute } from '../test/utils'
import { ProductImages } from './ProductImages'

function Harness({ initial = [] as string[] }) {
  const [images, setImages] = useState(initial)
  return (
    <>
      <ProductImages value={images} onChange={setImages} />
      <output data-testid="value">{images.join(',')}</output>
    </>
  )
}

const photo = (name: string, type = 'image/jpeg', size = 1000) => new File([new Uint8Array(size)], name, { type })

describe('product photo upload', () => {
  it('uploads chosen photos one by one and adds them in order', async () => {
    let n = 0
    const { calls } = mockApi({ 'POST /admin/uploads': () => ({ status: 201, body: { key: `/api/v1/uploads/p${++n}.jpg`, url: '' } }) })
    renderRoute(<Harness initial={['https://img.test/a.jpg']} />)

    await userEvent.upload(screen.getByTestId('photo-input'), [photo('one.jpg'), photo('two.jpg')])
    await waitFor(() => expect(screen.getByTestId('value')).toHaveTextContent('https://img.test/a.jpg,/api/v1/uploads/p1.jpg,/api/v1/uploads/p2.jpg'))
    expect(calls.filter((c) => c.path === '/admin/uploads')).toHaveLength(2)
    expect(calls[0].body).toBeInstanceOf(Blob)
  })

  it('skips files that are too big or not images, without calling the API', async () => {
    const { calls } = mockApi({})
    renderRoute(<Harness />)
    await userEvent.upload(screen.getByTestId('photo-input'), [photo('huge.jpg', 'image/jpeg', 6 * 1024 * 1024), photo('doc.pdf', 'application/pdf')], { applyAccept: false })
    expect(await screen.findByText(/huge.jpg: larger than 5 MB/)).toBeInTheDocument()
    expect(screen.getByText(/doc.pdf: use a JPEG/)).toBeInTheDocument()
    expect(calls.some((c) => c.path === '/admin/uploads')).toBe(false)
  })

  it('makes a photo the main one and removes photos', async () => {
    mockApi({})
    renderRoute(<Harness initial={['https://img.test/a.jpg', 'https://img.test/b.jpg']} />)
    await userEvent.click(screen.getByRole('button', { name: 'Make photo 2 the main photo' }))
    expect(screen.getByTestId('value')).toHaveTextContent('https://img.test/b.jpg,https://img.test/a.jpg')
    await userEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }))
    expect(screen.getByTestId('value')).toHaveTextContent(/^https:\/\/img.test\/a.jpg$/)
  })
})
