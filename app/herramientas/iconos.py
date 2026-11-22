"""Genera los íconos PNG de la app desde img/logo.svg (Chrome headless vía Playwright).  py herramientas/iconos.py"""
import os
from playwright.sync_api import sync_playwright
IMG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "img")
svg = open(os.path.join(IMG, "logo.svg"), encoding="utf-8").read()
# maskable: fondo a sangre (sin esquinas redondas) y la brújula al 78 % para la zona segura
mask = svg.replace('rx="112"', 'rx="0"').replace('<g transform="translate(256 256)">', '<g transform="translate(256 256) scale(.78)">')
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    for nombre, tam, fuente, fondo in [("icono-512.png", 512, svg, "transparent"), ("icono-192.png", 192, svg, "transparent"),
                                       ("icono-180.png", 180, mask, "#0F2B2D"), ("icono-maskable-512.png", 512, mask, "#0F2B2D"),
                                       ("icono-1024.png", 1024, mask, "#0F2B2D")]:
        pg = b.new_page(viewport={"width": tam, "height": tam})
        pg.set_content(f'<html><body style="margin:0;background:{fondo}">{fuente.replace("<svg ", f"<svg width=\"{tam}\" height=\"{tam}\" ", 1)}</body></html>')
        pg.screenshot(path=os.path.join(IMG, nombre), omit_background=fondo == "transparent")
        pg.close()
        print(nombre)
    b.close()
