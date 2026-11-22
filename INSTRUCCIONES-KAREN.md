# La Brújula Viajera · instrucciones para sumar productos (para el Claude de Karen)

App de mapas de rutas que se vende **por producto = tema × país** («Mapa Ciclismo Argentina», «Mapa Motociclismo
Argentina»…). Cada producto se abre con su propio código. Hoy hay 4 mapas de ciclismo (AR, PE, PT, BR) con 288 rutas reales
y `motociclismo-ar` figura como «Próximamente». Tu trabajo: **sumar los productos de motociclismo (y otros temas) y más
productos a la sección Tienda**.

Leé primero `app/README.md` (cómo está armada) y `SEGURIDAD.md`.

## 1. Probar en tu PC
Necesitás Node 24 y Python 3 con Pillow (`pip install pillow`).
```
cd app
set BV_LOGIN_PRUEBA=1
set BV_EJEMPLOS=1
node servidor.mjs          → http://localhost:8860
```
Para abrir rutas pagas en local: `node herramientas/codigos.mjs generar motociclismo-ar 1 prueba` y canjealo en la
pantalla «Código». Los códigos de prueba quedan en `app/.datos/` (es local, no se comparte).

## 2. Sumar un producto nuevo de rutas (ej. Mapa Motociclismo Argentina)
1. **Rutas reales, nunca inventadas.** Cada dato (km, desnivel, coordenadas, servicios) sale de una fuente verificable
   (OpenStreetMap, Wikipedia, organismos oficiales) y se anota en `fuentes_km`, `fuente_coord`, `traza_fuente`.
2. Armá los datos con el **mismo formato** que las rutas en bici: un JSON por región con una lista de provincias:
   `provincia, slug, region, frase, como_llegar, mejor_epoca, tene_en_cuenta, rutas[]`, y cada ruta con
   `nombre, estrella, resumen, superficie, nivel, dias, km, desnivel_m, inicio{nombre,lat,lon}, fin{…}, tramos[], descansos[],
   miradores[], ojo, fotos[], traza[[lat,lon,altura,km],…], servicios[]` (estaciones de servicio, gomerías, talleres).
   Para motos, el campo `bici` se reemplaza por el tipo de moto sugerido (`moto`: «trail», «ruta», «enduro»…).
   Ejemplo completo para copiar: `app/datos/ejemplo-ruta.json` (la ruta de muestra gratis). Las rutas pagas de ciclismo
   no están en este repositorio: viven en el servidor.
3. `app/herramientas/armar_contenido.py` hoy tiene `TEMA = "ciclismo"` fijo y lee las carpetas `RUTAS EN BICI <PAÍS>`.
   Adaptalo para recibir el tema (`--tema motociclismo`) y su carpeta de datos, sin romper ciclismo. Genera
   `public/contenido/…` (lo público) y `datos/<tema>/<cc>/…` (lo protegido, solo con código).
4. En `app/datos/productos.json` el producto pasa de `"estado": "proximamente"` a activo, con su `impultienda` (ID del
   producto en la tienda) y `tienda` (link de la landing). Sacalo de `PROXIMOS` en `armar_contenido.py`.
5. Emoji del tema en `public/app.js` (`temaEmoji`) y textos nuevos en los 6 idiomas de `public/i18n.js` (es, en, pt, fr, it, de).

## 3. Sumar productos a la Tienda
1. Agregalos en `app/datos/tienda-fuente.json` (`id, pais, tipo: mapa|extra, titulo, descripcion, tapa, link, impultienda`,
   y `producto_app` si abre un mapa). La `tapa` es una imagen real del producto (mockup), nunca un recuadro vacío.
2. `py herramientas/armar_tienda.py` arma la sección. Mapas → su landing; extras → `https://<tienda>/checkout?p=<id>`.
3. Los precios y links los confirma el dueño: no inventar precios, reseñas ni datos.

## 4. Antes de entregar
- `node herramientas/version.mjs` (así la app instalada muestra «Hay una versión nueva · Actualizar»).
- `py herramientas/capturas.py` → revisar en PC (1366) y celular (390) que no haya scroll de costado ni textos cortados.
- Probar que el código de un producto **no** abre otro producto.
- **Nunca** poner claves, tokens ni contraseñas en el código; nunca tocar `servidor.mjs` en la parte de seguridad
  (códigos, cookies, cabeceras) sin explicarlo.

## 5. Cómo se publica
El repositorio es público (se entra con el link) pero solo el dueño publica. El camino es:
1. Hacé un **fork** del repositorio con tu cuenta de GitHub y trabajá en tu fork, en una rama por tarea
   (`motos-argentina`, `tienda-nuevos`…).
2. Cuando esté listo, abrí un **pull request** al repositorio del dueño, con una lista corta de qué cambió y por qué.
3. El Claude del dueño lo revisa, lo une y lo publica en el servidor. Los celulares con la app lo reciben solos, sin reinstalar.

Como el repositorio es público, **las rutas pagas completas nunca se suben acá**. Los JSON de rutas nuevas (`datos/<tema>/…`)
van aparte: subilos en privado al dueño (zip por Drive o WhatsApp). En el pull request van solo el código, las tapas y un ejemplo.
