"""Arma la sección Tienda de la app desde datos/tienda-fuente.json.  py herramientas/armar_tienda.py
Copia cada tapa (webp 640 px) a public/contenido/tienda/ y escribe public/contenido/tienda.json."""
import json, os
from PIL import Image, ImageOps
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCTOS = os.path.dirname(os.path.dirname(APP))
SAL = os.path.join(APP, "public", "contenido", "tienda")
os.makedirs(SAL, exist_ok=True)
fuente = json.load(open(os.path.join(APP, "datos", "tienda-fuente.json"), encoding="utf-8"))
paises = {p["cc"]: p for p in json.load(open(os.path.join(APP, "public", "contenido", "paises.json"), encoding="utf-8"))["paises"]}
items = []
for it in fuente["items"]:
    tapa = None
    if it.get("tapa") and os.path.exists(os.path.join(PRODUCTOS, it["tapa"])):
        im = ImageOps.exif_transpose(Image.open(os.path.join(PRODUCTOS, it["tapa"]))).convert("RGB")
        im.thumbnail((640, 640))
        im.save(os.path.join(SAL, it["id"] + ".webp"), "WEBP", quality=78, method=6)
        tapa = f"contenido/tienda/{it['id']}.webp"
    elif it.get("tipo") == "mapa":  # sin tapa: la foto del país
        tapa = paises.get(it["pais"], {}).get("foto")
    else:
        print("SIN TAPA:", it["id"])
    items.append({k: it.get(k) for k in ("id", "pais", "tipo", "producto_app", "titulo", "descripcion", "link")} | {"tapa": tapa})
json.dump({"items": items}, open(os.path.join(APP, "public", "contenido", "tienda.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(items), "productos en la tienda")
