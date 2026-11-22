// Sube la versión de la app antes de publicar: node herramientas/version.mjs "Texto de la novedad (opcional)"
// Cambia public/version.json y la línea VERSION de public/sw.js → los celulares ven «Hay una versión nueva · Actualizar».
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const v = JSON.parse(fs.readFileSync(path.join(PUB, 'version.json'), 'utf8'));
const base = (v.version || '1.0.0').split('-')[0];
const [M, m, p] = base.split('.').map(Number);
const d = new Date(), z = n => String(n).padStart(2, '0');
const nueva = `${M}.${m}.${p + 1}-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}${z(d.getHours())}${z(d.getMinutes())}`;
fs.writeFileSync(path.join(PUB, 'version.json'), JSON.stringify({ version: nueva, novedad: process.argv[2] || null }, null, 1) + '\n');
const sw = path.join(PUB, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const VERSION = '[^']*';/, `const VERSION = '${nueva}';`));
console.log('versión', nueva);
