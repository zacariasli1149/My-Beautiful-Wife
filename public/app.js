// 老婆的小本本 — local-first app: data in localStorage, photos in IndexedDB, synced to the Cloudflare Worker (/api)
(() => {
/* ---------- constants ---------- */
const CATS = {
  place: { name: '想去的地方', short: '想去', animal: 'dog',   c: 'var(--sky)',   wish: true,
           ph: '例如：京都嵐山的竹林小徑', noteph: '她怎麼說的？什麼季節想去、想做什麼…', fields: ['location', 'link'] },
  food:  { name: '想吃的美食', short: '想吃', animal: 'bunny', c: 'var(--peach)', wish: true,
           ph: '例如：信義區那家舒芙蕾鬆餅', noteph: '想點什麼？要不要訂位？', fields: ['location', 'link'] },
  gift:  { name: '禮物靈感',   short: '禮物', animal: 'cat',   c: 'var(--pink)',  wish: true,
           ph: '例如：櫻花粉色的鑄鐵鍋', noteph: '顏色、尺寸、在哪裡看到的…', fields: ['price', 'link', 'location'] },
  like:  { name: '喜好與地雷', short: '喜好', animal: 'cow',   c: 'var(--lilac)',
           ph: '例如：喜歡白色小花、不吃香菜', noteph: '補充細節，送禮或安排時就不會踩雷', fields: ['mood'] },
  habit: { name: '習慣小事',   short: '習慣', animal: 'bunny', c: 'var(--mint)',
           ph: '例如：早上一定要先喝溫水', noteph: '什麼時候、為什麼…', fields: [] },
  info:  { name: '重要資訊',   short: '資訊', animal: 'dog',   c: 'var(--butter)',
           ph: '例如：生日、戒圍 11 號、鞋子 23.5', noteph: '尺寸、過敏、紀念日、證件到期…', fields: ['date'] },
};
const CAT_KEYS = Object.keys(CATS);
const WISH_KEYS = CAT_KEYS.filter(k => CATS[k].wish);

/* ---------- icons ---------- */
const I = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 2.5-2 4.5 3.5"/></svg>',
  heartBook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z"/><path d="M5 18a2 2 0 0 1 2-2h11"/><path d="M11.5 12.5s-2.5-1.5-2.5-3a1.3 1.3 0 0 1 2.5-.6 1.3 1.3 0 0 1 2.5.6c0 1.5-2.5 3-2.5 3z" fill="currentColor" stroke="none"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>',
  paw: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="16" rx="4.5" ry="3.8"/><circle cx="6.5" cy="10.5" r="2"/><circle cx="17.5" cy="10.5" r="2"/><circle cx="9.5" cy="6.5" r="2"/><circle cx="14.5" cy="6.5" r="2"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.3" fill="currentColor"/><circle cx="15" cy="15" r="1.3" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="9" cy="15" r="1.3" fill="currentColor"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>',
};

/* ---------- mascots ---------- */
const S = 'stroke="#4B3439" stroke-width="2.2" stroke-linejoin="round"';
const face = (y = 34) => `
  <circle cx="24" cy="${y}" r="2.6" fill="#3B2A2E"/><circle cx="40" cy="${y}" r="2.6" fill="#3B2A2E"/>
  <circle cx="24.9" cy="${y - 0.9}" r=".8" fill="#fff"/><circle cx="40.9" cy="${y - 0.9}" r=".8" fill="#fff"/>
  <ellipse cx="18.5" cy="${y + 5}" rx="3.4" ry="2.2" fill="#FF8FA8" opacity=".55"/><ellipse cx="45.5" cy="${y + 5}" rx="3.4" ry="2.2" fill="#FF8FA8" opacity=".55"/>`;
const ART = {
  /* Dalmatian: white face, black floppy ears, black spots */
  dog: `<ellipse cx="13" cy="30" rx="7" ry="13" fill="#2B2326" ${S} transform="rotate(18 13 30)"/>
        <ellipse cx="51" cy="30" rx="7" ry="13" fill="#2B2326" ${S} transform="rotate(-18 51 30)"/>
        <circle cx="13" cy="33" r="1.8" fill="#FFFFFF"/><circle cx="50" cy="26" r="1.5" fill="#FFFFFF"/>
        <circle cx="32" cy="35" r="19" fill="#FFFFFF" ${S}/>
        <circle cx="40.5" cy="32.5" r="6" fill="#2B2326"/>
        <circle cx="21" cy="24" r="2.4" fill="#2B2326"/><circle cx="31" cy="21" r="1.8" fill="#2B2326"/>
        <circle cx="17" cy="42" r="1.7" fill="#2B2326"/><circle cx="45" cy="45" r="2.2" fill="#2B2326"/>
        <circle cx="38" cy="22.5" r="1.4" fill="#2B2326"/><circle cx="25" cy="49" r="1.3" fill="#2B2326"/>
        <circle cx="24" cy="34" r="2.6" fill="#3B2A2E"/><circle cx="24.9" cy="33.1" r=".8" fill="#fff"/>
        <circle cx="40" cy="34" r="3.2" fill="#FFFFFF"/><circle cx="40" cy="34" r="2.4" fill="#3B2A2E"/><circle cx="40.8" cy="33.2" r=".8" fill="#fff"/>
        <ellipse cx="18.5" cy="39" rx="3.4" ry="2.2" fill="#FF8FA8" opacity=".55"/><ellipse cx="45.5" cy="39.5" rx="3" ry="2" fill="#FF8FA8" opacity=".7"/>
        <ellipse cx="32" cy="41" rx="3.6" ry="2.6" fill="#2B2326"/>
        <path d="M28.5 45q3.5 3 7 0" fill="none" stroke="#3B2A2E" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M31 46.5q1 3.5 3 0" fill="#FF8FA8" stroke="#3B2A2E" stroke-width="1.2"/>`,
  /* Black bunny: black fur, pink inner ears, light features */
  bunny: `<ellipse cx="23" cy="15" rx="5.5" ry="13" fill="#2B2326" ${S}/><ellipse cx="23" cy="16" rx="2.4" ry="9" fill="#F49AB0"/>
          <ellipse cx="41" cy="15" rx="5.5" ry="13" fill="#2B2326" ${S}/><ellipse cx="41" cy="16" rx="2.4" ry="9" fill="#F49AB0"/>
          <circle cx="32" cy="38" r="18" fill="#2B2326" ${S}/>
          <ellipse cx="32" cy="44" rx="7.5" ry="5.5" fill="#463A3E"/>
          <circle cx="24" cy="37" r="3.6" fill="#FFFFFF"/><circle cx="40" cy="37" r="3.6" fill="#FFFFFF"/>
          <circle cx="24.4" cy="37.4" r="2.5" fill="#120C0E"/><circle cx="40.4" cy="37.4" r="2.5" fill="#120C0E"/>
          <circle cx="25.3" cy="36.4" r=".9" fill="#fff"/><circle cx="41.3" cy="36.4" r=".9" fill="#fff"/>
          <ellipse cx="18" cy="43" rx="3.4" ry="2.2" fill="#FF8FA8" opacity=".8"/><ellipse cx="46" cy="43" rx="3.4" ry="2.2" fill="#FF8FA8" opacity=".8"/>
          <path d="M30 42.2h4l-2 2.2z" fill="#FF9FB4"/>
          <path d="M32 44.4q-2 2.6-4.2 1.4M32 44.4q2 2.6 4.2 1.4" fill="none" stroke="#F3DCE2" stroke-width="1.6" stroke-linecap="round"/>`,
  cat: `<path d="M15 26 17 9l12 9z" fill="#F7B26E" ${S}/><path d="M49 26 47 9l-12 9z" fill="#F7B26E" ${S}/>
        <path d="M18.5 20 19 13.5l5 4z" fill="#FFC1CF"/><path d="M45.5 20 45 13.5l-5 4z" fill="#FFC1CF"/>
        <circle cx="32" cy="36" r="19" fill="#F7B26E" ${S}/>
        <path d="M32 18v6M27 19l1.2 5M37 19l-1.2 5" stroke="#D98A45" stroke-width="2.4" stroke-linecap="round"/>
        ${face(35)}
        <path d="M30 40h4l-2 2z" fill="#FF8FA8"/>
        <path d="M32 42q-2 2.6-4.2 1.4M32 42q2 2.6 4.2 1.4" fill="none" stroke="#3B2A2E" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M9 37h8M9.5 41.5l7.5-2M55 37h-8M54.5 41.5l-7.5-2" stroke="#4B3439" stroke-width="1.4" stroke-linecap="round"/>`,
  /* Highland cow: long sweeping horns, ginger shaggy coat, fringe over the eyes */
  cow: `<path d="M20 24C12 24 5 20 4 11c4 5 9 7 16 7z" fill="#F3E3C3" ${S}/>
        <path d="M44 24c8 0 15-4 16-13-4 5-9 7-16 7z" fill="#F3E3C3" ${S}/>
        <path d="M14 30q-9 0-10 5 6 3 12 0z" fill="#C4703A" ${S}/>
        <path d="M50 30q9 0 10 5-6 3-12 0z" fill="#C4703A" ${S}/>
        <path d="M14 33q0-15 18-15t18 15q0 10-4 15H18q-4-5-4-15z" fill="#D07E44" ${S}/>
        <circle cx="25" cy="35" r="2.3" fill="#3B2A2E"/><circle cx="39" cy="35" r="2.3" fill="#3B2A2E"/>
        <circle cx="25.8" cy="34.3" r=".7" fill="#fff"/><circle cx="39.8" cy="34.3" r=".7" fill="#fff"/>
        <path d="M15 29q2-12 17-12t17 12l-3 4-3-3-3 4-3-4-3 4-3-4-3 4-3-4-3 4-3-3z" fill="#B0602C" ${S}/>
        <path d="M24 22q2 4 1 8M32 20q1 5 0 10M40 22q-2 4-1 8" fill="none" stroke="#8E4A1F" stroke-width="1.4" stroke-linecap="round"/>
        <ellipse cx="19" cy="40" rx="3" ry="2" fill="#FF8FA8" opacity=".6"/><ellipse cx="45" cy="40" rx="3" ry="2" fill="#FF8FA8" opacity=".6"/>
        <ellipse cx="32" cy="46" rx="11" ry="7" fill="#F2B9A2" ${S}/>
        <ellipse cx="27.5" cy="45.5" rx="1.6" ry="2.1" fill="#9A4F3C"/><ellipse cx="36.5" cy="45.5" rx="1.6" ry="2.1" fill="#9A4F3C"/>`,
};
function mascot(animal, size = 44, bg = '') {
  return `<span class="m" style="width:${size}px;height:${size}px;${bg ? `background:${bg};padding:${Math.round(size * .08)}px` : ''}" aria-hidden="true"><svg viewBox="0 0 64 64">${ART[animal]}</svg></span>`;
}
const catMascot = (k, size = 44) => mascot(CATS[k].animal, size, `color-mix(in srgb, ${CATS[k].c} 55%, var(--surface))`);

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const safeUrl = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
const mapsUrl = it => {
  if (it.link && /google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/.test(it.link)) return safeUrl(it.link);
  const q = (it.location || '').trim() || it.title;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
};
const fmtDate = ts => { if (!ts) return ''; const d = new Date(ts); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; };
const hearts = n => n ? '♥'.repeat(n) : '';
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }

/* ---------- local-first store + cloud sync (Cloudflare Worker) ---------- */
const K = { items: 'mbw.items', meta: 'mbw.sync', seeded: 'mbw.seeded' };
const state = {
  items: new Map(lsGet(K.items, []).map(i => [i.id, i])), ready: true,
  view: 'home', cat: null, filter: 'todo', query: '',
  sheet: null, draft: null, confirmDel: false, toast: null, uploading: 0,
};
const meta = Object.assign({ password: '', seq: 0, lastSync: null, dirty: [], pendingPhotos: [], photoDeletes: [] }, lsGet(K.meta, {}));
const saveMeta = () => lsSet(K.meta, meta);
let warnedFull = false;
function persist() {
  if (!lsSet(K.items, [...state.items.values()]) && !warnedFull) { warnedFull = true; toast('這台裝置的儲存空間不足，資料可能沒存好'); }
}
function markDirty(id) { if (!meta.dirty.includes(id)) meta.dirty.push(id); saveMeta(); Sync.schedule(); }

function saveItem(item) {
  state.items.set(item.id, item); persist(); markDirty(item.id); render();
}
function patchItem(id, patch) {
  const it = state.items.get(id); if (!it || it.deleted) return;
  state.items.set(id, { ...it, ...patch, updatedAt: Date.now() }); persist(); markDirty(id); render();
}
function removeItem(id) {
  const it = state.items.get(id); if (!it) return;
  state.items.set(id, { id, deleted: true, updatedAt: Date.now() }); persist(); markDirty(id);
  (it.photos || []).forEach(deletePhoto);
  render();
}

/* first launch: a few marked examples (fixed ids/timestamps, so devices never duplicate them) */
const EXAMPLES = [
  { id: 'ex1', cat: 'place', title: '京都嵐山竹林小徑', note: '她說秋天楓葉季去最美，想穿和服拍照', location: '嵐山 竹林之道', priority: 3, tags: ['日本', '秋天'] },
  { id: 'ex2', cat: 'food', title: '舒芙蕾鬆餅', note: '看到 IG 上的影片說好想吃，要點抹茶口味', location: '台北 舒芙蕾鬆餅', priority: 2, tags: ['甜點'] },
  { id: 'ex3', cat: 'gift', title: '櫻花粉色的鑄鐵鍋', note: '逛百貨時停下來看了很久，說 20 公分剛好', price: '6800', priority: 2, tags: ['廚房'] },
  { id: 'ex4', cat: 'like', title: '喜歡白色小花', note: '滿天星、小蒼蘭都喜歡，玫瑰覺得太隆重', mood: 'love', priority: 1, tags: ['花'] },
  { id: 'ex5', cat: 'like', title: '不吃香菜', note: '點餐記得說「不要香菜」', mood: 'dislike', tags: ['飲食'] },
  { id: 'ex6', cat: 'habit', title: '早上一定先喝一杯溫水' },
  { id: 'ex7', cat: 'info', title: '她的生日（範例日期）', note: '改成真正的生日，首頁就會倒數', date: '1995-12-20', yearly: true },
  { id: 'ex8', cat: 'food', title: '淡水老街阿給', note: '上次去吃覺得很好吃，還想再去', location: '淡水 老牌阿給', priority: 1, tags: ['小吃'], done: true, doneAt: 1763100000000 },
];
if (!lsGet(K.seeded, false) && state.items.size === 0) {
  EXAMPLES.forEach((e, n) => state.items.set(e.id, {
    note: '', location: '', link: '', price: '', date: '', yearly: false, mood: '', priority: 0, tags: [], done: false, doneAt: null, photos: [],
    ...e, example: true, createdAt: 1763800000000 - n * 1e8, updatedAt: 1763800000000 - n * 1e8 }));
  persist(); lsSet(K.seeded, true);
}

/* ---------- photo storage (IndexedDB on the device, uploaded to the cloud when online) ---------- */
const PhotoDB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('mbw-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('p');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => {
    const t = db.transaction('p', mode); const req = fn(t.objectStore('p'));
    t.oncomplete = () => res(req?.result); t.onerror = () => rej(t.error); }); };
  return { get: id => tx('readonly', s => s.get(id)), put: (id, v) => tx('readwrite', s => s.put(v, id)), del: id => tx('readwrite', s => s.delete(id)) };
})();
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const photoUrls = new Map(), photoLoading = new Set(), photoMissing = new Set();
const photoSrc = id => photoUrls.get(id) || BLANK;
function hydratePhotos() {
  document.querySelectorAll('img[data-photo]').forEach(img => {
    const id = img.dataset.photo, u = photoUrls.get(id);
    if (u) { if (img.getAttribute('src') !== u) img.src = u; } else loadPhoto(id);
  });
}
async function loadPhoto(id) {
  if (photoLoading.has(id) || photoMissing.has(id)) return;
  photoLoading.add(id);
  try {
    let rec = await PhotoDB.get(id).catch(() => null);
    if (!rec && meta.password && navigator.onLine) {
      const res = await fetch('api/photos/' + encodeURIComponent(id), { headers: { authorization: 'Bearer ' + meta.password } });
      if (res.ok) { const blob = await res.blob(); rec = { blob, type: blob.type, pending: false }; PhotoDB.put(id, rec).catch(() => {}); }
      else if (res.status === 404) photoMissing.add(id);
    }
    if (rec) {
      photoUrls.set(id, URL.createObjectURL(rec.blob));
      document.querySelectorAll(`img[data-photo="${CSS.escape(id)}"]`).forEach(i => { i.src = photoUrls.get(id); });
    }
  } catch {} finally { photoLoading.delete(id); }
}
async function addPhoto(file) {
  const { blob, type } = await compress(file);
  if (blob.size > 1.9 * 1024 * 1024) throw Object.assign(new Error('too big'), { code: 'too_big' });
  const id = 'p' + uid();
  await PhotoDB.put(id, { blob, type, pending: true });
  photoUrls.set(id, URL.createObjectURL(blob));
  meta.pendingPhotos.push(id); saveMeta(); Sync.schedule();
  return id;
}
function deletePhoto(id) {
  PhotoDB.del(id).catch(() => {});
  const wasPending = meta.pendingPhotos.includes(id);
  meta.pendingPhotos = meta.pendingPhotos.filter(x => x !== id);
  if (!wasPending && !meta.photoDeletes.includes(id)) meta.photoDeletes.push(id);
  saveMeta(); Sync.schedule();
}

/* ---------- sync ---------- */
const Sync = (() => {
  let status = meta.password ? 'idle' : 'off', error = '', running = null, again = false, timer;
  const set = (s, e = '') => { status = s; error = e; onSyncStatus(); };
  async function api(path, opts = {}) {
    const res = await fetch('api/' + path, { ...opts, cache: 'no-store',
      headers: { authorization: 'Bearer ' + meta.password, ...(opts.headers || {}) } });
    if (res.status === 401) throw Object.assign(new Error('密碼錯誤，請到設定重新輸入'), { code: 'auth' });
    if (res.status === 429) throw Object.assign(new Error('密碼錯太多次，請 15 分鐘後再試'), { code: 'locked' });
    if (res.status === 503) { const j = await res.json().catch(() => ({})); throw new Error(j.message || '雲端還沒設定好'); }
    if (!res.ok) throw new Error('伺服器回應 ' + res.status);
    return res;
  }
  async function run() {
    for (const id of [...meta.pendingPhotos]) {
      const rec = await PhotoDB.get(id).catch(() => null);
      if (rec) {
        await api('photos/' + encodeURIComponent(id), { method: 'PUT', body: rec.blob, headers: { 'content-type': rec.type || 'image/jpeg' } });
        rec.pending = false; await PhotoDB.put(id, rec).catch(() => {});
      }
      meta.pendingPhotos = meta.pendingPhotos.filter(x => x !== id); saveMeta(); onSyncStatus();
    }
    for (const id of [...meta.photoDeletes]) {
      await api('photos/' + encodeURIComponent(id), { method: 'DELETE' });
      meta.photoDeletes = meta.photoDeletes.filter(x => x !== id); saveMeta();
    }
    while (meta.dirty.length) {
      const ids = meta.dirty.slice(0, 200);
      const items = ids.map(id => state.items.get(id)).filter(Boolean);
      await api('push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
      const sent = new Map(items.map(i => [i.id, i.updatedAt]));
      // keep anything edited again while the request was in flight
      meta.dirty = meta.dirty.filter(id => !ids.includes(id) || (state.items.get(id) && state.items.get(id).updatedAt !== sent.get(id)));
      saveMeta();
      if (ids.every(id => meta.dirty.includes(id))) break;
    }
    let changed = false, more = true;
    while (more) {
      const j = await (await api('changes?since=' + meta.seq)).json();
      for (const it of j.items) {
        const local = state.items.get(it.id);
        if (local && meta.dirty.includes(it.id) && (local.updatedAt || 0) > (it.updatedAt || 0)) continue;
        if (!local || local.updatedAt !== it.updatedAt || !!local.deleted !== !!it.deleted) { state.items.set(it.id, it); changed = true; }
      }
      meta.seq = j.seq; more = j.more;
    }
    meta.lastSync = new Date().toISOString(); saveMeta(); photoMissing.clear();
    if (changed) { persist(); render(); }
  }
  function syncNow() {
    if (!meta.password) { set('off'); return Promise.resolve(); }
    if (running) { again = true; return running; }
    running = (async () => {
      set('syncing');
      try { await run(); set('ok'); }
      catch (e) {
        if (e.code === 'auth' || e.code === 'locked') set('error', e.message);
        else if (!navigator.onLine || e instanceof TypeError) set('offline');
        else set('error', e.message);
      } finally { running = null; if (again) { again = false; syncNow(); } }
    })();
    return running;
  }
  function schedule() { if (!meta.password) { onSyncStatus(); return; } clearTimeout(timer); timer = setTimeout(syncNow, 1200); }
  async function connect(password) {
    const res = await fetch('api/ping', { headers: { authorization: 'Bearer ' + password }, cache: 'no-store' });
    if (res.status === 401) throw new Error('密碼不對，再試一次');
    if (res.status === 429) throw new Error('密碼錯太多次，請 15 分鐘後再試');
    if (res.status === 503) { const j = await res.json().catch(() => ({})); throw new Error(j.message || '雲端還沒設定好'); }
    if (!res.ok) throw new Error('連不上雲端（' + res.status + '）');
    meta.password = password; meta.seq = 0;
    // upload everything this device has; newer edits win on both sides
    state.items.forEach((_, id) => { if (!meta.dirty.includes(id)) meta.dirty.push(id); });
    saveMeta();
    await syncNow();
  }
  function disconnect() { meta.password = ''; meta.seq = 0; meta.lastSync = null; saveMeta(); set('off'); }
  return { syncNow, schedule, connect, disconnect, get status() { return status; }, get error() { return error; } };
})();

const SYNC_TEXT = { off: '尚未開啟雲端同步', idle: '雲端同步', syncing: '同步中…', ok: '已同步', offline: '離線中，連上網路後會自動同步', error: '同步失敗' };
function pendingText() {
  const n = meta.dirty.length, p = meta.pendingPhotos.length;
  return [n ? `${n} 筆待同步` : '', p ? `${p} 張照片待上傳` : ''].filter(Boolean).join('、');
}
function syncPill() {
  const s = Sync.status, cls = s === 'ok' ? 'ok' : s === 'syncing' || s === 'idle' ? 'busy' : 'off';
  const extra = s !== 'off' && s !== 'syncing' ? pendingText() : '';
  return `<button class="cloud-pill ${cls}" data-act="settings">${SYNC_TEXT[s]}${s === 'off' ? '（點這裡設定）' : ''}${extra ? ' · ' + extra : ''}</button>`;
}
function onSyncStatus() {
  const pill = $('.cloud-pill'); if (pill) pill.outerHTML = syncPill();
  if (state.sheet?.mode === 'settings' && meta.password) { const box = $('#syncBox'); if (box) box.innerHTML = syncCardInner(); }
}

/* ---------- derived ---------- */
const all = () => [...state.items.values()].filter(i => !i.deleted).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
const byCat = k => all().filter(i => i.cat === k);
const matches = (i, q) => {
  q = q.trim().toLowerCase(); if (!q) return true;
  if (q.startsWith('#')) return (i.tags || []).some(t => t.toLowerCase() === q.slice(1));
  return [i.title, i.note, i.location, ...(i.tags || []), CATS[i.cat]?.name].join(' ').toLowerCase().includes(q);
};
function upcoming() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return all().filter(i => i.date).map(i => {
    const [y, m, d] = i.date.split('-').map(Number);
    let next = new Date(y, m - 1, d);
    if (i.yearly) { next = new Date(today.getFullYear(), m - 1, d); if (next < today) next.setFullYear(today.getFullYear() + 1); }
    const days = Math.round((next - today) / 864e5);
    const years = i.yearly ? next.getFullYear() - y : 0;
    return { it: i, days, next, years };
  }).filter(x => x.days >= 0 && x.days <= 366).sort((a, b) => a.days - b.days);
}

/* ---------- render ---------- */
function render() {
  renderTabs();
  const app = $('#app');
  if (!state.ready) { app.innerHTML = `<div class="loading"><div class="bounce">${mascot('bunny', 64)}</div>小本本打開中…</div>`; return; }
  const v = state.view;
  app.innerHTML = v === 'wish' ? viewWish() : v === 'memories' ? viewMemories() : v === 'profile' ? viewProfile()
    : v === 'cat' ? viewCat() : viewHome();
  const s = $('#q'); if (s) { s.value = state.query; }
  renderLayer();
}

function renderTabs() {
  const t = (v, icon, label) => `<button class="tab ${state.view === v || (v === 'home' && state.view === 'cat') ? 'on' : ''}" data-act="nav" data-v="${v}">${icon}<span>${label}</span></button>`;
  $('#tabs').innerHTML = t('home', I.home, '首頁') + t('wish', I.star, '心願清單') +
    `<button class="fab" data-act="add" aria-label="新增一筆">${I.plus}</button>` +
    t('memories', I.photo, '回憶牆') + t('profile', I.heartBook, '她的檔案');
}

function card(i, opts = {}) {
  const c = CATS[i.cat] || CATS.like;
  const thumb = i.photos?.length ? `<img class="thumb" src="${photoSrc(i.photos[0])}" data-photo="${esc(i.photos[0])}" alt="" loading="lazy">` : catMascot(i.cat, 44);
  const chips = [];
  if (i.example) chips.push('<span class="chip ex">範例</span>');
  if (opts.showCat) chips.push(`<span class="chip">${c.short}</span>`);
  if (i.mood === 'dislike') chips.push('<span class="chip bad">地雷</span>');
  if (i.location && (i.cat === 'place' || i.cat === 'food' || i.cat === 'gift'))
    chips.push(`<a class="chip map" href="${esc(mapsUrl(i))}" target="_blank" rel="noopener" data-stop>${I.pin}${esc(i.location)}</a>`);
  if (i.price) chips.push(`<span class="chip num">$${esc(i.price)}</span>`);
  if (i.date) chips.push(`<span class="chip num">${esc(i.date.replace(/-/g, '/'))}${i.yearly ? ' · 每年' : ''}</span>`);
  if (i.photos?.length > 1) chips.push(`<span class="chip">${I.photo}${i.photos.length}</span>`);
  (i.tags || []).slice(0, 3).forEach(t => chips.push(`<span class="chip">#${esc(t)}</span>`));
  const checkbox = c.wish ? `<button class="check ${i.done ? 'on' : ''}" data-act="toggle" data-id="${i.id}" aria-label="${i.done ? '改回未完成' : '標記完成'}" data-stop>${I.check}</button>` : '';
  return `<div class="card cat-${i.cat} ${i.done ? 'done' : ''}" role="button" tabindex="0" data-act="open" data-id="${i.id}">
    ${thumb}
    <div class="card-body">
      <div class="card-title">${esc(i.title)} ${i.priority ? `<span class="hearts">${hearts(i.priority)}</span>` : ''}</div>
      ${i.note ? `<div class="card-note">${esc(i.note)}</div>` : ''}
      ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
    </div>
    ${checkbox}
  </div>`;
}

function exampleBanner() {
  const n = all().filter(i => i.example).length;
  if (!n) return '';
  return `<div class="banner">${mascot('cow', 34)}<p>這裡有 ${n} 筆<b>範例</b>，讓你看看怎麼用。開始記錄老婆的事之後就可以清掉。</p>
    <button data-act="clearEx">${state.confirmClear ? '確定清除？' : '清除範例'}</button></div>`;
}

function viewHome() {
  const items = all();
  const q = state.query;
  const results = q ? items.filter(i => matches(i, q)) : null;
  const ups = upcoming().slice(0, 6);
  const tiles = CAT_KEYS.map(k => {
    const list = byCat(k), done = list.filter(i => i.done).length;
    return `<button class="cat-tile" style="--c:${CATS[k].c}" data-act="openCat" data-cat="${k}">
      ${catMascot(k, 48)}<b>${CATS[k].name}</b>
      <span class="num">${CATS[k].wish ? `${done}/${list.length} 完成` : `${list.length} 筆`}</span></button>`;
  }).join('');
  return `
  <header class="hero">
    <div class="stack">${mascot('dog', 46)}${mascot('bunny', 46)}${mascot('cat', 46)}${mascot('cow', 46)}</div>
    <div class="hero-text"><h1>老婆的小本本</h1><p>她說過的每件小事，都好好收著</p></div>
  </header>
  <div class="chips">${syncPill()}</div>
  ${Sync.status === 'off' ? `<div class="banner">${mascot('dog', 34)}<p>還沒開啟雲端同步：資料只存在這台裝置，換手機或清掉瀏覽器就會不見。</p><button data-act="settings">去設定</button></div>` : ''}
  ${exampleBanner()}
  <label class="search">${I.search}<input id="q" type="search" placeholder="搜尋她說過的事、地點、#標籤" autocomplete="off" aria-label="搜尋"></label>
  <div id="results">${results ? resultsHtml(results) : ''}</div>
  ${results ? '' : `
  ${ups.length ? `<section class="section">
    <div class="sec-head"><h2>快到的日子</h2><button data-act="giftMode">挑禮物 →</button></div>
    <div class="dates">${ups.map(u => `<button class="date-card" data-act="open" data-id="${u.it.id}">
      <span class="d">${u.days === 0 ? '今天！' : `${u.days}<small>天</small>`}</span>
      <span class="t">${esc(u.it.title)}${u.years > 0 ? ` · ${u.years} 週年` : ''}</span>
      <span class="s num">${u.next.getMonth() + 1}/${u.next.getDate()}</span></button>`).join('')}</div>
  </section>` : ''}
  <div class="quick">
    <button class="qa" data-act="random" data-cat="place">${mascot('dog', 40)}今天去哪玩？<small>從清單隨機抽</small></button>
    <button class="qa" data-act="random" data-cat="food">${mascot('bunny', 40)}今天吃什麼？<small>從清單隨機抽</small></button>
    <button class="qa" data-act="giftMode">${mascot('cat', 40)}送禮靈感<small>禮物＋她的喜好</small></button>
  </div>
  <section class="section"><div class="sec-head"><h2>分類</h2></div><div class="cats">${tiles}</div></section>
  <section class="section">
    <div class="sec-head"><h2>最近記下的</h2></div>
    ${items.length ? `<div class="list">${items.slice(0, 8).map(i => card(i, { showCat: true })).join('')}</div>`
      : `<div class="empty">${mascot('bunny', 64)}<b>小本本還是空的</b>她最近說想去哪、想吃什麼？<button class="btn" data-act="add">${I.plus}記下第一件事</button></div>`}
  </section>`}`;
}
function resultsHtml(list) {
  return list.length ? `<div class="list">${list.map(i => card(i, { showCat: true })).join('')}</div>`
    : `<div class="empty">${mascot('cat', 56)}<b>找不到「${esc(state.query)}」</b>換個關鍵字，或把它記下來吧<button class="btn" data-act="add" data-title="${esc(state.query)}">${I.plus}新增「${esc(state.query)}」</button></div>`;
}

function viewCat() {
  const k = state.cat, c = CATS[k];
  if (k === 'giftMode') return viewGift();
  let list = byCat(k);
  const total = list.length, done = list.filter(i => i.done).length;
  if (c.wish) list = list.filter(i => state.filter === 'all' ? true : state.filter === 'done' ? i.done : !i.done);
  if (c.wish && state.filter === 'todo') list.sort((a, b) => (b.priority || 0) - (a.priority || 0) || (b.createdAt || 0) - (a.createdAt || 0));
  if (k === 'like') list.sort((a, b) => (a.mood === 'dislike') - (b.mood === 'dislike'));
  return `
  <div class="vhead"><button class="back" data-act="nav" data-v="home" aria-label="回首頁">${I.back}</button>
    ${catMascot(k, 48)}<div><h1>${c.name}</h1><p class="num">${c.wish ? `完成 ${done} / ${total}` : `${total} 筆`}</p></div></div>
  ${c.wish ? `<div class="seg">${[['todo', '還沒完成'], ['done', '已完成'], ['all', '全部']].map(([f, l]) =>
    `<button class="${state.filter === f ? 'on' : ''}" data-act="filter" data-f="${f}">${l}</button>`).join('')}</div>` : ''}
  ${list.length ? `<div class="list">${list.map(i => card(i)).join('')}</div>`
    : `<div class="empty">${catMascot(k, 60)}<b>${state.filter === 'done' && c.wish ? '還沒有完成的項目' : '這裡還沒有東西'}</b>${c.ph.replace('例如：', '像是 ')}</div>`}
  <button class="btn ghost" data-act="add" data-cat="${k}">${I.plus}新增到「${c.name}」</button>`;
}

function viewGift() {
  const gifts = byCat('gift').filter(i => !i.done);
  const likes = byCat('like').filter(i => i.mood !== 'dislike');
  const bad = byCat('like').filter(i => i.mood === 'dislike');
  const info = byCat('info');
  const sec = (t, l, extra = '') => l.length ? `<section class="section"><div class="sec-head"><h2>${t}</h2>${extra}</div><div class="list">${l.map(i => card(i)).join('')}</div></section>` : '';
  return `
  <div class="vhead"><button class="back" data-act="nav" data-v="home" aria-label="回首頁">${I.back}</button>
    ${catMascot('gift', 48)}<div><h1>送禮靈感</h1><p>她提過想要的、喜歡的、還有不能踩的雷</p></div></div>
  ${sec('她提過想要的', gifts, `<button data-act="add" data-cat="gift">＋新增</button>`) ||
    `<div class="empty">${catMascot('gift', 56)}<b>還沒有禮物靈感</b>下次她說「這個好可愛」時，馬上記下來<button class="btn" data-act="add" data-cat="gift">${I.plus}新增禮物靈感</button></div>`}
  ${sec('她喜歡的東西', likes)}
  ${sec('千萬別送', bad)}
  ${sec('尺寸與資訊', info)}`;
}

function viewWish() {
  const wishes = all().filter(i => CATS[i.cat]?.wish);
  const done = wishes.filter(i => i.done).length, total = wishes.length;
  const pct = total ? done / total : 0, R = 40, C = 2 * Math.PI * R;
  const todo = wishes.filter(i => !i.done).sort((a, b) => (b.priority || 0) - (a.priority || 0) || (b.createdAt || 0) - (a.createdAt || 0));
  const finished = wishes.filter(i => i.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  return `
  <div class="vhead">${mascot('dog', 48)}<div><h1>心願清單</h1><p>一起把她的願望一個一個完成</p></div></div>
  <div class="progress-card">
    <div class="ring"><svg viewBox="0 0 92 92"><circle cx="46" cy="46" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
      <circle cx="46" cy="46" r="${R}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
      <div class="lbl"><div><b>${Math.round(pct * 100)}%</b><small class="num">${done}/${total}</small></div></div></div>
    <div class="bars">${WISH_KEYS.map(k => { const l = byCat(k), d = l.filter(i => i.done).length;
      return `<div class="bar-row" style="--c:${CATS[k].c}"><span>${CATS[k].short}</span><div class="bar"><i style="width:${l.length ? d / l.length * 100 : 0}%"></i></div><span class="num">${d}/${l.length}</span></div>`; }).join('')}</div>
  </div>
  <section class="section"><div class="sec-head"><h2>還在等著實現（${todo.length}）</h2></div>
    ${todo.length ? `<div class="list">${todo.map(i => card(i, { showCat: true })).join('')}</div>`
      : `<div class="empty">${mascot('cat', 56)}<b>${total ? '全部完成了，太厲害！' : '還沒有心願'}</b>想去的地方、想吃的、想要的禮物都會出現在這裡<button class="btn" data-act="add" data-cat="place">${I.plus}新增心願</button></div>`}
  </section>
  ${finished.length ? `<section class="section"><div class="sec-head"><h2>已經完成（${finished.length}）</h2></div>
    <div class="list">${finished.map(i => card(i, { showCat: true })).join('')}</div></section>` : ''}`;
}

function viewMemories() {
  const pics = [];
  all().sort((a, b) => (b.doneAt || b.createdAt || 0) - (a.doneAt || a.createdAt || 0))
    .forEach(i => (i.photos || []).forEach(p => pics.push({ i, p })));
  return `
  <div class="vhead">${mascot('bunny', 48)}<div><h1>回憶牆</h1><p class="num">${pics.length} 張照片</p></div></div>
  ${pics.length ? `<div class="gallery">${pics.map(({ i, p }) => `<button data-act="open" data-id="${i.id}">
      <img src="${photoSrc(p)}" data-photo="${esc(p)}" alt="${esc(i.title)}" loading="lazy">
      <div class="cap">${esc(i.title)}<small>${CATS[i.cat]?.short || ''}${i.doneAt ? ' · ' + fmtDate(i.doneAt) : ''}</small></div></button>`).join('')}</div>`
    : `<div class="empty">${mascot('bunny', 64)}<b>還沒有照片</b>完成一個心願，或記下她喜歡的東西時，打開那一筆就能上傳照片</div>`}`;
}

function viewProfile() {
  const sec = k => { const l = byCat(k);
    return `<section class="section"><div class="sec-head"><h2>${CATS[k].name}</h2><button data-act="add" data-cat="${k}">＋新增</button></div>
      ${l.length ? `<div class="list">${l.map(i => card(i)).join('')}</div>` : `<div class="empty">${catMascot(k, 48)}${CATS[k].ph}</div>`}</section>`; };
  return `
  <div class="vhead">${mascot('cow', 48)}<div style="flex:1;min-width:0"><h1>她的檔案</h1><p>尺寸、紀念日、喜好、小習慣，一次看完</p></div>
    <button class="back" data-act="settings" aria-label="設定與同步">${I.gear}</button></div>
  ${sec('info')}${sec('like')}${sec('habit')}`;
}

/* ---------- sheets ---------- */
function renderLayer() {
  const L = $('#layer');
  if (state.sheet?.mode === 'form' && $('#form')) readForm();
  let html = '';
  if (state.sheet?.mode === 'view') html = sheetView(state.items.get(state.sheet.id));
  else if (state.sheet?.mode === 'form') html = sheetForm();
  else if (state.sheet?.mode === 'settings') html = sheetSettings();
  if (state.lightbox) html += `<div class="lightbox" data-act="closeLight"><img src="${photoSrc(state.lightbox)}" data-photo="${esc(state.lightbox)}" alt="照片"></div>`;
  if (state.toast) html += `<div class="toast" role="status"><span>${esc(state.toast.text)}</span>${state.toast.action ? `<button data-act="${state.toast.action}" data-id="${state.toast.id || ''}">${esc(state.toast.label)}</button>` : ''}</div>`;
  const prevScroll = $('.sheet', L)?.scrollTop;
  L.innerHTML = html;
  hydratePhotos();
  if (prevScroll && $('.sheet', L)) $('.sheet', L).scrollTop = prevScroll;
}

function sheetView(i) {
  if (!i || i.deleted) return '';
  const c = CATS[i.cat] || CATS.like;
  const rows = [];
  if (i.location) rows.push(['地點', esc(i.location)]);
  if (i.price) rows.push(['預算', `<span class="num">$${esc(i.price)}</span>`]);
  if (i.date) rows.push(['日期', `<span class="num">${esc(i.date.replace(/-/g, '/'))}</span>${i.yearly ? '（每年提醒）' : ''}`]);
  if (i.mood) rows.push(['她覺得', i.mood === 'dislike' ? '不喜歡，別踩雷' : '喜歡']);
  if (i.link && safeUrl(i.link)) rows.push(['連結', `<a href="${esc(safeUrl(i.link))}" target="_blank" rel="noopener">${esc(new URL(i.link).hostname)}</a>`]);
  if (i.tags?.length) rows.push(['標籤', i.tags.map(t => `<button class="chip" data-act="tag" data-t="${esc(t)}">#${esc(t)}</button>`).join(' ')]);
  rows.push(['記下於', `<span class="num">${fmtDate(i.createdAt)}</span>`]);
  const canPhoto = true;
  return `<div class="overlay" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(i.title)}" data-stop>
    <div class="grab"></div>
    <div class="sheet-head">${catMascot(i.cat, 46)}<h2>${esc(i.title)} ${i.priority ? `<span class="hearts">${hearts(i.priority)}</span>` : ''}</h2>
      <button class="x" data-act="close" aria-label="關閉">${I.x}</button></div>
    <div class="chips"><span class="chip" style="background:color-mix(in srgb, ${c.c} 45%, var(--surface));color:var(--ink)">${c.name}</span>${i.example ? '<span class="chip ex">範例</span>' : ''}</div>
    ${i.note ? `<p style="margin:0;white-space:pre-wrap;overflow-wrap:anywhere">${esc(i.note)}</p>` : ''}
    ${c.wish ? `<div class="done-bar"><button class="check ${i.done ? 'on' : ''}" data-act="toggle" data-id="${i.id}" aria-label="切換完成">${I.check}</button>
      <p>${i.done ? '已經一起完成了' : '還沒完成，找個時間吧'}<small>${i.done && i.doneAt ? '完成於 ' + fmtDate(i.doneAt) : '完成後打勾，再放張照片留念'}</small></p></div>` : ''}
    ${(i.cat === 'place' || i.cat === 'food' || (i.location && i.cat === 'gift')) ?
      `<a class="btn" href="${esc(mapsUrl(i))}" target="_blank" rel="noopener">${I.pin}在 Google 地圖開啟</a>` : ''}
    <div class="detail-meta">${rows.map(([k, v]) => `<div class="kv"><span>${k}</span><span>${v}</span></div>`).join('')}</div>
    <section class="section"><div class="sec-head"><h2>照片</h2>${state.uploading ? `<span class="hint">上傳中 ${state.uploading} 張…</span>` : ''}</div>
      <div class="photos">
        ${(i.photos || []).map(p => `<div class="ph"><img src="${photoSrc(p)}" data-photo="${esc(p)}" alt="" loading="lazy" data-act="light" data-p="${p}">
          ${canPhoto ? `<button class="rm" data-act="rmPhoto" data-id="${i.id}" data-p="${p}" aria-label="移除照片">${I.x}</button>` : ''}</div>`).join('')}
        ${canPhoto ? `<button class="add" data-act="upload" data-id="${i.id}">${I.camera}上傳照片</button>` : ''}
      </div>
    </section>
    ${state.confirmDel ? `<div class="confirm">確定要刪除「${esc(i.title)}」嗎？照片也會一起刪掉，無法復原。
      <div class="sheet-actions"><button class="btn ghost" data-act="cancelDel">先不要</button><button class="btn danger" data-act="del" data-id="${i.id}">刪除</button></div></div>`
    : `<div class="sheet-actions"><button class="btn ghost" data-act="askDel">${I.trash}刪除</button><button class="btn" data-act="edit" data-id="${i.id}">${I.edit}編輯</button></div>`}
  </div></div>`;
}

function sheetForm() {
  const d = state.draft, c = CATS[d.cat];
  const f = name => c.fields.includes(name);
  return `<div class="overlay" data-act="close"><form class="sheet" id="form" role="dialog" aria-modal="true" aria-label="${d.id ? '編輯' : '新增'}" data-stop>
    <div class="grab"></div>
    <div class="sheet-head"><h2>${d.id ? '編輯' : '記下老婆說的事'}</h2><button type="button" class="x" data-act="close" aria-label="關閉">${I.x}</button></div>
    <div class="field"><span class="lab">分類</span><div class="cat-pick">${CAT_KEYS.map(k =>
      `<button type="button" style="--c:${CATS[k].c}" class="${d.cat === k ? 'on' : ''}" data-act="pickCat" data-cat="${k}">${catMascot(k, 26)}${CATS[k].short}</button>`).join('')}</div></div>
    <div class="field"><label for="f-title">${d.cat === 'info' ? '項目' : '她說的是…'}</label>
      <input id="f-title" type="text" required maxlength="120" value="${esc(d.title)}" placeholder="${esc(c.ph)}"></div>
    ${d.cat === 'gift' ? formPhotos(d) : ''}
    <div class="field"><label for="f-note">細節</label><textarea id="f-note" maxlength="2000" placeholder="${esc(c.noteph)}">${esc(d.note)}</textarea></div>
    ${d.cat !== 'gift' ? formPhotos(d) : ''}
    ${f('mood') ? `<div class="field"><span class="lab">她覺得</span><div class="seg">
      <button type="button" class="${d.mood !== 'dislike' ? 'on' : ''}" data-act="mood" data-m="love">喜歡</button>
      <button type="button" class="${d.mood === 'dislike' ? 'on' : ''}" data-act="mood" data-m="dislike">不喜歡（地雷）</button></div></div>` : ''}
    ${f('location') ? `<div class="field"><label for="f-loc">地點或店名</label><input id="f-loc" type="text" maxlength="200" value="${esc(d.location)}" placeholder="例如：京都 嵐山 竹林之道">
      <span class="hint">會用這個在 Google 地圖搜尋；也可以在下方貼上 Google 地圖分享連結。</span></div>` : ''}
    ${f('price') ? `<div class="field"><label for="f-price">大概價格</label><input id="f-price" type="text" inputmode="numeric" maxlength="20" value="${esc(d.price)}" placeholder="例如：3200"></div>` : ''}
    ${f('link') ? `<div class="field"><label for="f-link">連結（商品頁、IG、Google 地圖）</label><input id="f-link" type="url" maxlength="500" value="${esc(d.link)}" placeholder="https://"></div>` : ''}
    ${f('date') ? `<div class="row2"><div class="field"><label for="f-date">日期（選填）</label><input id="f-date" type="date" value="${esc(d.date)}"></div>
      <div class="field"><span class="lab">&nbsp;</span><label class="toggle"><input id="f-yearly" type="checkbox" ${d.yearly ? 'checked' : ''}>每年提醒（生日、紀念日）</label></div></div>` : ''}
    ${c.wish || d.cat === 'like' ? `<div class="field"><span class="lab">她有多想要</span><div class="prio">${[1, 2, 3].map(n =>
      `<button type="button" class="${(d.priority || 0) >= n ? 'on' : ''}" data-act="prio" data-n="${n}" aria-label="${n} 顆心">${I.heart}</button>`).join('')}</div></div>` : ''}
    <div class="field"><label for="f-tags">標籤（用空格或逗號分開）</label><input id="f-tags" type="text" maxlength="200" value="${esc((d.tags || []).join(' '))}" placeholder="例如：日本 秋天 週年"></div>
    <div class="sheet-actions"><button type="button" class="btn ghost" data-act="close">取消</button><button type="submit" class="btn">${I.check}${d.id ? '儲存' : '記下來'}</button></div>
  </form></div>`;
}

function formPhotos(d) {
  const gift = d.cat === 'gift';
  const label = gift ? '款式照片' : '照片（選填）';
  const hint = gift ? '拍下或截圖她看中的那一款：顏色、型號、尺寸標籤都可以。' : '';
  return `<div class="field"><span class="lab">${label}${state.uploading ? ` · 上傳中 ${state.uploading} 張…` : ''}</span>
    <div class="photos">
      ${(d.photos || []).map(p => `<div class="ph"><img src="${photoSrc(p)}" data-photo="${esc(p)}" alt="" data-act="light" data-p="${p}">
        <button type="button" class="rm" data-act="rmDraftPhoto" data-p="${p}" aria-label="移除照片">${I.x}</button></div>`).join('')}
      <button type="button" class="add" data-act="upload" data-id="__draft__">${I.camera}${gift ? '加上款式照片' : '上傳照片'}</button>
    </div>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
}

// drop photos uploaded in a form that was cancelled, so they don't take up space
function discardDraft() {
  const d = state.draft;
  (d?.newUploads || []).forEach(deletePhoto);
  state.draft = null;
}

function readForm() {
  const d = state.draft; if (!d) return;
  const v = id => { const el = $('#' + id); return el ? el.value : undefined; };
  if ($('#f-title')) d.title = v('f-title');
  if ($('#f-note')) d.note = v('f-note');
  if ($('#f-loc')) d.location = v('f-loc');
  if ($('#f-price')) d.price = v('f-price');
  if ($('#f-link')) d.link = v('f-link');
  if ($('#f-date')) d.date = v('f-date');
  if ($('#f-yearly')) d.yearly = $('#f-yearly').checked;
  if ($('#f-tags')) d.tags = v('f-tags').split(/[\s,，、#]+/).map(s => s.trim()).filter(Boolean).slice(0, 12);
}

function openForm(base) {
  state.draft = { cat: 'place', title: '', note: '', location: '', price: '', link: '', date: '', yearly: false, priority: 0, tags: [], mood: 'love', ...base, photos: [...(base.photos || [])], newUploads: [], removed: [] };
  state.sheet = { mode: 'form' }; state.confirmDel = false;
  renderLayer();
  setTimeout(() => $('#f-title')?.focus({ preventScroll: true }), 60);
}

function submitForm() {
  readForm();
  const d = state.draft;
  if (!d.title.trim()) { $('#f-title')?.focus(); toast('先寫下她說了什麼喔'); return; }
  const fields = CATS[d.cat].fields;
  const now = Date.now();
  const existing = d.id ? state.items.get(d.id) : null;
  const item = {
    ...(existing || {}),
    id: d.id || uid(), cat: d.cat, title: d.title.trim(), note: (d.note || '').trim(),
    location: fields.includes('location') ? (d.location || '').trim() : '',
    price: fields.includes('price') ? (d.price || '').trim() : '',
    link: fields.includes('link') ? safeUrl((d.link || '').trim()) : '',
    date: fields.includes('date') ? (d.date || '') : '',
    yearly: fields.includes('date') ? !!d.yearly : false,
    mood: fields.includes('mood') ? (d.mood || 'love') : '',
    priority: d.priority || 0, tags: d.tags || [],
    done: existing?.done || false, doneAt: existing?.doneAt || null, photos: d.photos || [],
    example: false, createdAt: existing?.createdAt || now, updatedAt: now,
  };
  saveItem(item);
  (d.removed || []).forEach(deletePhoto);
  state.sheet = d.id ? { mode: 'view', id: item.id } : null; state.draft = null;
  renderLayer();
  toast(d.id ? '已更新' : `記下來了，放在「${CATS[item.cat].name}」`);
}

/* ---------- photos ---------- */
async function compress(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { return { blob: file, type: file.type || 'image/jpeg' }; }
  for (const [max, q] of [[1600, .85], [1400, .75], [1200, .65], [1000, .6]]) {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size < 1.8 * 1024 * 1024) return { blob, type: 'image/jpeg' };
  }
  return { blob: file, type: file.type || 'image/jpeg' };
}
let uploadTarget = null;
$('#file').addEventListener('change', async e => {
  const files = [...e.target.files]; e.target.value = '';
  const id = uploadTarget; if (!id || !files.length) return;
  const toDraft = id === '__draft__';
  const draft = state.draft;
  state.uploading += files.length; renderLayer();
  const added = [];
  for (const f of files) {
    try {
      const pid = await addPhoto(f);
      added.push(pid);
      if (toDraft && draft && state.draft === draft) { draft.photos.push(pid); draft.newUploads.push(pid); }
      else if (toDraft) deletePhoto(pid);
    } catch (err) {
      toast(err?.code === 'too_big' ? '這張照片太大了，換一張試試' : '這張照片讀不出來，換成 JPG 或 PNG 試試');
    }
    state.uploading--; renderLayer();
  }
  if (added.length && !toDraft) {
    const it = state.items.get(id);
    await patchItem(id, { photos: [...(it?.photos || []), ...added] });
    toast(`放好 ${added.length} 張照片了`);
  }
});

/* ---------- settings: sync + backup ---------- */
function syncCardInner() {
  if (!meta.password) return `
    <p class="hint">開啟後，資料和照片會自動存到你的 Cloudflare。換手機、清掉瀏覽器都不會不見；沒網路時照常使用，連上網路後自動同步。</p>
    <div class="field"><label for="syncPw">同步密碼</label>
      <input id="syncPw" type="password" autocomplete="current-password" placeholder="Cloudflare 上設定的 SYNC_PASSWORD"></div>
    <button class="btn" data-act="syncConnect" id="syncConnectBtn">連線並同步</button>`;
  const p = pendingText();
  return `
    <div class="sync-line"><span class="dot ${Sync.status}"></span>
      <div><b>${SYNC_TEXT[Sync.status]}</b>${Sync.error ? '：' + esc(Sync.error) : ''}
      <small>${meta.lastSync ? '上次同步 ' + new Date(meta.lastSync).toLocaleString('zh-TW') : '還沒同步過'}${p ? ' · ' + p : ''}</small></div></div>
    <div class="sheet-actions"><button class="btn" data-act="syncNow">立即同步</button>
      <button class="btn ghost" data-act="syncOff">${state.confirmOff ? '確定停止？' : '這台裝置停止同步'}</button></div>`;
}
function sheetSettings() {
  const n = all().length;
  return `<div class="overlay" data-act="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="設定" data-stop>
    <div class="grab"></div>
    <div class="sheet-head">${mascot('cow', 42)}<h2>設定與同步</h2><button class="x" data-act="close" aria-label="關閉">${I.x}</button></div>
    <section class="section"><div class="sec-head"><h2>雲端同步</h2></div><div class="detail-meta" id="syncBox">${syncCardInner()}</div></section>
    <section class="section"><div class="sec-head"><h2>備份</h2></div>
      <div class="detail-meta">
        <p class="hint" style="margin:0">把 ${n} 筆資料下載成 JSON 檔，存到雲端硬碟多一層保險。照片不包含在備份檔裡（照片在雲端同步中）。</p>
        <div class="sheet-actions"><button class="btn ghost" data-act="exportJson">下載備份</button><button class="btn ghost" data-act="importJson">從備份還原</button></div>
      </div></section>
    <p class="hint" style="text-align:center">老婆的小本本 · 離線也能用</p>
  </div></div>`;
}
function exportJson() {
  const data = { app: 'my-beautiful-wife', version: 1, exportedAt: new Date().toISOString(), items: all() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const d = new Date(); a.download = `老婆的小本本-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('備份下載好了');
}
$('#jsonFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const list = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(list)) throw new Error();
    let n = 0;
    for (const it of list) {
      if (!it || typeof it.id !== 'string' || !CATS[it.cat] || !it.title) continue;
      const local = state.items.get(it.id);
      if (local && (local.updatedAt || 0) >= (it.updatedAt || 0)) continue;
      state.items.set(it.id, { ...it, photos: (it.photos || []).filter(p => typeof p === 'string') });
      if (!meta.dirty.includes(it.id)) meta.dirty.push(it.id);
      n++;
    }
    persist(); saveMeta(); Sync.schedule(); render();
    toast(n ? `還原了 ${n} 筆` : '備份裡沒有比現在更新的資料');
  } catch { toast('這個檔案不是小本本的備份'); }
});

/* ---------- toast & confetti ---------- */
let toastTimer;
function toast(text, action, label, id) {
  state.toast = { text, action, label, id }; renderLayer();
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { state.toast = null; renderLayer(); }, action ? 5000 : 2600);
}
function celebrate(x, y) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['var(--accent)', 'var(--sky)', 'var(--butter)', 'var(--mint)', 'var(--lilac)', 'var(--peach)'];
  for (let n = 0; n < 16; n++) {
    const el = document.createElement('span');
    el.className = 'confetti';
    el.innerHTML = n % 2 ? I.heart : I.paw;
    el.style.cssText = `left:${x - 11}px;top:${y - 11}px;color:${colors[n % colors.length]};--dx:${(Math.random() - .5) * 220}px;--dy:${-60 - Math.random() * 160}px;--rot:${(Math.random() - .5) * 120}deg`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1200);
  }
}

/* ---------- navigation ---------- */
function go(view, cat) {
  state.view = view; state.cat = cat || null; state.filter = 'todo'; state.query = view === 'home' ? state.query : '';
  const h = view === 'cat' ? 'cat-' + cat : view;
  if (location.hash.slice(1) !== h) { try { history.pushState(null, '', '#' + h); } catch { location.hash = h; } }
  render(); window.scrollTo(0, 0);
}
function fromHash() {
  const h = location.hash.slice(1);
  if (h.startsWith('cat-') && (CATS[h.slice(4)] || h === 'cat-giftMode')) { state.view = 'cat'; state.cat = h.slice(4); }
  else if (['home', 'wish', 'memories', 'profile'].includes(h)) { state.view = h; state.cat = null; }
  else { state.view = 'home'; state.cat = null; }
}
window.addEventListener('hashchange', () => { fromHash(); render(); });
window.addEventListener('popstate', () => { fromHash(); render(); });

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const stopEl = e.target.closest('[data-stop]');
  const el = e.target.closest('[data-act]');
  if (!el) return;
  // clicks inside a sheet should not bubble to the overlay's close action
  if (el.dataset.act === 'close' && el.classList.contains('overlay') && e.target !== el) return;
  // links inside cards: let them navigate without opening the card
  if (e.target.closest('a[href]') && el.dataset.act === 'open') return;
  if (stopEl && el !== stopEl && el.contains(stopEl) && !stopEl.dataset.act) return;
  const a = el.dataset.act, id = el.dataset.id;
  switch (a) {
    case 'nav': go(el.dataset.v); break;
    case 'settings': state.sheet = { mode: 'settings' }; state.confirmOff = false; renderLayer(); break;
    case 'syncConnect': {
      const pw = ($('#syncPw')?.value || '').trim();
      if (pw.length < 8) { toast('密碼至少 8 個字元'); break; }
      el.disabled = true; el.textContent = '連線中…';
      Sync.connect(pw).then(() => { renderLayer(); toast('連線成功，資料同步中'); })
        .catch(err => { el.disabled = false; el.textContent = '連線並同步'; toast(err.message || '連不上雲端，請檢查網路'); });
      break;
    }
    case 'syncNow': Sync.syncNow().then(() => { if (Sync.status === 'ok') toast('同步完成'); }); break;
    case 'syncOff':
      if (!state.confirmOff) { state.confirmOff = true; renderLayer(); setTimeout(() => { state.confirmOff = false; if (state.sheet?.mode === 'settings') renderLayer(); }, 4000); break; }
      state.confirmOff = false; Sync.disconnect(); renderLayer(); toast('這台裝置已停止同步，雲端資料沒有刪除'); break;
    case 'exportJson': exportJson(); break;
    case 'importJson': $('#jsonFile').click(); break;
    case 'openCat': go('cat', el.dataset.cat); break;
    case 'giftMode': go('cat', 'giftMode'); break;
    case 'filter': state.filter = el.dataset.f; render(); break;
    case 'add': {
      let cat = el.dataset.cat || (state.view === 'cat' && CATS[state.cat] ? state.cat : state.view === 'profile' ? 'info' : 'place');
      openForm({ cat, title: el.dataset.title || '' }); break;
    }
    case 'open': state.sheet = { mode: 'view', id }; state.confirmDel = false; renderLayer(); break;
    case 'close': if (state.sheet?.mode === 'form' && state.draft?.id) { state.sheet = { mode: 'view', id: state.draft.id }; discardDraft(); } else { state.sheet = null; discardDraft(); } renderLayer(); break;
    case 'rmDraftPhoto': {
      const d = state.draft, p = el.dataset.p; if (!d) break;
      readForm(); d.photos = d.photos.filter(x => x !== p);
      if (d.newUploads.includes(p)) { d.newUploads = d.newUploads.filter(x => x !== p); deletePhoto(p); }
      else d.removed.push(p);
      renderLayer(); break;
    }
    case 'toggle': {
      e.stopPropagation();
      const it = state.items.get(id); if (!it) break;
      const done = !it.done;
      patchItem(id, { done, doneAt: done ? Date.now() : null });
      if (done) {
        const r = el.getBoundingClientRect(); celebrate(r.left + r.width / 2, r.top + r.height / 2);
        toast('完成一個心願！要放張照片嗎？', 'upload', '上傳照片', id);
      }
      break;
    }
    case 'edit': { const it = state.items.get(id); openForm({ ...it, tags: [...(it.tags || [])] }); break; }
    case 'askDel': state.confirmDel = true; renderLayer(); break;
    case 'cancelDel': state.confirmDel = false; renderLayer(); break;
    case 'del': removeItem(id); state.sheet = null; state.confirmDel = false; renderLayer(); toast('已刪除'); break;
    case 'pickCat': readForm(); state.draft.cat = el.dataset.cat; renderLayer(); break;
    case 'prio': readForm(); { const n = +el.dataset.n; state.draft.priority = state.draft.priority === n ? n - 1 : n; } renderLayer(); break;
    case 'mood': readForm(); state.draft.mood = el.dataset.m; renderLayer(); break;
    case 'upload': uploadTarget = id; state.toast = null; $('#file').click(); break;
    case 'rmPhoto': {
      const it = state.items.get(id); const p = el.dataset.p;
      patchItem(id, { photos: (it.photos || []).filter(x => x !== p) });
      deletePhoto(p);
      break;
    }
    case 'light': state.lightbox = el.dataset.p; renderLayer(); break;
    case 'closeLight': state.lightbox = null; renderLayer(); break;
    case 'tag': state.sheet = null; state.query = '#' + el.dataset.t; go('home'); break;
    case 'random': {
      const pool = byCat(el.dataset.cat).filter(i => !i.done);
      if (!pool.length) { toast(`「${CATS[el.dataset.cat].name}」還沒有未完成的項目`, 'add', '去新增'); break; }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const r = el.getBoundingClientRect(); celebrate(r.left + r.width / 2, r.top + 20);
      state.sheet = { mode: 'view', id: pick.id }; renderLayer(); break;
    }
    case 'clearEx': {
      if (!state.confirmClear) { state.confirmClear = true; render(); setTimeout(() => { state.confirmClear = false; render(); }, 4000); break; }
      state.confirmClear = false;
      all().filter(i => i.example).forEach(i => removeItem(i.id));
      toast('範例都清掉了，開始記錄吧'); break;
    }
  }
});
document.addEventListener('submit', e => { e.preventDefault(); submitForm(); });
document.addEventListener('input', e => {
  if (e.target.id === 'q') { state.query = e.target.value; render(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (state.lightbox) { state.lightbox = null; } else if (state.sheet) { state.sheet = null; discardDraft(); } renderLayer(); }
  if (e.key === 'Enter' && e.target.classList?.contains('card') ) e.target.click();
});

// keep results rendering in sync when search typed and the full view would hide quick sections
const origRender = render;
render = function () {
  const q = $('#q'); const focused = document.activeElement === q; const pos = q?.selectionStart;
  origRender();
  if (focused) { const nq = $('#q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch {} } }
};

fromHash();
render();
Sync.syncNow();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Sync.syncNow(); });
window.addEventListener('online', () => Sync.syncNow());
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
window.__MBW = { state, meta, Sync };
})();
