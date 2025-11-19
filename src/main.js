import { jsx as _jsx } from "react/jsx-runtime";
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CosmosProvider } from './context/CosmosProvider';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(CosmosProvider, { children: _jsx(App, {}) }) }));
