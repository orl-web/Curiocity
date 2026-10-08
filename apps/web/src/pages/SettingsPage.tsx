import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme, SKINS } from '../components/ThemeProvider'
import { useI18n, LANGUAGES, type Lang } from '../i18n'
import { users, payments } from '../services/api'
import SEO from '../components/SEO'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const { isDark, toggle, skin, setSkin } = useTheme()
  const { lang, setLang, t } = useI18n()

  // Account form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Payments state
  const [stripeStatus, setStripeStatus] = useState<{ onboarded: boolean } | null>(null)
  const [earnings, setEarnings] = useState<{ totalEarnings: number; pendingEarnings: number } | null>(null)
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setBio(user.bio || '')
      setLocation(user.location || '')
    }
  }, [user])

  useEffect(() => {
    if (!isAuthenticated) return
    setPaymentsLoading(true)
    Promise.allSettled([
      payments.connectStatus(),
      user?.role === 'creator' || user?.role === 'admin' ? payments.creatorEarnings() : Promise.reject(new Error('not creator')),
    ]).then(([statusRes, earningsRes]) => {
      if (statusRes.status === 'fulfilled') setStripeStatus(statusRes.value.data)
      if (earningsRes.status === 'fulfilled') setEarnings(earningsRes.value.data)
      setPaymentsLoading(false)
    }).catch(() => setPaymentsLoading(false))
  }, [isAuthenticated, user])

  const handleSaveAccount = async () => {
    setSavingAccount(true)
    setAccountError(null)
    setAccountSaved(false)
    try {
      await users.updateMe({ displayName, bio, location })
      setAccountSaved(true)
      setTimeout(() => setAccountSaved(false), 2000)
    } catch {
      setAccountError(t('error.generic'))
    } finally {
      setSavingAccount(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordMessage(null)
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: t('settings.passwordTooShort') })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: t('settings.passwordMismatch') })
      return
    }
    setSavingPassword(true)
    try {
      await users.changePassword(currentPassword, newPassword)
      setPasswordMessage({ type: 'success', text: t('settings.passwordChanged') })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPasswordMessage({ type: 'error', text: t('error.generic') })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleConnectStripe = async () => {
    try {
      const returnUrl = `${window.location.origin}/settings`
      const refreshUrl = `${window.location.origin}/settings`
      const res = await payments.connectOnboard(returnUrl, refreshUrl)
      window.location.href = res.data.url
    } catch {
      setPaymentsError(t('settings.stripeNotConfigured'))
    }
  }

  const handlePayout = async () => {
    setPayoutMessage(null)
    try {
      await payments.payout()
      setPayoutMessage('Payout requested successfully')
    } catch (err: any) {
      setPayoutMessage(err?.response?.data?.message || t('error.generic'))
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border text-[14px] bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] focus:outline-none focus:border-[var(--color-primary)]'
  const labelClass = 'text-[12px] font-bold text-[var(--text-secondary)] mb-1 block'
  const sectionTitleClass = 'text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-4 pt-5 pb-2'

  return (
    <div className="flex flex-col h-full">
      <SEO title="Settings" />
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-2.5 shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <button onClick={() => navigate(-1)} aria-label={t('common.back')} className="w-7 h-7 flex items-center justify-center cursor-pointer rounded-lg hover:opacity-80" style={{ color: 'var(--text-primary)' }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4L6 9l5 5"/>
          </svg>
        </button>
        <div className="flex-1 text-lg font-bold" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>{t('settings.title')}</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ===== APPEARANCE ===== */}
        <div className={sectionTitleClass}>{t('settings.appearance')}</div>
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Theme toggle */}
          <div>
            <div className={labelClass}>{t('settings.theme')}</div>
            <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={() => { if (isDark) toggle() }}
                aria-pressed={!isDark}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${!isDark ? 'text-white' : ''}`}
                style={{ background: !isDark ? 'var(--color-primary)' : 'var(--bg-secondary)', color: !isDark ? undefined : 'var(--text-secondary)' }}
              >
                <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="4"/><path d="M11 3v2M11 17v2M3 11h2M17 11h2M5.6 5.6l1.4 1.4M15 15l1.4 1.4M5.6 16.4l1.4-1.4M15 7l1.4-1.4"/></svg>
                {t('settings.light')}
              </button>
              <button
                onClick={() => { if (!isDark) toggle() }}
                aria-pressed={isDark}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${isDark ? 'text-white' : ''}`}
                style={{ background: isDark ? 'var(--color-primary)' : 'var(--bg-secondary)', color: isDark ? undefined : 'var(--text-secondary)' }}
              >
                <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 12A7 7 0 017 6a7.5 7.5 0 0011 6z"/></svg>
                {t('settings.dark')}
              </button>
            </div>
          </div>

          {/* Skin picker */}
          <div>
            <div className={labelClass}>{t('settings.skin')}</div>
            <div className="text-[11px] text-[var(--text-muted)] mb-2">{t('settings.skinHint')}</div>
            <div className="grid grid-cols-2 gap-2">
              {SKINS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSkin(s.id)}
                  aria-pressed={skin === s.id}
                  className={`rounded-xl border-2 p-3 text-left cursor-pointer transition-all ${skin === s.id ? '' : 'opacity-80'}`}
                  style={{
                    borderColor: skin === s.id ? 'var(--color-primary)' : 'var(--border-color)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <div className="flex gap-1.5 mb-2">
                    {s.swatches.map((c, i) => (
                      <div key={i} className="w-5 h-5 rounded-full border border-black/10" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== LANGUAGE ===== */}
        <div className={sectionTitleClass}>{t('settings.language')}</div>
        <div className="px-4 pb-4">
          <div className="text-[11px] text-[var(--text-muted)] mb-2">{t('settings.languageHint')}</div>
          <div className="flex flex-col rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            {LANGUAGES.map((l, i) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code as Lang)}
                aria-pressed={lang === l.code}
                className={`flex items-center justify-between px-4 py-3 text-[14px] cursor-pointer transition-colors ${i > 0 ? 'border-t' : ''}`}
                style={{
                  background: lang === l.code ? 'var(--color-primary)' + '22' : 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <span className="font-medium">{l.nativeLabel}</span>
                {lang === l.code && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M3 8l3.5 3.5L13 5"/></svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ===== ACCOUNT ===== */}
        {isAuthenticated ? (
          <>
            <div className={sectionTitleClass}>{t('settings.account')}</div>
            <div className="px-4 pb-4 flex flex-col gap-3">
              <div>
                <label htmlFor="settings-email" className={labelClass}>{t('common.email')}</label>
                <input id="settings-email" type="email" value={user?.email || ''} disabled
                  className={inputClass + ' opacity-60 cursor-not-allowed'} />
              </div>
              <div>
                <label htmlFor="settings-name" className={labelClass}>{t('settings.displayName')}</label>
                <input id="settings-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100} className={inputClass} />
              </div>
              <div>
                <label htmlFor="settings-bio" className={labelClass}>{t('settings.bio')} <span className="font-normal">({t('common.optional')})</span></label>
                <textarea id="settings-bio" value={bio} onChange={(e) => setBio(e.target.value)}
                  maxLength={300} rows={2} className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label htmlFor="settings-location" className={labelClass}>{t('settings.location')} <span className="font-normal">({t('common.optional')})</span></label>
                <input id="settings-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  maxLength={100} className={inputClass} />
              </div>
              {accountError && <div className="text-[12px] text-[var(--color-error)]">{accountError}</div>}
              {accountSaved && <div className="text-[12px]" style={{ color: 'var(--color-success)' }}>{t('common.done')} ✓</div>}
              <button
                onClick={handleSaveAccount}
                disabled={savingAccount}
                className="py-2.5 rounded-xl text-white text-[13px] font-bold border-none cursor-pointer disabled:opacity-60"
                style={{ background: 'var(--color-primary)' }}
              >
                {savingAccount ? t('common.loading') : t('common.save')}
              </button>

              {/* Change password */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-[13px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('settings.changePassword')}</div>
                <div className="flex flex-col gap-2.5">
                  <input
                    type="password"
                    placeholder={t('settings.currentPassword')}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className={inputClass}
                  />
                  <input
                    type="password"
                    placeholder={t('settings.newPassword')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  <input
                    type="password"
                    placeholder={t('settings.confirmPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  {passwordMessage && (
                    <div className="text-[12px]" style={{ color: passwordMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {passwordMessage.text}
                    </div>
                  )}
                  <button
                    onClick={handleChangePassword}
                    disabled={savingPassword || !currentPassword || !newPassword}
                    className="py-2.5 rounded-xl text-[13px] font-bold border cursor-pointer disabled:opacity-60"
                    style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'transparent' }}
                  >
                    {savingPassword ? t('common.loading') : t('settings.changePassword')}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="py-2.5 rounded-xl text-[13px] font-bold border-none cursor-pointer mt-1"
                style={{ background: 'var(--color-error)', color: '#fff' }}
              >
                {t('common.signOut')}
              </button>
            </div>

            {/* ===== PAYMENTS ===== */}
            <div className={sectionTitleClass}>{t('settings.payments')}</div>
            <div className="px-4 pb-6 flex flex-col gap-3">
              <div className="text-[11px] text-[var(--text-muted)]">{t('settings.paymentsHint')}</div>

              {paymentsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-[var(--border-color)] border-t-[var(--color-primary)] rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Stripe status */}
                  <div className="rounded-xl border p-3 flex items-center justify-between" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <div>
                      <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>Stripe</div>
                      <div className="text-[11px] mt-0.5" style={{ color: stripeStatus?.onboarded ? 'var(--color-success)' : 'var(--text-muted)' }}>
                        {stripeStatus?.onboarded ? t('settings.onboarded') : t('settings.notOnboarded')}
                      </div>
                    </div>
                    {!stripeStatus?.onboarded && (
                      <button
                        onClick={handleConnectStripe}
                        className="px-4 py-2 rounded-lg text-white text-[12px] font-bold border-none cursor-pointer"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        {t('settings.connectStripe')}
                      </button>
                    )}
                  </div>

                  {/* Earnings (creators) */}
                  {(user?.role === 'creator' || user?.role === 'admin') && earnings && (
                    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <div className="flex gap-4 mb-3">
                        <div>
                          <div className="text-[16px] font-bold" style={{ color: 'var(--color-primary)' }}>€{earnings.totalEarnings.toFixed(2)}</div>
                          <div className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{t('settings.totalEarnings')}</div>
                        </div>
                        <div>
                          <div className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>€{earnings.pendingEarnings.toFixed(2)}</div>
                          <div className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{t('settings.pendingEarnings')}</div>
                        </div>
                      </div>
                      <button
                        onClick={handlePayout}
                        disabled={!stripeStatus?.onboarded || earnings.totalEarnings < 50}
                        className="w-full py-2 rounded-lg text-[12px] font-bold border cursor-pointer disabled:opacity-50"
                        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', background: 'transparent' }}
                      >
                        {t('settings.requestPayout')}
                      </button>
                      <div className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{t('settings.payoutMinimum')}</div>
                    </div>
                  )}

                  {payoutMessage && <div className="text-[12px] text-center" style={{ color: 'var(--text-secondary)' }}>{payoutMessage}</div>}
                  {paymentsError && <div className="text-[12px] text-center" style={{ color: 'var(--color-error)' }}>{paymentsError}</div>}

                  {/* Purchase history */}
                  <div>
                    <div className="text-[12px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('settings.purchaseHistory')}</div>
                    <PurchaseHistory />
                  </div>

                  <div className="text-[10.5px] text-center" style={{ color: 'var(--text-muted)' }}>{t('settings.managePayment')}</div>
                </>
              )}
            </div>
          </>
        ) : (
          /* Guest prompt */
          <div className="px-4 py-8 flex flex-col items-center gap-3">
            <p className="text-[13px] text-center" style={{ color: 'var(--text-secondary)' }}>{t('profile.signInCta')}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-xl text-white text-[13px] font-bold border-none cursor-pointer"
              style={{ background: 'var(--color-primary)' }}
            >
              {t('common.signIn')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PurchaseHistory() {
  const { t } = useI18n()
  const [items, setItems] = useState<any[] | null>(null)

  useEffect(() => {
    payments.history()
      .then((res) => setItems(res.data.payments || []))
      .catch(() => setItems([]))
  }, [])

  if (items === null) return <div className="text-[11px] py-2" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</div>
  if (items.length === 0) return <div className="text-[11px] py-2" style={{ color: 'var(--text-muted)' }}>{t('settings.noPurchases')}</div>

  return (
    <div className="flex flex-col gap-1.5">
      {items.slice(0, 5).map((p) => (
        <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-[12px] font-medium truncate flex-1" style={{ color: 'var(--text-primary)' }}>{p.guide?.title}</div>
          <div className="text-[12px] font-bold ml-2" style={{ color: 'var(--text-primary)' }}>€{parseFloat(p.amount).toFixed(2)}</div>
        </div>
      ))}
    </div>
  )
}
