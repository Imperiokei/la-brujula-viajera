"""Capturas de celular 1080x1920 para landings (360x640 a 3x), solo la pantalla visible, con rutas reales.
  py herramientas/capturas_landing.py <ar|pt> <salida> <BV-código-local> [base=http://localhost:8861/]
Antes: servidor local sin ejemplos (node servidor.mjs con PUERTO=8861) y un código local del producto
(node herramientas/codigos.mjs generar ciclismo-<cc> 1).
Con Playwright, cambiar solo el #hash no redibuja la app: se pasa por about:blank antes de cada pantalla."""
import os, sys
from playwright.sync_api import sync_playwright

PAIS, SAL, COD = sys.argv[1], sys.argv[2], sys.argv[3]
BASE = sys.argv[4] if len(sys.argv) > 4 else "http://localhost:8861/"
# bajar: 0 = arriba · número = px CSS · "mapa" = mapa de la ruta · "filtros" = filtros de miradores/paradas/servicios
CONF = {
    "ar": {"idioma": "es", "locale": "es-AR", "geo": (-38.95, -68.06), "det": {"cc": "AR", "prov": "neuquen", "por": "gps"},
           "pantallas": [("01", "#/pais/AR/ciclismo", 0), ("02", "#/pais/AR/ciclismo/neuquen", 470),
                         ("03", "#/ruta/AR/ciclismo/neuquen/neuquen-0", 0), ("04", "#/ruta/AR/ciclismo/neuquen/neuquen-0", "mapa"),
                         ("05", "#/ruta/AR/ciclismo/cordoba/cordoba-0", "mapa")]},
    "pt": {"idioma": "pt", "locale": "pt-PT", "geo": (40.66, -7.91), "det": {"cc": "PT", "prov": "viseu", "por": "gps"},
           "pantallas": [("01", "#/pais/PT/ciclismo", 0), ("02", "#/pais/PT/ciclismo/faro", 470),
                         ("03", "#/ruta/PT/ciclismo/viseu/viseu-0", "mapa"), ("04", "#/ruta/PT/ciclismo/viseu/viseu-0", "filtros")]},
}[PAIS]
os.makedirs(SAL, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    ctx = b.new_context(viewport={"width": 360, "height": 640}, is_mobile=True, has_touch=True, device_scale_factor=3,
                        geolocation={"latitude": CONF["geo"][0], "longitude": CONF["geo"][1]}, permissions=["geolocation"],
                        service_workers="block", locale=CONF["locale"])
    pg = ctx.new_page()
    pg.goto(BASE)
    pg.evaluate("""([i, d]) => { localStorage.clear(); localStorage.setItem('bv.idioma', JSON.stringify(i));
        localStorage.setItem('bv.detectado', JSON.stringify(d)); }""", [CONF["idioma"], CONF["det"]])
    pg.goto("about:blank"); pg.goto(BASE + f"#/codigo?producto=ciclismo-{PAIS}"); pg.wait_for_timeout(2500)
    pg.fill("#cod", COD); pg.click("#enviar"); pg.wait_for_timeout(2000)
    print("productos:", pg.evaluate("localStorage.getItem('bv.productos')"))
    for nombre, ruta, bajar in CONF["pantallas"]:
        pg.goto("about:blank"); pg.goto(BASE + ruta); pg.wait_for_timeout(3500)
        if bajar in ("mapa", "filtros"):
            sel = ".leaflet-container" if bajar == "mapa" else ".filtros-serv"
            pg.evaluate("""([s, extra]) => { const m = document.querySelector(s);
                if (m) window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - extra); }""",
                        [sel, 70 if bajar == "mapa" else 330])
            pg.wait_for_timeout(3500)
        elif bajar:
            pg.evaluate(f"window.scrollTo(0, {bajar})"); pg.wait_for_timeout(1500)
        pg.screenshot(path=os.path.join(SAL, f"{nombre}.png"))
        print(nombre, ruta, pg.evaluate("document.documentElement.scrollWidth"))
    b.close()
