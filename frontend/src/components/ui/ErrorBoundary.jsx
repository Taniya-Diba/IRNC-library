import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>This page ran into an unexpected problem.</p>
            <button
              className="btn btn-secondary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              Go back to catalogue
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
