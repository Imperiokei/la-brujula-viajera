// La Brújula Viajera · app (sin frameworks). Pantallas: inicio → idioma → país → provincia → rutas → detalle, y código.
import { IDIOMAS, IDIOMA_DE_PAIS, T, NOMBRE_IDIOMA } from './i18n.js';

const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');

// ---------- estado guardado en el dispositivo ----------
const LS = {
  get(k, d) { try { const v = localStorage.getItem('bv.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bv.' + k, JSON.stringify(v)); } catch {} },
};
if (!LS.get('dispositivo')) LS.set('dispositivo', (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)));
let idioma = LS.get('idioma', null);

function t(k, vars = {}) {
  const pack = T[idioma] || T.es;
  let s = pack[k] ?? T.es[k] ?? k;
  if (typeof s === 'string') for (const [a, b] of Object.entries(vars)) s = s.replaceAll('{' + a + '}', b);
  return s;
}
const tn = (k, n) => { const v = t(k); return (Array.isArray(v) ? v[n === 1 ? 0 : 1] : v).replace('{n}', n); };
const tv = (grupo, v) => (T[idioma]?.[grupo] || T.es[grupo] || {})[v] || v;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => new Intl.NumberFormat(idioma || 'es').format(n);
const division = (d, n) => { const p = t('div')[d] || [d, d]; return n === 1 ? p[0] : p[1]; };
function nombrePais(cc, lang = idioma || 'es') {
  const p = PAISES?.find(x => x.cc === cc);
  if (p?.nombre?.[lang]) return p.nombre[lang];
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(cc); } catch { return cc; }
}

// ---------- íconos ----------
const I = {
  flecha: '<path d="M15 18l-6-6 6-6"/>', ir: '<path d="M9 18l6-6-6-6"/>', abajo: '<path d="M6 9l6 6 6-6"/>',
  brujula: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>', llave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  ajustes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', abierto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 017.5-2"/>',
  tilde: '<path d="M5 12l5 5L20 7"/>', buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  ruta: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 000-6h-4a3 3 0 010-6h6"/>', monte: '<path d="M3 20l6-10 4 6 3-4 5 8z"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', bici: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-8h5M10 8l4 8 2-6h2"/>',
  ojo: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>', mapa: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', ojito: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  carpa: '<path d="M3 20L12 4l9 16zM12 4v16M8 20l4-6 4 6"/>', surtidor: '<path d="M4 20V5a1 1 0 011-1h8a1 1 0 011 1v15M3 20h12M7 8h4"/><path d="M14 10h2a2 2 0 012 2v5a1.5 1.5 0 003 0V8l-3-3"/>',
  idioma: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>', recargar: '<path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6"/>',
  moto: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5l4-6h5l4 6M14.5 10.5L13 7h3M9.5 10.5L8 8H5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>', bolsa: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 016 0"/>',
};
const ico = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${I[n] || ''}</svg>`;

// Banderas dibujadas (los emojis de bandera no se ven en Windows)
const BANDERAS = {
  AR: '<rect width="30" height="20" fill="#74ACDF"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><circle cx="15" cy="10" r="2.2" fill="#F6B40E"/>',
  PE: '<rect width="30" height="20" fill="#D91023"/><rect x="10" width="10" height="20" fill="#fff"/>',
  PT: '<rect width="30" height="20" fill="#FF0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="3.6" fill="#FFCC00"/><circle cx="12" cy="10" r="2" fill="#fff" stroke="#FF0000" stroke-width=".8"/>',
  BR: '<rect width="30" height="20" fill="#009C3B"/><path d="M15 2.5L27 10 15 17.5 3 10z" fill="#FFDF00"/><circle cx="15" cy="10" r="3.8" fill="#002776"/>',
};
const bandera = (cc, alto = 22) => BANDERAS[cc]
  ? `<svg class="flag" viewBox="0 0 30 20" width="${alto * 1.5}" height="${alto}" style="border-radius:4px;box-shadow:0 0 0 1px rgba(0,0,0,.12)">${BANDERAS[cc]}</svg>`
  : `<span style="font-size:${alto}px">${ico('idioma', `width="${alto}" height="${alto}"`)}</span>`;

// ---------- red ----------
async function api(ruta, opciones = {}) {
  const h = { ...(opciones.headers || {}) };
  const permiso = LS.get('permiso');
  if (permiso) h.authorization = 'Bearer ' + permiso;
  const r = await fetch(ruta, { ...opciones, headers: h });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(datos.error || 'error'); e.estado = r.status; e.datos = datos; throw e; }
  return datos;
}
let PAISES = null;
let VERSION_CONTENIDO = null;
async function paises() {
  if (!PAISES) { const d = await api('contenido/paises.json'); PAISES = d.paises; VERSION_CONTENIDO = d.version; }
  return PAISES;
}
const INDICES = {};
async function indice(tema, cc) { return INDICES[tema + cc] ||= await api(`contenido/${tema}/${cc.toLowerCase()}/indice.json`); }
const PROV = {};
async function provincia(tema, cc, slug) {
  const k = tema + '/' + cc + '/' + slug;
  if (!PROV[k]) PROV[k] = await api(`/api/provincia/${tema}/${cc.toLowerCase()}/${slug}`);
  return PROV[k];
}
const abiertos = () => LS.get('productos', []);
const estaAbierto = id => abiertos().includes(id); // id de producto: ciclismo-ar, motociclismo-ar…
// País base = el detectado al abrir (o el primero que elige quien no tiene ubicación). Los demás países arrancan
// bloqueados y se abren con el código de cualquiera de sus mapas.
const paisBase = () => {
  const b = LS.get('pais_base'); if (b) return b;
  const d = LS.get('detectado')?.cc;
  return d && PAISES?.some(p => p.cc === d) ? d : null;
};
const paisLibre = cc => {
  const p = PAISES?.find(x => x.cc === cc);
  return cc === paisBase() || !!p?.productos.some(x => estaAbierto(x.id));
};
const temaEmoji = tema => (tema === 'motociclismo' ? '🏍️' : '🚴');
const TIPOS_SERV = ['estacion', 'gomeria', 'bicicleteria'];
const EMO_SERV = { estacion: '⛽', gomeria: '🛞', bicicleteria: '🔧' };
const COLOR_SERV = { estacion: '#B4432F', gomeria: '#4A4F57', bicicleteria: '#2D5B73' };
const emoClima = (c, dia = 1) => c === 0 ? (dia ? '☀️' : '🌙') : c <= 2 ? (dia ? '🌤️' : '☁️') : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️'
  : c <= 67 ? '🌧️' : c <= 77 ? '🌨️' : c <= 82 ? '🌧️' : c <= 86 ? '🌨️' : '⛈️';
const nombreTema = tema => t('temas')[tema] || tema;
const nombreProducto = (id, cc) => { const [tema, p] = id.split('-'); return t('mapa_de', { tema: nombreTema(tema), pais: nombrePais(cc || p.toUpperCase()) }); };
function buscarProducto(id) { for (const p of PAISES || []) for (const x of p.productos) if (x.id === id) return { pais: p, prod: x }; return {}; }

// ---------- detección de ubicación ----------
const ZONAS = {
  'America/Argentina': 'AR', 'America/Buenos_Aires': 'AR', 'America/Cordoba': 'AR', 'America/Mendoza': 'AR', 'America/Lima': 'PE',
  'Europe/Lisbon': 'PT', 'Atlantic/Madeira': 'PT', 'Atlantic/Azores': 'PT', 'America/Sao_Paulo': 'BR', 'America/Bahia': 'BR', 'America/Fortaleza': 'BR',
  'America/Recife': 'BR', 'America/Manaus': 'BR', 'America/Belem': 'BR', 'America/Cuiaba': 'BR', 'America/Campo_Grande': 'BR', 'America/Porto_Velho': 'BR',
  'America/Rio_Branco': 'BR', 'America/Boa_Vista': 'BR', 'America/Maceio': 'BR', 'America/Araguaina': 'BR', 'America/Noronha': 'BR',
  'America/Santiago': 'CL', 'America/Montevideo': 'UY', 'America/Asuncion': 'PY', 'America/La_Paz': 'BO', 'America/Bogota': 'CO', 'America/Guayaquil': 'EC',
  'America/Caracas': 'VE', 'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Monterrey': 'MX', 'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES',
  'Europe/Paris': 'FR', 'Europe/Rome': 'IT', 'Europe/Berlin': 'DE', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/London': 'GB', 'Europe/Dublin': 'IE',
  'Europe/Brussels': 'BE', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Toronto': 'CA',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
};
function paisPorZona() {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    for (const [k, v] of Object.entries(ZONAS)) if (z === k || z.startsWith(k + '/')) return v;
  } catch {}
  const reg = (navigator.language || '').split('-')[1];
  return reg && reg.length === 2 ? reg.toUpperCase() : null;
}
function idiomaPara(cc) {
  if (cc && IDIOMA_DE_PAIS[cc]) return IDIOMA_DE_PAIS[cc];
  const nav = (navigator.language || 'en').slice(0, 2);
  return T[nav] ? nav : 'en';
}
async function detectar() {
  const pos = await new Promise(ok => {
    if (!navigator.geolocation) return ok(null);
    navigator.geolocation.getCurrentPosition(p => ok(p), () => ok(null), { timeout: 9000, maximumAge: 600000, enableHighAccuracy: false });
  });
  if (pos) {
    try {
      const r = await api(`/api/donde?lat=${pos.coords.latitude.toFixed(3)}&lon=${pos.coords.longitude.toFixed(3)}`);
      if (r.cc) return { cc: r.cc, prov: r.prov, por: 'gps' };
    } catch {}
  }
  try { const r = await api('/api/donde'); if (r.cc) return { cc: r.cc, por: 'ip' }; } catch {}
  const cc = paisPorZona();
  return cc ? { cc, por: 'zona' } : { cc: null, por: null };
}

// ---------- marco: barra, navegación, hoja, aviso ----------
function navegacion(actual) {
  const items = [['#/paises', 'explorar', 'brujula'], ['#/turismo', 'turismo', 'pin'], ['#/tienda', 'tienda', 'bolsa'], ['#/codigo', 'codigo', 'llave'], ['#/ajustes', 'ajustes', 'ajustes']];
  $('#nav-abajo').innerHTML = items.map(([h, k, i]) => `<a href="${h}" ${actual === k ? 'aria-current="page"' : ''}>${ico(i)}<span>${t(k)}</span></a>`).join('');
  $('#nav-arriba').innerHTML = items.map(([h, k]) => `<a href="${h}" ${actual === k ? 'aria-current="page"' : ''}>${t(k)}</a>`).join('');
}
function abrirHoja(html) {
  const h = $('#hoja'), f = $('#hoja-fondo');
  h.innerHTML = html; h.hidden = false; f.hidden = false;
  f.onclick = cerrarHoja;
  h.querySelectorAll('[data-cerrar]').forEach(b => b.onclick = cerrarHoja);
}
function cerrarHoja() { $('#hoja').hidden = true; $('#hoja-fondo').hidden = true; }
let toastTimer;
function toast(texto, boton, accion, fijo = false) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(texto)}</span>${boton ? `<button class="btn btn-ambar">${esc(boton)}</button>` : ''}`;
  el.hidden = false;
  if (boton) el.querySelector('button').onclick = () => { el.hidden = true; accion(); };
  clearTimeout(toastTimer);
  if (!fijo) toastTimer = setTimeout(() => el.hidden = true, 4200);
}
function avisoRed() { const a = $('#aviso-red'); a.textContent = t('sin_conexion'); a.hidden = navigator.onLine; }
addEventListener('online', avisoRed); addEventListener('offline', avisoRed);

function paywall(prod, cc, foto) {
  abrirHoja(`
    ${foto ? `<div class="hoja-foto"><img src="${foto}" alt=""></div>` : ''}
    <h2>${esc(t('paywall_t', { producto: nombreProducto(prod.id, cc) }))}</h2>
    <p>${esc(t('paywall_s', { n: prod.rutas }))}</p>
    <ul class="lista-beneficios">
      <li>${ico('mapa')}${esc(t('el_recorrido'))} · ${esc(t('perfil'))}</li>
      <li>${ico('ruta')}${esc(t('tramos'))} · ${esc(t('descansos'))}</li>
      <li>${ico('ojito')}${esc(t('miradores'))} · ${esc(t('servicios'))}</li>
    </ul>
    <a class="btn btn-ambar btn-ancho" href="#/codigo?producto=${prod.id}" data-cerrar>${ico('llave')}${esc(t('desbloquear'))}</a>
    ${prod.tienda ? `<a class="btn btn-claro btn-ancho" href="${prod.tienda}" target="_blank" rel="noopener">${ico('bolsa')}${esc(t('conseguir'))}</a>` : ''}`);
}

// ---------- pantallas ----------
const P = {};

P.inicio = async () => {
  document.body.classList.add('sin-nav'); $('#barra').hidden = true;
  const ps = await paises().catch(() => []);
  const fondo = ps[0]?.foto;
  let det = null, elegido = idioma;
  const pintar = () => {
    const lang = elegido || idioma || idiomaPara(det?.cc);
    const anterior = idioma; idioma = lang;
    const nombreIdioma = IDIOMAS.find(x => x.id === lang)?.nombre;
    const conocido = det?.cc && ps.some(p => p.cc === det.cc);
    app.innerHTML = `
      <section class="bienvenida" style="--fondo:url('${fondo || ''}')">
        <div class="bv-centro">
          <img class="bv-logo" src="img/logo.svg" alt="">
          <h1 class="bv-titulo">La Brújula <em>Viajera</em></h1>
          <p class="bv-lema">${esc(t('lema'))}</p>
        </div>
        <div class="bv-panel">
          <div class="bv-tarjeta">
            ${!det ? `<div class="bv-estado"><div class="giro"></div><div>${esc(t('buscando'))}</div></div>` : `
              <div class="bv-estado">
                <div class="bv-bandera">${det.cc ? bandera(det.cc, 30) : ico('idioma', 'width="34" height="34"')}</div>
                <div><div class="bv-rotulo">${esc(det.cc ? t('tu_ubic') : t('no_detectado'))}</div>
                <div class="bv-pais">${det.cc ? esc(nombrePais(det.cc)) : '—'}</div></div>
              </div>
              <div class="bv-idioma"><span>${esc(t('te_mostramos'))} <strong>${esc(nombreIdioma)}</strong></span>
                <button class="bv-link" id="otro">${esc(t('otro_idioma'))}</button></div>`}
          </div>
          ${det ? `<button class="btn btn-ambar btn-ancho" id="seguir">${esc(t('continuar'))}${ico('ir')}</button>` : ''}
          <p class="bv-nota">${esc(t('permiso_ubic'))}</p>
        </div>
      </section>`;
    idioma = anterior;
    if (det) {
      $('#seguir').onclick = () => {
        idioma = lang; LS.set('idioma', lang); LS.set('detectado', det); document.documentElement.lang = lang;
        location.hash = conocido ? `#/pais/${det.cc}` : '#/paises';
      };
      $('#otro').onclick = () => { LS.set('detectado', det); location.hash = '#/idioma?primera=1'; };
    }
  };
  pintar();
  det = await detectar();
  if (location.hash.startsWith('#/inicio')) pintar();
};

P.idioma = async (q) => {
  const primera = q.get('primera');
  if (primera) { document.body.classList.add('sin-nav'); } else navegacion('ajustes');
  let elegido = idioma || idiomaPara(LS.get('detectado')?.cc);
  const pintar = () => {
    const ant = idioma; idioma = elegido;
    app.innerHTML = `<div class="ancho" style="max-width:720px">
      <div class="cabeza">${primera ? '' : `<a class="miga" href="#/ajustes">${ico('flecha')}${esc(t('volver'))}</a>`}
        <h1>${esc(t('elegi_idioma'))}</h1></div>
      <div class="lista-idiomas">${IDIOMAS.map(l => `
        <button class="idioma" data-id="${l.id}" aria-pressed="${l.id === elegido}">
          <span>${esc(l.nombre)}<small>${esc(new Intl.DisplayNames([elegido], { type: 'language' }).of(l.id))}</small></span>
          <span class="tilde">${ico('tilde')}</span></button>`).join('')}</div>
      <button class="btn btn-ambar btn-ancho" id="listo">${esc(t('continuar'))}${ico('ir')}</button>
    </div>`;
    idioma = ant;
    app.querySelectorAll('.idioma').forEach(b => b.onclick = () => { elegido = b.dataset.id; pintar(); });
    $('#listo').onclick = () => {
      idioma = elegido; LS.set('idioma', elegido); document.documentElement.lang = elegido;
      const det = LS.get('detectado');
      location.hash = primera && det?.cc && PAISES?.some(p => p.cc === det.cc) ? `#/pais/${det.cc}` : (primera ? '#/paises' : '#/ajustes');
    };
  };
  await paises().catch(() => {});
  pintar();
};

P.paises = async () => {
  navegacion('explorar');
  const ps = await paises();
  const det = LS.get('detectado');
  const orden = [...ps].sort((a, b) => (b.cc === det?.cc) - (a.cc === det?.cc));
  app.innerHTML = `<div class="ancho">
    <div class="cabeza"><h1>${esc(t('elegi_pais'))}</h1><p>${esc(t('elegi_pais_sub'))}</p></div>
    <div class="grilla-paises">${orden.map(p => `
      <a class="pais ${p.cc === det?.cc ? 'cerca' : ''} ${paisLibre(p.cc) ? '' : 'pais-bloq'}" href="#/pais/${p.cc}">
        ${p.foto ? `<img src="${p.foto}" alt="" loading="lazy">` : ''}
        <div class="arriba"><span class="bandera">${bandera(p.cc, 24)}</span>
          ${p.productos.some(x => estaAbierto(x.id)) ? `<span class="chip chip-abierto">${ico('abierto')}${esc(t('abierto'))}</span>` : !paisLibre(p.cc) ? `<span class="chip chip-candado">${ico('candado')}${esc(t('bloqueado'))}</span>` : ''}</div>
        ${paisLibre(p.cc) ? '' : `<span class="candado-grande" aria-label="${esc(t('pais_bloq'))}">${ico('candado')}</span>`}
        ${p.cc === det?.cc ? `<span class="chip chip-gratis cerca-chip">${ico('pin')}${esc(t('cerca'))}</span>` : ''}
        <div class="abajo"><h2>${esc(nombrePais(p.cc))}</h2>
          <div class="datos"><span>${esc(tn('mapas_n', p.productos.length))}</span>${p.productos.map(x => `<span><span class="emoji-tema">${temaEmoji(x.tema)}</span> ${esc(nombreTema(x.tema))}</span>`).join('')}</div></div>
      </a>`).join('')}</div></div>`;
};

// Los mapas (productos) de un país: Ciclismo, Motociclismo… Cada uno se desbloquea con su propio código.
P.productos = async (q, cc) => {
  navegacion('explorar');
  const ps = await paises();
  const pais = ps.find(p => p.cc === cc);
  if (!pais) return (location.hash = '#/paises');
  if (!paisBase()) LS.set('pais_base', cc); // sin ubicación: el primer país elegido queda como propio
  LS.set('pais', cc);
  const libre = paisLibre(cc);
  app.innerHTML = `<div class="ancho">
    <div class="cabeza"><a class="miga" href="#/paises">${ico('flecha')}${esc(t('paises'))}</a>
      <h1 style="display:flex;align-items:center;gap:14px">${bandera(cc, 30)} ${esc(nombrePais(cc))}</h1>
      <p>${esc(t('elegi_mapa'))}</p></div>
    ${libre ? '' : `<div class="aviso-bloq"><span class="aviso-bloq-ico">${ico('candado')}</span>
      <div><strong>${esc(t('pais_bloq'))}</strong><p>${esc(t('pais_bloq_sub'))}</p></div>
      <div class="aviso-bloq-botones"><a class="btn btn-ambar" href="#/codigo">${ico('llave')}${esc(t('desbloquear'))}</a>
        <a class="btn btn-claro" href="#/tienda?pais=${cc}">${ico('bolsa')}${esc(t('ver_tienda'))}</a></div></div>`}
    <div class="grilla-paises">${pais.productos.map(x => {
      const prox = x.estado === 'proximamente', ab = estaAbierto(x.id);
      const destino = libre ? `#/pais/${cc}/${x.tema}` : `#/codigo?producto=${x.id}`;
      return `<a class="pais producto ${prox ? 'proximo' : ''} ${!prox && !libre ? 'pais-bloq' : ''}" ${prox ? 'aria-disabled="true"' : `href="${destino}"`}>
        ${x.foto ? `<img src="${x.foto}" alt="" loading="lazy">` : ''}
        ${!prox && !libre ? `<span class="candado-grande">${ico('candado')}</span>` : ''}
        <div class="arriba"><span class="tema-ico">${temaEmoji(x.tema)}</span>
          ${prox ? `<span class="chip chip-claro">${esc(t('proximamente'))}</span>` : ab ? `<span class="chip chip-abierto">${ico('abierto')}${esc(t('abierto'))}</span>` : `<span class="chip chip-candado">${ico('candado')}${esc(t('con_codigo'))}</span>`}</div>
        <div class="abajo"><h2>${esc(nombreProducto(x.id, cc))}</h2>
          ${prox ? '' : `<div class="datos"><span>${esc(t('rutas_n', { n: x.rutas }))}</span><span>${esc(t('division_n', { n: x.provincias, division: division(pais.division, x.provincias) }))}</span><span>${esc(t('km_n', { n: fmt(x.km) }))}</span></div>`}</div>
      </a>`; }).join('')}</div></div>`;
};

P.pais = async (q, cc, tema) => {
  navegacion('explorar');
  const ps = await paises();
  const pais = ps.find(p => p.cc === cc);
  const prod = pais?.productos.find(x => x.tema === tema && x.estado !== 'proximamente');
  if (!prod) return (location.hash = pais ? `#/pais/${cc}` : '#/paises');
  if (!paisLibre(cc)) return (location.hash = `#/pais/${cc}`);
  LS.set('pais', cc);
  const ind = await indice(tema, cc);
  const det = LS.get('detectado');
  const cerca = det?.cc === cc ? det.prov : null;
  let filtro = '', region = '';
  const abierto = estaAbierto(prod.id);
  const nota = idioma !== ind.idioma ? `<div class="nota-idioma">${ico('info')}${esc(t('contenido_en', { idioma: NOMBRE_IDIOMA[idioma]?.[ind.idioma] || ind.idioma }))}</div>` : '';
  app.innerHTML = `<div class="ancho">
    <div class="cabeza"><a class="miga" href="#/pais/${cc}">${ico('flecha')}${esc(nombrePais(cc))}</a>
      <h1 style="display:flex;align-items:center;gap:14px">${bandera(cc, 30)} ${esc(nombreProducto(prod.id, cc))}</h1>
      <p>${esc(t('elegi_division', { division: division(pais.division, 1) }))} · ${esc(t('rutas_n', { n: prod.rutas }))}</p></div>
    <div class="banda-pais ${abierto ? 'abierta' : ''}">
      ${abierto ? `<p>${ico('abierto', 'width="18" height="18" style="vertical-align:-3px"')} <strong>${esc(t('abierto'))}</strong> · ${esc(t('rutas_n', { n: prod.rutas }))}</p>`
        : `<p>${esc(t('banda_cerrada', { n: prod.rutas }))}</p>
           <a class="btn btn-ambar" href="#/codigo?producto=${prod.id}">${ico('llave')}${esc(t('desbloquear'))}</a>`}
    </div>
    ${nota}
    <div class="buscador">${ico('buscar')}<input id="busca" type="search" placeholder="${esc(t('buscar'))}" autocomplete="off"></div>
    <div class="filtros" id="filtros"></div>
    <div id="lista"></div></div>`;
  const filtros = $('#filtros');
  filtros.innerHTML = [['', t('todas')], ...ind.regiones.map(r => [r, r])].map(([v, txt]) => `<button class="filtro" data-v="${esc(v)}" aria-pressed="${v === region}">${esc(txt)}</button>`).join('');
  filtros.onclick = e => { const b = e.target.closest('.filtro'); if (!b) return; region = b.dataset.v; filtros.querySelectorAll('.filtro').forEach(x => x.setAttribute('aria-pressed', x === b)); pintar(); };
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tarjeta = p => `
    <a class="prov ${p.slug === cerca ? 'cerca' : ''}" href="#/pais/${cc}/${tema}/${p.slug}">
      <div class="mini">${p.foto ? `<img src="${p.foto}" alt="" loading="lazy">` : ''}</div>
      <div><h3>${esc(p.nombre)}</h3><p>${esc(p.frase || '')}</p>
      <div class="cuenta">${esc(t('rutas_n', { n: p.rutas.length }))}${p.rutas.some(r => r.muestra) && !abierto ? ' · ' + esc(t('muestra')) : ''}</div></div>
    </a>`;
  const pintar = () => {
    const f = norm(filtro);
    let lista = ind.provincias.filter(p => (!region || p.region === region) &&
      (!f || norm(p.nombre).includes(f) || p.rutas.some(r => norm(r.nombre).includes(f))));
    let html = '';
    if (!f && !region && cerca) {
      const c = lista.find(p => p.slug === cerca);
      if (c) html += `<h2 class="region-titulo">${ico('pin', 'width="14" height="14" style="vertical-align:-2px"')} ${esc(t('cerca'))}</h2><div class="grilla-prov">${tarjeta(c)}</div>`;
    }
    if (f) {
      html += lista.length ? `<h2 class="region-titulo">${esc(t('n_resultados', { n: lista.length }))}</h2><div class="grilla-prov">${lista.map(tarjeta).join('')}</div>`
        : `<p class="vacio">${esc(t('sin_resultados'))}</p>`;
    } else {
      for (const r of ind.regiones) {
        const de = lista.filter(p => p.region === r);
        if (de.length) html += `<h2 class="region-titulo">${esc(r)}</h2><div class="grilla-prov">${de.map(tarjeta).join('')}</div>`;
      }
    }
    $('#lista').innerHTML = html + '<div style="height:20px"></div>';
  };
  $('#busca').oninput = e => { filtro = e.target.value; pintar(); };
  pintar();
};

const nivelClase = n => 'nivel nivel-' + (n === 'fácil' ? 'facil' : n);
function tarjetaRuta(cc, prov, r, abierto) {
  const libre = abierto || r.muestra;
  return `
  <button class="ruta ${libre ? '' : 'cerrada'}" data-id="${r.id}">
    <div class="foto">${r.foto ? `<img src="${r.foto}" alt="" loading="lazy">` : `<div class="sin-foto"><img src="img/logo.svg" alt=""></div>`}
      <div class="chips"><span>${r.estrella ? `<span class="chip chip-estrella">${ico('estrella')}${esc(t('destacada'))}</span>` : ''}</span>
      ${abierto ? '' : r.muestra ? `<span class="chip chip-gratis">${esc(t('muestra'))}</span>` : `<span class="chip chip-candado">${ico('candado')}${esc(t('bloqueada'))}</span>`}</div></div>
    <div class="cuerpo"><h3>${esc(r.nombre)}</h3>
      <div class="metricas">
        <span>${ico('ruta')}${fmt(r.km)} km</span>
        ${r.desnivel ? `<span>${ico('monte')}${fmt(r.desnivel)} m</span>` : ''}
        <span>${ico('reloj')}${esc(tv('v_dias', r.dias))}</span>
        <span class="${nivelClase(r.nivel)}">${esc(tv('v_nivel', r.nivel))}</span>
      </div></div>
  </button>`;
}

P.provincia = async (q, cc, tema, slug) => {
  navegacion('explorar');
  const ps = await paises();
  const pais = ps.find(p => p.cc === cc);
  const prod = pais?.productos.find(x => x.tema === tema);
  if (pais && !paisLibre(cc)) return (location.hash = `#/pais/${cc}`);
  const ind = await indice(tema, cc);
  const prov = ind.provincias.find(p => p.slug === slug);
  if (!pais || !prov || !prod) return (location.hash = `#/pais/${cc}/${tema}`);
  const abierto = estaAbierto(prod.id);
  app.innerHTML = `
    <section class="portada">${prov.foto ? `<img src="${prov.foto}" alt="">` : ''}
      <div class="ancho"><a class="volver" href="#/pais/${cc}/${tema}">${ico('flecha')}${esc(nombreProducto(prod.id, cc))}</a>
        <div><h1>${esc(prov.nombre)}</h1><p>${esc(prov.frase || '')}</p>
        <div class="chips"><span class="chip chip-claro">${esc(t('rutas_n', { n: prov.rutas.length }))}</span>
        ${abierto ? `<span class="chip chip-abierto">${ico('abierto')}${esc(t('abierto'))}</span>` : `<span class="chip chip-claro">${ico('candado')}${esc(t('con_codigo'))}</span>`}</div></div></div>
    </section>
    <div class="ancho"><div class="info-prov" id="info"></div>
      <div class="grilla-rutas">${prov.rutas.map(r => tarjetaRuta(cc, prov, r, abierto)).join('')}</div></div>`;
  app.querySelector('.grilla-rutas').onclick = e => {
    const b = e.target.closest('.ruta'); if (!b) return;
    const r = prov.rutas.find(x => x.id === b.dataset.id);
    if (abierto || r.muestra) location.hash = `#/ruta/${cc}/${tema}/${slug}/${r.id}`;
    else paywall(prod, cc, r.foto);
  };
  try {
    const d = await provincia(tema, cc, slug);
    const bloques = [['como_llegar', d.como_llegar], ['mejor_epoca', d.mejor_epoca], ['tene_cuenta', d.tene_en_cuenta]].filter(x => x[1]);
    const info = $('#info');
    if (info) info.innerHTML = bloques.map(([k, v]) => `<details class="desplegable"><summary>${esc(t(k))}${ico('abajo')}</summary><div>${esc(v)}</div></details>`).join('');
  } catch {}
};

let mapa = null;
P.ruta = async (q, cc, tema, slug, id) => {
  navegacion('explorar');
  const ps = await paises();
  const pais = ps.find(p => p.cc === cc);
  const prod = pais?.productos.find(x => x.tema === tema);
  if (pais && !paisLibre(cc)) return (location.hash = `#/pais/${cc}`);
  const ind = await indice(tema, cc);
  let d;
  try { d = await provincia(tema, cc, slug); } catch { location.hash = `#/pais/${cc}/${tema}/${slug}`; return; }
  const r = d.rutas.find(x => x.id === id);
  if (!r) { location.hash = `#/pais/${cc}/${tema}/${slug}`; if (prod) paywall(prod, cc); return; }
  const fotos = r.fotos || [];
  const gm = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=bicycling`;
  const nota = idioma !== ind.idioma ? `<div class="nota-idioma">${ico('info')}${esc(t('contenido_en', { idioma: NOMBRE_IDIOMA[idioma]?.[ind.idioma] || ind.idioma }))}</div>` : '';
  const cuenta = {}; for (const s of r.servicios || []) cuenta[s.tipo] = (cuenta[s.tipo] || 0) + 1;
  const lugar = (clase, icono, nombre, texto, lat, lon) => `
    <div class="lugar"><div class="ico ${clase}">${ico(icono)}</div><div><h3>${esc(nombre)}</h3>${texto ? `<p>${esc(texto)}</p>` : ''}</div>
      ${lat != null ? `<a href="${gm(lat, lon)}" target="_blank" rel="noopener" aria-label="${esc(t('como_ir'))}">${ico('pin')}</a>` : '<span></span>'}</div>`;
  app.innerHTML = `
    <section class="det-portada">
      <div class="galeria" id="galeria">${fotos.length ? fotos.map(f => `<figure><img src="${f.src}" alt="${esc(f.que || '')}"></figure>`).join('') : `<figure style="background:linear-gradient(135deg,#2C5A5C,#0F2B2D)"></figure>`}</div>
      <div class="ancho"><a class="volver portada-volver" href="#/pais/${cc}/${tema}/${slug}" style="align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:8px 14px 8px 10px;border-radius:999px;background:rgba(8,26,28,.45);backdrop-filter:blur(8px);font-size:14px;font-weight:600;text-decoration:none;color:#fff">${ico('flecha', 'width="18" height="18"')}${esc(d.nombre)}</a>
        <div>${r.estrella ? `<span class="chip chip-estrella" style="margin-bottom:10px">${ico('estrella')}${esc(t('destacada'))}</span>` : ''}
          <h1>${esc(r.nombre)}</h1>
          ${fotos.length > 1 ? `<div class="puntos" id="puntos">${fotos.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}
          ${fotos[0] ? `<div class="credito" id="credito">${creditoFoto(fotos[0])}</div>` : ''}</div></div>
    </section>
    <div class="ancho">
      <div class="ficha">
        <div><b>${fmt(r.km)}</b><small>${esc(t('km'))}</small></div>
        <div><b>${r.desnivel ? fmt(r.desnivel) + ' m' : '—'}</b><small>${esc(t('desnivel'))}</small></div>
        <div><b>${esc(tv('v_dias', r.dias))}</b><small>${esc(t('duracion'))}</small></div>
        <div><b class="${nivelClase(r.nivel)}">${esc(tv('v_nivel', r.nivel))}</b><small>${esc(t('nivel'))}</small></div>
        <div><b>${esc(tv('v_sup', r.superficie))}</b><small>${esc(t('superficie'))}</small></div>
        <div><b>${esc(tv('v_bici', r.bici))}</b><small>${esc(t('bici'))}</small></div>
      </div>
      ${nota}
      <div class="det-cuerpo">
        <div class="det-col-mapa">
          <div class="bloque"><h2>${esc(t('el_recorrido'))}</h2>
            <div class="mapa-caja"><div id="mapa"></div></div>
            <div class="capas" id="capas">
              <button class="capa" data-capa="miradores" aria-pressed="true"><i style="background:#E58E1F"></i>${esc(t('miradores'))}</button>
              <button class="capa" data-capa="descansos" aria-pressed="true"><i style="background:#5E8C6A"></i>${esc(t('descansos'))}</button>
              ${TIPOS_SERV.filter(k => cuenta[k]).map(k => `<button class="capa" data-capa="${k}" aria-pressed="true"><span class="emo">${EMO_SERV[k]}</span>${esc(tv('v_serv', k))}</button>`).join('')}
            </div></div>
          ${r.traza?.length > 5 && r.traza[0].length > 2 ? `<div class="bloque"><h2>${esc(t('perfil'))}</h2>${perfil(r.traza, r.desnivel)}</div>` : ''}
        </div>
        <div class="det-col-texto" style="display:grid;gap:22px">
          ${r.inicio?.lat != null ? `<div class="bloque clima" id="clima"><h2>${esc(t('clima'))}</h2><p class="sub-bloque">${esc(t('clima_sub'))}</p><div class="clima-cuerpo"><div class="giro"></div></div></div>` : ''}
          ${r.resumen ? `<div class="bloque"><p>${esc(r.resumen)}</p></div>` : ''}
          ${r.tramos?.length ? `<div class="bloque"><h2>${esc(t('tramos'))}</h2><ol class="tramos">${r.tramos.map(x => `
            <li><div class="t-cab"><span>${esc(t('tramo_de', { a: x.de, b: x.a }))}</span><span class="t-km">${fmt(x.km)} km</span></div>
            ${x.superficie ? `<div class="t-sup">${esc(tv('v_sup', x.superficie))}</div>` : ''}${x.nota ? `<p>${esc(x.nota)}</p>` : ''}</li>`).join('')}</ol></div>` : ''}
          ${r.ojo ? `<div class="ojo">${ico('ojo')}<div><strong>${esc(t('ojo'))}</strong>${esc(r.ojo)}</div></div>` : ''}
          ${r.miradores?.length ? `<div class="bloque"><h2>${esc(t('miradores'))}</h2><div class="lugares">${r.miradores.map(m => lugar('ico-mirador', 'ojito', m.nombre, m.que_se_ve, m.lat, m.lon)).join('')}</div></div>` : ''}
          ${r.descansos?.length ? `<div class="bloque"><h2>${esc(t('descansos'))}</h2><div class="lugares">${r.descansos.map(m => lugar('ico-descanso', 'carpa', m.nombre, [tv('v_desc', m.tipo), m.nota].filter(Boolean).join(' · '), m.lat, m.lon)).join('')}</div></div>` : ''}
          <div class="bloque" id="cerca-ruta" hidden></div>
          ${(r.servicios || []).length ? `<div class="bloque" id="en-camino"><h2>${esc(t('en_camino'))}</h2><p class="sub-bloque">${esc(t('en_camino_sub'))}</p>
            <div class="filtros-serv">${TIPOS_SERV.map((k, i) => `<button class="filtro-serv" data-tipo="${k}" aria-pressed="${i === 0}"><span class="emo">${EMO_SERV[k]}</span>${esc(tv('v_serv', k))}<b>${cuenta[k] || 0}</b></button>`).join('')}</div>
            <div class="lista-serv" id="lista-serv"></div></div>` : ''}
          <div class="acciones-det">
            ${r.inicio?.lat != null ? `<a class="btn btn-tinta btn-ancho" href="${gm(r.inicio.lat, r.inicio.lon)}" target="_blank" rel="noopener">${ico('pin')}${esc(t('abrir_maps'))}</a>` : ''}
            <p class="aviso-legal">${esc(t('aviso'))}</p>
          </div>
          <div class="bloque resenas" id="resenas"><h2>${esc(t('resenas'))}</h2><div class="giro"></div></div>
        </div>
      </div>
    </div>`;
  const gal = $('#galeria');
  if (gal && fotos.length > 1) gal.onscroll = () => {
    const i = Math.round(gal.scrollLeft / gal.clientWidth);
    document.querySelectorAll('#puntos i').forEach((p, j) => p.classList.toggle('on', i === j));
    const c = $('#credito'); if (c && fotos[i]) c.innerHTML = creditoFoto(fotos[i]);
  };
  dibujarMapa(r);
  if ($('#lista-serv')) {
    const pintarServ = tipo => {
      const l = (r.servicios || []).filter(s => s.tipo === tipo && s.lat != null);
      $('#lista-serv').innerHTML = l.length ? l.map(s => `
        <div class="lugar"><div class="ico emo-ico" style="background:${COLOR_SERV[tipo]}1A">${EMO_SERV[tipo]}</div>
          <div><h3>${esc(s.nombre || s.marca || tv('v_serv', tipo))}</h3><p>${esc([s.nombre && s.marca && s.marca !== s.nombre ? s.marca : '', tv('v_serv', tipo)].filter(Boolean).join(' · '))}</p></div>
          <a href="${gm(s.lat, s.lon)}" target="_blank" rel="noopener" aria-label="${esc(t('como_ir'))}">${ico('pin')}</a></div>`).join('')
        : `<p class="vacio-chico">${esc(t('sin_lugares'))}</p>`;
    };
    $('#en-camino').onclick = e => {
      const b = e.target.closest('.filtro-serv'); if (!b) return;
      document.querySelectorAll('.filtro-serv').forEach(x => x.setAttribute('aria-pressed', x === b));
      pintarServ(b.dataset.tipo);
    };
    pintarServ(TIPOS_SERV.find(k => cuenta[k]) || 'estacion');
    document.querySelectorAll('.filtro-serv').forEach(x => x.setAttribute('aria-pressed', x.dataset.tipo === (TIPOS_SERV.find(k => cuenta[k]) || 'estacion')));
  }
  if (r.inicio?.lat != null) { cargarClima(r.inicio.lat, r.inicio.lon); localesCerca(r.inicio.lat, r.inicio.lon); }
  cargarResenas(`${tema}/${cc.toLowerCase()}/${id}`);
};

// ---------- clima en la largada (Open-Meteo vía el servidor) ----------
async function cargarClima(lat, lon) {
  const caja = $('#clima .clima-cuerpo'); if (!caja) return;
  try {
    const d = await api(`/api/clima?lat=${lat}&lon=${lon}`);
    const a = d.actual, D = d.dias;
    const dia = i => i === 0 ? t('hoy') : new Intl.DateTimeFormat(idioma || 'es', { weekday: 'short', timeZone: 'UTC' }).format(new Date(D.time[i] + 'T12:00:00Z'));
    caja.innerHTML = `
      <div class="clima-ahora">
        <span class="clima-emo">${emoClima(a.weather_code, a.is_day)}</span>
        <div><b class="clima-temp">${Math.round(a.temperature_2m)}°</b><small>${esc(t('sensacion', { n: Math.round(a.apparent_temperature) }))}</small></div>
        <div class="clima-datos">
          <span>💨 ${esc(t('viento'))} <b>${Math.round(a.wind_speed_10m)} km/h</b> <i class="flecha-viento" style="transform:rotate(${a.wind_direction_10m + 180}deg)">↑</i></span>
          <span>💧 ${esc(t('lluvia'))} <b>${D.precipitation_probability_max?.[0] ?? '—'} %</b></span>
          ${D.uv_index_max?.[0] != null ? `<span>🕶️ ${esc(t('uv'))} <b>${Math.round(D.uv_index_max[0])}</b></span>` : ''}
        </div>
      </div>
      <div class="clima-dias">${D.time.map((_, i) => `
        <div class="clima-dia"><small>${esc(dia(i))}</small><span>${emoClima(D.weather_code[i])}</span>
          <b>${Math.round(D.temperature_2m_max[i])}°</b><small>${Math.round(D.temperature_2m_min[i])}°</small>
          <small class="clima-lluvia">💧${D.precipitation_probability_max[i] ?? 0}%</small><small>💨${Math.round(D.wind_speed_10m_max[i])}</small></div>`).join('')}</div>
      <p class="clima-fuente">Open-Meteo</p>`;
  } catch { caja.innerHTML = `<p class="vacio-chico">${esc(t('clima_error'))}</p>`; }
}

// ---------- reseñas ----------
let YO = null;
async function yo(forzar) { if (!YO || forzar) YO = await api('/api/yo').catch(() => ({ usuario: null, proveedores: [] })); return YO; }
const estrellasHtml = (n, tam = 16) => [1, 2, 3, 4, 5].map(i => `<span class="estrella ${i <= Math.round(n) ? 'llena' : ''}" style="font-size:${tam}px">★</span>`).join('');
async function cargarResenas(rutaId) {
  const caja = $('#resenas'); if (!caja) return;
  const [d, y] = await Promise.all([api('/api/resenas?ruta=' + encodeURIComponent(rutaId)).catch(() => null), yo()]);
  if (!d) { caja.remove(); return; }
  const mia = d.items.find(x => x.mia);
  let elegidas = mia?.estrellas || 0;
  const volver = location.hash.slice(1);
  caja.innerHTML = `<h2>${esc(t('resenas'))}</h2>
    ${d.total ? `<div class="res-resumen"><b>${String(d.promedio).replace('.', ',')}</b><div>${estrellasHtml(d.promedio, 20)}<small>${esc(tn('n_resenas', d.total))}</small></div></div>` : `<p class="vacio-chico">${esc(t('sin_resenas'))}</p>`}
    ${y.usuario ? `<form class="res-form" id="res-form">
        <label>${esc(mia ? t('editar_resena') : t('tu_resena'))}</label>
        <div class="res-estrellas" id="res-estrellas" role="radiogroup" aria-label="${esc(t('elegi_estrellas'))}">${[1, 2, 3, 4, 5].map(i => `<button type="button" role="radio" data-n="${i}" aria-checked="${i === elegidas}" aria-label="${i}">★</button>`).join('')}</div>
        <textarea id="res-texto" maxlength="600" rows="3" placeholder="${esc(t('tu_opinion'))}">${esc(mia?.texto || '')}</textarea>
        <button class="btn btn-ambar" type="submit">${esc(t('publicar'))}</button></form>`
      : `<a class="btn btn-tinta btn-ancho" href="#/cuenta?volver=${encodeURIComponent(volver)}">${ico('llave')}${esc(t('inicia_para_resenar'))}</a>`}
    <div class="res-lista">${d.items.map(x => `
      <article class="res-item"><div class="res-cab"><span class="avatar">${esc((x.nombre || '?').trim().charAt(0).toUpperCase())}</span>
        <div><b>${esc(x.nombre)}</b>${x.compro ? `<span class="chip chip-abierto chip-mini">${ico('tilde')}${esc(t('compro'))}</span>` : ''}<div>${estrellasHtml(x.estrellas, 14)} <small>${esc(new Date(x.fecha + 'T12:00:00Z').toLocaleDateString(idioma || 'es', { timeZone: 'UTC' }))}</small></div></div></div>
        ${x.texto ? `<p>${esc(x.texto)}</p>` : ''}</article>`).join('')}</div>`;
  const form = $('#res-form'); if (!form) return;
  const marcar = () => form.querySelectorAll('#res-estrellas button').forEach(b => { b.setAttribute('aria-checked', Number(b.dataset.n) === elegidas); b.classList.toggle('on', Number(b.dataset.n) <= elegidas); });
  marcar();
  $('#res-estrellas').onclick = e => { const b = e.target.closest('button'); if (!b) return; elegidas = Number(b.dataset.n); marcar(); };
  form.onsubmit = async e => {
    e.preventDefault();
    if (!elegidas) return toast(t('elegi_estrellas'));
    try {
      await api('/api/resenas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ruta: rutaId, estrellas: elegidas, texto: $('#res-texto').value }) });
      toast(t('gracias_resena')); cargarResenas(rutaId);
    } catch (err) { if (err.estado === 401) { YO = null; cargarResenas(rutaId); } else toast(t('sesion_error')); }
  };
}
function creditoFoto(f) {
  return f.autor ? `<a href="${/^https:\/\//.test(f.pagina || '') ? esc(f.pagina) : '#'}" target="_blank" rel="noopener noreferrer">${esc(t('foto_de', { autor: f.autor, licencia: f.licencia || '' }))}</a>` : '';
}
function perfil(traza, desnivel) {
  const pts = traza.filter(p => p[2] != null);
  const W = 640, H = 170, pad = 6;
  const kmTot = pts[pts.length - 1][3] ?? pts.length;
  const eles = pts.map(p => p[2]);
  const min = Math.min(...eles), max = Math.max(...eles);
  const rango = Math.max(max - min, 40);
  const x = (p, i) => pad + ((p[3] ?? i) / (kmTot || 1)) * (W - pad * 2);
  const y = p => H - 18 - ((p[2] - min) / rango) * (H - 40);
  const linea = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p, i).toFixed(1)},${y(p).toFixed(1)}`).join('');
  const area = `${linea}L${x(pts[pts.length - 1], pts.length - 1).toFixed(1)},${H}L${pad},${H}Z`;
  const imax = eles.indexOf(max);
  return `<div class="perfil"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('perfil'))}">
    <defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E58E1F" stop-opacity=".45"/><stop offset="1" stop-color="#E58E1F" stop-opacity=".03"/></linearGradient></defs>
    ${[0.25, 0.5, 0.75].map(f => `<line x1="0" x2="${W}" y1="${(H - 18) * f + 6}" y2="${(H - 18) * f + 6}" stroke="#0F2B2D" stroke-opacity=".07"/>`).join('')}
    <path d="${area}" fill="url(#gp)"/><path d="${linea}" fill="none" stroke="#E58E1F" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="${x(pts[imax], imax)}" cy="${y(pts[imax])}" r="4.5" fill="#fff" stroke="#0F2B2D" stroke-width="2"/>
    <text x="${Math.min(Math.max(x(pts[imax], imax), 40), W - 40)}" y="${Math.max(y(pts[imax]) - 10, 12)}" text-anchor="middle" font-size="13" font-weight="700" fill="#0F2B2D" font-family="Inter,sans-serif">${fmt(max)} m</text>
    </svg><div class="ejes"><span>0 km · ${fmt(pts[0][2])} m</span><span>${esc(t('desnivel'))} ↑ ${fmt(desnivel || Math.round(subida(pts)))} m</span><span>${fmt(Math.round(kmTot))} km · ${fmt(pts[pts.length - 1][2])} m</span></div></div>`;
}
function subida(pts) { let s = 0; for (let i = 1; i < pts.length; i++) { const d = pts[i][2] - pts[i - 1][2]; if (d > 0) s += d; } return s; }

function dibujarMapa(r) {
  if (mapa) { mapa.remove(); mapa = null; }
  if (!window.L || !$('#mapa')) return;
  mapa = L.map('mapa', { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(mapa);
  const gm = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=bicycling`;
  const popup = (titulo, texto, lat, lon) => `<b>${esc(titulo)}</b>${texto ? esc(texto) + '<br>' : ''}<a href="${gm(lat, lon)}" target="_blank" rel="noopener">${esc(t('como_ir'))} →</a>`;
  const grupoTraza = L.featureGroup().addTo(mapa);
  const linea = (r.traza || []).map(p => [p[0], p[1]]);
  if (linea.length > 1) {
    L.polyline(linea, { color: '#fff', weight: 8, opacity: .9 }).addTo(grupoTraza);
    L.polyline(linea, { color: '#E58E1F', weight: 4.5, opacity: 1 }).addTo(grupoTraza);
  }
  const pin = (color, letra) => L.divIcon({ className: '', html: `<div class="pin" style="background:${color}"><span>${letra}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });
  const punto = color => L.divIcon({ className: '', html: `<div class="punto" style="background:${color}"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
  if (r.inicio?.lat != null) L.marker([r.inicio.lat, r.inicio.lon], { icon: pin('#2F7A45', 'A') }).bindPopup(popup(t('largada') + ' · ' + r.inicio.nombre, '', r.inicio.lat, r.inicio.lon)).addTo(grupoTraza);
  if (r.fin?.lat != null && (Math.abs(r.fin.lat - r.inicio?.lat) > .002 || Math.abs(r.fin.lon - r.inicio?.lon) > .002))
    L.marker([r.fin.lat, r.fin.lon], { icon: pin('#0F2B2D', 'B') }).bindPopup(popup(t('llegada') + ' · ' + r.fin.nombre, '', r.fin.lat, r.fin.lon)).addTo(grupoTraza);
  const capas = {
    miradores: L.layerGroup((r.miradores || []).filter(m => m.lat != null).map(m => L.marker([m.lat, m.lon], { icon: punto('#E58E1F') }).bindPopup(popup(m.nombre, m.que_se_ve, m.lat, m.lon)))),
    descansos: L.layerGroup((r.descansos || []).filter(m => m.lat != null).map(m => L.marker([m.lat, m.lon], { icon: punto('#5E8C6A') }).bindPopup(popup(m.nombre, tv('v_desc', m.tipo), m.lat, m.lon)))),
  };
  const emoPin = k => L.divIcon({ className: '', html: `<div class="pin-emo" style="border-color:${COLOR_SERV[k]}">${EMO_SERV[k]}</div>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
  for (const k of TIPOS_SERV) capas[k] = L.layerGroup((r.servicios || []).filter(m => m.tipo === k && m.lat != null)
    .map(m => L.marker([m.lat, m.lon], { icon: emoPin(k) }).bindPopup(popup(m.nombre || m.marca || tv('v_serv', k), tv('v_serv', k), m.lat, m.lon))));
  for (const c of Object.values(capas)) c.addTo(mapa);
  $('#capas').onclick = e => {
    const b = e.target.closest('.capa'); if (!b) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on);
    on ? capas[b.dataset.capa].addTo(mapa) : mapa.removeLayer(capas[b.dataset.capa]);
  };
  const b = grupoTraza.getBounds();
  if (b.isValid()) mapa.fitBounds(b, { padding: [26, 26] }); else mapa.setView([r.inicio?.lat || 0, r.inicio?.lon || 0], 11);
  mapa.once('focus', () => mapa.scrollWheelZoom.enable());
  setTimeout(() => mapa && mapa.invalidateSize(), 200);
}

P.codigo = async q => {
  navegacion('codigo');
  const ps = await paises();
  const pre = q.get('producto');
  const { pais: prePais, prod: preProd } = pre ? buscarProducto(pre) : {};
  const irA = id => { const { pais, prod } = buscarProducto(id); return pais ? `#/pais/${pais.cc}/${prod.tema}` : '#/paises'; };
  const pintar = (msj = '') => {
    const mios = ps.flatMap(p => p.productos.filter(x => estaAbierto(x.id)).map(x => ({ cc: p.cc, ...x })));
    app.innerHTML = `<div class="ancho"><div class="codigo-caja">
      <div class="cabeza" style="padding-top:18px">${preProd ? `<a class="miga" href="${irA(pre)}">${ico('flecha')}${esc(nombreProducto(pre, prePais.cc))}</a>` : ''}</div>
      <div class="codigo-tarjeta">
        <div class="codigo-ico">${ico('llave')}</div>
        <h1>${esc(t('codigo_t'))}</h1><p>${esc(t('codigo_s'))}</p>
        ${msj}
        <form id="form" autocomplete="off">
          <label class="visually-hidden" for="cod">${esc(t('codigo'))}</label>
          <input class="campo-codigo" id="cod" name="cod" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="BV-XXXX-XXXX" maxlength="16">
          <p class="ayuda">${esc(t('codigo_ayuda'))}</p>
          <button class="btn btn-ambar btn-ancho" id="enviar">${ico('abierto')}${esc(t('canjear'))}</button>
        </form>
        ${preProd?.tienda && !estaAbierto(pre) ? `<a class="btn btn-claro btn-ancho" style="margin-top:10px" href="${preProd.tienda}" target="_blank" rel="noopener">${ico('bolsa')}${esc(t('conseguir'))}</a>` : ''}
      </div>
      <div class="mis-paises"><h2>${esc(t('mis_paises'))}</h2>
        ${mios.length ? mios.map(p => `<a class="mi-pais" href="${irA(p.id)}"><span>${bandera(p.cc, 22)}</span><span>${esc(nombreProducto(p.id, p.cc))}</span><span class="chip chip-abierto">${ico('abierto')}${esc(t('abierto'))}</span></a>`).join('')
          : `<p class="vacio" style="padding:10px 0;text-align:left">${esc(t('ninguno'))}</p>`}</div>
    </div></div>`;
    const campo = $('#cod');
    campo.oninput = () => {
      let v = campo.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (v.startsWith('BV')) v = [v.slice(0, 2), v.slice(2, 6), v.slice(6, 10)].filter(Boolean).join('-');
      campo.value = v; campo.classList.remove('mal');
    };
    $('#form').onsubmit = async e => {
      e.preventDefault();
      const codigo = campo.value.trim(); if (!codigo) return campo.focus();
      const btn = $('#enviar'); btn.disabled = true; btn.textContent = t('canjeando');
      try {
        const r = await api('/api/canjear', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ codigo, dispositivo: LS.get('dispositivo'), permiso: LS.get('permiso') }) });
        LS.set('permiso', r.permiso); LS.set('productos', r.productos);
        for (const k of Object.keys(PROV)) delete PROV[k];
        const { pais: np } = buscarProducto(r.nuevo);
        const nombre = nombreProducto(r.nuevo, np?.cc);
        pintar(`<div class="msj msj-bien">${esc(t('codigo_ok', { pais: nombre }))}</div>`);
        toast(t('codigo_ok', { pais: nombre }), t('ver_rutas'), () => location.hash = irA(r.nuevo));
      } catch (err) {
        const m = err.estado === 404 ? t('e_invalido') : err.estado === 409 ? t('e_lleno', { max: err.datos?.max || 3 }) : err.estado === 429 ? t('e_muchos') : t('e_red');
        pintar(`<div class="msj msj-mal">${esc(m)}</div>`);
        const c = $('#cod'); c.value = codigo; c.classList.add('mal');
      }
    };
  };
  pintar();
};

// Tienda: los mapas y los extras (upsells) de cada país. Tocar uno abre su landing o su checkout para comprarlo.
let TIENDA = null;
P.tienda = async q => {
  navegacion('tienda');
  const ps = await paises();
  TIENDA ||= (await api('contenido/tienda.json')).items;
  const det = LS.get('detectado');
  let cc = q.get('pais') || LS.get('pais') || det?.cc;
  const conItems = ps.filter(p => TIENDA.some(i => i.pais === p.cc));
  if (!conItems.some(p => p.cc === cc)) cc = conItems[0]?.cc;
  const tarjeta = i => {
    const tengo = i.producto_app && estaAbierto(i.producto_app);
    return `<a class="art ${i.tipo === 'mapa' ? 'art-mapa' : ''}" href="${esc(i.link)}" target="_blank" rel="noopener">
      <div class="art-tapa">${i.tapa ? `<img src="${i.tapa}" alt="" loading="lazy">` : ''}${tengo ? `<span class="chip chip-abierto">${ico('tilde')}${esc(t('ya_tienes'))}</span>` : ''}</div>
      <div class="art-cuerpo"><h3>${esc(i.titulo)}</h3><p>${esc(i.descripcion || '')}</p>
      <span class="art-btn">${esc(t('ver_tienda'))}${ico('ir')}</span></div></a>`;
  };
  const pintar = () => {
    const de = TIENDA.filter(i => i.pais === cc);
    const mapas = de.filter(i => i.tipo === 'mapa'), extras = de.filter(i => i.tipo !== 'mapa');
    app.innerHTML = `<div class="ancho">
      <div class="cabeza"><h1>${esc(t('tienda'))}</h1><p>${esc(t('tienda_sub'))}</p></div>
      <div class="filtros" id="paises-t">${conItems.map(p => `<button class="filtro filtro-pais" data-cc="${p.cc}" aria-pressed="${p.cc === cc}">${bandera(p.cc, 14)} ${esc(nombrePais(p.cc))}</button>`).join('')}</div>
      ${mapas.length ? `<h2 class="region-titulo">${esc(t('t_mapas'))}</h2><div class="grilla-tienda">${mapas.map(tarjeta).join('')}</div>` : ''}
      ${extras.length ? `<h2 class="region-titulo">${esc(t('t_extras'))}</h2><div class="grilla-tienda">${extras.map(tarjeta).join('')}</div>` : ''}
      <div style="height:20px"></div></div>`;
    $('#paises-t').onclick = e => { const b = e.target.closest('.filtro'); if (!b) return; cc = b.dataset.cc; pintar(); };
  };
  pintar();
};

P.ajustes = async () => {
  navegacion('ajustes');
  await paises();
  const pais = LS.get('pais');
  const v = await fetch('version.json').then(r => r.json()).catch(() => ({}));
  app.innerHTML = `<div class="ancho"><div class="cabeza" style="max-width:640px;margin:0 auto"><h1>${esc(t('ajustes'))}</h1></div>
    <div class="ajustes">
      <a class="fila" href="#/idioma"><span>${esc(t('idioma'))}<small>${esc(IDIOMAS.find(x => x.id === idioma)?.nombre)}</small></span>${ico('ir')}</a>
      <a class="fila" href="#/paises"><span>${esc(t('pais'))}<small>${pais ? esc(nombrePais(pais)) : '—'}</small></span>${ico('ir')}</a>
      <a class="fila" href="#/codigo"><span>${esc(t('mis_paises'))}<small>${abiertos().map(id => esc(nombreProducto(id, buscarProducto(id).pais?.cc))).join(' · ') || '—'}</small></span>${ico('ir')}</a>
      <a class="fila" href="#/cuenta"><span>${esc(t('cuenta_fila'))}<small>${esc((await yo()).usuario?.nombre || '—')}</small></span>${ico('ir')}</a>
      <a class="fila" href="#/inicio"><span>${esc(t('detectar_de_nuevo'))}</span>${ico('pin')}</a>
      <button class="fila" id="act"><span>${esc(t('buscar_act'))}<small>${esc(t('version'))} ${esc(v.version || '')} · ${esc(VERSION_CONTENIDO || '')}</small></span>${ico('recargar')}</button>
      <p class="pie">La Brújula Viajera · © OpenStreetMap · ${esc(t('aviso'))}</p>
    </div></div>`;
  $('#act').onclick = async () => { const hay = await buscarActualizacion(true); if (!hay) toast(t('al_dia')); };
};

const LOGO_G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const LOGO_F = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#fff" d="M24 12a12 12 0 10-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0024 12z"/></svg>';
P.cuenta = async q => {
  navegacion('ajustes');
  const y = await yo(true);
  const volver = q.get('volver') || '/ajustes';
  const enlace = prov => `/auth/${prov}?volver=${encodeURIComponent(volver.startsWith('/') ? volver : '/ajustes')}`;
  const hay = prov => y.proveedores.includes(prov);
  const NOMBRES = { google: 'Google', facebook: 'Facebook', p: 'prueba', prueba: 'prueba' };
  app.innerHTML = `<div class="ancho" style="max-width:560px">
    <div class="cabeza"><a class="miga" href="#/ajustes">${ico('flecha')}${esc(t('volver'))}</a><h1>${esc(t('cuenta'))}</h1><p>${esc(t('cuenta_sub'))}</p></div>
    ${y.usuario ? `<div class="cuenta-tarjeta"><span class="avatar grande">${esc(y.usuario.nombre.charAt(0).toUpperCase())}</span>
        <div><b>${esc(y.usuario.nombre)}</b><small>${esc(t('conectado_con', { p: NOMBRES[y.usuario.proveedor] || y.usuario.proveedor }))}</small></div></div>
        <button class="btn btn-claro btn-ancho" id="salir">${esc(t('salir'))}</button>`
    : `<div class="botones-login">
        ${hay('google') ? `<a class="btn-login google" href="${enlace('google')}">${LOGO_G}<span>${esc(t('entrar_google'))}</span></a>` : `<span class="btn-login google apagado">${LOGO_G}<span>${esc(t('entrar_google'))}<small>${esc(t('pronto'))}</small></span></span>`}
        ${hay('facebook') ? `<a class="btn-login facebook" href="${enlace('facebook')}">${LOGO_F}<span>${esc(t('entrar_facebook'))}</span></a>` : `<span class="btn-login facebook apagado">${LOGO_F}<span>${esc(t('entrar_facebook'))}<small>${esc(t('pronto'))}</small></span></span>`}
        ${hay('prueba') ? `<a class="btn-login prueba" href="${enlace('prueba')}">${ico('llave')}<span>${esc(t('entrar_prueba'))}</span></a>` : ''}
      </div>
      <p class="nota-insta">📸 ${esc(t('insta_nota'))}</p>`}
  </div>`;
  const s = $('#salir');
  if (s) s.onclick = async () => { await fetch('/auth/salir', { method: 'POST' }); YO = null; P.cuenta(q); };
};

// ---------- Turismo: locales que pagan su lugar y ofrecen beneficios a ciclistas ----------
const EMO_LOCAL = { cafeteria: '☕', restaurante: '🍽️', alojamiento: '🛏️', taller: '🔧', tienda: '🛍️', experiencia: '🧭', otro: '📍' };
const tarjetaLocal = l => `
  <a class="local" href="#/local/${encodeURIComponent(l.id)}">
    <div class="local-foto">${l.fotos?.[0] ? `<img src="${l.fotos[0]}" alt="" loading="lazy">` : `<span class="local-emo">${EMO_LOCAL[l.tipo] || '📍'}</span>`}
      ${l.ejemplo ? `<span class="chip chip-ejemplo">${esc(t('ejemplo'))}</span>` : ''}</div>
    <div class="local-cuerpo">
      <small>${EMO_LOCAL[l.tipo] || '📍'} ${esc(tv('tipos_local', l.tipo))}${l.km != null ? ' · ' + esc(t('a_km', { n: fmt(l.km) })) : ''}</small>
      <h3>${esc(l.nombre)}</h3>
      ${l.promo?.titulo ? `<div class="local-promo">🎁 ${esc(l.promo.titulo)}</div>` : ''}
      ${l.total ? `<div class="local-res">${estrellasHtml(l.promedio, 13)} <small>${String(l.promedio).replace('.', ',')} (${l.total})</small></div>` : ''}
    </div></a>`;
async function localesCerca(lat, lon) {
  const caja = $('#cerca-ruta'); if (!caja) return;
  const d = await api(`/api/turismo?lat=${lat}&lon=${lon}&radio=40`).catch(() => null);
  if (!d?.locales?.length) return;
  caja.hidden = false;
  caja.innerHTML = `<h2>🎁 ${esc(t('cerca_ruta'))}</h2><div class="grilla-locales chica">${d.locales.slice(0, 4).map(tarjetaLocal).join('')}</div>`;
}
P.turismo = async q => {
  navegacion('turismo');
  const det = LS.get('detectado');
  let tipo = q.get('tipo') || '';
  app.innerHTML = `<div class="ancho"><div class="cabeza"><h1>${esc(t('turismo'))}</h1><p>${esc(t('tur_sub'))}</p></div><div class="giro" style="margin:40px auto"></div></div>`;
  let pos = det?.lat != null ? { lat: det.lat, lon: det.lon } : null;
  if (!pos && navigator.geolocation) pos = await new Promise(ok => navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lon: p.coords.longitude }), () => ok(null), { timeout: 6000, maximumAge: 600000 }));
  const d = await api('/api/turismo' + (pos ? `?lat=${pos.lat}&lon=${pos.lon}` : '')).catch(() => ({ locales: [], precio_usd: 20 }));
  const pintar = () => {
    const tipos = [...new Set(d.locales.map(l => l.tipo))];
    const lista = d.locales.filter(l => !tipo || l.tipo === tipo);
    app.innerHTML = `<div class="ancho">
      <div class="cabeza"><h1>${esc(t('turismo'))}</h1><p>${esc(t('tur_sub'))}</p></div>
      ${tipos.length > 1 ? `<div class="filtros" id="f-tipo"><button class="filtro" data-t="" aria-pressed="${!tipo}">${esc(t('todos'))}</button>${tipos.map(k => `<button class="filtro" data-t="${k}" aria-pressed="${tipo === k}">${EMO_LOCAL[k] || ''} ${esc(tv('tipos_local', k))}</button>`).join('')}</div>` : ''}
      ${lista.length ? `<div class="grilla-locales">${lista.map(tarjetaLocal).join('')}</div>` : `<p class="vacio-chico" style="margin:10px 0 24px">${esc(t('tur_vacio'))}</p>`}
      <div class="sumar-local"><div><h2>🏪 ${esc(t('tur_sumar'))}</h2><p>${esc(t('tur_sumar_sub', { p: d.precio_usd || 20 }))}</p></div>
        <a class="btn btn-ambar" href="#/turismo/sumar">${esc(t('tur_sumar_btn'))}${ico('ir')}</a></div>
    </div>`;
    const f = $('#f-tipo'); if (f) f.onclick = e => { const b = e.target.closest('.filtro'); if (!b) return; tipo = b.dataset.t; pintar(); };
  };
  pintar();
};
let relojPase;
P.local = async (q, id) => {
  navegacion('turismo');
  let l; try { l = await api('/api/turismo/' + encodeURIComponent(id || '')); } catch { location.hash = '#/turismo'; return; }
  const gm = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  app.innerHTML = `
    <section class="det-portada local-portada">
      <div class="galeria" id="galeria">${l.fotos.length ? l.fotos.map(f => `<figure><img src="${f}" alt=""></figure>`).join('') : `<figure class="sin-foto"><span>${EMO_LOCAL[l.tipo] || '📍'}</span></figure>`}</div>
      <div class="ancho"><a class="volver portada-volver" href="#/turismo" style="align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:8px 14px 8px 10px;border-radius:999px;background:rgba(8,26,28,.45);backdrop-filter:blur(8px);font-size:14px;font-weight:600;text-decoration:none;color:#fff">${ico('flecha', 'width="18" height="18"')}${esc(t('turismo'))}</a>
        <div>${l.ejemplo ? `<span class="chip chip-ejemplo" style="margin-bottom:10px">${esc(t('ejemplo'))}</span>` : ''}
          <span class="chip chip-claro" style="margin-bottom:10px">${EMO_LOCAL[l.tipo] || '📍'} ${esc(tv('tipos_local', l.tipo))}</span>
          <h1>${esc(l.nombre)}</h1>${l.total ? `<div class="local-res claro">${estrellasHtml(l.promedio, 16)} <small>${String(l.promedio).replace('.', ',')} · ${esc(tn('n_resenas', l.total))}</small></div>` : ''}</div></div>
    </section>
    <div class="ancho" style="max-width:820px;display:grid;gap:22px;padding-top:22px">
      ${l.promo?.titulo ? `<div class="promo-tarjeta"><small>🎁 ${esc(t('promo'))}</small><h2>${esc(l.promo.titulo)}</h2>${l.promo.detalle ? `<p>${esc(l.promo.detalle)}</p>` : ''}
        <button class="btn btn-ambar btn-ancho" id="pase">${ico('tilde')}${esc(t('mostrar_pase'))}</button></div>` : ''}
      ${l.descripcion ? `<div class="bloque"><p>${esc(l.descripcion)}</p></div>` : ''}
      <div class="local-datos">
        ${l.horario ? `<div><small>🕒 ${esc(t('horario'))}</small><b>${esc(l.horario)}</b></div>` : ''}
        ${l.direccion ? `<div><small>📍 ${esc(t('direccion'))}</small><b>${esc(l.direccion)}</b></div>` : ''}
      </div>
      <div class="local-botones">
        <a class="btn btn-tinta" href="${gm(l.lat, l.lon)}" target="_blank" rel="noopener">${ico('pin')}${esc(t('como_ir'))}</a>
        ${l.whatsapp ? `<a class="btn btn-wa" href="https://wa.me/${encodeURIComponent(l.whatsapp.replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener">💬 ${esc(t('whatsapp'))}</a>` : ''}
        ${l.instagram ? `<a class="btn btn-claro" href="https://www.instagram.com/${encodeURIComponent(l.instagram)}/" target="_blank" rel="noopener">📸 Instagram</a>` : ''}
        ${/^https:\/\//.test(l.web || '') ? `<a class="btn btn-claro" href="${esc(l.web)}" target="_blank" rel="noopener noreferrer">🌐 ${esc(t('web'))}</a>` : ''}
      </div>
      <div class="mapa-caja"><div id="mapa" style="height:260px"></div></div>
      <div class="bloque resenas" id="resenas"><h2>${esc(t('resenas'))}</h2><div class="giro"></div></div>
    </div>`;
  if (mapa) { mapa.remove(); mapa = null; }
  if (window.L) {
    mapa = L.map('mapa', { scrollWheelZoom: false }).setView([l.lat, l.lon], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(mapa);
    L.marker([l.lat, l.lon], { icon: L.divIcon({ className: '', html: `<div class="pin-emo" style="border-color:#E58E1F">${EMO_LOCAL[l.tipo] || '📍'}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(mapa);
  }
  const b = $('#pase');
  if (b) b.onclick = () => {
    abrirHoja(`<div class="pase"><img src="img/logo.svg" alt="" width="54" height="54"><small>La Brújula Viajera · ${esc(t('pase_valido'))}</small>
      <h2>${esc(l.promo.titulo)}</h2><p>${esc(l.nombre)}</p><div class="pase-reloj" id="pase-reloj"></div><div class="pase-onda"></div>
      <p class="pase-nota">${esc(t('pase_nota'))}</p><button class="btn btn-claro btn-ancho" data-cerrar>${esc(t('volver'))}</button></div>`);
    const tic = () => { const r = $('#pase-reloj'); if (!r) return clearInterval(relojPase); r.textContent = new Date().toLocaleString(idioma || 'es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
    clearInterval(relojPase); tic(); relojPase = setInterval(tic, 1000);
  };
  cargarResenas('local/' + l.id);
};
P.sumarLocal = async () => {
  navegacion('turismo');
  const puntos = t('sumar_puntos');
  app.innerHTML = `<div class="ancho" style="max-width:640px">
    <div class="cabeza"><a class="miga" href="#/turismo">${ico('flecha')}${esc(t('turismo'))}</a><h1>${esc(t('sumar_titulo'))}</h1><p>${esc(t('tur_sumar_sub', { p: 20 }))}</p></div>
    <ul class="sumar-puntos">${(Array.isArray(puntos) ? puntos : []).map(x => `<li>${ico('tilde')}${esc(x)}</li>`).join('')}</ul>
    <form class="form-sumar" id="form-sumar">
      <label>${esc(t('f_negocio'))}<input name="negocio" maxlength="80" required autocomplete="organization"></label>
      <label>${esc(t('f_ciudad'))}<input name="ciudad" maxlength="80" autocomplete="address-level2"></label>
      <label>${esc(t('f_contacto'))}<input name="contacto" maxlength="120" required autocomplete="tel"></label>
      <label>${esc(t('f_mensaje'))}<textarea name="mensaje" maxlength="800" rows="4"></textarea></label>
      <button class="btn btn-ambar btn-ancho" type="submit">${esc(t('enviar'))}</button>
    </form></div>`;
  $('#form-sumar').onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)); f.idioma = idioma;
    if ((f.negocio || '').trim().length < 2 || (f.contacto || '').trim().length < 5) return toast(t('faltan_datos'));
    try { await api('/api/turismo-solicitud', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) }); toast(t('enviado')); location.hash = '#/turismo'; }
    catch { toast(t('sesion_error')); }
  };
};

// ---------- router ----------
async function enrutar() {
  cerrarHoja();
  const [ruta, qs] = location.hash.slice(1).split('?');
  const q = new URLSearchParams(qs || '');
  const partes = (ruta || '/').split('/').filter(Boolean);
  document.body.classList.remove('sin-nav'); $('#barra').hidden = false;
  if (!idioma && partes[0] !== 'inicio' && partes[0] !== 'idioma') { location.hash = '#/inicio'; return; }
  document.documentElement.lang = idioma || 'es';
  if (partes[0] !== 'ruta' && mapa) { mapa.remove(); mapa = null; }
  app.innerHTML = '<div class="cargando"><div class="giro"></div></div>';
  try {
    if (!partes.length) location.hash = '#/paises';
    else if (partes[0] === 'inicio') await P.inicio(q);
    else if (partes[0] === 'idioma') await P.idioma(q);
    else if (partes[0] === 'paises') await P.paises(q);
    else if (partes[0] === 'pais' && partes.length === 2) await P.productos(q, partes[1].toUpperCase());
    else if (partes[0] === 'pais' && partes.length === 3) await P.pais(q, partes[1].toUpperCase(), partes[2]);
    else if (partes[0] === 'pais' && partes.length === 4) await P.provincia(q, partes[1].toUpperCase(), partes[2], partes[3]);
    else if (partes[0] === 'ruta') await P.ruta(q, partes[1].toUpperCase(), partes[2], partes[3], partes[4]);
    else if (partes[0] === 'codigo') await P.codigo(q);
    else if (partes[0] === 'tienda') await P.tienda(q);
    else if (partes[0] === 'ajustes') await P.ajustes(q);
    else if (partes[0] === 'cuenta') await P.cuenta(q);
    else if (partes[0] === 'turismo' && partes[1] === 'sumar') await P.sumarLocal(q);
    else if (partes[0] === 'turismo') await P.turismo(q);
    else if (partes[0] === 'local') await P.local(q, partes[1]);
    else location.hash = '#/paises';
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="ancho"><p class="vacio">${esc(t('e_red'))}</p><p style="text-align:center"><button class="btn btn-tinta" onclick="location.reload()">${ico('recargar')}${esc(t('actualizar'))}</button></p></div>`;
  }
  if (!partes.length || partes[0] !== 'ruta') scrollTo(0, 0); else scrollTo(0, 0);
}
addEventListener('hashchange', enrutar);

// ---------- actualizaciones: la app se renueva sola desde el servidor ----------
let registro = null;
async function buscarActualizacion(manual = false) {
  let hay = false;
  try {
    const v = await api('/api/version');
    const antes = LS.get('contenido');
    if (antes && v.contenido !== antes) {
      hay = true; PAISES = null; for (const k of Object.keys(INDICES)) delete INDICES[k]; for (const k of Object.keys(PROV)) delete PROV[k];
      navigator.serviceWorker?.controller?.postMessage('limpiar-contenido');
      toast(v.novedad || t('nueva_version'), t('actualizar'), () => enrutar());
    }
    LS.set('contenido', v.contenido);
    if (registro) { await registro.update(); if (registro.waiting) { hay = true; ofrecerNueva(registro.waiting); } }
    if (LS.get('permiso')) { const p = await api('/api/permiso'); LS.set('productos', p.productos); }
  } catch {}
  return hay;
}
function ofrecerNueva(sw) { toast(t('nueva_version'), t('actualizar'), () => sw.postMessage('saltar'), true); }
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    registro = reg;
    if (reg.waiting && navigator.serviceWorker.controller) ofrecerNueva(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo?.addEventListener('statechange', () => { if (nuevo.state === 'installed' && navigator.serviceWorker.controller) ofrecerNueva(nuevo); });
    });
  }).catch(() => {});
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargando) { recargando = true; location.reload(); } });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') buscarActualizacion(); });

avisoRed();
enrutar();
setTimeout(buscarActualizacion, 1500);
