import { Link, useParams } from 'react-router'
import { SizeGuideContent } from '../components/SizeGuide'
import { deliveryPolicy, returnsPolicy } from '../lib/policies'
import { NotFoundPage } from './NotFoundPage'

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL as string | undefined

const TOPICS: Record<string, { title: string; body: React.ReactNode }> = {
  shipping: { title: 'Shipping', body: deliveryPolicy.map((t) => <p key={t}>{t}</p>) },
  returns: { title: 'Returns', body: returnsPolicy.map((t) => <p key={t}>{t}</p>) },
  'size-guide': { title: 'Size guide', body: <SizeGuideContent /> },
  contact: {
    title: 'Contact',
    body: (
      <>
        {CONTACT_EMAIL ? (
          <p>
            Email us at <span className="font-medium text-ink">{CONTACT_EMAIL}</span> and we'll reply within two working days.
          </p>
        ) : (
          <p>Customer service contact details will be published here soon.</p>
        )}
        <p>
          Questions about an order? Open it from{' '}
          <Link to="/account/orders" className="link-underline">
            your orders
          </Link>{' '}
          to see its status and delivery details.
        </p>
      </>
    ),
  },
}

export function HelpPage() {
  const { topic = '' } = useParams()
  const page = TOPICS[topic]
  if (!page) return <NotFoundPage />
  return (
    <article className="mx-auto max-w-2xl">
      <p className="eyebrow">Help</p>
      <h1 className="display mt-2 text-5xl">{page.title}</h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-taupe">{page.body}</div>
    </article>
  )
}
