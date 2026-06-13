import { useAppStore } from '../../store/useAppStore'
import GlobalKPI from './GlobalKPI'
import CountryProfile from './CountryProfile'

export default function Sidebar() {
  const { viewMode, selectedCountry } = useAppStore()
  const showCountryPanel = selectedCountry !== null
  const isContinentView = viewMode !== 'global'

  return (
    <aside
      className="absolute right-0 top-0 h-full w-80 flex flex-col z-10 pointer-events-auto"
      style={{
        background: 'linear-gradient(to left, rgba(10,14,26,0.97) 80%, rgba(10,14,26,0.7))',
        borderLeft: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-dark-border shrink-0">
        <h1 className="text-xl font-semibold leading-tight text-[var(--color-text)]">
          NZ Migration Inflow Explorer
        </h1>
        <div className="text-xs text-[var(--color-text-dim)] mt-1">2016 – 2025</div>
      </div>

      {/* Mode badge */}
      <div className="px-5 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              isContinentView ? 'bg-neon-cyan' : 'bg-neon-blue'
            }`}
            style={{ boxShadow: isContinentView ? '0 0 6px #00ffee' : '0 0 6px #00b4d8' }}
          />
          <span className="text-xs text-[var(--color-text-dim)] uppercase tracking-wider">
            {isContinentView ? 'Country Mode' : 'Global Mode'}
          </span>
        </div>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {showCountryPanel ? <CountryProfile /> : <GlobalKPI />}
      </div>

      {/* Usage hint */}
      <div
        className="px-5 py-3 shrink-0 border-t border-dark-border"
        style={{ background: 'rgba(10,14,26,0.8)' }}
      >
        <div className="text-[10px] text-[var(--color-text-dim)] space-y-0.5">
          {viewMode === 'global' ? (
            <>
              <div>Double-click map → Zoom into region</div>
            </>
          ) : (
            <>
              <div>Drag to pan · Scroll to zoom</div>
              <div>Click country → Profile · Double-click → Global view</div>
            </>
          )}
        </div>
        <div className="mt-2 border-t border-dark-border pt-2 text-[10px] text-[var(--color-text-dim)]">
          Data source: Statistics New Zealand (Stats NZ)
        </div>
      </div>
    </aside>
  )
}
