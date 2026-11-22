# La Brújula Viajera — app

App de rutas por país (hoy: **Mapa Ciclismo** de Argentina, Perú, Portugal y Brasil, 288 rutas reales sacadas de
`Productos/RUTAS EN BICI */_build/datos`). Armada el 2026-11-21 en la PC Yassin. Estado: **anda en localhost**; sin publicar.

**Stack (decisión):** web app instalable (PWA, sin frameworks) servida por Node desde el servidor del negocio, y para las
tiendas un envoltorio **Capacitor** que abre esa misma dirección. Así cada cambio que se sube al servidor llega solo a
Android, iPhone y web, sin reinstalar ni pasar por Google Play o App Store.

## Cómo se usa
1. Al abrir: pide la ubicación (GPS) → país y provincia más cercanos → idioma de ese país. Sin GPS: país por IP (si el
   servidor está detrás de Cloudflare) o por la zona horaria del celular. Siempre se puede elegir otro idioma.
2. País → **mapas (productos) del país**: «Mapa Ciclismo Argentina», «Mapa Motociclismo Argentina» (próximamente)…
3. Mapa → provincia/región/distrito/estado (con buscador, filtro por región y «Cerca de ti») → rutas → detalle con mapa OSM,
   perfil de altura, tramos, miradores, paradas, servicios y «Abrir la largada en Google Maps».
4. **Un código por producto**: cada código abre un solo mapa (p. ej. `ciclismo-ar`). Una ruta de muestra gratis por mapa.
5. **Tienda**: los mapas y los extras (upsells) de cada país, con su tapa; tocar uno abre la landing o el checkout `?p=<id>`.
6. Idiomas de la app: español, inglés, portugués, francés, italiano y alemán (`public/i18n.js`). El texto de las rutas
   está en el idioma del país (AR/PE español, PT/BR portugués) y la app lo avisa.

## Probar en local
`.claude/launch.json` → **brujula-viajera** (http://localhost:8860), o `node servidor.mjs`.
```
node herramientas/codigos.mjs productos                  # lista de productos (datos/productos.json)
node herramientas/codigos.mjs generar ciclismo-ar 5      # 5 códigos BV-XXXX-XXXX del Mapa Ciclismo Argentina
node herramientas/codigos.mjs lista ciclismo-ar
node herramientas/codigos.mjs baja BV-XXXX-XXXX          # reembolso: deja de abrir en todos los dispositivos
node herramientas/codigos.mjs liberar BV-XXXX-XXXX       # cliente cambió de celular
py herramientas/capturas.py BV-XXXX-XXXX                  # capturas PC 1366 y celu 390 en ../capturas (y prueba el canje)
```

## Piezas
| Pieza | Qué es |
|---|---|
| `servidor.mjs` | Node 24 sin dependencias: archivos, `/api/donde` (GPS → país/provincia), `/api/canjear`, `/api/permiso`, `/api/provincia/<tema>/<cc>/<slug>` (protegido), `/hook/impultienda` (venta → código) |
| `datos/productos.json` | catálogo de productos: tema, país, ids de Impultienda que lo venden |
| `datos/<tema>/<cc>/*.json` | rutas completas (NO públicas: solo salen con un permiso válido; la ruta de muestra sale sin permiso) |
| `datos/tienda-fuente.json` | productos de la Tienda (mapas y extras) con link y tapa → `herramientas/armar_tienda.py` |
| `public/` | la app: `index.html`, `app.js`, `app.css`, `i18n.js`, `sw.js` (sin conexión + actualizaciones), íconos, Leaflet y letras locales |
| `public/contenido/` | `paises.json`, `tienda.json`, `<tema>/<cc>/indice.json` (lista pública de rutas) y fotos webp |
| `.datos/` | códigos canjeados y clave de firma (solo en la máquina que corre el servidor; nunca al cerebro ni a git) |
| `capacitor.config.json` | envoltorio Android/iPhone apuntando al servidor |

## Seguridad de los códigos
- `BV-XXXX-XXXX` al azar (31^8 ≈ 850 mil millones), guardados en el servidor con su producto; el código no dice qué abre.
- Cada código vale en **3 dispositivos** (`BV_MAX_DISPOSITIVOS`). Al canjear, el servidor da un permiso firmado (HMAC) atado
  al dispositivo; las rutas se piden con ese permiso y el servidor vuelve a mirar que el código siga activo (baja = sin acceso).
- 20 intentos de canje cada 10 minutos por IP.

## Actualizar sin reinstalar
- Rutas nuevas: `py herramientas/armar_contenido.py` → cambia la versión de contenido; la app lo detecta y recarga los datos.
- App nueva: `node herramientas/version.mjs "texto"` → cambia `sw.js`; el celular muestra «Hay una versión nueva · Actualizar».
- Producto nuevo (p. ej. motociclismo-ar): sumarlo a `datos/productos.json`, sus datos en `datos/motociclismo/ar/`, su índice en
  `public/contenido/motociclismo/ar/` y su entrada en `paises.json` (hoy figura como «próximamente», sin rutas).

## Secciones nuevas (2026-11-21)
- **Países bloqueados:** el país detectado (o el primero que elige quien no tiene ubicación) queda libre; los demás salen con candado
  hasta canjear el código de uno de sus mapas.
- **Clima** en cada ruta (en la largada, hoy y 5 días: temperatura, viento, lluvia, UV). Open-Meteo, sin clave, por `/api/clima` con caché de 30 min.
- **En el camino:** estaciones de servicio, gomerías y bicicleterías de cada ruta, en el mapa (capas con emoji) y en lista con «Cómo ir».
- **Cuenta y reseñas:** inicio de sesión con Google o Facebook (Instagram ya no permite iniciar sesión en otras apps). Reseñas de
  1 a 5 estrellas en cada ruta y cada local; marca «Tiene el mapa» si quien opina tiene el código. Moderar: `node herramientas/resenas.mjs`.
- **Turismo:** locales y servicios que pagan USD 20 por mes (los cobra el dueño a mano; después `locales.py alta` o `renovar`; seguimiento con `vencen` y `pedidos`). `py herramientas/locales.py alta ficha.json | renovar <id> <meses> | baja <id> | lista`.
  Cada local tiene fotos, promo para ciclistas con «pase» en pantalla (reloj en vivo), WhatsApp, Instagram, web, mapa y reseñas;
  aparece también en «Beneficios cerca de esta ruta» (40 km). El formulario «Quiero sumar mi local» guarda los pedidos en
  `.datos/solicitudes-turismo.jsonl`. El local `[EJEMPLO]` solo se ve con `BV_EJEMPLOS=1` en la PC.

## Variables del servidor
`BV_URL` (https del dominio) · `BV_PROXY=1` (detrás de Caddy) · `BV_SECRETO` · `IMPULTIENDA_FIRMA` · `GOOGLE_ID` / `GOOGLE_SECRETO` ·
`FACEBOOK_ID` / `FACEBOOK_SECRETO`. Solo en la PC: `BV_LOGIN_PRUEBA=1`, `BV_EJEMPLOS=1` (se apagan solas con `BV_URL` en https).
Revisión de seguridad completa: `../SEGURIDAD.md`.

## Pendiente (ver ficha `Cerebro/wiki/productos/la-brujula-viajera.md`)
Publicar en el servidor, conectar el webhook de Impultienda y el mail del código, Android/iOS y tiendas (cuentas del dueño).
Mapa base: hoy usa los mosaicos públicos de OpenStreetMap (sirve para pruebas; con tráfico real hay que pasar a mosaicos
propios con Protomaps como la app de Viajando, que además anda sin conexión).
