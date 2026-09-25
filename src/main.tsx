import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { resolveDemo } from './config/registry';
import { DemoApp } from './App';
import { Studio } from './views/Studio';

const cfg = resolveDemo();
const fromFile = new URLSearchParams(location.search).has('c');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{cfg ? <DemoApp cfg={cfg} fromFile={fromFile} /> : <Studio />}</StrictMode>,
);
