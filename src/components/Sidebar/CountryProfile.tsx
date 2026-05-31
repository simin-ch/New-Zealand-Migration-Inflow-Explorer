import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../../store/useAppStore'
import { formatNumber, formatYoY, calcYoY, pct } from '../../utils/dataHelpers'
import type { YearData } from '../../types'

function DonutChart({ yd }: { yd: YearData }) {
  const total = yd.totalInflow
  const option = {
    backgroundColor: 'transparent',
    legend: { show: false },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0f1629',
      borderColor: '#1a2744',
      textStyle: { color: '#c8d8f0', fontSize: 11 },
      formatter: '{b}: {c} ({d}%)',
    },
    series: [{
      type: 'pie',
      radius: ['50%', '78%'],
      center: ['50%', '50%'],
      data: [
        { name: 'Male',      value: yd.sex.male,     itemStyle: { color: '#4a9eff' } },
        { name: 'Female',    value: yd.sex.female,   itemStyle: { color: '#ff6b9d' } },
        { name: 'No Record', value: yd.sex.noRecord,  itemStyle: { color: '#5a6a88' } },
      ].filter(d => d.value > 0),
      label: {
        show: true,
        formatter: '{b}\n{d}%',
        color: '#c8d8f0',
        fontSize: 10,
      },
      labelLine: { lineStyle: { color: '#2a3a5c' } },
    }],
  }

  return (
    <div>
      <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1">
        Sex Distribution
        <span className="ml-1 text-[var(--color-muted)] normal-case">
          · total {formatNumber(total)}
        </span>
      </div>
      <ReactECharts option={option} style={{ height: 140 }} />
    </div>
  )
}

function VisaBar({ yd }: { yd: YearData }) {
  const total = yd.totalInflow
  const items = [
    { name: 'Student',   value: yd.visa.student,  color: '#00ffee' },
    { name: 'Work',      value: yd.visa.work,      color: '#00b4d8' },
    { name: 'Resident',  value: yd.visa.resident,  color: '#4a9eff' },
    { name: 'Other',     value: yd.visa.other,     color: '#a78bfa' },
  ]

  const option = {
    backgroundColor: 'transparent',
    grid: { left: 60, right: 50, top: 5, bottom: 5 },
    xAxis: {
      type: 'value',
      axisLabel: { show: false },
      splitLine: { lineStyle: { color: '#1a2744', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: items.map(i => i.name),
      axisLabel: { color: '#c8d8f0', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: items.map((item, i) => ({
        value: item.value,
        itemStyle: { color: item.color, borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: 'right',
          formatter: () => `${pct(item.value, total).toFixed(1)}%`,
          color: '#6a80a8',
          fontSize: 10,
        },
      })),
      barMaxWidth: 16,
    }],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
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
        Visa Type Structure
      </div>
      <ReactECharts option={option} style={{ height: 110 }} />
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
    grid: { left: 50, right: 50, top: 5, bottom: 20 },
    xAxis: {
      type: 'value',
      min: -maxVal * 1.15,
      max: maxVal * 1.15,
      axisLabel: {
        color: '#6a80a8', fontSize: 9,
        formatter: (v: number) => `${Math.abs(Math.round(v / maxVal * 100))}%`,
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
      bottom: 0,
      data: ['Male', 'Female'],
      textStyle: { color: '#6a80a8', fontSize: 10 },
      itemWidth: 10, itemHeight: 10,
    },
  }

  return (
    <div>
      <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-1 flex items-center gap-1">
        Age Distribution (Population Pyramid)
        {isIncomplete && (
          <span
            title="Sex data incomplete for this year"
            className="text-yellow-400 cursor-help"
          >
            ⚠
          </span>
        )}
      </div>
      <ReactECharts option={option} style={{ height: 160 }} />
      <div className="text-[10px] text-[var(--color-text-dim)] mt-0.5 italic">
        Age groups reflect source data classification
      </div>
    </div>
  )
}

export default function CountryProfile() {
  const { hoveredCountry, selectedCountry, year } = useAppStore()
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

  const yoy = calcYoY(yd.totalInflow, pyd?.totalInflow ?? 0)
  const yoyPositive = yoy !== null && yoy >= 0

  return (
    <div className="flex flex-col gap-4">
      {/* Country header */}
      <div>
        <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider mb-0.5">
          {country.continent}
        </div>
        <div className="text-lg font-semibold text-[var(--color-text)]">{country.name}</div>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-2xl font-mono font-semibold text-neon-cyan">
            {formatNumber(yd.totalInflow)}
          </span>
          <span className={`text-sm font-mono ${yoyPositive ? 'text-green-400' : 'text-red-400'}`}>
            {formatYoY(yoy)} YoY
          </span>
        </div>
        <div className="text-xs text-[var(--color-text-dim)] mt-0.5">
          {yd.totalInflow > 0
            ? `Share of ${country.continent} inflow`
            : 'No migration record this year'}
        </div>
      </div>

      <DonutChart yd={yd} />
      <VisaBar yd={yd} />
      <PyramidChart yd={yd} />
    </div>
  )
}
