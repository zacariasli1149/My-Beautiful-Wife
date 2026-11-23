// 老婆的小本本 — 雲端同步後端（Cloudflare Worker + Durable Object / SQLite）
// 靜態網頁由 assets（./public）提供；/api/* 由這支 Worker 處理。
// 密碼存在 Cloudflare 的 Secret：SYNC_PASSWORD（不在程式碼裡）。做法和 Accounting-Book 一樣。
import { DurableObject } from 'cloudflare:workers';

const MAX_PHOTO = 1.95 * 1024 * 1024;  // SQLite 單一欄位上限 2MB；App 會先把照片壓到 1.8MB 以下
const MAX_PUSH = 2 * 1024 * 1024;
const MAX_ITEM = 64 * 1024;
const MAX_FAILS = 10, LOCK_MS = 15 * 60 * 1000;
const PHOTO_ID = /^[A-Za-z0-9_-]{1,64}$/;
const PHOTO_TYPES = /^image\/(jpeg|png|webp|gif|heic|heif)$/;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

async function sha256(s) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
async function safeEqual(a, b) {  // 固定時間比較，避免時序攻擊
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0; for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    if (!env.SYNC_PASSWORD || env.SYNC_PASSWORD.length < 8)
      return json({ error: 'not_configured', message: '尚未在 Cloudflare 設定 SYNC_PASSWORD（至少 8 個字元）' }, 503);

    const store = env.STORE.get(env.STORE.idFromName('main'));
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (await store.isLocked(ip)) return json({ error: 'locked', message: '密碼錯誤太多次，請 15 分鐘後再試' }, 429);
    const auth = request.headers.get('authorization') || '';
    const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!given || !(await safeEqual(given, env.SYNC_PASSWORD))) {
      await store.recordFail(ip);
      return json({ error: 'unauthorized', message: '密碼錯誤' }, 401);
    }
    await store.clearFails(ip);

    const path = url.pathname.slice(5);  // 去掉 "/api/"
    const m = request.method;

    if (path === 'ping' && m === 'GET') return json({ ok: true, seq: await store.getSeq() });

    if (path === 'changes' && m === 'GET') {
      const since = Math.max(0, Number(url.searchParams.get('since')) || 0);
      return json(await store.changes(since, 500));
    }

    if (path === 'push' && m === 'POST') {
      if (Number(request.headers.get('content-length') || 0) > MAX_PUSH) return json({ error: 'too_large' }, 413);
      let body; try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
      if (!body || !Array.isArray(body.items) || body.items.length > 500) return json({ error: 'bad_request' }, 400);
      const items = [];
      for (const it of body.items) {
        if (!it || typeof it.id !== 'string' || !it.id || it.id.length > 100 || typeof it.updatedAt !== 'number') return json({ error: 'bad_item' }, 400);
        const text = JSON.stringify(it);
        if (text.length > MAX_ITEM) return json({ error: 'item_too_large', id: it.id }, 413);
        items.push({ id: it.id, updatedAt: it.updatedAt, deleted: it.deleted ? 1 : 0, text });
      }
      return json(await store.push(items));
    }

    if (path.startsWith('photos/')) {
      const id = decodeURIComponent(path.slice(7));
      if (!PHOTO_ID.test(id)) return json({ error: 'bad_id' }, 400);
      if (m === 'GET') {
        const p = await store.getPhoto(id);
        if (!p) return json({ error: 'not_found' }, 404);
        return new Response(p.data, { headers: { 'content-type': p.type, 'cache-control': 'private, max-age=31536000, immutable' } });
      }
      if (m === 'PUT') {
        const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!PHOTO_TYPES.test(type)) return json({ error: 'unsupported_type' }, 415);
        const data = await request.arrayBuffer();
        if (!data.byteLength || data.byteLength > MAX_PHOTO) return json({ error: 'too_large' }, 413);
        await store.putPhoto(id, type, data);
        return json({ ok: true, id, size: data.byteLength });
      }
      if (m === 'DELETE') { await store.deletePhoto(id); return json({ ok: true }); }
    }
    return json({ error: 'not_found' }, 404);
  },
};

export class SyncStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, seq INTEGER NOT NULL)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS items_seq ON items (seq)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS fails (ip TEXT PRIMARY KEY, n INTEGER, until INTEGER)`);
  }
  meta(k) { const r = this.sql.exec(`SELECT v FROM meta WHERE k = ?`, k).toArray()[0]; return r ? r.v : null; }
  setMeta(k, v) { this.sql.exec(`INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`, k, String(v)); }

  async getSeq() { return Number(this.meta('seq') || 0); }

  // 每筆各自比較 updatedAt，新的贏（同一時間以後到的為準）
  async push(items) {
    let applied = 0;
    this.ctx.storage.transactionSync(() => {
      let seq = Number(this.meta('seq') || 0);
      for (const it of items) {
        const cur = this.sql.exec(`SELECT updated_at FROM items WHERE id = ?`, it.id).toArray()[0];
        if (cur && cur.updated_at > it.updatedAt) continue;
        seq++;
        this.sql.exec(`INSERT INTO items (id, data, updated_at, deleted, seq) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted, seq = excluded.seq`,
          it.id, it.text, it.updatedAt, it.deleted, seq);
        applied++;
      }
      this.setMeta('seq', seq);
    });
    return { applied, seq: await this.getSeq() };
  }
  async changes(since, limit) {
    const rows = this.sql.exec(`SELECT data, seq FROM items WHERE seq > ? ORDER BY seq LIMIT ?`, since, limit + 1).toArray();
    const more = rows.length > limit; if (more) rows.pop();
    const seq = rows.length ? rows[rows.length - 1].seq : Math.max(since, await this.getSeq());
    return { items: rows.map(r => JSON.parse(r.data)), seq, more };
  }

  async putPhoto(id, type, data) {
    this.sql.exec(`INSERT INTO photos (id, type, data, size, created_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET type = excluded.type, data = excluded.data, size = excluded.size`, id, type, data, data.byteLength, Date.now());
  }
  async getPhoto(id) {
    const r = this.sql.exec(`SELECT type, data FROM photos WHERE id = ?`, id).toArray()[0];
    return r ? { type: r.type, data: r.data } : null;
  }
  async deletePhoto(id) { this.sql.exec(`DELETE FROM photos WHERE id = ?`, id); }

  async isLocked(ip) {
    const r = this.sql.exec(`SELECT until FROM fails WHERE ip = ?`, ip).toArray()[0];
    return !!(r && r.until && r.until > Date.now());
  }
  async recordFail(ip) {
    const r = this.sql.exec(`SELECT n FROM fails WHERE ip = ?`, ip).toArray()[0];
    const n = (r ? r.n : 0) + 1;
    const until = n >= MAX_FAILS ? Date.now() + LOCK_MS : 0;
    this.sql.exec(`INSERT INTO fails (ip, n, until) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET n = excluded.n, until = excluded.until`, ip, n >= MAX_FAILS ? 0 : n, until);
  }
  async clearFails(ip) { this.sql.exec(`DELETE FROM fails WHERE ip = ?`, ip); }
}
