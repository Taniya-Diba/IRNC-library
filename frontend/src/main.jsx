import './lib/i18n.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.72)',
            color: '#1a1625',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.90), 0 8px 32px rgba(80,60,180,0.09)',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
