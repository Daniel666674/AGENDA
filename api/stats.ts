// Resumen de actividad de los demos para el panel "Seguimiento" del Estudio.
// Protegido con la clave TRACK_KEY (variable de entorno del proyecto en Vercel).
import { list } from '@vercel/blob';

const dec = (s: string) => {
  try {
    return Buffer.from(s, 'base64url').toString();
  } catch {
    return '';
  }
};

interface Demo {
  key: string;
  kind: string;
  slug: string;
  name: string;
  seller: string;
  opens: number;
  cta: number;
  calc: number;
  booking: number;
  order: number;
  mobile: number;
  first: number;
  last: number;
  lastCta?: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!process.env.TRACK_KEY || url.searchParams.get('k') !== process.env.TRACK_KEY) return new Response('Clave incorrecta', { status: 401 });

  const demos = new Map<string, Demo>();
  const recent: { at: number; event: string; kind: string; slug: string; name: string; device: string; detail: string }[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const page = await list({ prefix: 'ev/', cursor, limit: 1000 });
    for (const b of page.blobs) {
      const [ts, event, kind, slug, nameEnc, device, sellerEnc, detailEnc] = b.pathname.slice(3).split('__');
      const at = Number(ts);
      const name = dec(nameEnc) || slug;
      const key = `${kind}:${slug}`;
      const d = demos.get(key) ?? { key, kind, slug, name, seller: dec(sellerEnc), opens: 0, cta: 0, calc: 0, booking: 0, order: 0, mobile: 0, first: at, last: at };
      if (event === 'open') {
        d.opens++;
        if (device === 'm') d.mobile++;
      } else if (event === 'cta') {
        d.cta++;
        d.lastCta = dec(detailEnc);
      } else if (event in d) (d as unknown as Record<string, number>)[event]++;
      d.first = Math.min(d.first, at);
      d.last = Math.max(d.last, at);
      if (!d.seller) d.seller = dec(sellerEnc);
      demos.set(key, d);
      recent.push({ at, event, kind, slug, name, device, detail: dec(detailEnc) });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && ++pages < 20);

  recent.sort((a, b) => b.at - a.at);
  return Response.json(
    { demos: [...demos.values()].sort((a, b) => b.last - a.last), recent: recent.slice(0, 60) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
