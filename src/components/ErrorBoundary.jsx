import React from 'react';
import { AlertTriangle, RefreshCw, Download, FileText } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Doodle Desk ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleExportBackup = () => {
    try {
      const backupData = localStorage.getItem('doodle_desktop_recovery_data');
      if (!backupData) {
        alert('No backup data found in local storage.');
        return;
      }
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doodle-desk-emergency-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export backup:', err);
      alert('Failed to export backup.');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#121214',
            color: '#f4f4f5',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#18181b',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                margin: '0 0 10px 0',
                color: '#ffffff',
              }}
            >
              Doodle Desk Recovered Gracefully
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: '#a1a1aa',
                lineHeight: 1.5,
                margin: '0 0 24px 0',
              }}
            >
              An unexpected display glitch occurred, but your drawings and autosave snapshots have been preserved.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: '100%',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <RefreshCw size={16} />
                Reload & Resume Drawing
              </button>

              <button
                onClick={this.handleExportBackup}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#e4e4e7',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <Download size={15} />
                Download Emergency Drawing Backup
              </button>
            </div>

            {this.state.error && (
              <div
                style={{
                  marginTop: '20px',
                  textAlign: 'left',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#71717a',
                  wordBreak: 'break-all',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
