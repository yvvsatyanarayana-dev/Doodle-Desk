import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Global uncaught error & rejection guards to prevent the app from freezing or halting
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Unhandled runtime error intercepted:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled promise rejection intercepted:', event.reason);
    event.preventDefault(); // Prevents Electron/Chromium console crash warning
  });

  // Configure offline assets for Doodle Desk Canvas
  window.DOODLE_ASSET_PATH = window.DOODLE_ASSET_PATH || (window.location.protocol === 'file:' ? './' : '/');

  // Intercept Chromium's File System Access showSaveFilePicker to brand as Doodle Desk
  if (window.showSaveFilePicker) {
    const originalShowSaveFilePicker = window.showSaveFilePicker;
    window.showSaveFilePicker = async (options = {}) => {
      const updatedOptions = { ...options };
      if (updatedOptions.types) {
        updatedOptions.types = updatedOptions.types.map((type) => {
          if (type.description?.includes('Doodle') || type.accept?.['application/vnd.doodledesk+json']) {
            return {
              description: 'Doodle Desk File',
              accept: {
                'application/vnd.doodledesk+json': ['.doodle'],
              },
            };
          }
          return type;
        });
      }
      if (updatedOptions.suggestedName) {
        updatedOptions.suggestedName = updatedOptions.suggestedName
          .replace(/^Untitled/, 'Doodle');
      }
      return originalShowSaveFilePicker.call(window, updatedOptions);
    };
  }
}

// Render directly without React.StrictMode to avoid expensive duplicate Doodle canvas initializations
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
