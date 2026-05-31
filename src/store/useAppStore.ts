import { create } from 'zustand'
import type { ViewMode, MigrationData, CountryData } from '../types'

interface AppState {
  data: MigrationData | null
  year: number
  viewMode: ViewMode
  selectedContinent: string | null
  hoveredCountry: CountryData | null
  selectedCountry: CountryData | null

  setData: (data: MigrationData) => void
  setYear: (year: number) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedContinent: (continent: string | null) => void
  setHoveredCountry: (country: CountryData | null) => void
  setSelectedCountry: (country: CountryData | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  data: null,
  year: 2024,
  viewMode: 'global',
  selectedContinent: null,
  hoveredCountry: null,
  selectedCountry: null,

  setData: (data) => set({ data }),
  setYear: (year) => set({ year }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedContinent: (continent) => set({ selectedContinent: continent }),
  setHoveredCountry: (country) => set({ hoveredCountry: country }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
}))
