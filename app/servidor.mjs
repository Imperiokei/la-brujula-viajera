// La Brújula Viajera · servidor (Node 24, sin dependencias)
// Sirve la app (public/), el contenido protegido (datos/) y los códigos de desbloqueo.
//   node servidor.mjs            → http://localhost:8860  (PUERTO=xxxx para cambiarlo)
// Claves: BV_SECRETO (firma de los permisos) e IMPULTIENDA_FIRMA (webhook). En local se crean solas en .datos/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(RAIZ, 'public');
const DAT = path.join(RAIZ, 'datos');
const PRIV = process.env.BV_DATOS || path.join(RAIZ, '.datos');
const PUERTO = Number(process.env.PUERTO || 8860);
const MAX_DISPOSITIVOS = Number(process.env.BV_MAX_DISPOSITIVOS || 3);
fs.mkdirSync(PRIV, { recursive: true });

function secreto() {
  if (process.env.BV_SECRETO) return process.env.BV_SECRETO;
  const f = path.join(PRIV, 'secreto');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'));
  return fs.readFileSync(f, 'utf8').trim();
}
const SECRETO = secreto();

// ---------- catálogo de productos (cada código abre UN producto) ----------
// datos/productos.json: { "ciclismo-ar": { "nombre": "Mapa Ciclismo Argentina", "pais": "AR", "tema": "ciclismo", "impultienda": ["cc7db378"] }, ... }
const PRODUCTOS = JSON.parse(fs.readFileSync(path.join(DAT, 'productos.json'), 'utf8'));
// qué abre cada producto: las rutas de SU tema en SU país (ciclismo-ar → ciclismo de Argentina)
const abre = (prods, tema, cc) => prods.some(id => PRODUCTOS[id]?.tema === tema && PRODUCTOS[id]?.pais === cc.toUpperCase());

// ---------- base de códigos (archivo JSON con escritura atómica) ----------
const ARCH_COD = path.join(PRIV, 'codigos.json');
export function leerCodigos() {
  try { return JSON.parse(fs.readFileSync(ARCH_COD, 'utf8')); } catch { return { codigos: {} }; }
}
export function guardarCodigos(db) {
  const tmp = ARCH_COD + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, ARCH_COD);
}
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O, 1/I/L
export function nuevoCodigo(producto, extra = {}) {
  const db = leerCodigos();
  let c;
  do {
    const b = crypto.randomBytes(8); // 8 letras de 31 posibles ≈ 8,5 × 10^11 combinaciones
    const s = [...b].map(x => LETRAS[x % LETRAS.length]).join('');
    c = `BV-${s.slice(0, 4)}-${s.slice(4)}`;
  } while (db.codigos[c]);
  db.codigos[c] = { producto, creado: new Date().toISOString(), dispositivos: [], activo: true, ...extra };
  guardarCodigos(db);
  return c;
}
const normalizar = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// ---------- permisos firmados ----------
const b64 = s => Buffer.from(s).toString('base64url');
const firmar = s => crypto.createHmac('sha256', SECRETO).update(s).digest('base64url');
function emitirPermiso(productos, dispositivo) {
  const cuerpo = b64(JSON.stringify({ p: productos, d: dispositivo, t: Date.now() }));
  return cuerpo + '.' + firmar(cuerpo);
}
function leerPermiso(tok) {
  if (!tok || !tok.includes('.')) return null;
  const [cuerpo, f] = tok.split('.');
  const esperado = firmar(cuerpo);
  if (f.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(f), Buffer.from(esperado))) return null;
  try { return JSON.parse(Buffer.from(cuerpo, 'base64url').toString()); } catch { return null; }
}
// Un permiso vale si su código sigue activo (se puede revocar por reembolso).
function productosVigentes(permiso) {
  if (!permiso) return [];
  const db = leerCodigos();
  const activos = new Set(Object.values(db.codigos).filter(c => c.activo && c.dispositivos.includes(permiso.d)).flatMap(c => hermanos(c.producto)));
  return permiso.p.filter(p => activos.has(p));
}
// Productos que se venden juntos (mismo producto de Impultienda, p. ej. moto + auto + autocaravana de un país):
// un código de cualquiera de ellos abre todos.
function hermanos(p) {
  const ids = PRODUCTOS[p]?.impultienda || [];
  if (!ids.length) return [p];
  return [...new Set([p, ...Object.entries(PRODUCTOS).filter(([, v]) => (v.impultienda || []).some(x => ids.includes(x))).map(([k]) => k)])];
}

// ---------- utilidades HTTP ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function json(res, cod, obj, extra = {}) {
  res.writeHead(cod, { 'content-type': TIPOS['.json'], 'cache-control': 'no-store', ...extra });
  res.end(JSON.stringify(obj));
}
function cuerpo(req, limite = 200_000) {
  return new Promise((ok, mal) => {
    let datos = [];
    let largo = 0;
    req.on('data', d => { largo += d.length; if (largo > limite) { mal(new Error('grande')); req.destroy(); } else datos.push(d); });
    req.on('end', () => ok(Buffer.concat(datos)));
    req.on('error', mal);
  });
}
const intentos = new Map(); // freno simple por IP para el canje
function frenado(ip) {
  const ahora = Date.now();
  if (intentos.size > 50_000) for (const [k, v] of intentos) if (!v.length || ahora - v[v.length - 1] > 10 * 60_000) intentos.delete(k);
  const lista = (intentos.get(ip) || []).filter(t => ahora - t < 10 * 60_000);
  lista.push(ahora);
  intentos.set(ip, lista);
  return lista.length > 20;
}

// ---------- ubicación → país y provincia ----------
const UBIC = JSON.parse(fs.readFileSync(path.join(DAT, 'ubicaciones.json'), 'utf8'));
function distanciaKm(a, b, c, d) {
  const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}
function donde(lat, lon) {
  // 1) el punto tiene que caer dentro de la caja de algún país con rutas; 2) gana la provincia más cercana de esos países
  const dentro = Object.entries(UBIC.cajas).filter(([, [s, w, n, e]]) => lat >= s && lat <= n && lon >= w && lon <= e).map(([cc]) => cc);
  let mejor = null;
  for (const u of UBIC.puntos) {
    if (!dentro.includes(u.cc)) continue;
    const km = distanciaKm(lat, lon, u.lat, u.lon);
    if (!mejor || km < mejor.km) mejor = { ...u, km: Math.round(km) };
  }
  return mejor && mejor.km < 600 ? mejor : null;
}

function rutaGratis(tema, cc, id) {
  try {
    const ind = JSON.parse(fs.readFileSync(path.join(PUB, 'contenido', tema, cc, 'indice.json'), 'utf8'));
    return ind.muestra === id;
  } catch { return false; }
}

// ---------- webhook de Impultienda: venta → código ----------
function productoDeImpultienda(id) {
  for (const [k, v] of Object.entries(PRODUCTOS)) if ((v.impultienda || []).some(x => String(id || '').startsWith(x))) return k;
  return null;
}
async function webhook(req, res) {
  const crudo = await cuerpo(req);
  const clave = process.env.IMPULTIENDA_FIRMA;
  if (!clave) return json(res, 503, { error: 'webhook sin clave' });
  const ts = req.headers['x-impultienda-timestamp'] || '';
  const sig = String(req.headers['x-impultienda-signature'] || '');
  const ok = crypto.createHmac('sha256', clave).update(`${ts}.${crudo}`).digest('hex');
  if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return json(res, 401, { error: 'firma' });
  const tsMs = Number(ts) < 1e12 ? Number(ts) * 1000 : Number(ts); // acepta segundos o milisegundos
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60_000) return json(res, 401, { error: 'hora' });
  const ev = JSON.parse(crudo.toString());
  const d = ev.data || {};
  if (ev.test || String(d.order_id || '').startsWith('TEST-')) return json(res, 200, { ok: true, prueba: true });
  const mail = d.customer?.email;
  const productos = new Set();
  for (const it of d.items || []) { const p = productoDeImpultienda(it.product_id); if (p) productos.add(p); }
  const db = leerCodigos();
  const tipo = String(ev.event || ev.type || '');
  if (/refund|chargeback|reembolso|contracargo/i.test(tipo)) {
    for (const c of Object.values(db.codigos)) if (c.pedido === d.order_id) c.activo = false;
    guardarCodigos(db);
    return json(res, 200, { ok: true, baja: true });
  }
  const nuevos = [];
  for (const p of productos) {
    const ya = Object.entries(db.codigos).find(([, c]) => c.pedido === d.order_id && c.producto === p);
    nuevos.push(ya ? ya[0] : nuevoCodigo(p, { pedido: d.order_id, mail }));
  }
  // El envío por mail lo hace el relevo de correo (pendiente); queda en la bandeja de salida.
  if (nuevos.length) fs.appendFileSync(path.join(PRIV, 'salida-mails.jsonl'), JSON.stringify({ mail, codigos: nuevos, pedido: d.order_id, t: new Date().toISOString() }) + '\n');
  return json(res, 200, { ok: true, codigos: nuevos.length });
}

// ---------- seguridad: cabeceras en TODAS las respuestas ----------
const URL_BASE = (process.env.BV_URL || `http://localhost:${PUERTO}`).replace(/\/$/, '');
const esHttps = req => req.headers['x-forwarded-proto'] === 'https' || URL_BASE.startsWith('https://');
const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: https://tile.openstreetmap.org",
  "font-src 'self'", "connect-src 'self'", "manifest-src 'self'", "worker-src 'self'", "object-src 'none'", "base-uri 'self'",
  "frame-ancestors 'none'", "form-action 'self'"].join('; ');
function cabecerasSeguras(req, res) {
  res.setHeader('content-security-policy', CSP);
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('permissions-policy', 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()');
  res.setHeader('cross-origin-opener-policy', 'same-origin-allow-popups');
  res.setHeader('cross-origin-resource-policy', 'same-origin');
  // HSTS: el navegador no vuelve a entrar nunca por http (solo tiene sentido detrás de HTTPS)
  if (esHttps(req)) res.setHeader('strict-transport-security', 'max-age=63072000; includeSubDomains');
}
// Pedidos que cambian algo: tienen que venir de la propia app (freno de CSRF además de SameSite=Lax).
function mismoOrigen(req) {
  const o = req.headers.origin;
  if (!o) return req.headers['sec-fetch-site'] === 'same-origin';
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}

// ---------- sesión (para reseñas): Google y Facebook ----------
// Claves en variables de entorno, nunca en el código: GOOGLE_ID, GOOGLE_SECRETO, FACEBOOK_ID, FACEBOOK_SECRETO.
// Instagram ya no ofrece inicio de sesión para personas (Meta cerró la Basic Display API el 2024-12-04): se entra con Facebook.
const PROVEEDORES = {
  google: {
    id: process.env.GOOGLE_ID, secreto: process.env.GOOGLE_SECRETO,
    autorizar: 'https://accounts.google.com/o/oauth2/v2/auth', scope: 'openid profile',
    async usuario(code, redir) {
      const tok = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: this.id, client_secret: this.secreto, redirect_uri: redir, grant_type: 'authorization_code' }) }).then(r => r.json());
      if (!tok.access_token) throw new Error('google-token');
      const u = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: 'Bearer ' + tok.access_token } }).then(r => r.json());
      if (!u.sub) throw new Error('google-usuario');
      return { id: 'g:' + u.sub, nombre: u.given_name || u.name || 'Ciclista' };
    },
  },
  facebook: {
    id: process.env.FACEBOOK_ID, secreto: process.env.FACEBOOK_SECRETO,
    autorizar: 'https://www.facebook.com/v21.0/dialog/oauth', scope: 'public_profile',
    async usuario(code, redir) {
      const q = new URLSearchParams({ client_id: this.id, client_secret: this.secreto, redirect_uri: redir, code });
      const tok = await fetch('https://graph.facebook.com/v21.0/oauth/access_token?' + q).then(r => r.json());
      if (!tok.access_token) throw new Error('facebook-token');
      const u = await fetch('https://graph.facebook.com/me?fields=id,first_name,name&access_token=' + encodeURIComponent(tok.access_token)).then(r => r.json());
      if (!u.id) throw new Error('facebook-usuario');
      return { id: 'f:' + u.id, nombre: u.first_name || u.name || 'Ciclista' };
    },
  },
};
// Entrada de prueba SOLO en la PC (BV_LOGIN_PRUEBA=1 y sin HTTPS): sirve para probar reseñas sin cuentas reales.
const LOGIN_PRUEBA = process.env.BV_LOGIN_PRUEBA === '1' && !URL_BASE.startsWith('https://');
const disponibles = () => [...Object.entries(PROVEEDORES).filter(([, p]) => p.id && p.secreto).map(([k]) => k), ...(LOGIN_PRUEBA ? ['prueba'] : [])];

function leerCookies(req) {
  const out = {};
  for (const par of String(req.headers.cookie || '').split(';')) { const i = par.indexOf('='); if (i > 0) out[par.slice(0, i).trim()] = par.slice(i + 1).trim(); }
  return out;
}
const cookie = (req, nombre, valor, segundos) =>
  `${nombre}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${segundos}${esHttps(req) ? '; Secure' : ''}`;
const ARCH_USU = path.join(PRIV, 'usuarios.json');
const leerJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const guardarJSON = (f, v) => { fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 1)); fs.renameSync(f + '.tmp', f); };
const DIAS_SESION = 30;
function sesion(req) {
  const s = leerPermiso(leerCookies(req).bv_ses); // misma firma HMAC que los permisos
  if (!s || !s.u || !s.exp || s.exp < Date.now()) return null;
  const u = leerJSON(ARCH_USU, {})[s.u];
  return u && !u.bloqueado ? { id: s.u, ...u } : null;
}
function abrirSesion(req, res, usuario, volver) {
  const db = leerJSON(ARCH_USU, {});
  db[usuario.id] = { ...(db[usuario.id] || { creado: new Date().toISOString() }), nombre: String(usuario.nombre).slice(0, 40), visto: new Date().toISOString() };
  guardarJSON(ARCH_USU, db);
  const cuerpoS = b64(JSON.stringify({ u: usuario.id, exp: Date.now() + DIAS_SESION * 864e5 }));
  res.writeHead(302, { location: '/#' + volver, 'set-cookie': [cookie(req, 'bv_ses', cuerpoS + '.' + firmar(cuerpoS), DIAS_SESION * 86400), cookie(req, 'bv_est', '', 0)] });
  res.end();
}
// Solo se vuelve a una pantalla de la propia app (nada de redirecciones abiertas a otros sitios)
const volverSeguro = v => (/^\/[a-z0-9/?=&._-]*$/i.test(v || '') && !String(v).startsWith('//') ? v : '/cuenta');
async function auth(req, res, url, prov, paso) {
  const volverPedido = volverSeguro(url.searchParams.get('volver'));
  if (prov === 'prueba' && LOGIN_PRUEBA) return abrirSesion(req, res, { id: 'p:prueba', nombre: 'Ciclista de prueba' }, volverPedido);
  const P = PROVEEDORES[prov];
  if (!P || !P.id || !P.secreto) return json(res, 503, { error: 'proveedor-no-configurado' });
  const redir = `${URL_BASE}/auth/${prov}/vuelta`;
  if (!paso) {
    const estado = crypto.randomBytes(18).toString('base64url');
    const cuerpoE = b64(JSON.stringify({ e: estado, v: volverPedido, t: Date.now() }));
    const q = new URLSearchParams({ client_id: P.id, redirect_uri: redir, response_type: 'code', scope: P.scope, state: estado });
    if (prov === 'google') q.set('prompt', 'select_account');
    res.writeHead(302, { location: `${P.autorizar}?${q}`, 'set-cookie': cookie(req, 'bv_est', cuerpoE + '.' + firmar(cuerpoE), 600) });
    return res.end();
  }
  // vuelta: el "state" tiene que coincidir con la cookie firmada (corta el CSRF de inicio de sesión)
  const est = leerPermiso(leerCookies(req).bv_est);
  const estado = url.searchParams.get('state') || '';
  if (!est || est.e !== estado || Date.now() - est.t > 600_000) return json(res, 400, { error: 'estado-invalido' });
  const code = url.searchParams.get('code');
  if (!code) { res.writeHead(302, { location: '/#' + est.v, 'set-cookie': cookie(req, 'bv_est', '', 0) }); return res.end(); }
  try { return abrirSesion(req, res, await P.usuario(code, redir), est.v); }
  catch (e) { console.error('login', prov, e.message); return json(res, 502, { error: 'login-fallo' }); }
}

// ---------- reseñas ----------
const ARCH_RES = path.join(PRIV, 'resenas.json');
const RUTA_ID = /^([a-z]+)\/([a-z]{2})\/([a-z0-9-]+)-(\d+)$/; // ciclismo/ar/neuquen-0
function rutaExiste(ruta) {
  const ml = String(ruta).match(/^local\/([a-z0-9-]{2,60})$/);
  if (ml) return localPorId(ml[1]) ? { local: ml[1] } : null;
  const m = String(ruta).match(RUTA_ID); if (!m) return null;
  const arch = path.join(DAT, m[1], m[2], m[3] + '.json');
  if (!arch.startsWith(DAT + path.sep) || !fs.existsSync(arch)) return null;
  const d = JSON.parse(fs.readFileSync(arch, 'utf8'));
  return d.rutas.some(r => r.id === `${m[3]}-${m[4]}`) ? { tema: m[1], cc: m[2] } : null;
}
const resenasFreno = new Map();
function resenasDe(ruta, yo) {
  const lista = (leerJSON(ARCH_RES, {})[ruta] || []).filter(r => !r.oculta);
  const total = lista.length;
  const promedio = total ? Math.round(lista.reduce((s, r) => s + r.estrellas, 0) / total * 10) / 10 : null;
  return { ruta, total, promedio, items: lista.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 50)
    .map(r => ({ nombre: r.nombre, estrellas: r.estrellas, texto: r.texto, fecha: r.fecha.slice(0, 10), compro: !!r.compro, mia: yo ? r.u === yo : false })) };
}
async function guardarResena(req, res, ip) {
  if (!mismoOrigen(req)) return json(res, 403, { error: 'origen' });
  const s = sesion(req);
  if (!s) return json(res, 401, { error: 'sin-sesion' });
  const ahora = Date.now(), previas = (resenasFreno.get(s.id) || []).filter(t => ahora - t < 3600_000);
  if (previas.length >= 10 || frenado(ip)) return json(res, 429, { error: 'muchos-intentos' });
  resenasFreno.set(s.id, [...previas, ahora]);
  let d; try { d = JSON.parse((await cuerpo(req, 4000)).toString()); } catch { return json(res, 400, { error: 'json' }); }
  const r = String(d?.ruta || ''), donde = rutaExiste(r);
  const estrellas = Number(d?.estrellas);
  const texto = String(d?.texto || '').replace(/[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]/g, '').trim().slice(0, 600);
  if (!donde) return json(res, 404, { error: 'ruta' });
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return json(res, 400, { error: 'estrellas' });
  if (texto && texto.length < 3) return json(res, 400, { error: 'texto' });
  const compro = !donde.local && abre(productosVigentes(leerPermiso((req.headers.authorization || '').replace(/^Bearer /, ''))), donde.tema, donde.cc);
  const db = leerJSON(ARCH_RES, {});
  const lista = (db[r] ||= []);
  const i = lista.findIndex(x => x.u === s.id);
  const nueva = { u: s.id, nombre: s.nombre, estrellas, texto, compro: compro || !!lista[i]?.compro, fecha: new Date().toISOString(), oculta: false };
  if (i >= 0) lista[i] = nueva; else lista.push(nueva);
  guardarJSON(ARCH_RES, db);
  return json(res, 200, resenasDe(r, s.id));
}

// ---------- clima (Open-Meteo, sin clave; pasa por el servidor para cachear y no abrir la app a otros dominios) ----------
const CLIMA = new Map();
async function clima(lat, lon) {
  const k = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const c = CLIMA.get(k);
  if (c && Date.now() - c.t < 30 * 60_000) return c.d;
  const q = new URLSearchParams({ latitude: lat.toFixed(3), longitude: lon.toFixed(3), timezone: 'auto', forecast_days: '6', wind_speed_unit: 'kmh',
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset' });
  const r = await fetch('https://api.open-meteo.com/v1/forecast?' + q, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('clima ' + r.status);
  const j = await r.json();
  const d = { actual: j.current, dias: j.daily, zona: j.timezone };
  if (CLIMA.size > 2000) CLIMA.clear();
  CLIMA.set(k, { t: Date.now(), d });
  return d;
}

// ---------- Turismo: locales y servicios que pagan su lugar en la app (USD 20/mes) ----------
// datos/locales.json lo maneja herramientas/locales.py (alta, renovar, baja). Un local se muestra solo si está activo
// y pagado hasta hoy o más. Los marcados "ejemplo" solo aparecen en la PC (BV_EJEMPLOS=1), nunca en el servidor real.
const ARCH_LOC = path.join(DAT, 'locales.json');
const EJEMPLOS = process.env.BV_EJEMPLOS === '1' && !URL_BASE.startsWith('https://');
const hoyISO = () => new Date().toISOString().slice(0, 10);
function localesVigentes() {
  const hoy = hoyISO();
  return (leerJSON(ARCH_LOC, { locales: [] }).locales || [])
    .filter(l => l.activo !== false && (l.pagado_hasta || '') >= hoy && (!l.ejemplo || EJEMPLOS));
}
const publico = l => ({ id: l.id, nombre: l.nombre, tipo: l.tipo, pais: l.pais, provincia: l.provincia, lat: l.lat, lon: l.lon,
  direccion: l.direccion, horario: l.horario, descripcion: l.descripcion, promo: l.promo, fotos: l.fotos || [],
  whatsapp: l.whatsapp, instagram: l.instagram, web: l.web, ejemplo: !!l.ejemplo });
function resumenResenas(clave) {
  const lista = (leerJSON(ARCH_RES, {})[clave] || []).filter(r => !r.oculta);
  return { total: lista.length, promedio: lista.length ? Math.round(lista.reduce((s, r) => s + r.estrellas, 0) / lista.length * 10) / 10 : null };
}
function turismo(url) {
  const lat = parseFloat(url.searchParams.get('lat')), lon = parseFloat(url.searchParams.get('lon'));
  const radio = Math.min(Math.max(parseFloat(url.searchParams.get('radio')) || 0, 0), 2000);
  const cc = String(url.searchParams.get('cc') || '').toUpperCase();
  let lista = localesVigentes().map(l => ({ ...publico(l), ...resumenResenas('local/' + l.id),
    km: Number.isFinite(lat) && Number.isFinite(lon) ? Math.round(distanciaKm(lat, lon, l.lat, l.lon) * 10) / 10 : null }));
  if (cc) lista = lista.filter(l => l.pais === cc);
  if (radio && lista.some(l => l.km != null)) lista = lista.filter(l => l.km != null && l.km <= radio);
  lista.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9) || a.nombre.localeCompare(b.nombre));
  return { locales: lista.slice(0, 100), precio_usd: 20 };
}
const localPorId = id => localesVigentes().find(l => l.id === id);
// Pedido de un local que quiere sumarse: queda en .datos/ para que lo lea el dueño (no se publica nada solo).
async function solicitudTurismo(req, res, ip) {
  if (!mismoOrigen(req)) return json(res, 403, { error: 'origen' });
  if (frenado(ip)) return json(res, 429, { error: 'muchos-intentos' });
  let d; try { d = JSON.parse((await cuerpo(req, 6000)).toString()); } catch { return json(res, 400, { error: 'json' }); }
  const limpio = (v, n) => String(v || '').replace(/[\u0000-\u001F\u007F‪-‮⁦-⁩]/g, ' ').trim().slice(0, n);
  const s = { negocio: limpio(d.negocio, 80), ciudad: limpio(d.ciudad, 80), contacto: limpio(d.contacto, 120), mensaje: limpio(d.mensaje, 800),
    idioma: limpio(d.idioma, 5), t: new Date().toISOString() };
  if (s.negocio.length < 2 || s.contacto.length < 5) return json(res, 400, { error: 'faltan-datos' });
  fs.appendFileSync(path.join(PRIV, 'solicitudes-turismo.jsonl'), JSON.stringify(s) + '\n');
  return json(res, 200, { ok: true });
}

// ---------- servidor ----------
const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    let ruta; try { ruta = decodeURIComponent(url.pathname); } catch { return json(res, 400, { error: 'url' }); }
    // IP real: X-Forwarded-For lo puede inventar cualquiera; solo vale detrás de nuestro Caddy (BV_PROXY=1) y se usa el
    // último salto, que es el que agrega Caddy. Sin eso, la IP de la conexión.
    const ip = process.env.BV_PROXY === '1' ? (String(req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.socket.remoteAddress) : req.socket.remoteAddress;
    cabecerasSeguras(req, res);
    if (!['GET', 'HEAD', 'POST'].includes(req.method)) return json(res, 405, { error: 'metodo' });

    const au = ruta.match(/^\/auth\/(google|facebook|prueba)(\/vuelta)?$/);
    if (au && req.method === 'GET') return auth(req, res, url, au[1], au[2]);
    if (ruta === '/auth/salir' && req.method === 'POST') {
      if (!mismoOrigen(req)) return json(res, 403, { error: 'origen' });
      return json(res, 200, { ok: true }, { 'set-cookie': cookie(req, 'bv_ses', '', 0) });
    }
    if (ruta === '/api/yo') {
      const s = sesion(req);
      return json(res, 200, { usuario: s ? { nombre: s.nombre, proveedor: s.id.split(':')[0] } : null, proveedores: disponibles() });
    }
    if (ruta === '/api/resenas' && req.method === 'GET') {
      const r = String(url.searchParams.get('ruta') || '');
      if (!rutaExiste(r)) return json(res, 404, { error: 'ruta' });
      return json(res, 200, resenasDe(r, sesion(req)?.id));
    }
    if (ruta === '/api/resenas' && req.method === 'POST') return guardarResena(req, res, ip);
    if (ruta === '/api/turismo') return json(res, 200, turismo(url));
    const mt = ruta.match(/^\/api\/turismo\/([a-z0-9-]{2,60})$/);
    if (mt && req.method === 'GET') {
      const l = localPorId(mt[1]);
      return l ? json(res, 200, { ...publico(l), ...resumenResenas('local/' + l.id) }) : json(res, 404, { error: 'no-existe' });
    }
    if (ruta === '/api/turismo-solicitud' && req.method === 'POST') return solicitudTurismo(req, res, ip);
    if (ruta === '/api/clima') {
      const lat = parseFloat(url.searchParams.get('lat')), lon = parseFloat(url.searchParams.get('lon'));
      if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return json(res, 400, { error: 'coordenadas' });
      try { return json(res, 200, await clima(lat, lon), { 'cache-control': 'public, max-age=900' }); }
      catch (e) { return json(res, 502, { error: 'clima-no-disponible' }); }
    }

    if (ruta === '/api/version') {
      const p = JSON.parse(fs.readFileSync(path.join(PUB, 'contenido', 'paises.json'), 'utf8'));
      const app = JSON.parse(fs.readFileSync(path.join(PUB, 'version.json'), 'utf8'));
      return json(res, 200, { contenido: p.version, app: app.version, novedad: app.novedad || null });
    }
    if (ruta === '/api/donde') {
      const lat = parseFloat(url.searchParams.get('lat')), lon = parseFloat(url.searchParams.get('lon'));
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const d = donde(lat, lon);
        return json(res, 200, d ? { cc: d.cc, prov: d.prov, km: d.km, por: 'gps' } : { cc: null, por: 'gps' });
      }
      const cc = (req.headers['cf-ipcountry'] || req.headers['x-pais'] || '').toUpperCase();
      return json(res, 200, { cc: cc || null, por: cc ? 'ip' : null });
    }
    if (ruta === '/api/canjear' && req.method === 'POST') {
      if (frenado(ip)) return json(res, 429, { error: 'muchos-intentos' });
      const { codigo, dispositivo, permiso } = JSON.parse((await cuerpo(req, 4000)).toString() || '{}');
      if (!dispositivo || String(dispositivo).length < 8) return json(res, 400, { error: 'dispositivo' });
      const db = leerCodigos();
      const buscado = normalizar(codigo);
      const entrada = Object.entries(db.codigos).find(([k]) => normalizar(k) === buscado);
      if (!entrada || !entrada[1].activo) return json(res, 404, { error: 'codigo-invalido' });
      const [k, c] = entrada;
      if (!c.dispositivos.includes(dispositivo)) {
        if (c.dispositivos.length >= MAX_DISPOSITIVOS) return json(res, 409, { error: 'codigo-lleno', max: MAX_DISPOSITIVOS });
        c.dispositivos.push(dispositivo);
        c.usado = c.usado || new Date().toISOString();
        guardarCodigos(db);
      }
      const previo = leerPermiso(permiso);
      const productos = new Set(previo && previo.d === dispositivo ? productosVigentes(previo) : []);
      for (const h of hermanos(c.producto)) productos.add(h);
      return json(res, 200, { permiso: emitirPermiso([...productos], dispositivo), productos: [...productos], nuevo: c.producto, codigo: k });
    }
    if (ruta === '/api/permiso') { // la app confirma qué sigue vigente (por si hubo reembolso)
      const p = leerPermiso((req.headers.authorization || '').replace(/^Bearer /, ''));
      return json(res, 200, { productos: productosVigentes(p) });
    }
    let m = ruta.match(/^\/api\/provincia\/([a-z]+)\/([a-z]{2})\/([a-z0-9-]+)$/);
    if (m) {
      const [, tema, cc, prov] = m;
      const arch = path.join(DAT, tema, cc, prov + '.json');
      if (!fs.existsSync(arch)) return json(res, 404, { error: 'no-existe' });
      const datos = JSON.parse(fs.readFileSync(arch, 'utf8'));
      const vig = productosVigentes(leerPermiso((req.headers.authorization || '').replace(/^Bearer /, '')));
      const abierto = abre(vig, tema, cc);
      if (!abierto) datos.rutas = datos.rutas.filter(r => rutaGratis(tema, cc, r.id));
      return json(res, 200, { ...datos, abierto });
    }
    if (ruta === '/hook/impultienda' && req.method === 'POST') return webhook(req, res);
    if (ruta.startsWith('/api/')) return json(res, 404, { error: 'no-existe' });

    // archivos de la app
    let arch = path.normalize(path.join(PUB, ruta));
    if (!arch.startsWith(PUB)) return json(res, 403, { error: 'no' });
    if (!fs.existsSync(arch) || fs.statSync(arch).isDirectory()) arch = path.join(PUB, 'index.html');
    const ext = path.extname(arch);
    const cache = ext === '.html' || arch.endsWith('sw.js') || ext === '.json' || ext === '.webmanifest'
      ? 'no-cache' : (arch.includes(`${path.sep}vendor${path.sep}`) || arch.includes(`${path.sep}fotos${path.sep}`) ? 'public, max-age=604800' : 'no-cache');
    res.writeHead(200, { 'content-type': TIPOS[ext] || 'application/octet-stream', 'cache-control': cache,
      });
    fs.createReadStream(arch).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: 'interno' });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  servidor.listen(PUERTO, () => console.log(`La Brújula Viajera en http://localhost:${PUERTO}`));
}
