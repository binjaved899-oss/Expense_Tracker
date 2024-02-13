import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import { App } from './App';
import { db } from './server/db/client';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App database={db} />
    </React.StrictMode>
  );
}
