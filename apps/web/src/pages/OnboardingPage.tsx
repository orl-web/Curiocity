import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const steps = [
  {
    emoji: '🌍',
    title: 'Discover hidden gems',
    subtitle: 'Audio walking guides created by local experts',
  },
  {
    features: [
      { emoji: '🎧', title: 'Listen & Walk', desc: 'Audio guides lead you through each stop' },
      { emoji: '🔓', title: 'Free or Unlock', desc: 'Watch a short ad to unlock premium guides' },
      { emoji: '💚', title: 'Support Locals', desc: 'Creators earn from your explorations' },
    ],
  },
  {
    title: 'Get started',
    subtitle: 'Join thousands exploring cities with local audio guides',
  },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
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
    <div className="min-h-screen bg-[#f5f5f3] dark:bg-[#161614] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {step === 0 && (
          <div className="flex flex-col items-center text-center max-w-[340px]">
            <div className="text-[72px] leading-none mb-6">{steps[0].emoji}</div>
            <h1 className="text-[22px] font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">
              {steps[0].title}
            </h1>
            <p className="text-[14px] text-[#5f5e5a] dark:text-[#a8a7a0] leading-relaxed">
              {steps[0].subtitle}
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3 w-full max-w-[340px]">
            {(steps[1].features || []).map((f, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#1e1e1c] border border-black/10 dark:border-white/9 rounded-xl p-4 flex gap-4 items-start"
              >
                <div className="text-[28px] leading-none mt-0.5">{f.emoji}</div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#F27732] dark:text-[#f5f5f3] mb-0.5">
                    {f.title}
                  </h3>
                  <p className="text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0] leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center text-center max-w-[340px]">
            <div className="text-[72px] leading-none mb-6">🧭</div>
            <h1 className="text-[22px] font-bold text-[#F27732] dark:text-[#f5f5f3] mb-2">
              {steps[2].title}
            </h1>
            <p className="text-[14px] text-[#5f5e5a] dark:text-[#a8a7a0] leading-relaxed mb-8">
              {steps[2].subtitle}
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={handleSignup}
                className="w-full py-3 rounded-lg bg-[#1D9E75] text-white text-[14px] font-bold border-none cursor-pointer"
              >
                Sign Up Free
              </button>
              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-lg bg-transparent border border-black/10 dark:border-white/9 text-[#F27732] dark:text-[#f5f5f3] text-[14px] font-bold cursor-pointer"
              >
                I already have an account
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-8 flex flex-col items-center gap-4">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full max-w-[340px] py-3 rounded-lg bg-transparent border border-black/10 dark:border-white/9 text-[#5f5e5a] dark:text-[#a8a7a0] text-[14px] font-bold cursor-pointer"
          >
            Back
          </button>
        )}
        {step < 2 ? (
          <button
            onClick={handleNext}
            className="w-full max-w-[340px] py-3 rounded-lg bg-[#1D9E75] text-white text-[14px] font-bold border-none cursor-pointer"
          >
            Next
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-[7px] h-[7px] rounded-full transition-colors ${
                i === step ? 'bg-[#1D9E75]' : 'bg-[#d4d3cf]'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleSkip}
          className="text-[13px] text-[#5f5e5a] dark:text-[#a8a7a0] bg-transparent border-none cursor-pointer underline"
        >
          Skip — use offline
        </button>
      </div>
    </div>
  )
}
