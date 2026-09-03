import { Helmet } from 'react-helmet-async'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
}

const defaults = {
  title: 'CurioCity — Curated Audio Walking Guides',
  description: 'Discover hidden gems with curated audio walking guides by local experts',
  image: '/icon-512.png',
  url: 'https://curiocity.app',
}

export default function SEO({ title, description, image, url }: SEOProps) {
  const t = title ? `${title} | CurioCity` : defaults.title
  const d = description || defaults.description
  const img = image || defaults.image
  const u = url || defaults.url

  return (
    <Helmet>
      <title>{t}</title>
      <meta name="description" content={d} />
      <meta property="og:title" content={t} />
      <meta property="og:description" content={d} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={u} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={t} />
      <meta name="twitter:description" content={d} />
      <meta name="twitter:image" content={img} />
      <link rel="canonical" href={u} />
    </Helmet>
  )
}
