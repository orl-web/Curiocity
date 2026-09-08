import { useState, useEffect, useRef } from 'react'

interface TimerWidgetProps {
  onTimeUp?: () => void
}

export default function TimerWidget({ onTimeUp }: TimerWidgetProps) {
  const [minutes, setMinutes] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [displayMinutes, setDisplayMinutes] = useState([0, 0])
  const [displaySeconds, setDisplaySeconds] = useState([0, 0])
  const intervalRef = useRef<number | null>(null)
  const spinIntervalRef = useRef<number | null>(null)
  const startTimeoutRef = useRef<number | null>(null)
  const minutesRef = useRef(minutes)

  useEffect(() => {
    minutesRef.current = minutes
  }, [minutes])

  useEffect(() => {
    if (isRunning && (minutes > 0 || seconds > 0)) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (prev === 0) {
            if (minutesRef.current === 0) {
              setIsRunning(false)
              onTimeUp?.()
              return 0
            }
            setMinutes((m) => m - 1)
            return 59
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, onTimeUp])

  useEffect(() => {
    setDisplayMinutes([Math.floor(minutes / 10), minutes % 10])
    setDisplaySeconds([Math.floor(seconds / 10), seconds % 10])
  }, [minutes, seconds])

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current)
      }
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current)
      }
    }
  }, [])

  const spinSlots = (callback: (m: number, s: number) => void) => {
    setIsSpinning(true)
    let spinCount = 0
    const maxSpins = 15

    spinIntervalRef.current = window.setInterval(() => {
      setDisplayMinutes([
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
      ])
      setDisplaySeconds([
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
      ])

      spinCount++
      if (spinCount >= maxSpins) {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current)
        }
        const randomMinutes = Math.floor(Math.random() * 59) + 1
        callback(randomMinutes, 0)
        setIsSpinning(false)
      }
    }, 80)
  }

  const handleRandomize = () => {
    if (isRunning) return
    spinSlots((m, _s) => {
      setMinutes(m)
      setSeconds(0)
    })
  }

  const handleStart = () => {
    if (minutes === 0 && seconds === 0) {
      handleRandomize()
      startTimeoutRef.current = window.setTimeout(() => setIsRunning(true), 1300)
    } else {
      setIsRunning(true)
    }
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setMinutes(0)
    setSeconds(0)
  }

  const SlotDigit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div
        className={`sketch-box w-14 h-20 flex items-center justify-center bg-white dark:bg-[#2a2a28] ${
          isSpinning ? 'sketch-spinning' : ''
        }`}
      >
        <span className="text-4xl font-mono font-bold text-[#1e1e1c] dark:text-white sketch-text">
          {value}
        </span>
      </div>
      <span className="text-[10px] mt-1 text-[#5f5e5a] dark:text-[#a8a7a0]">{label}</span>
    </div>
  )

  return (
    <div className="sketch-widget p-4 bg-[#f5f5f3] dark:bg-[#1e1e1c] rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="sketch-title text-sm font-bold text-[#1e1e1c] dark:text-white tracking-wide">
          TIME-OUT
        </h3>
        <button
          onClick={handleRandomize}
          disabled={isRunning || isSpinning}
          className="sketch-button w-8 h-8 rounded-full bg-[#e74c3c] hover:bg-[#c0392b] disabled:opacity-50 flex items-center justify-center"
          aria-label="Randomize time"
        >
          <div className="w-3 h-3 bg-white rounded-full" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <SlotDigit value={displayMinutes[0]} label="" />
        <SlotDigit value={displayMinutes[1]} label="MIN" />
        <div className="text-3xl font-bold text-[#1e1e1c] dark:text-white mx-1 sketch-text">:</div>
        <SlotDigit value={displaySeconds[0]} label="" />
        <SlotDigit value={displaySeconds[1]} label="SEC" />
      </div>

      <div className="flex gap-2 justify-center">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isSpinning}
            className="sketch-button px-4 py-2 bg-[#1D9E75] hover:bg-[#178a65] text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Start
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="sketch-button px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg text-sm font-medium"
          >
            Pause
          </button>
        )}
        <button
          onClick={handleReset}
          disabled={isSpinning}
          className="sketch-button px-4 py-2 bg-[#5f5e5a] hover:bg-[#4a4946] text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
