import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#161614]">
      <SEO
        title="Terms of Service — CurioCity"
        description="The terms that govern your use of CurioCity."
        url="/terms"
      />
      <nav className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
        <Link to="/" className="text-lg font-bold text-[#1D9E75] no-underline">
          Curio<span className="text-[#F27732] dark:text-[#f5f5f3]">City</span>
        </Link>
        <Link to="/" className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] no-underline hover:text-[#1D9E75]">Back to home</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#b4b2a9] dark:text-[#706f6a] mb-8">Last updated: October 2026</p>

        <div className="space-y-6 text-sm text-[#5f5e5a] dark:text-[#a8a7a0] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">1. The service</h2>
            <p>CurioCity is a platform for creating, sharing, and following curated walking guides. By creating an account you agree to these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">2. Your account</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate information and keep your password secure.</li>
              <li>You are responsible for activity under your account.</li>
              <li>You must be at least 16 years old to use CurioCity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">3. Content ownership</h2>
            <p>Creators keep full ownership of the guides, text, photos, and audio they upload. By publishing, you grant CurioCity a non-exclusive license to host, display, and distribute that content within the app (including offline copies on users' devices). We will never relicense your content to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">4. Acceptable use</h2>
            <p>You may not publish content that is illegal, infringing, hateful, or dangerous (e.g. guides that direct people into unsafe areas knowingly). We may remove content or suspend accounts that break these rules.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">5. Payments & refunds</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Paid guides are purchased once and remain accessible on your account.</li>
              <li>Payments are processed by Stripe; CurioCity never stores card details.</li>
              <li>Creators keep 70% of each sale (or the percentage shown in their dashboard); CurioCity retains a platform fee.</li>
              <li>Refund requests: contact support within 14 days of purchase and we will review them individually.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">6. Safety</h2>
            <p>Walking guides are informational. Follow local laws, watch traffic, and use your judgement. CurioCity is not responsible for incidents during walks.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">7. Liability</h2>
            <p>To the maximum extent permitted by law, CurioCity is not liable for indirect or consequential damages. Our total liability is limited to the amount you paid us in the last 12 months.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">8. Changes & contact</h2>
            <p>We may update these terms; material changes will be announced by email. Questions: <a href="mailto:legal@curiocity.app" className="text-[#1D9E75] underline">legal@curiocity.app</a></p>
          </section>
        </div>
      </main>

      <footer className="px-6 py-8 border-t border-black/5 text-center text-xs text-[#b4b2a9] dark:text-[#706f6a]">
        CurioCity &copy; {new Date().getFullYear()} — <Link to="/privacy" className="underline">Privacy</Link>
      </footer>
    </div>
  )
}
