import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#f5f5f3] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-black/10 p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-[#5f5e5a] mb-4">{this.state.error.message || 'An unexpected error occurred'}</p>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 rounded-lg bg-[#1D9E75] text-white text-sm font-bold border-none cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
