// Códigos de desbloqueo de La Brújula Viajera.
// Cada código abre UN producto (tema + país), definido en datos/productos.json.
//   node herramientas/codigos.mjs generar ciclismo-ar 10 [nota] → 10 códigos del «Mapa Ciclismo Argentina»
//   node herramientas/codigos.mjs productos                      → lista de productos
//   node herramientas/codigos.mjs lista [ciclismo-ar]     → todos los códigos, con uso
//   node herramientas/codigos.mjs baja BV-AR-XXXX-XXXX    → lo da de baja (reembolso); deja de abrir en todos los dispositivos
//   node herramientas/codigos.mjs alta BV-AR-XXXX-XXXX    → lo vuelve a activar
//   node herramientas/codigos.mjs liberar BV-AR-XXXX-XXXX → borra sus dispositivos (cliente que cambió de celular)
import fs from 'node:fs';
import { leerCodigos, guardarCodigos, nuevoCodigo } from '../servidor.mjs';
const PRODUCTOS = JSON.parse(fs.readFileSync(new URL('../datos/productos.json', import.meta.url), 'utf8'));
const [, , orden, a, b, ...resto] = process.argv;
const VALIDOS = Object.keys(PRODUCTOS);
const db = leerCodigos();
const buscar = c => Object.keys(db.codigos).find(k => k.replace(/-/g, '') === String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
if (orden === 'generar') {
  const p = String(a || '').toLowerCase();
  if (!VALIDOS.includes(p)) { console.log('Producto inválido. Usá:', VALIDOS.join(', ')); process.exit(1); }
  const n = Math.min(Number(b || 1), 1000);
  const nota = resto.join(' ') || null;
  for (let i = 0; i < n; i++) console.log(nuevoCodigo(p, nota ? { nota } : {}));
} else if (orden === 'lista') {
  const filtro = (a || '').toLowerCase();
  for (const [k, c] of Object.entries(db.codigos)) if (!filtro || c.producto === filtro)
    console.log(k, c.activo ? 'activo' : 'BAJA', `${c.dispositivos.length} disp.`, c.mail || '', c.pedido || '', c.nota || '');
} else if (orden === 'productos') {
  for (const [k, v] of Object.entries(PRODUCTOS)) console.log(k.padEnd(18), v.nombre, v.estado === 'proximamente' ? '(próximamente)' : '');
} else if (['baja', 'alta', 'liberar'].includes(orden)) {
  const k = buscar(a);
  if (!k) { console.log('No existe ese código'); process.exit(1); }
  if (orden === 'baja') db.codigos[k].activo = false;
  if (orden === 'alta') db.codigos[k].activo = true;
  if (orden === 'liberar') db.codigos[k].dispositivos = [];
  guardarCodigos(db);
  console.log(orden, k, 'ok');
} else {
  console.log('Órdenes: productos · generar <producto> <cantidad> [nota] · lista [país] · baja <código> · alta <código> · liberar <código>');
}
