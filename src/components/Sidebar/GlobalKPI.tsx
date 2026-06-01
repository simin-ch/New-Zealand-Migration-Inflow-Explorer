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
  const visaTotals = {
    student: 0,
    work: 0,
    resident: 0,
    visitor: 0,
    other: 0,
  }

  for (const c of data.countries) {
    const yd = c.byYear[yr]
    const pyd = c.byYear[prevYr]
    if (yd) {
      total += yd.totalInflow
      visaTotals.student += yd.visa.student
      visaTotals.work += yd.visa.work
      visaTotals.resident += yd.visa.resident
      visaTotals.visitor += yd.visa.visitor
      visaTotals.other += yd.visa.other
    }
    if (pyd) prevTotal += pyd.totalInflow
  }

  const yoy = calcYoY(total, prevTotal)
  const yoyStr = formatYoY(yoy)
  const yoyPositive = yoy !== null && yoy >= 0
  const yearTotals = data.meta.yearTotals?.[yr]
  const totalInflow = yearTotals?.totalInflow ?? total
  const totalOutflow = yearTotals?.totalOutflow ?? 0
  const net = yearTotals?.net ?? totalInflow - totalOutflow

  const visaItems = [
    { name: 'Student', value: visaTotals.student, color: '#00ffee' },
    { name: 'Work', value: visaTotals.work, color: '#00b4d8' },
    { name: 'Resident', value: visaTotals.resident, color: '#4a9eff' },
    { name: 'Visitor', value: visaTotals.visitor, color: '#f59e0b' },
    { name: 'Other', value: visaTotals.other, color: '#a78bfa' },
  ].sort((a, b) => b.value - a.value)

  const countryRanking = data.countries
    .map(c => ({
      code: c.code,
      name: c.name,
      continent: c.continent,
      inflow: c.byYear[yr]?.totalInflow ?? 0,
    }))
    .filter(c => c.inflow > 0 && c.continent !== 'Not applicable')
    .sort((a, b) => b.inflow - a.inflow)
    .slice(0, 5)

  // Trend data: global total by year
  const trendYears = data.meta.years
  const trendValues = trendYears.map(y => data.meta.yearTotals?.[String(y)]?.totalInflow ?? 0)

  const trendOption = {
    backgroundColor: 'transparent',
    grid: { left: 38, right: 10, top: 10, bottom: 20 },
    xAxis: {
      type: 'category',
      data: trendYears.map(String),
      axisLabel: { color: '#6a80a8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#1a2744' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        color: '#6a80a8', fontSize: 9,
        formatter: (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`,
      },
      axisLine: { show: true, lineStyle: { color: '#1a2744' } },
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
            {formatNumber(totalInflow)}
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
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
          <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
            Total Outflow
          </div>
          <div className="text-2xl font-mono font-semibold text-orange-300">
            {formatNumber(totalOutflow)}
          </div>
          <div className="text-xs text-[var(--color-text-dim)] mt-0.5">{year}</div>
        </div>
        <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
          <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
            Net
          </div>
          <div className={`text-2xl font-mono font-semibold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {net >= 0 ? '+' : ''}{formatNumber(net)}
          </div>
          <div className="text-xs text-[var(--color-text-dim)] mt-0.5">inflow - outflow</div>
        </div>
      </div>

      {/* Visa distribution */}
      <div>
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          Inflow by Visa Type
        </div>
        <div className="flex flex-col gap-1.5">
          {visaItems.map((item) => {
            const pct = totalInflow > 0 ? (item.value / totalInflow) * 100 : 0
            return (
              <div key={item.name} className="group relative flex cursor-default items-center gap-2">
                <span className="text-xs text-[var(--color-text)] flex-1 truncate">{item.name}</span>
                <div className="flex-1 h-1.5 bg-dark-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="text-xs font-mono text-[var(--color-text-dim)] w-12 text-right">
                  {pct.toFixed(1)}%
                </span>
                <span className="hidden group-hover:block absolute right-0 -top-7 z-20 whitespace-nowrap rounded border border-[#1a2744] bg-[#0f1629] px-2 py-1 font-mono text-[11px] text-[#c8d8f0] shadow-lg">
                  {item.name}: {formatNumber(item.value)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Country ranking */}
      <div>
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          Inflow by Country
        </div>
        <div className="flex flex-col gap-1.5">
          {countryRanking.map((country, i) => {
            const pct = totalInflow > 0 ? (country.inflow / totalInflow) * 100 : 0
            const color = continentHex(country.continent)
            return (
              <div key={country.code} className="group relative flex cursor-default items-center gap-2">
                <span className="text-xs text-[var(--color-text-dim)] w-4 text-right">{i + 1}</span>
                <span className="text-xs text-[var(--color-text)] flex-1 truncate">{country.name}</span>
                <div className="flex-1 h-1.5 bg-dark-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-xs font-mono text-[var(--color-text-dim)] w-12 text-right">
                  {pct.toFixed(1)}%
                </span>
                <span className="hidden group-hover:block absolute right-0 -top-7 z-20 whitespace-nowrap rounded border border-[#1a2744] bg-[#0f1629] px-2 py-1 font-mono text-[11px] text-[#c8d8f0] shadow-lg">
                  {country.name}: {formatNumber(country.inflow)}
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
