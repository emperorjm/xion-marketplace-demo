import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AbstraxionProvider } from '@burnt-labs/abstraxion';
import '@burnt-labs/abstraxion/dist/index.css';
import App from './App';
import { CosmosProvider } from './context/CosmosProvider';
import './styles.css';

const abstraxionConfig = {
  treasury: import.meta.env.VITE_ABSTRAXION_TREASURY || '',
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AbstraxionProvider config={abstraxionConfig}>
      <CosmosProvider>
        <App />
      </CosmosProvider>
    </AbstraxionProvider>
  </React.StrictMode>,
);
