import { useAppStore } from '../../store/useAppStore'
import { PALETTE, ZERO_COLOR } from '../../utils/colorScale'
import { formatNumber } from '../../utils/dataHelpers'

export default function MapLegend() {
  const { data, viewMode } = useAppStore()
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
        {colors.map((color, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: color, border: i === 0 ? '1px solid #2a3a5c' : 'none' }}
            />
            <span className="text-[10px] text-[var(--color-text-dim)]">{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
