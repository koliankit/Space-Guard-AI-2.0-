import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SpaceGuard Root Error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: '#EF4444', background: '#060B16', fontFamily: "'Sitka Small Semibold', 'Sitka Small', Georgia, serif", minHeight: '100vh', zIndex: 99999 }}>
          <div style={{ display: 'inline-block', border: '1px solid #F59E0B', padding: '4px 12px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: 'bold', marginBottom: 16 }}>
            ISRO SPACEGUARD AI &bull; MISSION CONTROL CRITICAL EXCEPTION
          </div>
          <h2 style={{ color: '#fff', fontSize: 18, margin: '8px 0' }}>An unexpected error prevented the control deck from loading:</h2>
          <div style={{ color: '#F59E0B', fontSize: 14, fontWeight: 'bold', margin: '12px 0' }}>
            {this.state.error?.name}: {this.state.error?.message}
          </div>
          <pre style={{ background: '#0B1120', color: '#94A3B8', padding: 16, borderRadius: 6, border: '1px solid #1E293B', overflowX: 'auto', fontSize: 12, lineHeight: 1.5 }}>
            {this.state.error?.stack}
          </pre>
          <button
            type="button"
            onClick={() => {
              window.location.href = window.location.origin + window.location.pathname + '?r=' + Date.now()
            }}
            style={{ marginTop: 20, padding: '10px 24px', background: '#10B981', color: '#060B16', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Sitka Small Semibold', 'Sitka Small', Georgia, serif", letterSpacing: '1px' }}
          >
            &#8635; REINITIALIZE SYSTEM
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
