import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { resolveDemo } from './config/registry';
import { resolveMenu } from './menu/registry';
import { DemoApp } from './App';
import { MenuDemo } from './menu/MenuApp';
import { StudioHome } from './views/StudioHome';

// ?c= / ?d=  → agenda de citas   ·   ?m= / ?md= → pedidos por QR   ·   nada → estudio
const cfg = resolveDemo();
const menu = cfg ? null : resolveMenu();
const fromFile = new URLSearchParams(location.search).has('c');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{cfg ? <DemoApp cfg={cfg} fromFile={fromFile} /> : menu ? <MenuDemo cfg={menu} /> : <StudioHome />}</StrictMode>,
);
