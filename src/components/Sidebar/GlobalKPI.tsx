import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../../store/useAppStore'
import { formatNumber, formatYoY, calcYoY, getMetricValue, visaTypeLabel } from '../../utils/dataHelpers'
import { continentHex } from '../../utils/continentColors'
import type { VisaType } from '../../types'

export default function GlobalKPI() {
  const {
    data, year, selectedVisaType,
    setSelectedVisaType, setSelectedCountry, setFocusedCountry,
  } = useAppStore()
  if (!data) return null

  const yr = String(year)
  const prevYr = String(year - 1)

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
      total += getMetricValue(yd, selectedVisaType)
      visaTotals.student += yd.visa.student
      visaTotals.work += yd.visa.work
      visaTotals.resident += yd.visa.resident
      visaTotals.visitor += yd.visa.visitor
      visaTotals.other += yd.visa.other
    }
    prevTotal += getMetricValue(pyd, selectedVisaType)
  }

  const yoy = calcYoY(total, prevTotal)
  const yoyStr = formatYoY(yoy)
  const yoyPositive = yoy !== null && yoy >= 0
  const yearTotals = data.meta.yearTotals?.[yr]
  const allVisaTotal = yearTotals?.totalInflow ?? Object.values(visaTotals).reduce((sum, value) => sum + value, 0)
  const metricTotal = selectedVisaType ? total : allVisaTotal
  const totalOutflow = yearTotals?.totalOutflow ?? 0
  const net = yearTotals?.net ?? allVisaTotal - totalOutflow
  const selectedVisaShare = selectedVisaType && allVisaTotal > 0 ? (metricTotal / allVisaTotal) * 100 : 0

  const visaItems = [
    { key: 'student', name: 'Student', value: visaTotals.student, color: '#00ffee' },
    { key: 'work', name: 'Work', value: visaTotals.work, color: '#00b4d8' },
    { key: 'resident', name: 'Resident', value: visaTotals.resident, color: '#4a9eff' },
    { key: 'visitor', name: 'Visitor', value: visaTotals.visitor, color: '#f59e0b' },
    { key: 'other', name: 'Other', value: visaTotals.other, color: '#a78bfa' },
  ].sort((a, b) => b.value - a.value)

  const countryRanking = data.countries
    .map(c => ({
      country: c,
      code: c.code,
      name: c.name,
      continent: c.continent,
      inflow: getMetricValue(c.byYear[yr], selectedVisaType),
    }))
    .filter(c => c.inflow > 0 && c.continent !== 'Not applicable')
    .sort((a, b) => b.inflow - a.inflow)
    .slice(0, 5)
  const topCountry = countryRanking[0]

  const trendYears = data.meta.years
  const trendValues = trendYears.map(y => {
    if (!selectedVisaType) return data.meta.yearTotals?.[String(y)]?.totalInflow ?? 0
    return data.countries.reduce((sum, c) => sum + getMetricValue(c.byYear[String(y)], selectedVisaType), 0)
  })
  const metricLabel = visaTypeLabel(selectedVisaType)

  const selectCountry = (country: typeof countryRanking[number]) => {
    setSelectedCountry(country.country)
    setFocusedCountry(country.country)
  }

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
            {selectedVisaType ? `${metricLabel} Inflow` : 'Total Inflow'}
          </div>
          <div className="text-2xl font-mono font-semibold text-neon-cyan">
            {formatNumber(metricTotal)}
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
      {selectedVisaType ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
            <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
              Visa Share
            </div>
            <div className="text-2xl font-mono font-semibold text-neon-cyan">
              {selectedVisaShare.toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--color-text-dim)] mt-0.5">of total inflow</div>
          </div>
          <button
            type="button"
            disabled={!topCountry}
            onClick={() => topCountry && selectCountry(topCountry)}
            className="bg-dark-bg rounded-lg p-3 border border-dark-border text-left transition-colors enabled:hover:border-neon-blue disabled:opacity-50"
          >
            <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
              Top Country
            </div>
            <div className="truncate text-lg font-semibold text-[var(--color-text)]">
              {topCountry?.name ?? 'N/A'}
            </div>
            <div className="text-xs text-[var(--color-text-dim)] mt-0.5">
              {topCountry ? formatNumber(topCountry.inflow) : 'No data'}
            </div>
          </button>
        </div>
      ) : (
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
      )}

      {/* Visa distribution */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider">
            Inflow by Visa Type
          </div>
          {selectedVisaType && (
            <button
              type="button"
              onClick={() => setSelectedVisaType(null)}
              className="rounded border border-dark-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] transition-colors hover:border-neon-blue hover:text-neon-cyan"
            >
              All visas
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {visaItems.map((item) => {
            const visaKey = item.key as VisaType
            const isSelected = selectedVisaType === visaKey
            const pct = allVisaTotal > 0 ? (item.value / allVisaTotal) * 100 : 0
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setSelectedVisaType(isSelected ? null : visaKey)}
                className={`group relative flex items-center gap-2 rounded px-1 py-0.5 text-left transition-colors ${
                  isSelected ? 'bg-neon-blue/10 ring-1 ring-neon-cyan/40' : 'hover:bg-dark-bg'
                }`}
              >
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
              </button>
            )
          })}
        </div>
        <div className="mt-2 text-[10px] leading-snug text-[var(--color-text-dim)]">
          Other = Australian, Diplomatic, Limited, Military (source grouping)
        </div>
      </div>

      {/* Country ranking */}
      <div>
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
          {selectedVisaType ? `Top Countries by ${metricLabel}` : 'Inflow by Country'}
        </div>
        <div className="flex flex-col gap-1.5">
          {countryRanking.map((country, i) => {
            const pct = metricTotal > 0 ? (country.inflow / metricTotal) * 100 : 0
            const color = continentHex(country.continent)
            return (
              <button
                key={country.code}
                type="button"
                onClick={() => selectCountry(country)}
                className="group relative flex items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-dark-bg"
              >
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
              </button>
            )
          })}
        </div>
      </div>

      {/* Trend chart */}
      <div>
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
          {selectedVisaType ? `${metricLabel} Trend Over Time` : 'Trend Over Time'}
        </div>
        <ReactECharts option={trendOption} style={{ height: 100 }} />
      </div>
    </div>
  )
}
