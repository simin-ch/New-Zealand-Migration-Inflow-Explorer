import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../../store/useAppStore'
import { formatNumber, formatYoY, calcYoY } from '../../utils/dataHelpers'
import { continentHex } from '../../utils/continentColors'

export default function GlobalKPI() {
  const { data, year } = useAppStore()
  if (!data) return null

  const yr = String(year)
  const prevYr = String(year - 1)

  // Global total
  let total = 0
  let prevTotal = 0
  const contTotals: Record<string, number> = {}

  for (const c of data.countries) {
    const yd = c.byYear[yr]
    const pyd = c.byYear[prevYr]
    if (yd) {
      total += yd.totalInflow
      contTotals[c.continent] = (contTotals[c.continent] ?? 0) + yd.totalInflow
    }
    if (pyd) prevTotal += pyd.totalInflow
  }

  const yoy = calcYoY(total, prevTotal)
  const yoyStr = formatYoY(yoy)
  const yoyPositive = yoy !== null && yoy >= 0

  // Sorted continent ranking
  const contRanking = Object.entries(contTotals)
    .filter(([k]) => k && k !== 'Not applicable')
    .sort((a, b) => b[1] - a[1])

  // Trend data: global total by year
  const trendYears = data.meta.years
  const trendValues = trendYears.map(y => {
    let t = 0
    for (const c of data.countries) {
      t += c.byYear[String(y)]?.totalInflow ?? 0
    }
    return t
  })

  const trendOption = {
    backgroundColor: 'transparent',
    grid: { left: 10, right: 10, top: 10, bottom: 20 },
    xAxis: {
      type: 'category',
      data: trendYears.map(String),
      axisLabel: { color: '#6a80a8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#1a2744' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#6a80a8', fontSize: 9,
        formatter: (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`,
      },
      splitLine: { lineStyle: { color: '#1a2744', type: 'dashed' } },
    },
    series: [{
      type: 'line',
      data: trendValues,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#00b4d8', width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0,180,216,0.3)' },
            { offset: 1, color: 'rgba(0,180,216,0)' },
          ],
        },
      },
      markLine: {
        silent: true,
        data: [{ xAxis: String(year) }],
        lineStyle: { color: '#00ffee', width: 1, type: 'dashed' },
        label: { show: false },
        symbol: 'none',
      },
    }],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f1629',
      borderColor: '#1a2744',
      textStyle: { color: '#c8d8f0', fontSize: 11 },
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}: ${formatNumber(params[0].value)}`,
    },
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
          <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
            Total Inflow
          </div>
          <div className="text-2xl font-mono font-semibold text-neon-cyan">
            {formatNumber(total)}
          </div>
          <div className="text-xs text-[var(--color-text-dim)] mt-0.5">{year}</div>
        </div>
        <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
          <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
            YoY Change
          </div>
          <div className={`text-2xl font-mono font-semibold ${yoyPositive ? 'text-green-400' : 'text-red-400'}`}>
            {yoyStr}
          </div>
          <div className="text-xs text-[var(--color-text-dim)] mt-0.5">vs {year - 1}</div>
        </div>
      </div>

      {/* Continent ranking */}
      <div>
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          Inflow by Continent
        </div>
        <div className="flex flex-col gap-1.5">
          {contRanking.map(([cont, val], i) => {
            const pct = total > 0 ? (val / total) * 100 : 0
            const color = continentHex(cont)
            return (
              <div key={cont} className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-dim)] w-4 text-right">{i + 1}</span>
                <span className="text-xs text-[var(--color-text)] flex-1 truncate">{cont}</span>
                <div className="flex-1 h-1.5 bg-dark-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-xs font-mono text-[var(--color-text-dim)] w-12 text-right">
                  {pct.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trend chart */}
      <div>
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
          Trend Over Time
        </div>
        <ReactECharts option={trendOption} style={{ height: 100 }} />
      </div>
    </div>
  )
}
