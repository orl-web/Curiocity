import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import { useI18n } from '../i18n';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <>
      <SEO
        title="CurioCity — Curated Audio Walking Guides"
        description="Discover Rome like a local. Curated walking guides with GPS navigation, offline access, and AI-powered audio. Skip the tourist traps."
        url="/"
      />
      <div className="min-h-screen bg-white dark:bg-[#161614]">
        <nav className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
          <Link to="/" className="text-lg font-bold text-[var(--color-primary)] no-underline">
            Curio<span className="text-[#F27732] dark:text-[var(--text-primary)]">City</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-[var(--text-secondary)] no-underline hover:text-[var(--color-primary)]">{t('landing.login')}</Link>
            <Link to="/register" className="text-sm font-bold text-white bg-[var(--color-primary)] px-4 py-2 rounded-full no-underline hover:bg-[#178563]">{t('landing.signupFree')}</Link>
          </div>
        </nav>

        <section className="px-6 py-20 max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#F27732] dark:text-[var(--text-primary)] leading-tight mb-6">
            {t('landing.heroLine1')}<br />
            <span className="text-[var(--color-primary)]">{t('landing.heroLine2')}</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
            {t('landing.heroSub')}
          </p>

          {submitted ? (
            <div className="bg-[#E1F5EE] rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-[#085041] font-bold text-lg">{t('landing.onList')}</p>
              <p className="text-[#085041]/70 text-sm mt-1">{t('landing.notifyLaunch')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('landing.emailPlaceholder')}
                required
                className="flex-1 px-4 py-3 rounded-full border border-black/10 text-sm text-[#F27732] dark:text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[var(--color-primary)] text-white text-sm font-bold rounded-full border-none cursor-pointer hover:bg-[#178563] disabled:opacity-50"
              >
                {loading ? t('landing.joining') : t('landing.earlyAccess')}
              </button>
            </form>
          )}
        </section>

        <section className="px-6 py-16 bg-[var(--bg-secondary)]">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-bold text-[#F27732] dark:text-[var(--text-primary)] mb-1">{t('landing.feature1Title')}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{t('landing.feature1Body')}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">📴</div>
              <h3 className="font-bold text-[#F27732] dark:text-[var(--text-primary)] mb-1">{t('landing.feature2Title')}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{t('landing.feature2Body')}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">🎧</div>
              <h3 className="font-bold text-[#F27732] dark:text-[var(--text-primary)] mb-1">{t('landing.feature3Title')}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{t('landing.feature3Body')}</p>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#F27732] dark:text-[var(--text-primary)] mb-4">{t('landing.statsHeadline')}</h2>
          <p className="text-[var(--text-secondary)] mb-6">{t('landing.statsBody')}</p>
          <Link to="/register" className="inline-block px-6 py-3 bg-[var(--color-primary)] text-white text-sm font-bold rounded-full no-underline hover:bg-[#178563]">
            {t('landing.startFree')}
          </Link>
          <p className="mt-4">
            <button
              onClick={() => { localStorage.setItem('onboarding_complete', 'true'); navigate('/'); }}
              className="text-sm text-[var(--text-secondary)] underline hover:text-[var(--color-primary)] bg-transparent border-none cursor-pointer"
            >
              {t('landing.skipOffline')}
            </button>
          </p>
        </section>

        <footer className="px-6 py-8 border-t border-black/5 text-center text-xs text-[var(--text-muted)]">
          CurioCity &copy; {new Date().getFullYear()} &mdash; Curated by locals, powered by curiosity.
          <div className="mt-2">
            <Link to="/privacy" className="underline hover:text-[var(--color-primary)]">{t('landing.privacy')}</Link>
            <span className="mx-2">&middot;</span>
            <Link to="/terms" className="underline hover:text-[var(--color-primary)]">{t('landing.terms')}</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
