import { useRef, useState, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'

export default function YearSlider() {
  const { data, year, setYear } = useAppStore()
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Must be before any early return to satisfy Rules of Hooks
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  if (!data) return null
  const years = data.meta.years
  const minY = years[0]
  const maxY = years[years.length - 1]

  const startPlay = () => {
    if (isPlaying) return
    setIsPlaying(true)
    intervalRef.current = setInterval(() => {
      useAppStore.setState(state => {
        const nextYear = state.year < maxY ? state.year + 1 : minY
        return { year: nextYear }
      })
    }, 1200)
  }

  const stopPlay = () => {
    setIsPlaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const togglePlay = () => (isPlaying ? stopPlay() : startPlay())

  return (
    <div
      className="absolute bottom-0 left-0 right-80 z-10 px-6 py-4 flex items-center gap-4"
      style={{
        background: 'linear-gradient(to top, rgba(10,14,26,0.97) 60%, rgba(10,14,26,0))',
      }}
    >
      {/* Label */}
      <div className="shrink-0">
        <div className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">
          Time Controller
        </div>
        <div className="text-lg font-mono font-semibold text-neon-cyan leading-none mt-0.5">
          {year}
        </div>
      </div>

      {/* Play button */}
      <button
        onClick={togglePlay}
        className="shrink-0 w-8 h-8 rounded-full border border-neon-blue flex items-center justify-center hover:bg-neon-blue/20 transition-colors"
        style={{ color: '#00b4d8' }}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="1" width="3" height="10" rx="1"/>
            <rect x="7" y="1" width="3" height="10" rx="1"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 1.5l7 4.5-7 4.5V1.5z"/>
          </svg>
        )}
      </button>

      {/* Tick marks + slider */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Year ticks */}
        <div className="flex justify-between px-0">
          {years.map(y => (
            <button
              key={y}
              onClick={() => { stopPlay(); setYear(y) }}
              className={`text-[10px] font-mono transition-colors ${
                y === year
                  ? 'text-neon-cyan font-semibold'
                  : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Range slider */}
        <input
          type="range"
          min={minY}
          max={maxY}
          step={1}
          value={year}
          onChange={e => { stopPlay(); setYear(Number(e.target.value)) }}
          className="w-full h-1 appearance-none rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, #00ffee ${((year - minY) / (maxY - minY)) * 100}%, #1a2744 0%)`,
          }}
        />
      </div>
    </div>
  )
}
