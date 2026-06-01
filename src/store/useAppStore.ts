import { create } from 'zustand'
import type { ViewMode, MigrationData, CountryData, VisaType } from '../types'

interface AppState {
  data: MigrationData | null
  year: number
  viewMode: ViewMode
  selectedContinent: string | null
  hoveredCountry: CountryData | null
  selectedCountry: CountryData | null
  focusedCountry: CountryData | null
  inflowClassFilter: number | null
  selectedVisaType: VisaType | null

  setData: (data: MigrationData) => void
  setYear: (year: number) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedContinent: (continent: string | null) => void
  setHoveredCountry: (country: CountryData | null) => void
  setSelectedCountry: (country: CountryData | null) => void
  setFocusedCountry: (country: CountryData | null) => void
  setInflowClassFilter: (classIndex: number | null) => void
  setSelectedVisaType: (visaType: VisaType | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  data: null,
  year: 2025,
  viewMode: 'global',
  selectedContinent: null,
  hoveredCountry: null,
  selectedCountry: null,
  focusedCountry: null,
  inflowClassFilter: null,
  selectedVisaType: null,

  setData: (data) => set({ data }),
  setYear: (year) => set({ year }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedContinent: (continent) => set({ selectedContinent: continent }),
  setHoveredCountry: (country) => set({ hoveredCountry: country }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  setFocusedCountry: (country) => set({ focusedCountry: country }),
  setInflowClassFilter: (inflowClassFilter) => set({ inflowClassFilter }),
  setSelectedVisaType: (selectedVisaType) => set({ selectedVisaType }),
}))
