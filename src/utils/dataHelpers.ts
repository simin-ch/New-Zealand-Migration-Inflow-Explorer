import type { CountryData, YearData, VisaType } from '../types'

export function getYearData(country: CountryData, year: number): YearData | null {
  return country.byYear[String(year)] ?? null
}

export function getTotalInflow(country: CountryData, year: number): number {
  return getYearData(country, year)?.totalInflow ?? 0
}

export function getMetricValue(yd: YearData | null | undefined, visaType: VisaType | null): number {
  if (!yd) return 0
  return visaType ? yd.visa[visaType] : yd.totalInflow
}

export function visaTypeLabel(visaType: VisaType | null): string {
  if (!visaType) return 'All Visas'
  return {
    student: 'Student',
    work: 'Work',
    resident: 'Resident',
    visitor: 'Visitor',
    other: 'Other',
  }[visaType]
}

export function formatNumber(n: number): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function calcYoY(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

export function formatYoY(pct: number | null): string {
  if (pct === null) return 'N/A'
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export function pct(part: number, total: number): number {
  if (total === 0) return 0
  return (part / total) * 100
}
