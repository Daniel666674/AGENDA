import { useState } from 'react';
import type { Client } from '../types';
import { useApp } from '../lib/useApp';
import { useUI, uiActions } from '../store/ui';
import { uid } from '../store/store';
import { deleteClient, newClient, saveClient } from '../store/actions';
import { clientStats, lookup } from '../lib/queries';
import { parseLocal, toLocal } from '../lib/date';
import { digits, whatsappLink } from '../lib/messaging';
import { Avatar, Button, Drawer, Field, Modal, StatusPill } from './ui';
import { Icon } from './Icon';

/** Perfil del cliente (panel lateral) */
export function ClientProfile() {
  const { clientId } = useUI();
  const { s, t, preset, money, timeOf, shortDate, status, date } = useApp();
  const c = clientId ? s.clients.find((x) => x.id === clientId) : undefined;
  if (!c) return null;
  const st = clientStats(s, c.id);
  const list = [...(lookup(s).byClient.get(c.id) ?? [])].reverse();
  const nowKey = toLocal(new Date());
  const upcoming = list.filter((a) => a.start >= nowKey && a.status !== 'cancelled').reverse();
  const past = list.filter((a) => !upcoming.includes(a));

  return (
    <Drawer open onClose={uiActions.closeClient} width={500}>
      <div className="profile-hero">
        <Avatar name={c.name} size={64} />
        <div className="grow">
          <h2 className="display">{c.name}</h2>
          <div className="row gap-sm wrap">
            {c.tags.map((tg) => (
              <span key={tg} className="tag">
                {tg}
              </span>
            ))}
            <span className="muted small">
              {t('stats_since')} {date(parseLocal(c.createdAt), { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        <Button variant="ghost" icon="x" onClick={uiActions.closeClient} aria-label={t('close')} />
      </div>

      <div className="profile-actions">
        {c.phone && (
          <a className="btn btn-soft btn-md" href={whatsappLink(c.phone, '')} target="_blank" rel="noreferrer">
            <Icon name="whatsapp" size={16} /> <span>WhatsApp</span>
          </a>
        )}
        {c.phone && (
          <a className="btn btn-soft btn-md" href={`tel:${digits(c.phone)}`}>
            <Icon name="phone" size={16} /> <span>{t('act_call')}</span>
          </a>
        )}
        <Button icon="edit" onClick={() => uiActions.editClient({ id: c.id })}>
          {t('act_edit')}
        </Button>
        <Button variant="primary" icon="plus" onClick={() => uiActions.newAppointment({ clientId: c.id, serviceId: st.last?.serviceId, staffId: st.last?.staffId })}>
          {t('act_rebook')}
        </Button>
      </div>

      <div className="stat-row">
        <div>
          <span className="stat-num">{st.visits}</span>
          <span className="muted small">{t('stats_visits')}</span>
        </div>
        <div>
          <span className="stat-num">{money(st.spent)}</span>
          <span className="muted small">{t('stats_spent')}</span>
        </div>
        <div>
          <span className={st.noShows ? 'stat-num warn-text' : 'stat-num'}>{st.noShows}</span>
          <span className="muted small">{t('stats_noshow')}</span>
        </div>
      </div>

      <dl className="kv">
        {c.phone && (
          <>
            <dt>{t('f_phone')}</dt>
            <dd>{c.phone}</dd>
          </>
        )}
        {c.email && (
          <>
            <dt>{t('f_email')}</dt>
            <dd>{c.email}</dd>
          </>
        )}
      </dl>
      {c.notes && <div className="client-note big">{c.notes}</div>}

      {preset.usesPets && c.pets.length > 0 && (
        <>
          <h4 className="section-title">{t('pets')}</h4>
          <div className="pet-cards">
            {c.pets.map((p) => (
              <div key={p.id} className="pet-card">
                <span className="pet-icon">
                  <Icon name="paw" size={18} />
                </span>
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted small">{[p.species, p.breed].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {[
        { title: t('upcoming'), items: upcoming },
        { title: t('past'), items: past.slice(0, 25) },
      ].map(
        (g) =>
          g.items.length > 0 && (
            <div key={g.title}>
              <h4 className="section-title">{g.title}</h4>
              <div className="history">
                {g.items.map((a) => {
                  const svc = s.services.find((x) => x.id === a.serviceId);
                  const pet = c.pets.find((p) => p.id === a.petId);
                  return (
                    <button key={a.id} className="history-item" onClick={() => uiActions.openAppointment(a.id)} style={{ ['--item' as string]: svc?.color }}>
                      <span className="history-date">
                        <strong>{parseLocal(a.start).getDate()}</strong>
                        <span>{date(parseLocal(a.start), { month: 'short' }).replace('.', '')}</span>
                      </span>
                      <span className="grow">
                        <strong>{svc?.name}</strong>
                        {pet && <span className="muted"> · {pet.name}</span>}
                        <span className="muted small block">
                          {shortDate(parseLocal(a.start))} · {timeOf(a.start)} · {s.staff.find((x) => x.id === a.staffId)?.name}
                        </span>
                      </span>
                      <span className="col end gap-xs">
                        <StatusPill status={a.status} label={status(a.status)} />
                        <span className="small tabular">{money(a.price)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ),
      )}
      {list.length === 0 && <p className="muted">{t('no_history')}</p>}
    </Drawer>
  );
}

/** Alta / edición de cliente (modal) */
export function ClientEditorModal() {
  const { clientEdit } = useUI();
  if (!clientEdit) return null;
  return <ClientEditor key={clientEdit.id ?? 'new'} />;
}

function ClientEditor() {
  const { clientEdit } = useUI();
  const { s, t, preset } = useApp();
  const existing = clientEdit?.id ? s.clients.find((c) => c.id === clientEdit.id) : undefined;
  const [c, setC] = useState<Client>(() => existing ?? newClient({ name: clientEdit?.name ?? '' }));
  const [tags, setTags] = useState(c.tags.join(', '));
  const [confirm, setConfirm] = useState(false);
  const close = uiActions.closeClientEdit;

  const save = () => {
    if (!c.name.trim()) return;
    const final = { ...c, name: c.name.trim(), tags: tags.split(',').map((x) => x.trim()).filter(Boolean), pets: c.pets.filter((p) => p.name.trim()) };
    saveClient(final);
    clientEdit?.onCreated?.(final.id);
    close();
  };

  return (
    <Modal
      open
      onClose={close}
      title={existing ? existing.name : t('new_client')}
      footer={
        <>
          {existing &&
            (confirm ? (
              <Button variant="danger" icon="trash" onClick={() => (deleteClient(existing.id), uiActions.closeClient(), close())}>
                {t('delete_confirm')}
              </Button>
            ) : (
              <Button variant="ghost" icon="trash" onClick={() => setConfirm(true)} aria-label={t('delete')} />
            ))}
          <span className="grow" />
          <Button variant="ghost" onClick={close}>
            {t('cancel')}
          </Button>
          <Button variant="primary" onClick={save} disabled={!c.name.trim()}>
            {t('save')}
          </Button>
        </>
      }
    >
      <Field label={t('f_name')}>
        <input autoFocus value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
      </Field>
      <div className="grid-2">
        <Field label={t('f_phone')}>
          <input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
        </Field>
        <Field label={t('f_email')}>
          <input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
        </Field>
      </div>
      <Field label={t('f_tags')} hint={t('f_tags_hint')}>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="VIP, …" />
      </Field>
      <Field label={t('f_notes')}>
        <textarea rows={3} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} />
      </Field>
      {preset.usesPets && (
        <div className="form-section">
          <div className="field-label">{t('pets')}</div>
          {c.pets.map((p, i) => (
            <div key={p.id} className="grid-3 pet-row">
              <input value={p.name} placeholder={t('f_name')} onChange={(e) => setC({ ...c, pets: c.pets.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <input value={p.species} placeholder={t('f_species')} onChange={(e) => setC({ ...c, pets: c.pets.map((x, j) => (j === i ? { ...x, species: e.target.value } : x)) })} />
              <input value={p.breed} placeholder={t('f_breed')} onChange={(e) => setC({ ...c, pets: c.pets.map((x, j) => (j === i ? { ...x, breed: e.target.value } : x)) })} />
            </div>
          ))}
          <Button size="sm" icon="plus" onClick={() => setC({ ...c, pets: [...c.pets, { id: uid('pet'), name: '', species: '', breed: '' }] })}>
            {t('add_pet')}
          </Button>
        </div>
      )}
    </Modal>
  );
}
