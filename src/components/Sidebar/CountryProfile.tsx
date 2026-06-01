import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../../store/useAppStore'
import { formatNumber, formatYoY, calcYoY, pct, getMetricValue, visaTypeLabel } from '../../utils/dataHelpers'
import type { CountryData, YearData, VisaType } from '../../types'

function VisaBar({
  yd,
  selectedVisaType,
  setSelectedVisaType,
}: {
  yd: YearData
  selectedVisaType: VisaType | null
  setSelectedVisaType: (visaType: VisaType | null) => void
}) {
  const total = yd.totalInflow
  const items = [
    { key: 'student', name: 'Student',   value: yd.visa.student,  color: '#00ffee' },
    { key: 'work', name: 'Work',      value: yd.visa.work,      color: '#00b4d8' },
    { key: 'resident', name: 'Resident',  value: yd.visa.resident,  color: '#4a9eff' },
    { key: 'visitor', name: 'Visitor',   value: yd.visa.visitor,   color: '#f59e0b' },
    { key: 'other', name: 'Other',     value: yd.visa.other,     color: '#a78bfa' },
  ]

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider">
          Visa Type Structure
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
        {items.map((item) => {
          const visaKey = item.key as VisaType
          const isSelected = selectedVisaType === visaKey
          const itemPct = pct(item.value, total)
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedVisaType(isSelected ? null : visaKey)}
              className={`group relative flex items-center gap-2 rounded px-1 py-1 text-left transition-colors ${
                isSelected ? 'bg-neon-blue/10 ring-1 ring-neon-cyan/40' : 'hover:bg-dark-bg'
              }`}
              title={`Filter by ${item.name} visa`}
            >
              <span className="w-16 text-xs text-[var(--color-text)]">{item.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-dark-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${itemPct}%`, backgroundColor: item.color }}
                />
              </div>
              <span className="w-12 text-right font-mono text-xs text-[var(--color-text-dim)]">
                {itemPct.toFixed(1)}%
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
  )
}

function PyramidChart({ yd }: { yd: YearData }) {
  const male   = yd.age.male
  const female = yd.age.female
  const hasMale   = male   !== null
  const hasFemale = female !== null
  const isIncomplete = !hasMale || !hasFemale

  const groups = ['Under 18', '18 – 30', '31 – 50', '50+']
  const maleKeys  = ['under18', 'age18_30', 'age31_50', 'above50'] as const
  const maleVals   = hasMale   ? maleKeys.map(k => male![k])   : [0, 0, 0, 0]
  const femaleVals = hasFemale ? maleKeys.map(k => female![k]) : [0, 0, 0, 0]

  const maxVal = Math.max(...maleVals, ...femaleVals, 1)

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 50, right: 50, top: 5, bottom: 42 },
    xAxis: {
      type: 'value',
      min: -maxVal,
      max: maxVal,
      interval: maxVal / 2,
      axisLabel: {
        color: '#6a80a8', fontSize: 9,
        formatter: (v: number) => `${Math.abs(Math.round(v / maxVal * 100))}%`,
        margin: 8,
      },
      splitLine: { lineStyle: { color: '#1a2744', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: groups,
      axisLabel: { color: '#c8d8f0', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Male',
        type: 'bar',
        stack: 'total',
        data: maleVals.map(v => -v),
        itemStyle: { color: '#4a9eff', borderRadius: [3, 0, 0, 3] },
        barMaxWidth: 18,
        label: { show: false },
      },
      {
        name: 'Female',
        type: 'bar',
        stack: 'total',
        data: femaleVals,
        itemStyle: { color: '#ff6b9d', borderRadius: [0, 3, 3, 0] },
        barMaxWidth: 18,
        label: { show: false },
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      backgroundColor: '#0f1629',
      borderColor: '#1a2744',
      textStyle: { color: '#c8d8f0', fontSize: 11 },
      formatter: (params: { seriesName: string; value: number; name: string }[]) => {
        const grp = params[0]?.name ?? ''
        const m = params.find(p => p.seriesName === 'Male')
        const f = params.find(p => p.seriesName === 'Female')
        return [
          grp,
          m ? `♂ Male: ${formatNumber(Math.abs(m.value))}` : '',
          f ? `♀ Female: ${formatNumber(f.value)}` : '',
        ].filter(Boolean).join('<br/>')
      },
    },
    legend: {
      bottom: 2,
      data: ['Male', 'Female'],
      textStyle: { color: '#6a80a8', fontSize: 10 },
      itemWidth: 10, itemHeight: 10,
    },
  }

  return (
    <div>
      <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1 flex items-center gap-1">
        Age Distribution (All visas)
        {isIncomplete && (
          <span
            title="Sex data incomplete for this year"
            className="text-yellow-400 cursor-help"
          >
            ⚠
          </span>
        )}
      </div>
      <ReactECharts option={option} style={{ height: 170 }} />
    </div>
  )
}

function TrendChart({
  country,
  years,
  currentYear,
  selectedVisaType,
}: {
  country: CountryData
  years: number[]
  currentYear: number
  selectedVisaType: VisaType | null
}) {
  const metricLabel = visaTypeLabel(selectedVisaType)
  const values = years.map(y => getMetricValue(country.byYear[String(y)], selectedVisaType))

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 38, right: 10, top: 10, bottom: 20 },
    xAxis: {
      type: 'category',
      data: years.map(String),
      axisLabel: { color: '#6a80a8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#1a2744' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: {
        color: '#6a80a8',
        fontSize: 9,
        formatter: (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v),
      },
      axisLine: { show: true, lineStyle: { color: '#1a2744' } },
      splitLine: { lineStyle: { color: '#1a2744', type: 'dashed' } },
    },
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#00b4d8', width: 2 },
      itemStyle: { color: '#00ffee' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0,180,216,0.28)' },
            { offset: 1, color: 'rgba(0,180,216,0)' },
          ],
        },
      },
      markLine: {
        silent: true,
        data: [{ xAxis: String(currentYear) }],
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
    <div>
      <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
        Trend Over Time {selectedVisaType ? `(${metricLabel})` : ''}
      </div>
      <ReactECharts option={option} style={{ height: 110 }} />
    </div>
  )
}

export default function CountryProfile() {
  const {
    data, hoveredCountry, selectedCountry, year, selectedVisaType,
    setHoveredCountry, setSelectedCountry, setFocusedCountry, setSelectedVisaType,
  } = useAppStore()
  const country = selectedCountry ?? hoveredCountry
  if (!country) return null

  const yd = country.byYear[String(year)]
  const pyd = country.byYear[String(year - 1)]
  if (!yd) {
    return (
      <div className="text-sm text-[var(--color-text-dim)] p-4 text-center">
        No data for {country.name} in {year}
      </div>
    )
  }

  const metricValue = getMetricValue(yd, selectedVisaType)
  const previousMetricValue = getMetricValue(pyd, selectedVisaType)
  const metricLabel = visaTypeLabel(selectedVisaType)
  const yoy = calcYoY(metricValue, previousMetricValue)
  const yoyPositive = yoy !== null && yoy >= 0
  const globalTotal = selectedVisaType
    ? (data?.countries ?? []).reduce((sum, c) => sum + getMetricValue(c.byYear[String(year)], selectedVisaType), 0)
    : data?.meta.yearTotals?.[String(year)]?.totalInflow ?? 0
  const shareOfTotal = globalTotal > 0 ? pct(metricValue, globalTotal) : 0
  const rankedCountries = (data?.countries ?? [])
    .map(c => ({
      country: c,
      inflow: getMetricValue(c.byYear[String(year)], selectedVisaType),
    }))
    .filter(d => d.inflow > 0)
    .sort((a, b) => b.inflow - a.inflow)
  const currentRankIndex = rankedCountries.findIndex(d => d.country.code === country.code)
  const globalRank = currentRankIndex >= 0 ? currentRankIndex + 1 : null
  const previousCountry = currentRankIndex > 0 ? rankedCountries[currentRankIndex - 1] : null
  const nextCountry =
    currentRankIndex >= 0 && currentRankIndex < rankedCountries.length - 1
      ? rankedCountries[currentRankIndex + 1]
      : null

  const navigateToCountry = (target: typeof rankedCountries[number] | null) => {
    if (!target) return
    setHoveredCountry(null)
    setSelectedCountry(target.country)
    setFocusedCountry(target.country)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Country header */}
      <div>
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-0.5">
          {country.continent}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-semibold text-[var(--color-text)] truncate">{country.name}</div>
          {globalRank && (
            <div className="shrink-0 rounded-full border border-neon-blue/50 bg-neon-blue/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-neon-cyan">
              Rank #{globalRank} Global
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-2xl font-mono font-semibold text-neon-cyan">
            {formatNumber(metricValue)}
          </span>
          <span className={`text-sm font-mono ${yoyPositive ? 'text-green-400' : 'text-red-400'}`}>
            {formatYoY(yoy)} YoY
          </span>
        </div>
        <div className="text-xs text-[var(--color-text-dim)] mt-0.5">
          {metricValue > 0
            ? `Share of ${metricLabel} ${shareOfTotal.toFixed(2)}%`
            : 'No migration record this year'}
        </div>
        {selectedVisaType && (
          <div className="mt-1 text-[11px] text-neon-cyan">
            Visa lens: {metricLabel} · Total country inflow {formatNumber(yd.totalInflow)}
          </div>
        )}
        {globalRank && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              disabled={!previousCountry}
              onClick={() => navigateToCountry(previousCountry)}
              className="rounded border border-dark-border bg-dark-bg px-2 py-1.5 text-left text-[11px] text-[var(--color-text-dim)] transition-colors enabled:hover:border-neon-blue enabled:hover:text-[var(--color-text)] disabled:opacity-35"
              title={previousCountry ? `#${globalRank - 1} ${previousCountry.country.name}` : 'Already top ranked'}
            >
              <div className="font-mono text-[10px]">‹ Previous</div>
              <div className="truncate text-[var(--color-text)]">
                {previousCountry ? `#${globalRank - 1} ${previousCountry.country.name}` : 'Top ranked'}
              </div>
            </button>
            <button
              type="button"
              disabled={!nextCountry}
              onClick={() => navigateToCountry(nextCountry)}
              className="rounded border border-dark-border bg-dark-bg px-2 py-1.5 text-right text-[11px] text-[var(--color-text-dim)] transition-colors enabled:hover:border-neon-blue enabled:hover:text-[var(--color-text)] disabled:opacity-35"
              title={nextCountry ? `#${globalRank + 1} ${nextCountry.country.name}` : 'Already last ranked'}
            >
              <div className="font-mono text-[10px]">Next ›</div>
              <div className="truncate text-[var(--color-text)]">
                {nextCountry ? `#${globalRank + 1} ${nextCountry.country.name}` : 'Last ranked'}
              </div>
            </button>
          </div>
        )}
      </div>

      <VisaBar
        yd={yd}
        selectedVisaType={selectedVisaType}
        setSelectedVisaType={setSelectedVisaType}
      />
      {data && (
        <TrendChart
          country={country}
          years={data.meta.years}
          currentYear={year}
          selectedVisaType={selectedVisaType}
        />
      )}
      <PyramidChart yd={yd} />
    </div>
  )
}
