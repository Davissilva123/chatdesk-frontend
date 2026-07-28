import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#f8d7da', color: '#721c24', height: '100vh' }}>
          <h1>Oops, o aplicativo quebrou! (White Screen)</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// FORÇAR LIMPEZA DO CACHE (PWA) PARA ESTA ATUALIZAÇÃO
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    let unreg = false;
    for (let registration of registrations) {
      registration.unregister();
      unreg = true;
    }
    if (unreg) {
      // Set a flag to prevent infinite reloads
      if (!sessionStorage.getItem('cacheBusted_v1')) {
        sessionStorage.setItem('cacheBusted_v1', 'true');
        window.location.reload(true);
      }
    }
  });
}
