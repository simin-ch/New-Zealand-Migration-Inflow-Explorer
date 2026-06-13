import { useAppStore } from '../../store/useAppStore'
import { PALETTE, ZERO_COLOR } from '../../utils/colorScale'
import { formatNumber } from '../../utils/dataHelpers'

export default function MapLegend() {
  const { data, viewMode, inflowClassFilter, setInflowClassFilter } = useAppStore()
  if (!data || viewMode === 'global') return null

  const breaks = data.meta.jenksBreaks
  // breaks = [min, b1, b2, b3, b4, max]
  const labels = [
    `0`,
    `1 – ${formatNumber(breaks[1])}`,
    `${formatNumber(breaks[1])} – ${formatNumber(breaks[2])}`,
    `${formatNumber(breaks[2])} – ${formatNumber(breaks[3])}`,
    `${formatNumber(breaks[3])} – ${formatNumber(breaks[4])}`,
    `${formatNumber(breaks[4])}+`,
  ]
  const colors = [ZERO_COLOR, ...PALETTE]

  return (
    <div
      className="absolute bottom-20 left-4 z-10 px-3 py-2 rounded-lg"
      style={{
        background: 'rgba(10,14,26,0.88)',
        border: '1px solid var(--color-border)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
        Inflow Volume
      </div>
      <div className="flex flex-col gap-1">
        {colors.map((color, i) => {
          const isActive = inflowClassFilter === i
          return (
          <button
            key={i}
            type="button"
            onClick={() => setInflowClassFilter(isActive ? null : i)}
            className="flex items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-white/5"
            title={isActive ? 'Click to show all classes' : `Show ${labels[i]} only`}
          >
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{
                backgroundColor: color,
                border: isActive ? '2px solid #00ffee' : (i === 0 ? '1px solid #c5d3e8' : 'none'),
                boxShadow: isActive ? '0 0 8px rgba(0,255,238,0.7)' : 'none',
              }}
            />
            <span className={`text-[10px] ${isActive ? 'text-neon-cyan' : 'text-[var(--color-text-dim)]'}`}>
              {labels[i]}
            </span>
          </button>
        )})}
      </div>
      {inflowClassFilter !== null && (
        <button
          type="button"
          onClick={() => setInflowClassFilter(null)}
          className="mt-2 text-[10px] text-[var(--color-text-dim)] hover:text-neon-cyan"
        >
          Show all
        </button>
      )}
    </div>
  )
}
