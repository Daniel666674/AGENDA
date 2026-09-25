// Registra un evento de un demo (apertura, "Quiero activarlo", calculadora, reserva, pedido).
// Cada evento es un archivo vacío en Vercel Blob; toda la información va en el nombre,
// así el panel lo lee con un solo listado, sin descargar nada.
import { put } from '@vercel/blob';

const EVENTS = ['open', 'cta', 'calc', 'booking', 'order'];
const enc = (s: string) => Buffer.from(s).toString('base64url');
const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n);

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }
  const event = String(b.event);
  if (!EVENTS.includes(event)) return new Response('Evento desconocido', { status: 400 });
  const kind = b.kind === 'menu' ? 'menu' : 'agenda';
  const slug = clip(b.slug, 60).replace(/[^a-z0-9-]/gi, '') || 'sin-slug';
  const name = clip(b.name, 60);
  const seller = clip(b.seller, 40);
  const detail = clip(b.detail, 40);
  const ua = req.headers.get('user-agent') ?? '';
  const device = /mobile|android|iphone|ipad/i.test(ua) ? 'm' : 'd';
  const path = ['ev/' + Date.now(), event, kind, slug, enc(name), device, enc(seller), enc(detail), Math.random().toString(36).slice(2, 8)].join('__');
  await put(path, '1', { access: 'private', addRandomSuffix: false, contentType: 'text/plain' });
  return new Response(null, { status: 204 });
}
