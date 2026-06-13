import { useEffect, useState, Component, type ReactNode } from 'react'
import { useAppStore } from './store/useAppStore'
import MapView from './components/Map/MapView'
import Sidebar from './components/Sidebar/Sidebar'
import YearSlider from './components/YearSlider/YearSlider'
import MapLegend from './components/MapLegend/MapLegend'
import type { MigrationData } from './types'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#ff6b6b', background: '#0a0e1a', height: '100vh', fontFamily: 'monospace' }}>
          <h2>Runtime Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{this.state.error}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const { setData, data } = useAppStore()
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const dataUrl = `${import.meta.env.BASE_URL}data/migration.json`
    fetch(dataUrl)
      .then(r => {
        if (!r.ok) {
          throw new Error(`Could not load ${dataUrl} (${r.status} ${r.statusText})`)
        }
        return r.json()
      })
      .then((d: MigrationData) => {
        console.log('[App] Data loaded, countries:', d.countries.length, 'years:', d.meta.years)
        setData(d)
      })
      .catch(err => {
        console.error('[App] Failed to load migration data:', err)
        setLoadError(err instanceof Error ? err.message : 'Failed to load migration data')
      })
  }, [setData])

  return (
    <ErrorBoundary>
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0a0e1a' }}>
        <MapView />
        <MapLegend />
        <YearSlider />
        <Sidebar />

        {!data && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: '#0a0e1a', zIndex: 50,
          }}>
            <div style={{ textAlign: 'center', color: '#6a80a8' }}>
              {loadError ? (
                <>
                  <div style={{ color: '#ff6b6b', fontWeight: 700, marginBottom: 8 }}>
                    Failed to load migration data
                  </div>
                  <div style={{ maxWidth: 460, lineHeight: 1.5 }}>
                    {loadError}. Make sure <code>public/data/migration.json</code> exists, or run <code>npm run preprocess</code>.
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: '2px solid #00ffee', borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite', margin: '0 auto 12px',
                  }} />
                  <div>Loading migration data…</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
