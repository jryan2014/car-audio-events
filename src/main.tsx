import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize console manager to control console output in production
import { initializeConsoleManager, enableDebugMode } from './utils/consoleManager';
initializeConsoleManager();
enableDebugMode();

// Import memory manager to auto-start monitoring in development
import './utils/memoryManager';

// Import database test for debugging
import './utils/databaseTest';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
