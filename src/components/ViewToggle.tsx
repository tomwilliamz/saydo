'use client'

interface ViewToggleProps {
  activeView: 'daily' | 'long-term'
  onViewChange: (view: 'daily' | 'long-term') => void
  colors: { main: string; gradient: string[] }
}

export default function ViewToggle({ activeView, onViewChange, colors }: ViewToggleProps) {
  return (
    <div
      className="inline-flex rounded-full p-1"
      style={{
        background: 'rgba(0,0,0,0.3)',
      }}
    >
      <button
        onClick={() => onViewChange('daily')}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
          activeView === 'daily'
            ? 'text-white shadow-lg'
            : 'text-white/60 hover:text-white/80'
        }`}
        style={activeView === 'daily' ? {
          background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[2]})`,
        } : {}}
      >
        Daily
      </button>
      <button
        onClick={() => onViewChange('long-term')}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
          activeView === 'long-term'
            ? 'text-white shadow-lg'
            : 'text-white/60 hover:text-white/80'
        }`}
        style={activeView === 'long-term' ? {
          background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[2]})`,
        } : {}}
      >
        Long Term
      </button>
    </div>
  )
}
