import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ArcLayer, GeoJsonLayer } from '@deck.gl/layers'
import { useAppStore } from '../../store/useAppStore'
import { inflowToColor } from '../../utils/colorScale'
import { continentRgb } from '../../utils/continentColors'
import type { CountryData, ContinentArcData } from '../../types'

const NZ_CENTER: [number, number] = [174.0, -41.0]

const NZ_TARGETS: Record<string, [number, number]> = {
  Asia:     [179.0, -36.0],
  Europe:   [167.0, -39.5],
  Oceania:  [174.0, -35.0],
  Americas: [176.0, -46.5],
  Africa:   [169.0, -44.5],
}

const GLOBAL_CENTER: [number, number] = [140.0, -20.0]
const GLOBAL_ZOOM_TARGET = 1.15
const CONTINENT_ZOOM = 3.5
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

interface ArcDatum {
  sourcePosition: [number, number]
  targetPosition: [number, number]
  inflow: number
  continent: string
}

interface WorldFeature {
  type: 'Feature'
  geometry: object
  properties: { iso_a3: string; continent: string }
}
interface WorldGeoJson {
  type: 'FeatureCollection'
  features: WorldFeature[]
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const deckRef = useRef<MapboxOverlay | null>(null)
  const hoveredFeatureRef = useRef<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [worldGeo, setWorldGeo] = useState<WorldGeoJson | null>(null)

  useEffect(() => {
    fetch('/data/world_countries.geojson')
      .then(r => r.json())
      .then((d: WorldGeoJson) => setWorldGeo(d))
      .catch(err => console.error('Failed to load world GeoJSON:', err))
  }, [])

  const {
    data, year, viewMode,
    setViewMode, setSelectedContinent,
    setHoveredCountry, setSelectedCountry,
  } = useAppStore()

  const buildArcData = useCallback((): ArcDatum[] => {
    if (!data) return []
    const arcs = data.continentArcs[String(year)]
    if (!arcs) return []
    return Object.entries(arcs).map(([continent, arc]: [string, ContinentArcData]) => ({
      sourcePosition: [arc.centerLon, arc.centerLat] as [number, number],
      targetPosition: NZ_TARGETS[continent] ?? NZ_CENTER,
      inflow: arc.totalInflow,
      continent,
    }))
  }, [data, year])

  const buildCountryFeatures = useCallback(() => {
    if (!data) return []
    return data.countries.map((c: CountryData) => {
      const yd = c.byYear[String(year)]
      const inflow = yd?.totalInflow ?? 0
      const hex = inflowToColor(inflow, data.meta.jenksBreaks)
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] as [number, number] },
        properties: { code: c.code, name: c.name, continent: c.continent, inflow, r, g, b },
      }
    })
  }, [data, year])

  const updateLayers = useCallback(() => {
    if (!deckRef.current || !data) return
    const isGlobal = viewMode === 'global'
    const arcData = buildArcData()
    const maxInflow = Math.max(...arcData.map(d => d.inflow), 1)

    const continentFillLayer = new GeoJsonLayer({
      id: 'continent-fill',
      data: worldGeo ?? { type: 'FeatureCollection', features: [] },
      visible: true,
      filled: true,
      stroked: false,
      getFillColor: (f: { properties: { continent: string } }) => {
        const [r, g, b] = continentRgb(f.properties.continent)
        return [r, g, b, 55] as [number, number, number, number]
      },
      pickable: false,
    })

    const arcLayer = new ArcLayer<ArcDatum>({
      id: 'arc-layer',
      data: arcData,
      visible: isGlobal,
      getSourcePosition: d => d.sourcePosition,
      getTargetPosition: d => d.targetPosition,
      getSourceColor: (d: ArcDatum) => {
        const [r, g, b] = continentRgb(d.continent)
        return [r, g, b, 200] as [number, number, number, number]
      },
      getTargetColor: (d: ArcDatum) => {
        const [r, g, b] = continentRgb(d.continent)
        return [r, g, b, 120] as [number, number, number, number]
      },
      getWidth: d => Math.max(5, (d.inflow / maxInflow) * 28),
      getHeight: (d: ArcDatum) => d.continent === 'Asia' ? 2.2 : 1.0,
      greatCircle: true,
      pickable: false,
    })

    const features = buildCountryFeatures()
    const countryLayer = new GeoJsonLayer({
      id: 'country-dots',
      data: { type: 'FeatureCollection' as const, features },
      visible: !isGlobal,
      filled: true,
      stroked: true,
      getPointRadius: (f: { properties: { inflow: number } }) =>
        Math.max(50000, Math.sqrt(f.properties.inflow) * 1200),
      getFillColor: (f: { properties: { r: number; g: number; b: number } }) =>
        [f.properties.r, f.properties.g, f.properties.b, 200] as [number, number, number, number],
      getLineColor: [0, 255, 238, 60] as [number, number, number, number],
      lineWidthMinPixels: 1,
      pointRadiusUnits: 'meters',
      pointRadiusMinPixels: 4,
      pointRadiusMaxPixels: 40,
      pickable: true,
      onHover: (info: { object?: { properties: { code: string } } | null }) => {
        if (info.object) {
          const code = info.object.properties.code
          if (hoveredFeatureRef.current !== code) {
            hoveredFeatureRef.current = code
            const c = data.countries.find((x: CountryData) => x.code === code)
            if (c) setHoveredCountry(c)
          }
        } else {
          hoveredFeatureRef.current = null
          setHoveredCountry(null)
        }
      },
      onClick: (info: { object?: { properties: { code: string } } | null }) => {
        if (info.object) {
          const c = data.countries.find((x: CountryData) => x.code === info.object!.properties.code)
          if (c) setSelectedCountry(c)
        }
      },
    })

    deckRef.current.setProps({ layers: [continentFillLayer, arcLayer, countryLayer] })
  }, [data, year, viewMode, worldGeo, buildArcData, buildCountryFeatures, setHoveredCountry, setSelectedCountry])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: GLOBAL_CENTER,
        zoom: 1,
        minZoom: 0.5,
        maxZoom: 8,
        attributionControl: false,
      })
    } catch (e) {
      console.error('[MapView] Map init failed:', e)
      setMapError(String(e))
      return
    }

    mapRef.current = map

    map.on('load', () => {
      map.dragPan.disable()
      map.scrollZoom.disable()
      map.dragRotate.disable()
      map.touchZoomRotate.disable()
      map.keyboard.disable()
      map.doubleClickZoom.disable()

      map.jumpTo({ center: GLOBAL_CENTER, zoom: GLOBAL_ZOOM_TARGET })

      try {
        const overlay = new MapboxOverlay({ layers: [], interleaved: false })
        map.addControl(overlay as unknown as maplibregl.IControl)
        deckRef.current = overlay
        updateLayers()
      } catch (e) {
        console.error('[MapView] Deck.gl overlay failed:', e)
      }
    })

    map.on('error', (e) => console.error('[MapView]', e))

    map.on('dblclick', (e) => {
      const currentMode = useAppStore.getState().viewMode
      if (currentMode === 'global') {
        map.flyTo({ center: [e.lngLat.lng, e.lngLat.lat], zoom: CONTINENT_ZOOM, duration: 1000 })
        map.dragPan.enable()
        map.scrollZoom.enable()
        useAppStore.getState().setViewMode('continent')
        setSelectedContinent(null)
      }
    })

    map.on('contextmenu', (e) => {
      e.originalEvent.preventDefault()
      const currentMode = useAppStore.getState().viewMode
      if (currentMode === 'continent') {
        map.dragPan.disable()
        map.scrollZoom.disable()
        map.flyTo({ center: GLOBAL_CENTER, zoom: GLOBAL_ZOOM_TARGET, duration: 1000 })
        useAppStore.getState().setViewMode('global')
        useAppStore.getState().setSelectedCountry(null)
        useAppStore.getState().setHoveredCountry(null)
      }
    })

    map.on('zoomend', () => {
      const z = map.getZoom()
      const store = useAppStore.getState()
      if (z < 2.0 && store.viewMode === 'continent') {
        store.setViewMode('global')
        store.setSelectedCountry(null)
        store.setHoveredCountry(null)
      } else if (z >= 2.0 && store.viewMode === 'global') {
        store.setViewMode('continent')
      }
    })

    return () => {
      deckRef.current = null
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (deckRef.current) updateLayers()
  }, [updateLayers])

  if (mapError) {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 320, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a' }}>
        <div style={{ color: '#ff6b6b', fontFamily: 'monospace', textAlign: 'center' }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>Map initialization failed</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{mapError}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      style={{ position: 'absolute', top: 0, left: 0, right: 320, bottom: 0 }}
    />
  )
}
