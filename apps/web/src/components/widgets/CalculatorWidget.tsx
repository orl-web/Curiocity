import { useState } from 'react'

export default function CalculatorWidget() {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
      return
    }
    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const clear = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(false)
  }

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operation) {
      const currentValue = previousValue || 0
      let result: number

      switch (operation) {
        case '+':
          result = currentValue + inputValue
          break
        case '-':
          result = currentValue - inputValue
          break
        case '×':
          result = currentValue * inputValue
          break
        case '÷':
          result = inputValue !== 0 ? currentValue / inputValue : 0
          break
        default:
          result = inputValue
      }

      setDisplay(String(result))
      setPreviousValue(result)
    }

    setWaitingForOperand(true)
    setOperation(nextOperation)
  }

  const calculate = () => {
    if (!operation || previousValue === null) return

    const inputValue = parseFloat(display)
    let result: number

    switch (operation) {
      case '+':
        result = previousValue + inputValue
        break
      case '-':
        result = previousValue - inputValue
        break
      case '×':
        result = previousValue * inputValue
        break
      case '÷':
        result = inputValue !== 0 ? previousValue / inputValue : 0
        break
      default:
        result = inputValue
    }

    setDisplay(String(result))
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(true)
  }

  const percentage = () => {
    const current = parseFloat(display)
    setDisplay(String(current / 100))
  }

  const negate = () => {
    const current = parseFloat(display)
    setDisplay(String(-current))
  }

  const CalcButton = ({
    label,
    onClick,
    variant = 'default',
    span = 1,
  }: {
    label: string
    onClick: () => void
    variant?: 'default' | 'operator' | 'accent' | 'clear'
    span?: number
  }) => {
    const baseClass = 'sketch-button flex items-center justify-center font-bold text-lg rounded-lg h-12 transition-colors'
    const variantClass = {
      default: 'bg-white dark:bg-[#2a2a28] text-[#1e1e1c] dark:text-white hover:bg-black/5 dark:hover:bg-white/10',
      operator: 'bg-[#aa3bff] text-white hover:bg-[#9a2bef]',
      accent: 'bg-[#F27732] text-white hover:bg-[#d96a28]',
      clear: 'bg-[#e74c3c] text-white hover:bg-[#c0392b]',
    }[variant]

    return (
      <button
        onClick={onClick}
        className={`${baseClass} ${variantClass} ${span === 2 ? 'col-span-2' : ''}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="sketch-widget p-4 bg-[#f5f5f3] dark:bg-[#1e1e1c] rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="sketch-title text-sm font-bold text-[#1e1e1c] dark:text-white tracking-wide">
          CALCULATOR
        </h3>
      </div>

      <div className="sketch-box bg-white dark:bg-[#2a2a28] rounded-lg p-3 mb-3">
        <div className="text-right">
          {operation && (
            <div className="text-xs text-[#aa3bff] mb-1">
              {previousValue} {operation}
            </div>
          )}
          <div className="text-2xl font-mono font-bold text-[#1e1e1c] dark:text-white sketch-text truncate">
            {display}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <CalcButton label="AC" onClick={clear} variant="clear" />
        <CalcButton label="±" onClick={negate} variant="default" />
        <CalcButton label="%" onClick={percentage} variant="default" />
        <CalcButton label="÷" onClick={() => performOperation('÷')} variant="operator" />

        <CalcButton label="7" onClick={() => inputDigit('7')} />
        <CalcButton label="8" onClick={() => inputDigit('8')} />
        <CalcButton label="9" onClick={() => inputDigit('9')} />
        <CalcButton label="×" onClick={() => performOperation('×')} variant="operator" />

        <CalcButton label="4" onClick={() => inputDigit('4')} />
        <CalcButton label="5" onClick={() => inputDigit('5')} />
        <CalcButton label="6" onClick={() => inputDigit('6')} />
        <CalcButton label="-" onClick={() => performOperation('-')} variant="operator" />

        <CalcButton label="1" onClick={() => inputDigit('1')} />
        <CalcButton label="2" onClick={() => inputDigit('2')} />
        <CalcButton label="3" onClick={() => inputDigit('3')} />
        <CalcButton label="+" onClick={() => performOperation('+')} variant="operator" />

        <CalcButton label="0" onClick={() => inputDigit('0')} span={2} />
        <CalcButton label="." onClick={inputDecimal} />
        <CalcButton label="=" onClick={calculate} variant="accent" />
      </div>
    </div>
  )
}
