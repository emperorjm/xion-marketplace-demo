import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CosmosProvider } from './context/CosmosProvider';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CosmosProvider>
      <App />
    </CosmosProvider>
  </React.StrictMode>,
);
