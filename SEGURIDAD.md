# La Brújula Viajera · revisión de seguridad (2026-11-21)

Revisión hecha como atacante, sobre la app en la PC (localhost:8860), con pedidos reales armados a mano.

## Lo que se intentó y cómo terminó

| Ataque | Resultado |
|---|---|
| Leer archivos del servidor (`/../servidor.mjs`, `/.datos/secreto`, `/datos/...`) | Bloqueado: devuelve la portada o «no» |
| Ver rutas pagas sin código (`/api/provincia/...`) | Bloqueado: solo llega la ruta de muestra |
| Permiso falsificado o con la firma cambiada | Bloqueado: firma HMAC verificada |
| Código de Argentina para abrir Perú | Bloqueado: cada código abre solo su producto |
| Adivinar códigos a fuerza bruta | 31^8 ≈ 850.000 millones de combinaciones y 20 intentos cada 10 min por IP |
| **Saltar el freno mintiendo la IP (X-Forwarded-For)** | **Era posible → arreglado**: solo se cree en esa cabecera detrás de nuestro Caddy (`BV_PROXY=1`) |
| Publicar reseña sin sesión, desde otro sitio (CSRF) o con sesión falsa | Bloqueado (401/403) |
| Código malicioso dentro de una reseña (`<script>`, `<img onerror>`) | Se muestra como texto; además la política de contenido (CSP) no deja correr scripts de afuera |
| Estrellas inválidas, ruta inventada, texto gigante | Rechazado |
| Redirección a otro sitio después de iniciar sesión (`volver=//malo.com`) | Bloqueado: siempre vuelve a una pantalla de la app |
| Robar la sesión con JavaScript | No se puede: la cookie es HttpOnly, SameSite=Lax y Secure con HTTPS |
| Meter la app dentro de otra página (clickjacking) | Bloqueado: `frame-ancestors 'none'` y `X-Frame-Options: DENY` |
| **Reenviar un aviso viejo de venta de Impultienda para sacar códigos** | **Era posible → arreglado**: además de la firma, el aviso tiene que tener menos de 5 minutos |
| Dirección mal escrita para romper el servidor | **Daba error interno → arreglado** (responde 400) |
| Métodos raros (PUT, OPTIONS…) | 405 |
| Claves en el código o en el repositorio | No hay: van en variables de entorno; `.datos/` está fuera de git |

## HTTPS y SSL
- En el servidor, Caddy saca y renueva solo el certificado SSL (Let's Encrypt) y sirve solo HTTPS (TLS 1.2 y 1.3).
- La app manda `Strict-Transport-Security` (2 años): después de la primera visita, el navegador ya no entra nunca por http.
- Mejor con **dominio propio** (p. ej. `app.clubciclista.site`) que con `sslip.io`: si cambia la IP del servidor, la app instalada no se queda sin dirección.

## Al publicar en el servidor (obligatorio)
- `BV_URL=https://<dominio>` · `BV_PROXY=1` · `BV_SECRETO` (64 letras al azar) · `IMPULTIENDA_FIRMA`.
- `GOOGLE_ID`/`GOOGLE_SECRETO` y `FACEBOOK_ID`/`FACEBOOK_SECRETO` para iniciar sesión.
- **Nunca** `BV_LOGIN_PRUEBA` ni `BV_EJEMPLOS` (además, con `BV_URL` en https se apagan solos).
- Copia de seguridad diaria de `.datos/` (códigos, usuarios, reseñas, pedidos de locales).

## Riesgos que quedan (bajos)
- La sesión dura 30 días y no se puede cortar desde el servidor salvo bloqueando al usuario (`node herramientas/resenas.mjs bloquear <usuario>`).
- Cuentas falsas de Google o Facebook pueden dejar reseñas: se frena a 10 por hora por persona y una por ruta o local. Se moderan con `herramientas/resenas.mjs`.
- El texto general de cada provincia (cómo llegar, mejor época) se ve sin código; las rutas no.
- Las rutas abiertas quedan guardadas en el celular para usarlas sin señal; si se da de baja un código, siguen ahí hasta que vuelva la conexión.
- El mapa base usa los servidores públicos de OpenStreetMap; con tráfico real hay que pasar a mosaicos propios.
- La CSP deja estilos en línea (`'unsafe-inline'` solo para estilos, no para scripts).
