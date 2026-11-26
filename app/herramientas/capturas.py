"""Capturas de revisión en PC (1366) y celular (390).  py herramientas/capturas.py [BV-código-para-probar]
Deja PNG en ../capturas/ y avisa si alguna pantalla tiene scroll de costado."""
import os, sys, json
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8860/"
SAL = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "capturas")
os.makedirs(SAL, exist_ok=True)
COD = sys.argv[1] if len(sys.argv) > 1 else None
PANTALLAS = [("1-inicio", "#/inicio", None), ("2-idioma", "#/idioma?primera=1", None), ("3-paises", "#/paises", "es"),
             ("4-productos-ar", "#/pais/AR", "es"), ("5-provincias-ar", "#/pais/AR/ciclismo", "es"),
             ("6-rutas-neuquen", "#/pais/AR/ciclismo/neuquen", "es"), ("7-ruta-siete-lagos", "#/ruta/AR/ciclismo/neuquen/neuquen-0", "es"),
             ("8-codigo", "#/codigo?producto=ciclismo-ar", "es"), ("9-ruta-en-ingles", "#/ruta/AR/ciclismo/neuquen/neuquen-0", "en"), ("12-tienda", "#/tienda", "es"), ("13-tienda-pt-en-portugues", "#/tienda?pais=PT", "pt"),
             ("14-turismo", "#/turismo", "es"), ("15-local-ejemplo", "#/local/cafe-de-ejemplo-neuquen", "es"), ("16-sumar-local", "#/turismo/sumar", "es"),
             ("17-cuenta", "#/cuenta", "es"), ("18-pais-bloqueado", "#/pais/PE", "es")]
# Mapas de moto, auto y autocaravana (guías «en Ruedas»): (nombre, ruta, idioma, país detectado)
for cc, tema, prov, idi in [("CO", "motociclismo", "antioquia", "es"), ("CO", "autocaravana", "boyaca", "en"),
                            ("PL", "auto", None, "de"), ("CZ", "motociclismo", None, "es")]:
    PANTALLAS += [(f"20-{cc.lower()}-mapas", f"#/pais/{cc}", idi, cc), (f"21-{cc.lower()}-{tema}", f"#/pais/{cc}/{tema}", idi, cc)]
    if prov:
        PANTALLAS += [(f"22-{cc.lower()}-{tema}-{prov}", f"#/pais/{cc}/{tema}/{prov}", idi, cc),
                      (f"23-{cc.lower()}-{tema}-ruta", f"#/ruta/{cc}/{tema}/{prov}/{prov}-0", idi, cc)]
# Tienda de cada país nuevo, en su idioma
PANTALLAS += [(f"24-tienda-{cc.lower()}", f"#/tienda?pais={cc}", idi, cc) for cc, idi in [("CO", "es"), ("PL", "en"), ("CZ", "de")]]
GEO = {"AR": (-38.95, -68.06), "CO": (6.25, -75.56), "PL": (50.06, 19.94), "CZ": (50.08, 14.43)}
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    for nombre_disp, vw, vh, movil in [("pc", 1366, 900, False), ("celu", 390, 844, True)]:
        ctx = b.new_context(viewport={"width": vw, "height": vh}, is_mobile=movil, has_touch=movil, device_scale_factor=2 if movil else 1,
                            geolocation={"latitude": -38.95, "longitude": -68.06}, permissions=["geolocation"], service_workers="block")
        pg = ctx.new_page()
        for nombre, ruta, lang, *cc in PANTALLAS:
            cc = cc[0] if cc else "AR"
            ctx.set_geolocation({"latitude": GEO[cc][0], "longitude": GEO[cc][1]})
            pg.goto(BASE)
            pg.evaluate("""([lang, cc]) => { localStorage.clear(); if (lang) { localStorage.setItem('bv.idioma', JSON.stringify(lang));
                localStorage.setItem('bv.detectado', JSON.stringify({cc, prov: cc === 'AR' ? 'neuquen' : '', por:'gps'})); } }""", [lang, cc])
            pg.goto("about:blank"); pg.goto(BASE + ruta)
            pg.wait_for_timeout(2600)
            ancho = pg.evaluate("document.documentElement.scrollWidth")
            alto = min(pg.evaluate("document.documentElement.scrollHeight"), 4200)
            f = os.path.join(SAL, f"{nombre_disp}-{nombre}.png")
            pg.screenshot(path=f, full_page=True, clip={"x": 0, "y": 0, "width": vw, "height": alto})
            print(nombre_disp, nombre, "SCROLL DE COSTADO" if ancho > vw else "ok", ancho)
        if COD:  # canje real del código en pantalla
            pg.goto(BASE + "#/codigo?producto=ciclismo-ar"); pg.wait_for_timeout(1500)
            pg.fill("#cod", COD); pg.click("#enviar"); pg.wait_for_timeout(1500)
            pg.screenshot(path=os.path.join(SAL, f"{nombre_disp}-10-codigo-ok.png"))
            pg.goto(BASE + "#/ruta/AR/ciclismo/salta/salta-0"); pg.wait_for_timeout(2600)
            pg.screenshot(path=os.path.join(SAL, f"{nombre_disp}-11-ruta-desbloqueada.png"), full_page=True)
            print(nombre_disp, "código:", pg.evaluate("localStorage.getItem('bv.productos')"))
        # reseña real con la entrada de prueba (solo existe en la PC con BV_LOGIN_PRUEBA=1)
        pg.goto(BASE + "auth/prueba?volver=/ruta/AR/ciclismo/neuquen/neuquen-0"); pg.wait_for_timeout(2600)
        if pg.query_selector("#res-form"):
            pg.click('#res-estrellas button[data-n="5"]'); pg.fill("#res-texto", "Prueba de reseña desde la PC.")
            pg.click("#res-form button[type=submit]"); pg.wait_for_timeout(1500)
            pg.locator("#resenas").screenshot(path=os.path.join(SAL, f"{nombre_disp}-19-resena.png"))
            print(nombre_disp, "reseña:", pg.inner_text("#resenas .res-resumen") if pg.query_selector("#resenas .res-resumen") else "SIN RESUMEN")
        else:
            print(nombre_disp, "reseña: no apareció el formulario")
        ctx.close()
    b.close()
