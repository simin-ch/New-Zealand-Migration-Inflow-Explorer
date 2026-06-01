export type ViewMode = 'global' | 'continent'

export interface AgeBreakdown {
  under18: number
  age18_30: number
  age31_50: number
  above50: number
}

export interface YearData {
  totalInflow: number
  sex: {
    male: number
    female: number
    noRecord: number
  }
  visa: {
    student: number
    work: number
    resident: number
    visitor: number
    other: number
  }
  age: {
    male: AgeBreakdown | null
    female: AgeBreakdown | null
  }
}

export interface CountryData {
  code: string
  name: string
  continent: string
  lat: number
  lon: number
  byYear: Record<string, YearData>
}

export interface ContinentArcData {
  totalInflow: number
  centerLat: number
  centerLon: number
}

export interface MigrationData {
  meta: {
    years: number[]
    continents: string[]
    jenksBreaks: number[]
    yearTotals: Record<string, {
      totalInflow: number
      totalOutflow: number
      net: number
    }>
  }
  countries: CountryData[]
  continentArcs: Record<string, Record<string, ContinentArcData>>
}
