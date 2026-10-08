import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center min-h-0 flex-1">
      <SEO title="Page not found — CurioCity" description="This page doesn't exist." />
      <div className="text-6xl mb-4" aria-hidden="true">🧭</div>
      <h1 className="text-2xl font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">Lost? This path doesn't exist</h1>
      <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] mb-6 max-w-xs">
        The page you're looking for was moved, deleted, or never existed.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-[#1D9E75] text-white text-sm font-bold rounded-full no-underline hover:bg-[#178563] active:scale-95 transition-transform"
      >
        Back to guides
      </Link>
    </div>
  )
}
