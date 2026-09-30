// Sincroniza reservas de prueba entre dispositivos durante una demo en vivo:
// el prospecto reserva desde su celular (QR) y la cita aparece en la pantalla del vendedor.
// Sólo guarda lo mínimo para mostrar la cita: nombre de pila, servicio, profesional y hora.
import { list, put } from '@vercel/blob';

const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n);
const safeSlug = (v: unknown) => clip(v, 60).replace(/[^a-z0-9-]/gi, '');

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  const slug = safeSlug(b.slug);
  if (!slug) return new Response('Falta el demo', { status: 400 });
  const data = {
    id: clip(b.id, 40),
    name: clip(b.name, 30).split(' ')[0],
    service: clip(b.service, 80),
    staff: clip(b.staff, 80),
    start: clip(b.start, 16),
    duration: Math.min(600, Math.max(5, Number(b.duration) || 30)),
    price: Math.min(100_000_000, Math.max(0, Number(b.price) || 0)),
    pet: clip(b.pet, 30),
  };
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(data.start)) return new Response('Hora inválida', { status: 400 });
  const enc = Buffer.from(JSON.stringify(data)).toString('base64url');
  await put(`live/${slug}/${Date.now()}__${enc}`, '1', { access: 'private', addRandomSuffix: false, contentType: 'text/plain' });
  return new Response(null, { status: 204 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = safeSlug(url.searchParams.get('slug'));
  const since = Number(url.searchParams.get('since')) || 0;
  if (!slug) return Response.json({ items: [] });
  const { blobs } = await list({ prefix: `live/${slug}/`, limit: 1000 });
  const items = blobs
    .map((b) => {
      const [ts, enc] = b.pathname.split('/').pop()!.split('__');
      try {
        return { at: Number(ts), ...JSON.parse(Buffer.from(enc, 'base64url').toString()) };
      } catch {
        return null;
      }
    })
    .filter((x) => x && x.at > since);
  return Response.json({ items }, { headers: { 'cache-control': 'no-store' } });
}
