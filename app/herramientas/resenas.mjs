// Moderar reseñas de La Brújula Viajera (rutas y locales de Turismo).
//   node herramientas/resenas.mjs lista [ruta]            ej.: ciclismo/ar/neuquen-0  o  local/cafe-la-posta-neuquen
//   node herramientas/resenas.mjs ocultar <ruta> <usuario>  (usuario = g:… / f:… que muestra la lista; no se borra)
//   node herramientas/resenas.mjs mostrar <ruta> <usuario>
//   node herramientas/resenas.mjs bloquear <usuario>       (no puede volver a entrar ni reseñar)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const PRIV = process.env.BV_DATOS || path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), '.datos');
const R = path.join(PRIV, 'resenas.json'), U = path.join(PRIV, 'usuarios.json');
const leer = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const guardar = (f, v) => { fs.writeFileSync(f + '.tmp', JSON.stringify(v, null, 1)); fs.renameSync(f + '.tmp', f); };
const [cmd, a, b] = process.argv.slice(2);
const db = leer(R);
if (cmd === 'lista') {
  for (const [ruta, lista] of Object.entries(db)) if (!a || ruta === a)
    for (const r of lista) console.log(`${ruta}  ${r.u}  ${'★'.repeat(r.estrellas)}  ${r.oculta ? '[OCULTA] ' : ''}${r.nombre}: ${r.texto}`);
} else if (cmd === 'ocultar' || cmd === 'mostrar') {
  const r = (db[a] || []).find(x => x.u === b);
  if (!r) { console.log('no existe'); process.exit(1); }
  r.oculta = cmd === 'ocultar'; guardar(R, db); console.log(cmd, a, b);
} else if (cmd === 'bloquear') {
  const u = leer(U); if (!u[a]) { console.log('no existe'); process.exit(1); }
  u[a].bloqueado = true; guardar(U, u);
  for (const lista of Object.values(db)) for (const r of lista) if (r.u === a) r.oculta = true;
  guardar(R, db); console.log('bloqueado', a);
} else console.log('uso: lista [ruta] | ocultar <ruta> <usuario> | mostrar <ruta> <usuario> | bloquear <usuario>');
