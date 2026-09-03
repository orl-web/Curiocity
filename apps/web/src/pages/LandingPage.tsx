import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

export default function LandingPage() {
  const navigate = useNavigate();
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
          <Link to="/" className="text-lg font-bold text-[#1D9E75] no-underline">
            Curio<span className="text-[#F27732] dark:text-[#f5f5f3]">City</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] no-underline hover:text-[#1D9E75]">Log in</Link>
            <Link to="/register" className="text-sm font-bold text-white bg-[#1D9E75] px-4 py-2 rounded-full no-underline hover:bg-[#178563]">Sign up free</Link>
          </div>
        </nav>

        <section className="px-6 py-20 max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#F27732] dark:text-[#f5f5f3] leading-tight mb-6">
            Discover Rome<br />
            <span className="text-[#1D9E75]">like a local</span>
          </h1>
          <p className="text-lg text-[#5f5e5a] dark:text-[#a8a7a0] mb-8 max-w-xl mx-auto">
            Curated walking guides with GPS navigation, offline access, and stories only locals know. No tourist traps.
          </p>

          {submitted ? (
            <div className="bg-[#E1F5EE] rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-[#085041] font-bold text-lg">You're on the list!</p>
              <p className="text-[#085041]/70 text-sm mt-1">We'll notify you when we launch in Rome.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-4 py-3 rounded-full border border-black/10 text-sm text-[#F27732] dark:text-[#f5f5f3] outline-none focus:border-[#1D9E75]"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#1D9E75] text-white text-sm font-bold rounded-full border-none cursor-pointer hover:bg-[#178563] disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Get early access'}
              </button>
            </form>
          )}
        </section>

        <section className="px-6 py-16 bg-[#f5f5f3] dark:bg-[#1e1e1c]">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-bold text-[#F27732] dark:text-[#f5f5f3] mb-1">GPS-Guided Routes</h3>
              <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0]">Walk each stop with turn-by-turn navigation. No maps to fold.</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">📴</div>
              <h3 className="font-bold text-[#F27732] dark:text-[#f5f5f3] mb-1">Works Offline</h3>
              <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0]">Download guides before your trip. No roaming charges needed.</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">🎧</div>
              <h3 className="font-bold text-[#F27732] dark:text-[#f5f5f3] mb-1">AI Audio Descriptions</h3>
              <p className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0]">Listen to stories at each stop. Learn without looking at your phone.</p>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#F27732] dark:text-[#f5f5f3] mb-4">14 guides. 1 city. Zero tourist traps.</h2>
          <p className="text-[#5f5e5a] dark:text-[#a8a7a0] mb-6">Every guide is written by someone who actually lives in Rome. Real stories, real routes, real prices.</p>
          <Link to="/register" className="inline-block px-6 py-3 bg-[#1D9E75] text-white text-sm font-bold rounded-full no-underline hover:bg-[#178563]">
            Start exploring free
          </Link>
          <p className="mt-4">
            <button
              onClick={() => { localStorage.setItem('onboarding_complete', 'true'); navigate('/'); }}
              className="text-sm text-[#5f5e5a] dark:text-[#a8a7a0] underline hover:text-[#1D9E75] bg-transparent border-none cursor-pointer"
            >
              or skip — use offline
            </button>
          </p>
        </section>

        <footer className="px-6 py-8 border-t border-black/5 text-center text-xs text-[#b4b2a9] dark:text-[#706f6a]">
          CurioCity &copy; {new Date().getFullYear()} &mdash; Curated by locals, powered by curiosity.
        </footer>
      </div>
    </>
  );
}
