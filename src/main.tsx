import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import memory manager to auto-start monitoring in development
import './utils/memoryManager';

// Import database test for debugging
import './utils/databaseTest';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
