import { useState } from 'react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const calendarDays: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = []

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month - 1, day),
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day),
    })
  }

  const remainingDays = 42 - calendarDays.length
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day),
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  return (
    <div className="sketch-widget p-4 bg-[#f5f5f3] dark:bg-[#1e1e1c] rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="sketch-title text-sm font-bold text-[#1e1e1c] dark:text-white tracking-wide">
          CALENDAR
        </h3>
        <button
          onClick={goToToday}
          className="sketch-button px-2 py-1 text-[10px] bg-[#1D9E75] hover:bg-[#178a65] text-white rounded"
        >
          Today
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPrevMonth}
          className="sketch-button w-8 h-8 flex items-center justify-center text-[#5f5e5a] dark:text-[#a8a7a0] hover:bg-black/5 dark:hover:bg-white/5 rounded"
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="sketch-text font-bold text-[#1e1e1c] dark:text-white">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={goToNextMonth}
          className="sketch-button w-8 h-8 flex items-center justify-center text-[#5f5e5a] dark:text-[#a8a7a0] hover:bg-black/5 dark:hover:bg-white/5 rounded"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-bold text-[#5f5e5a] dark:text-[#a8a7a0] py-1"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((item, index) => (
          <button
            key={index}
            onClick={() => setSelectedDate(item.date)}
            className={`sketch-box aspect-square flex items-center justify-center text-sm rounded
              ${!item.isCurrentMonth ? 'text-[#b4b2a9] dark:text-[#706f6a] opacity-50' : ''}
              ${isToday(item.date) ? 'bg-[#1D9E75] text-white font-bold' : ''}
              ${isSelected(item.date) && !isToday(item.date) ? 'bg-[#aa3bff] text-white' : ''}
              ${!isToday(item.date) && !isSelected(item.date) ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''}
            `}
          >
            {item.day}
          </button>
        ))}
      </div>

      {selectedDate && (
        <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10">
          <p className="text-xs text-[#5f5e5a] dark:text-[#a8a7a0]">
            Selected: {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  )
}
