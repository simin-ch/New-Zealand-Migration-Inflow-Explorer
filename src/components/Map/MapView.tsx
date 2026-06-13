import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { Layer } from '@deck.gl/core'
import { PathLayer, GeoJsonLayer } from '@deck.gl/layers'
import { useAppStore } from '../../store/useAppStore'
import { classIndex, inflowToColor } from '../../utils/colorScale'
import { continentRgb } from '../../utils/continentColors'
import { getMetricValue, visaTypeLabel } from '../../utils/dataHelpers'
import type { CountryData, ContinentArcData } from '../../types'

const NZ_CENTER: [number, number] = [174.0, -41.0]
const GLOBAL_CENTER: [number, number] = [25.0, -8.0]
const GLOBAL_ZOOM_TARGET = 0.92
const CONTINENT_ZOOM = 3.5
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const BEZIER_STEPS = 32
const ARC_MIN_WIDTH = 1.2
const ARC_MAX_WIDTH = 34
const ARC_WIDTH_EXPONENT = 1.4
const FLOW_SPEED = 0.0016
const FLOW_PULSE_SPAN = 3

/**
 * Quadratic bezier control points per continent.
 * Each arc approaches NZ from a distinct compass direction
 * so the five flows never fold on top of each other.
 *
 *  Asia     → ctrl in equatorial W-Pacific  → arrives from the north
 *  Europe   → ctrl deep in southern IO      → arrives from the WSW (sweeps under Africa)
 *  Oceania  → virtual source on western Australia → short, low arc
 *  Americas → drawn from the visible western hemisphere copy
 *  Africa   → ctrl in mid Indian Ocean      → arrives from the west
 */
const CONTINENT_CTRL: Record<string, [number, number]> = {
  Asia:     [155,   5],
  Europe:   [ 80, -60],
  Oceania:  [135, -20],
  Americas: [-120, -55],
  Africa:   [115, -48],
}

const CONTINENT_SOURCE_OVERRIDES: Record<string, [number, number]> = {
  // Use western Australia so Oceania does not visually originate from Asia.
  Oceania:  [115, -25],
  // Keep Americas in the visible western hemisphere for the fixed full-world camera.
  Americas: [-80, 10],
}

interface ContinentArc {
  pts: [number, number][]
  baseWidth: number
  rgb: [number, number, number]
  continent: string
  totalInflow: number
  shareOfTotal: number
  topCountries: { name: string; inflow: number }[]
  flowRatio: number
}

interface TaperedSegment {
  path: [[number, number], [number, number]]
  width: number
  color: [number, number, number, number]
  continent: string
  totalInflow: number
  shareOfTotal: number
  topCountries: { name: string; inflow: number }[]
}

interface FlowSegment {
  path: [number, number][]
  width: number
  color: [number, number, number, number]
  continent: string
}

interface ArcTooltip {
  x: number
  y: number
  continent: string
  totalInflow: number
  shareOfTotal: number
  topCountries: { name: string; inflow: number }[]
}

interface CountryTooltip {
  x: number
  y: number
  name: string
  inflow: number
  shareOfTotal: number
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

/** Sample a quadratic bezier curve into BEZIER_STEPS+1 lon/lat points. */
function bezierPoints(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
): [number, number][] {
  return Array.from({ length: BEZIER_STEPS + 1 }, (_, i) => {
    const t = i / BEZIER_STEPS
    const mt = 1 - t
    return [
      mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
      mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
    ] as [number, number]
  })
}

/**
 * Convert a bezier curve into BEZIER_STEPS tapered segments.
 * Width tapers from baseWidth at the source to ~0.5 px at NZ.
 * Alpha also fades toward the tip so the end vanishes cleanly.
 */
function taperedSegments(
  pts: [number, number][],
  baseWidth: number,
  rgb: [number, number, number],
  continent: string,
  totalInflow: number,
  shareOfTotal: number,
  topCountries: { name: string; inflow: number }[],
): TaperedSegment[] {
  const n = pts.length - 1
  return Array.from({ length: n }, (_, i) => {
    const frac = 1 - i / (n - 1)                          // 1 at source → 0 at NZ
    const width = Math.max(0.4, baseWidth * Math.pow(frac, 0.55))
    const alpha = Math.round(40 + 180 * Math.pow(frac, 0.4))
    return {
      path: [pts[i], pts[i + 1]],
      width,
      color: [rgb[0], rgb[1], rgb[2], alpha],
      continent,
      totalInflow,
      shareOfTotal,
      topCountries,
    }
  })
}

/** Bright pulses that travel from each continent toward NZ. */
function buildFlowSegments(arcs: ContinentArc[], phase: number): FlowSegment[] {
  return arcs.flatMap(arc => {
    const pulseCount = arc.flowRatio > 0.3 ? 4 : arc.flowRatio > 0.08 ? 4 : 3
    const speed = 0.35 + arc.flowRatio * 0.5

    return Array.from({ length: pulseCount }, (_, p) => {
      const t = (phase * speed + p / pulseCount) % 1
      const idx = t * (arc.pts.length - 1)
      const i0 = Math.max(0, Math.floor(idx) - 1)
      const i1 = Math.min(arc.pts.length - 1, i0 + FLOW_PULSE_SPAN)
      const path = arc.pts.slice(i0, i1 + 1)
      if (path.length < 2) return null

      const frac = 1 - t
      const isAsia = arc.continent === 'Asia'
      const widthMult = isAsia ? 0.42 : 0.36
      const width = Math.max(0.5, arc.baseWidth * Math.pow(frac, 0.55) * widthMult)
      const headFade = Math.sin(t * Math.PI)
      const alpha = isAsia
        ? Math.min(255, Math.round(125 + 130 * headFade))
        : Math.round(90 + 165 * headFade)
      const [r, g, b] = arc.rgb
      const color: [number, number, number, number] = isAsia
        ? [210, 255, 255, alpha]
        : [
            Math.min(255, r + 90),
            Math.min(255, g + 90),
            Math.min(255, b + 90),
            alpha,
          ]
      return {
        path,
        width,
        color,
        continent: arc.continent,
      }
    }).filter((seg): seg is FlowSegment => seg !== null)
  })
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const deckRef = useRef<MapboxOverlay | null>(null)
  const staticLayersRef = useRef<Layer[]>([])
  const continentArcsRef = useRef<ContinentArc[]>([])
  const flowPhaseRef = useRef(0)
  const hoveredFeatureRef = useRef<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [worldGeo, setWorldGeo] = useState<WorldGeoJson | null>(null)
  const [arcTooltip, setArcTooltip] = useState<ArcTooltip | null>(null)
  const [countryTooltip, setCountryTooltip] = useState<CountryTooltip | null>(null)
  const [deckReady, setDeckReady] = useState(false)

  useEffect(() => {
    fetch('/data/world_countries.geojson')
      .then(r => r.json())
      .then((d: WorldGeoJson) => setWorldGeo(d))
      .catch(err => console.error('Failed to load world GeoJSON:', err))
  }, [])

  const {
    data, year, viewMode, hoveredCountry, selectedCountry, focusedCountry, inflowClassFilter, selectedVisaType,
    setSelectedContinent,
    setHoveredCountry, setSelectedCountry, setFocusedCountry,
  } = useAppStore()

  const buildContinentArcs = useCallback((): ContinentArc[] => {
    if (!data) return []
    const arcs = data.continentArcs[String(year)]
    if (!arcs) return []
    const entries = (Object.entries(arcs) as [string, ContinentArcData][]).map(([continent, arc]) => {
      const countries = data.countries.filter(c => c.continent === continent)
      const totalInflow = selectedVisaType
        ? countries.reduce((sum, c) => sum + getMetricValue(c.byYear[String(year)], selectedVisaType), 0)
        : arc.totalInflow
      const topCountries = countries
        .map(c => ({
          name: c.name,
          inflow: getMetricValue(c.byYear[String(year)], selectedVisaType),
        }))
        .filter(c => c.inflow > 0)
        .sort((a, b) => b.inflow - a.inflow)
        .slice(0, 3)
      return { continent, arc, totalInflow, topCountries }
    })
    const maxInflow = Math.max(...entries.map(e => e.totalInflow), 1)
    const globalTotal = selectedVisaType
      ? data.countries.reduce((sum, c) => sum + getMetricValue(c.byYear[String(year)], selectedVisaType), 0)
      : data.meta.yearTotals?.[String(year)]?.totalInflow ?? 0

    return entries.flatMap(({ continent, arc, totalInflow, topCountries }) => {
      const ctrl = CONTINENT_CTRL[continent]
      if (!ctrl) return []
      const p0: [number, number] =
        CONTINENT_SOURCE_OVERRIDES[continent] ?? [arc.centerLon, arc.centerLat]
      const p2: [number, number] = NZ_CENTER
      const pts = bezierPoints(p0, ctrl, p2)
      const flowRatio = totalInflow / maxInflow
      const widthScale = continent === 'Oceania' ? 24 : ARC_MAX_WIDTH
      const baseWidth = Math.max(
        ARC_MIN_WIDTH,
        Math.pow(flowRatio, ARC_WIDTH_EXPONENT) * widthScale,
      )
      const rgb = continentRgb(continent)
      const shareOfTotal = globalTotal > 0 ? (totalInflow / globalTotal) * 100 : 0
      return [{
        pts,
        baseWidth,
        rgb,
        continent,
        totalInflow,
        shareOfTotal,
        topCountries,
        flowRatio,
      }]
    })
  }, [data, year, selectedVisaType])

  const buildTaperedPaths = useCallback((continentArcs: ContinentArc[]): TaperedSegment[] => (
    continentArcs.flatMap(({ pts, baseWidth, rgb, continent, totalInflow, shareOfTotal, topCountries }) =>
      taperedSegments(pts, baseWidth, rgb, continent, totalInflow, shareOfTotal, topCountries),
    )
  ), [])

  const updateFlowLayer = useCallback((phase: number) => {
    if (!deckRef.current) return
    const isGlobal = useAppStore.getState().viewMode === 'global'
    const flowSegments = buildFlowSegments(continentArcsRef.current, phase)

    const flowGlowLayer = new PathLayer<FlowSegment>({
      id: 'arc-flow-glow',
      data: flowSegments,
      visible: isGlobal,
      getPath: d => d.path,
      getWidth: d => d.width * (d.continent === 'Asia' ? 1.4 : 2),
      getColor: d => [d.color[0], d.color[1], d.color[2], Math.round(d.color[3] * 0.25)],
      widthUnits: 'pixels',
      widthMinPixels: 0,
      pickable: false,
      jointRounded: true,
      capRounded: true,
    })

    const flowCoreLayer = new PathLayer<FlowSegment>({
      id: 'arc-flow-core',
      data: flowSegments,
      visible: isGlobal,
      getPath: d => d.path,
      getWidth: d => d.width,
      getColor: d => d.color,
      widthUnits: 'pixels',
      widthMinPixels: 0.5,
      pickable: false,
      jointRounded: true,
      capRounded: true,
    })

    deckRef.current.setProps({
      layers: [...staticLayersRef.current, flowGlowLayer, flowCoreLayer],
    })
  }, [])

  const buildCountryFeatures = useCallback(() => {
    if (!data) return []
    return data.countries.map((c: CountryData) => {
      const yd = c.byYear[String(year)]
      const inflow = getMetricValue(yd, selectedVisaType)
      const cls = classIndex(inflow, data.meta.jenksBreaks)
      const hex = inflowToColor(inflow, data.meta.jenksBreaks)
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] as [number, number] },
        properties: { code: c.code, name: c.name, continent: c.continent, inflow, classIndex: cls, r, g, b },
      }
    }).filter(f => inflowClassFilter === null || f.properties.classIndex === inflowClassFilter)
  }, [data, year, inflowClassFilter, selectedVisaType])

  const updateLayers = useCallback(() => {
    if (!deckRef.current || !data) return
    const isGlobal = viewMode === 'global'

    const continentFillLayer = new GeoJsonLayer({
      id: 'continent-fill',
      data: (worldGeo ?? { type: 'FeatureCollection', features: [] }) as unknown as never,
      visible: true,
      filled: true,
      stroked: false,
      getFillColor: (f: { properties: { continent: string } }) => {
        const [r, g, b] = continentRgb(f.properties.continent)
        return [r, g, b, 55] as [number, number, number, number]
      },
      pickable: false,
    })

    const continentArcs = buildContinentArcs()
    continentArcsRef.current = continentArcs
    const segments = buildTaperedPaths(continentArcs)

    // Soft glow layer: wider, very low alpha, blurs behind the core line
    const glowLayer = new PathLayer<TaperedSegment>({
      id: 'arc-glow',
      data: segments,
      visible: isGlobal,
      getPath: d => d.path,
      getWidth: d => d.width * (d.continent === 'Oceania' ? 1.4 : 2),
      getColor: d => [d.color[0], d.color[1], d.color[2], Math.round(d.color[3] * (d.continent === 'Oceania' ? 0.12 : 0.18))],
      widthUnits: 'pixels',
      widthMinPixels: 0,
      pickable: false,
      jointRounded: true,
      capRounded: true,
    })

    // Core line: sharp, full colour
    const coreLayer = new PathLayer<TaperedSegment>({
      id: 'arc-core',
      data: segments,
      visible: isGlobal,
      getPath: d => d.path,
      getWidth: d => d.width,
      getColor: d => d.color,
      widthUnits: 'pixels',
      widthMinPixels: 0.3,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 60],
      onHover: (info: { object?: TaperedSegment | null; x: number; y: number }) => {
        if (info.object) {
          setArcTooltip({
            x: info.x,
            y: info.y,
            continent: info.object.continent,
            totalInflow: info.object.totalInflow,
            shareOfTotal: info.object.shareOfTotal,
            topCountries: info.object.topCountries,
          })
        } else {
          setArcTooltip(null)
        }
      },
      jointRounded: true,
      capRounded: true,
    })

    const features = buildCountryFeatures()
    const globalTotal = selectedVisaType
      ? data.countries.reduce((sum, c) => sum + getMetricValue(c.byYear[String(year)], selectedVisaType), 0)
      : data.meta.yearTotals?.[String(year)]?.totalInflow ?? 0
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
          const c = data.countries.find((x: CountryData) => x.code === code)
          const inflow = getMetricValue(c?.byYear[String(year)], selectedVisaType)
          setCountryTooltip({
            x: (info as { x?: number }).x ?? 0,
            y: (info as { y?: number }).y ?? 0,
            name: c?.name ?? code,
            inflow,
            shareOfTotal: globalTotal > 0 ? (inflow / globalTotal) * 100 : 0,
          })
          if (hoveredFeatureRef.current !== code) {
            hoveredFeatureRef.current = code
            if (c) setHoveredCountry(c)
          }
        } else {
          setCountryTooltip(null)
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

    const activeCountryCode = selectedCountry?.code ?? hoveredCountry?.code ?? null
    const activeFeature = features.find(f => f.properties.code === activeCountryCode)
    const highlightLayer = new GeoJsonLayer({
      id: 'country-highlight-ring',
      data: {
        type: 'FeatureCollection' as const,
        features: activeFeature ? [activeFeature] : [],
      },
      visible: !isGlobal && Boolean(activeFeature),
      filled: false,
      stroked: true,
      getPointRadius: (f: { properties: { inflow: number } }) =>
        Math.max(70000, Math.sqrt(f.properties.inflow) * 1350),
      getLineColor: [0, 255, 238, 230] as [number, number, number, number],
      lineWidthMinPixels: 2,
      lineWidthMaxPixels: 4,
      pointRadiusUnits: 'meters',
      pointRadiusMinPixels: 7,
      pointRadiusMaxPixels: 46,
      pickable: false,
    })

    staticLayersRef.current = [continentFillLayer, glowLayer, coreLayer, countryLayer, highlightLayer]
    if (isGlobal) {
      updateFlowLayer(flowPhaseRef.current)
    } else {
      deckRef.current.setProps({ layers: staticLayersRef.current })
    }
  }, [data, year, viewMode, hoveredCountry, selectedCountry, selectedVisaType, worldGeo, buildContinentArcs, buildTaperedPaths, buildCountryFeatures, updateFlowLayer, setHoveredCountry, setSelectedCountry])

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
        setDeckReady(true)
      } catch (e) {
        console.error('[MapView] Deck.gl overlay failed:', e)
      }
    })

    map.on('error', (e) => console.error('[MapView]', e))

    const returnToGlobalView = () => {
      setArcTooltip(null)
      setCountryTooltip(null)
      map.dragPan.disable()
      map.scrollZoom.disable()
      map.flyTo({ center: GLOBAL_CENTER, zoom: GLOBAL_ZOOM_TARGET, duration: 1000 })
      const store = useAppStore.getState()
      store.setViewMode('global')
      store.setSelectedCountry(null)
      store.setHoveredCountry(null)
    }

    // Deck.gl overlay sits above the map canvas and swallows maplibre dblclick events.
    const onContainerDblClick = (e: MouseEvent) => {
      const currentMode = useAppStore.getState().viewMode
      if (currentMode === 'global') {
        const rect = map.getContainer().getBoundingClientRect()
        const lngLat = map.unproject([e.clientX - rect.left, e.clientY - rect.top])
        setArcTooltip(null)
        map.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: CONTINENT_ZOOM, duration: 1000 })
        map.dragPan.enable()
        map.scrollZoom.enable()
        useAppStore.getState().setViewMode('continent')
        setSelectedContinent(null)
      } else if (currentMode === 'continent') {
        e.preventDefault()
        e.stopPropagation()
        returnToGlobalView()
      }
    }

    const mapContainerEl = map.getContainer()
    mapContainerEl.addEventListener('dblclick', onContainerDblClick, true)

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
      mapContainerEl.removeEventListener('dblclick', onContainerDblClick, true)
      setDeckReady(false)
      deckRef.current = null
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (deckReady) updateLayers()
  }, [deckReady, updateLayers])

  useEffect(() => {
    if (!deckReady || viewMode !== 'global') return

    let raf = 0
    const tick = () => {
      flowPhaseRef.current = (flowPhaseRef.current + FLOW_SPEED) % 1
      updateFlowLayer(flowPhaseRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [deckReady, viewMode, updateFlowLayer])

  useEffect(() => {
    if (!focusedCountry || !mapRef.current) return
    const map = mapRef.current
    setCountryTooltip(null)
    map.dragPan.enable()
    map.scrollZoom.enable()
    map.flyTo({
      center: [focusedCountry.lon, focusedCountry.lat],
      zoom: CONTINENT_ZOOM,
      duration: 900,
    })
    useAppStore.getState().setViewMode('continent')
    setFocusedCountry(null)
  }, [focusedCountry, setFocusedCountry])

  useEffect(() => {
    if (viewMode !== 'global') setArcTooltip(null)
    if (viewMode === 'global') setCountryTooltip(null)
  }, [viewMode])

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

  const metricLabel = visaTypeLabel(selectedVisaType)

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 320, bottom: 0 }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      {arcTooltip && (
        <div
          style={{
            position: 'absolute',
            left: arcTooltip.x + 12,
            top: arcTooltip.y + 12,
            pointerEvents: 'none',
            minWidth: 210,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(0, 255, 238, 0.35)',
            background: 'rgba(8, 12, 24, 0.92)',
            boxShadow: '0 0 18px rgba(0, 255, 238, 0.18)',
            color: '#dff8ff',
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.45,
            zIndex: 10,
          }}
        >
          <div style={{ color: '#00ffee', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            {arcTooltip.continent}
          </div>
          <div style={{ marginBottom: 8 }}>
            {selectedVisaType ? `${metricLabel} Inflow` : 'Total Inflow'}:{' '}
            <span style={{ color: '#ffffff', fontWeight: 700 }}>
              {arcTooltip.totalInflow.toLocaleString()}
            </span>
          </div>
          <div style={{ marginBottom: 8 }}>
            Share of {selectedVisaType ? metricLabel : 'Total'}:{' '}
            <span style={{ color: '#ffffff', fontWeight: 700 }}>
              {arcTooltip.shareOfTotal.toFixed(2)}%
            </span>
          </div>
          <div style={{ color: '#8ab4c8', marginBottom: 4 }}>Top Countries</div>
          {arcTooltip.topCountries.map((country, index) => (
            <div
              key={country.name}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
            >
              <span>{index + 1}. {country.name}</span>
              <span style={{ color: '#ffffff' }}>{country.inflow.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      {countryTooltip && (
        <div
          style={{
            position: 'absolute',
            left: countryTooltip.x + 12,
            top: countryTooltip.y + 12,
            pointerEvents: 'none',
            minWidth: 180,
            padding: '9px 11px',
            borderRadius: 8,
            border: '1px solid rgba(0, 255, 238, 0.35)',
            background: 'rgba(8, 12, 24, 0.92)',
            boxShadow: '0 0 18px rgba(0, 255, 238, 0.18)',
            color: '#dff8ff',
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.45,
            zIndex: 10,
          }}
        >
          <div style={{ color: '#00ffee', fontSize: 15, fontWeight: 700, marginBottom: 5 }}>
            {countryTooltip.name}
          </div>
          <div>
            {selectedVisaType ? `${metricLabel} Volume` : 'Inflow Volume'}:{' '}
            <span style={{ color: '#ffffff', fontWeight: 700 }}>
              {countryTooltip.inflow.toLocaleString()}
            </span>
          </div>
          <div>
            Share of {selectedVisaType ? metricLabel : 'Total'}:{' '}
            <span style={{ color: '#ffffff', fontWeight: 700 }}>
              {countryTooltip.shareOfTotal.toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
