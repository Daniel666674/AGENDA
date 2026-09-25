import { useEffect, useState } from 'react';
import type { DemoConfig } from './types';
import { initStore } from './store/store';
import { uiActions, useUI } from './store/ui';
import { undoLast } from './store/actions';
import { useApp } from './lib/useApp';
import { go, useRoute, type Route } from './lib/router';
import { applyTheme } from './lib/theme';
import { lookup } from './lib/queries';
import { dateKey } from './lib/date';
import { cx } from './components/ui';
import { Icon, type IconName } from './components/Icon';
import { AppointmentEditor } from './components/AppointmentEditor';
import { ClientEditorModal, ClientProfile } from './components/ClientPanels';
import { CommandPalette, Customizer, Logo, Toasts, Welcome } from './components/Overlays';
import { Dashboard } from './views/Dashboard';
import { CalendarView } from './views/Calendar';
import { Clients } from './views/Clients';
import { Services } from './views/Services';
import { StaffView } from './views/Staff';
import { Reports } from './views/Reports';
import { BookingFlow, BookingPreview } from './views/Booking';
import { Settings } from './views/Settings';

export function DemoApp({ cfg, fromFile }: { cfg: DemoConfig; fromFile: boolean }) {
  const [ready] = useState(() => {
    initStore(cfg);
    return true;
  });
  return ready ? <Shell fromFile={fromFile} /> : null;
}

const NAV: { route: Route; icon: IconName; key: 'nav_today' | 'nav_calendar' | 'nav_clients' | 'nav_services' | 'nav_staff' | 'nav_reports' | 'nav_booking' | 'nav_settings'; mobile?: boolean }[] = [
  { route: 'today', icon: 'home', key: 'nav_today', mobile: true },
  { route: 'calendar', icon: 'calendar', key: 'nav_calendar', mobile: true },
  { route: 'clients', icon: 'users', key: 'nav_clients', mobile: true },
  { route: 'services', icon: 'tag', key: 'nav_services' },
  { route: 'staff', icon: 'team', key: 'nav_staff' },
  { route: 'reports', icon: 'chart', key: 'nav_reports', mobile: true },
  { route: 'booking', icon: 'globe', key: 'nav_booking' },
  { route: 'settings', icon: 'settings', key: 'nav_settings' },
];

function Shell({ fromFile }: { fromFile: boolean }) {
  const { s, t } = useApp();
  const ui = useUI();
  const { route } = useRoute();
  const b = s.business;
  const mode = ui.mode ?? b.theme.mode;
  const [welcome, setWelcome] = useState(() => {
    try {
      return !sessionStorage.getItem(`agenda-welcome:${s.slug}`);
    } catch {
      return true;
    }
  });
  const [menu, setMenu] = useState(false);

  useEffect(() => applyTheme(b.theme, mode), [b.theme, mode]);
  useEffect(() => {
    document.title = `${b.name} · ${t('nav_calendar')}`;
    document.documentElement.lang = b.lang;
  }, [b.name, b.lang]);
  useEffect(() => setMenu(false), [route]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        uiActions.setPalette(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        undoLast();
      } else if (!typing && !e.metaKey && !e.ctrlKey && !document.querySelector('.overlay')) {
        if (e.key === '/') {
          e.preventDefault();
          uiActions.setPalette(true);
        } else if (e.key.toLowerCase() === 'n') uiActions.newAppointment();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const enter = () => {
    setWelcome(false);
    try {
      sessionStorage.setItem(`agenda-welcome:${s.slug}`, '1');
    } catch {
      /* ignorar */
    }
  };

  if (route === 'book')
    return (
      <>
        <div className="bk-page">
          <BookingFlow />
        </div>
        <Toasts />
      </>
    );

  const todayCount = (lookup(s).byDay.get(dateKey(new Date())) ?? []).filter((a) => a.status !== 'cancelled').length;
  const view = (() => {
    switch (route) {
      case 'calendar':
        return <CalendarView />;
      case 'clients':
        return <Clients />;
      case 'services':
        return <Services />;
      case 'staff':
        return <StaffView />;
      case 'reports':
        return <Reports />;
      case 'booking':
        return <BookingPreview />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  })();

  return (
    <div className={cx('app', menu && 'menu-open')}>
      <aside className="sidebar">
        <div className="brand">
          <Logo size={38} />
          <div className="brand-text">
            <strong className="display">{b.name}</strong>
            <span className="muted small truncate">{b.tagline}</span>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.route} href={`#/${n.route}`} className={cx('nav-item', route === n.route && 'on')}>
              <Icon name={n.icon} size={19} />
              <span>{t(n.key)}</span>
              {n.route === 'today' && todayCount > 0 && <span className="nav-count">{todayCount}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="nav-item" onClick={() => uiActions.setCustomizer(true)}>
            <Icon name="palette" size={19} />
            <span>{t('nav_customize')}</span>
          </button>
          <button className="nav-item" onClick={() => uiActions.setMode(mode === 'dark' ? 'light' : 'dark')}>
            <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={19} />
            <span>{mode === 'dark' ? t('cz_light') : t('cz_dark')}</span>
          </button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setMenu(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn show-mobile" onClick={() => setMenu(true)} aria-label="menu">
            <Icon name="menu" size={20} />
          </button>
          <span className="topbar-brand show-mobile">
            <Logo size={28} />
            <strong className="display">{b.name}</strong>
          </span>
          <button className="search-trigger" onClick={() => uiActions.setPalette(true)}>
            <Icon name="search" size={16} />
            <span className="hide-mobile">{t('search_placeholder')}</span>
            <kbd className="hide-mobile">⌘K</kbd>
          </button>
          <span className="grow hide-mobile" />
          <button className="btn btn-primary btn-md topbar-new" onClick={() => uiActions.newAppointment()}>
            <Icon name="plus" size={17} />
            <span className="hide-mobile">{t('new_appt')}</span>
          </button>
        </header>
        <main className="content">{view}</main>
      </div>

      <nav className="tabbar">
        {NAV.filter((n) => n.mobile).map((n) => (
          <a key={n.route} href={`#/${n.route}`} className={cx('tab', route === n.route && 'on')}>
            <Icon name={n.icon} size={20} />
            <span>{t(n.key)}</span>
          </a>
        ))}
        <button className="tab" onClick={() => go('booking')}>
          <Icon name="globe" size={20} />
          <span>{t('nav_booking').split(' ')[0]}</span>
        </button>
      </nav>

      <AppointmentEditor />
      <ClientProfile />
      <ClientEditorModal />
      <CommandPalette />
      <Customizer fromFile={fromFile} />
      <Toasts />
      {welcome && <Welcome onEnter={enter} />}
    </div>
  );
}
