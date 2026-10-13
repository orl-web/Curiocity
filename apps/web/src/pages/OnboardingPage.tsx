import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n, type TranslationKey } from '../i18n'

const buildSteps = (t: (k: TranslationKey) => string) => [
  {
    emoji: '🌍',
    title: t('onb.step1Title'),
    subtitle: t('onb.step1Sub'),
  },
  {
    features: [
      { emoji: '🎧', title: t('onb.listenWalk'), desc: t('onb.listenWalkDesc') },
      { emoji: '🔓', title: t('onb.freeOrUnlock'), desc: t('onb.freeOrUnlockDesc') },
      { emoji: '💚', title: t('onb.supportLocals'), desc: t('onb.supportLocalsDesc') },
    ],
  },
  {
    title: t('onb.step3Title'),
    subtitle: t('onb.step3Sub'),
  },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const steps = buildSteps(t)
  const [step, setStep] = useState(0)

  const complete = () => {
    localStorage.setItem('onboarding_complete', 'true')
  }

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1)
    } else {
      complete()
      navigate('/')
    }
  }

  const handleSignup = () => {
    complete()
    navigate('/register')
  }

  const handleLogin = () => {
    complete()
    navigate('/login')
  }

  const handleSkip = () => {
    complete()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] dark:bg-[#161614] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {step === 0 && (
          <div className="flex flex-col items-center text-center max-w-[340px]">
            <div className="text-[72px] leading-none mb-6">{steps[0].emoji}</div>
            <h1 className="text-[22px] font-bold text-[#F27732] dark:text-[var(--text-primary)] mb-2">
              {steps[0].title}
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
              {steps[0].subtitle}
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3 w-full max-w-[340px]">
            {(steps[1].features || []).map((f, i) => (
              <div
                key={i}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex gap-4 items-start"
              >
                <div className="text-[28px] leading-none mt-0.5">{f.emoji}</div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#F27732] dark:text-[var(--text-primary)] mb-0.5">
                    {f.title}
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center text-center max-w-[340px]">
            <div className="text-[72px] leading-none mb-6">🧭</div>
            <h1 className="text-[22px] font-bold text-[#F27732] dark:text-[var(--text-primary)] mb-2">
              {steps[2].title}
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-8">
              {steps[2].subtitle}
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleSignup}
                className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white text-[14px] font-bold border-none cursor-pointer"
              >
                {t('landing.signupFree')}
              </button>
              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-lg bg-transparent border border-[var(--border-color)] text-[#F27732] dark:text-[var(--text-primary)] text-[14px] font-bold cursor-pointer"
              >
                {t('onb.haveAccount')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-8 flex flex-col items-center gap-4">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full max-w-[340px] py-3 rounded-lg bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] text-[14px] font-bold cursor-pointer"
          >
            {t('onb.back')}
          </button>
        )}
        {step < 2 ? (
          <button
            onClick={handleNext}
            className="w-full max-w-[340px] py-3 rounded-lg bg-[var(--color-primary)] text-white text-[14px] font-bold border-none cursor-pointer"
          >
            {t('onb.next')}
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-[7px] h-[7px] rounded-full transition-colors ${
                i === step ? 'bg-[var(--color-primary)]' : 'bg-[#d4d3cf]'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleSkip}
          className="text-[13px] text-[var(--text-secondary)] bg-transparent border-none cursor-pointer underline"
        >
          {t('auth.skipOffline')}
        </button>
      </div>
    </div>
  )
}
