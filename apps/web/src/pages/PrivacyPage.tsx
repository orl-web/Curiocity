import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#161614]">
      <SEO
        title="Privacy Policy — CurioCity"
        description="How CurioCity collects, uses, and protects your personal data."
        url="/privacy"
      />
      <nav className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
        <Link to="/" className="text-lg font-bold text-[#1D9E75] no-underline">
          Curio<span className="text-[#F27732] dark:text-[#f5f5f3]">City</span>
        </Link>
        <Link to="/" className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] no-underline hover:text-[#1D9E75]">Back to home</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#b4b2a9] dark:text-[#706f6a] mb-8">Last updated: October 2026</p>

        <div className="prose-custom space-y-6 text-sm text-[#5f5e5a] dark:text-[#a8a7a0] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">1. What we collect</h2>
            <p>CurioCity collects the following data:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account data:</strong> email address, display name, and password (stored only as a salted hash).</li>
              <li><strong>Content you create:</strong> walking guides, stops, reviews, and comments.</li>
              <li><strong>Location data:</strong> only when you explicitly enable GPS to find nearby guides or follow a route. Location is never collected in the background.</li>
              <li><strong>Payment data:</strong> handled entirely by Stripe. We never see or store your full card number — only a Stripe customer ID and payment status.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">2. How we use your data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide the service: showing your guides, saving favorites, offline downloads.</li>
              <li>To send transactional email: verification, password resets, purchase receipts.</li>
              <li>To pay creators: sharing earnings with Stripe Connect.</li>
              <li>To prevent abuse: rate limiting and content moderation.</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> sell your personal data to anyone.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">3. Third-party services</h2>
            <p>We rely on these processors, each with its own privacy policy:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Stripe</strong> — payments and creator payouts.</li>
              <li><strong>Anthropic</strong> — AI-generated guide descriptions (only stop names and text you submit are processed).</li>
              <li><strong>Cloudflare / AWS</strong> — storage of images and audio you upload.</li>
              <li><strong>SendGrid</strong> — transactional email delivery.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">4. Your rights (GDPR)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access:</strong> request a copy of your data from your profile page.</li>
              <li><strong>Deletion:</strong> delete your account and all associated content from your profile settings, or by emailing us.</li>
              <li><strong>Export:</strong> download your guides as GPX/KML/JSON files at any time.</li>
              <li><strong>Objection:</strong> opt out of non-essential processing at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">5. Data retention</h2>
            <p>Account data is kept until you delete your account. Payment records are retained for 10 years as required by EU tax law. Server logs are rotated every 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">6. Children</h2>
            <p>CurioCity is not directed at children under 16, and we do not knowingly collect data from them.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">7. Changes & contact</h2>
            <p>We will notify you of material changes via email. Questions about this policy: <a href="mailto:privacy@curiocity.app" className="text-[#1D9E75] underline">privacy@curiocity.app</a></p>
          </section>
        </div>
      </main>

      <footer className="px-6 py-8 border-t border-black/5 text-center text-xs text-[#b4b2a9] dark:text-[#706f6a]">
        CurioCity &copy; {new Date().getFullYear()} — <Link to="/terms" className="underline">Terms</Link>
      </footer>
    </div>
  )
}
