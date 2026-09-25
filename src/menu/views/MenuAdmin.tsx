// Carta: precios, fotos, agotados y nuevos platos
import { useState } from 'react';
import type { ItemTag, MenuItem } from '../types';
import { change, useMenuHelpers, useMenuState } from '../store';
import { mid } from '../seed';
import { Button, Field, Modal, Toggle, cx } from '../../components/ui';
import { ItemArt, TAG_LABEL } from './shared';

export function MenuAdmin() {
  const s = useMenuState();
  const { money } = useMenuHelpers();
  const [edit, setEdit] = useState<MenuItem | null>(null);
  const sold = new Map<string, number>();
  for (const o of s.orders) if (o.status !== 'cancelled') for (const l of o.lines) sold.set(l.itemId, (sold.get(l.itemId) ?? 0) + l.qty);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Carta</h1>
          <p className="muted">
            {s.items.length} productos · {s.items.filter((i) => !i.available).length} agotados. Los cambios se ven al instante en el QR.
          </p>
        </div>
        <Button
          variant="primary"
          icon="plus"
          onClick={() => setEdit({ id: mid('it'), categoryId: s.categories[0].id, name: '', description: '', price: 10000, emoji: '🍽️', tags: [], available: true, prepMinutes: 10, options: [] })}
        >
          Nuevo producto
        </Button>
      </div>
      {s.categories.map((c) => (
        <section key={c.id}>
          <h3 className="section-title">
            {c.emoji} {c.name}
          </h3>
          <div className="mn-list">
            {s.items
              .filter((i) => i.categoryId === c.id)
              .map((it) => (
                <div key={it.id} className={cx('mn-row', !it.available && 'off')}>
                  <button className="mn-main" onClick={() => setEdit(it)}>
                    <ItemArt item={it} />
                    <span className="grow">
                      <strong>{it.name}</strong>
                      <span className="muted small block">{it.description}</span>
                    </span>
                  </button>
                  <span className="mn-sold muted small hide-mobile">{sold.get(it.id) ?? 0} vendidos hoy</span>
                  <strong className="mn-price tabular">{money(it.price)}</strong>
                  <span className="mn-toggle">
                    <Toggle checked={it.available} onChange={(v) => change((d) => (d.items.find((x) => x.id === it.id)!.available = v))} />
                    <span className="small muted hide-mobile">{it.available ? 'Disponible' : 'Agotado'}</span>
                  </span>
                </div>
              ))}
          </div>
        </section>
      ))}
      {edit && <ItemModal item={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

const TAGS = Object.keys(TAG_LABEL) as ItemTag[];

function ItemModal({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const s = useMenuState();
  const [f, setF] = useState(item);
  const exists = s.items.some((i) => i.id === item.id);
  const set = (p: Partial<MenuItem>) => setF({ ...f, ...p });
  return (
    <Modal
      open
      onClose={onClose}
      title={exists ? f.name : 'Nuevo producto'}
      footer={
        <>
          {exists && (
            <Button variant="ghost" icon="trash" onClick={() => (change((d) => (d.items = d.items.filter((i) => i.id !== f.id))), onClose())} aria-label="Eliminar" />
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!f.name.trim()}
            onClick={() => {
              change((d) => {
                const i = d.items.findIndex((x) => x.id === f.id);
                if (i >= 0) d.items[i] = f;
                else d.items.push(f);
              });
              onClose();
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="mn-edit-top">
        <ItemArt item={f} big />
        <div className="grow">
          <Field label="Nombre">
            <input autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <div className="grid-2">
            <Field label="Precio (COP)">
              <input type="number" min={0} step={500} value={f.price} onChange={(e) => set({ price: Number(e.target.value) })} />
            </Field>
            <Field label="Emoji">
              <input value={f.emoji} maxLength={4} onChange={(e) => set({ emoji: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>
      <Field label="Descripción">
        <textarea rows={2} value={f.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      <Field label="Foto (URL)" hint="Pega la dirección de una foto del plato (Instagram, Google, su web)">
        <input value={f.photo ?? ''} placeholder="https://…" onChange={(e) => set({ photo: e.target.value || undefined })} />
      </Field>
      <div className="grid-2">
        <Field label="Categoría">
          <select value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
            {s.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tiempo de preparación (min)">
          <input type="number" min={1} value={f.prepMinutes} onChange={(e) => set({ prepMinutes: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="field">
        <span className="field-label">Etiquetas</span>
        <div className="chips">
          {TAGS.map((tg) => (
            <button key={tg} type="button" className={cx('chip', f.tags.includes(tg) && 'on')} onClick={() => set({ tags: f.tags.includes(tg) ? f.tags.filter((x) => x !== tg) : [...f.tags, tg] })}>
              {TAG_LABEL[tg]}
            </button>
          ))}
        </div>
      </div>
      {f.options.length > 0 && (
        <p className="muted small">
          Opciones: {f.options.map((g) => `${g.name} (${g.choices.map((c) => c.name).join(', ')})`).join(' · ')}
        </p>
      )}
    </Modal>
  );
}
