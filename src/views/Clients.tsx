import { useMemo, useState } from 'react';
import { useApp } from '../lib/useApp';
import { clientStats } from '../lib/queries';
import { addDays, dateKey, parseLocal } from '../lib/date';
import { digits, whatsappLink } from '../lib/messaging';
import { uiActions } from '../store/ui';
import { Avatar, Button, Empty, PageHead, Segmented, cx } from '../components/ui';
import { Icon } from '../components/Icon';

type Filter = 'all' | 'vip' | 'inactive';
type Sort = 'name' | 'visits' | 'spent' | 'last';

export function Clients() {
  const { s, t, money, shortDate, nouns, preset } = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('last');

  const rows = useMemo(() => {
    const cutoff = dateKey(addDays(new Date(), -60));
    const query = q.trim().toLowerCase();
    const qd = query.replace(/\D/g, '');
    return s.clients
      .map((c) => ({ c, st: clientStats(s, c.id) }))
      .filter(({ c, st }) => {
        if (query && !(c.name.toLowerCase().includes(query) || (qd.length > 2 && digits(c.phone).includes(qd)) || c.email.toLowerCase().includes(query) || c.pets.some((p) => p.name.toLowerCase().includes(query)))) return false;
        if (filter === 'vip') return c.tags.some((tg) => /vip/i.test(tg)) || st.spent > 0 && st.visits >= 6;
        if (filter === 'inactive') return !st.next && (!st.last || st.last.start < cutoff);
        return true;
      })
      .sort((a, b) =>
        sort === 'name' ? a.c.name.localeCompare(b.c.name) : sort === 'visits' ? b.st.visits - a.st.visits : sort === 'spent' ? b.st.spent - a.st.spent : (b.st.last?.start ?? '').localeCompare(a.st.last?.start ?? ''),
      );
  }, [s, q, filter, sort]);

  const th = (key: Sort, label: string, cls = '') => (
    <th className={cls}>
      <button className={cx('th-sort', sort === key && 'on')} onClick={() => setSort(key)}>
        {label}
        {sort === key && <Icon name="down" size={12} />}
      </button>
    </th>
  );

  return (
    <div className="page">
      <PageHead title={nouns.Clients} sub={t('clients_sub', { n: s.clients.length })}>
        <Button variant="primary" icon="plus" onClick={() => uiActions.editClient({})}>
          {t('new_client')}
        </Button>
      </PageHead>
      <div className="toolbar">
        <div className="input-icon grow">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search_placeholder')} />
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('filter_all') },
            { value: 'vip', label: t('filter_vip') },
            { value: 'inactive', label: t('filter_inactive') },
          ]}
        />
      </div>
      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              {th('name', t('col_name'))}
              <th className="hide-mobile">{t('col_contact')}</th>
              {th('visits', t('col_visits'), 'num')}
              {th('last', t('col_last'), 'hide-mobile')}
              <th className="hide-mobile">{t('col_next')}</th>
              {th('spent', t('col_spent'), 'num')}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, st }) => (
              <tr key={c.id} onClick={() => uiActions.openClient(c.id)}>
                <td>
                  <div className="row gap-sm">
                    <Avatar name={c.name} size={34} />
                    <div>
                      <strong>{c.name}</strong>
                      <div className="row gap-xs wrap">
                        {preset.usesPets &&
                          c.pets.map((p) => (
                            <span key={p.id} className="pet-chip">
                              <Icon name="paw" size={11} /> {p.name}
                            </span>
                          ))}
                        {c.tags.map((tg) => (
                          <span key={tg} className="tag">
                            {tg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hide-mobile">
                  <span className="small">{c.phone}</span>
                  <span className="muted small block">{c.email}</span>
                </td>
                <td className="num tabular">{st.visits}</td>
                <td className="hide-mobile small">{st.last ? shortDate(parseLocal(st.last.start)) : '—'}</td>
                <td className="hide-mobile small">{st.next ? <span className="accent-text">{shortDate(parseLocal(st.next.start))}</span> : <span className="muted">—</span>}</td>
                <td className="num tabular">{money(st.spent)}</td>
                <td className="actions" onClick={(e) => e.stopPropagation()}>
                  {c.phone && (
                    <a className="icon-btn wa" href={whatsappLink(c.phone, '')} target="_blank" rel="noreferrer" title="WhatsApp">
                      <Icon name="whatsapp" size={15} />
                    </a>
                  )}
                  <button className="icon-btn" title={t('new_appt')} onClick={() => uiActions.newAppointment({ clientId: c.id, serviceId: st.last?.serviceId, staffId: st.last?.staffId })}>
                    <Icon name="plus" size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty icon="users" title={t('nothing_found')} />}
      </div>
    </div>
  );
}
