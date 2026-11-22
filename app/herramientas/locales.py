"""Turismo: alta, renovación y baja de los locales que pagan su lugar en la app (USD 20 por mes).

Uso:
  py herramientas/locales.py lista
  py herramientas/locales.py alta ficha.json        (ficha con los datos del local y las rutas de sus fotos en la PC)
  py herramientas/locales.py renovar <id> <meses>   (suma meses desde la fecha pagada o desde hoy)
  py herramientas/locales.py baja <id>              (deja de mostrarse; no se borra)
  py herramientas/locales.py alta-local <id>        (vuelve a mostrarlo)
  py herramientas/locales.py vencen [días]          (locales que vencen en los próximos días, 7 por defecto, y los ya vencidos)
  py herramientas/locales.py pedidos                (locales que pidieron sumarse desde la app)

El cobro de los USD 20 por mes lo hace el dueño a mano (decisión del 2026-11-21): cuando avisa que cobró, se corre
«alta» (local nuevo) o «renovar <id> 1».

Ficha de ejemplo (ficha.json):
  {"nombre": "Café La Posta", "tipo": "cafeteria", "pais": "AR", "provincia": "neuquen", "lat": -40.15, "lon": -71.35,
   "direccion": "Av. San Martín 123", "horario": "Todos los días 8 a 20", "descripcion": "Café de especialidad...",
   "promo": {"titulo": "Café gratis para ciclistas", "detalle": "Mostrando la app en la caja"},
   "whatsapp": "+5492944...", "instagram": "cafelaposta", "web": "https://...", "fotos": ["C:/ruta/foto1.jpg"], "meses": 1}

Tipos: cafeteria, restaurante, alojamiento, taller, tienda, experiencia, otro.
Las fotos se pasan a webp de 1200 px en public/contenido/locales/<id>/.
"""
import json, os, re, sys, datetime, unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(AQUI)
ARCH = os.path.join(APP, "datos", "locales.json")
FOTOS = os.path.join(APP, "public", "contenido", "locales")
TIPOS = {"cafeteria", "restaurante", "alojamiento", "taller", "tienda", "experiencia", "otro"}


def leer():
    try:
        return json.load(open(ARCH, encoding="utf-8"))
    except FileNotFoundError:
        return {"locales": []}


def guardar(db):
    tmp = ARCH + ".tmp"
    json.dump(db, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, ARCH)


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:50]


def sumar_meses(desde, meses):
    y, m = desde.year, desde.month + meses
    y += (m - 1) // 12
    m = (m - 1) % 12 + 1
    dias = [31, 29 if y % 4 == 0 and (y % 100 or y % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
    return datetime.date(y, m, min(desde.day, dias))


def fotos_webp(lid, rutas):
    from PIL import Image, ImageOps
    os.makedirs(os.path.join(FOTOS, lid), exist_ok=True)
    out = []
    for i, r in enumerate(rutas[:8]):
        im = ImageOps.exif_transpose(Image.open(r)).convert("RGB")
        if im.width > 1200:
            im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
        nombre = f"{i}.webp"
        im.save(os.path.join(FOTOS, lid, nombre), "WEBP", quality=78, method=6)
        out.append(f"contenido/locales/{lid}/{nombre}")
    return out


def https_o_nada(u):
    return u if isinstance(u, str) and u.startswith("https://") else None


def main():
    if len(sys.argv) < 2:
        print(__doc__); return
    cmd, args = sys.argv[1], sys.argv[2:]
    db = leer()
    hoy = datetime.date.today()
    if cmd == "lista":
        for l in db["locales"]:
            estado = "EJEMPLO" if l.get("ejemplo") else ("activo" if l.get("activo", True) and l.get("pagado_hasta", "") >= hoy.isoformat() else "vencido/baja")
            print(f'{l["id"]:30} {l["pais"]} {l.get("provincia",""):18} pagado hasta {l.get("pagado_hasta")}  {estado}  {l["nombre"]}')
        return
    if cmd == "vencen":
        limite = (hoy + datetime.timedelta(days=int(args[0]) if args else 7)).isoformat()
        for l in db["locales"]:
            if l.get("ejemplo") or not l.get("activo", True):
                continue
            ph = l.get("pagado_hasta", "")
            if ph <= limite:
                print(f'{"VENCIDO " if ph < hoy.isoformat() else "vence   "}{ph}  {l["id"]}  {l["nombre"]}  WhatsApp {l.get("whatsapp") or "—"}')
        return
    if cmd == "pedidos":
        f = os.path.join(APP, ".datos", "solicitudes-turismo.jsonl")
        if not os.path.exists(f):
            print("sin pedidos"); return
        for linea in open(f, encoding="utf-8"):
            d = json.loads(linea)
            print(f'{d["t"][:16]}  {d["negocio"]} · {d.get("ciudad") or "—"} · {d["contacto"]} · {d.get("mensaje") or ""}')
        return
    if cmd == "alta":
        f = json.load(open(args[0], encoding="utf-8"))
        assert f.get("tipo") in TIPOS, f"tipo debe ser uno de {sorted(TIPOS)}"
        assert -90 <= float(f["lat"]) <= 90 and -180 <= float(f["lon"]) <= 180, "coordenadas"
        lid = slug(f["nombre"] + "-" + f.get("provincia", ""))
        base, n = lid, 2
        while any(x["id"] == lid for x in db["locales"]):
            lid, n = f"{base}-{n}", n + 1
        local = {
            "id": lid, "nombre": f["nombre"][:80], "tipo": f["tipo"], "pais": f["pais"].upper(), "provincia": f.get("provincia"),
            "lat": float(f["lat"]), "lon": float(f["lon"]), "direccion": f.get("direccion"), "horario": f.get("horario"),
            "descripcion": (f.get("descripcion") or "")[:1200], "promo": f.get("promo"),
            "whatsapp": re.sub(r"[^0-9+]", "", f.get("whatsapp") or "") or None,
            "instagram": re.sub(r"[^A-Za-z0-9._]", "", f.get("instagram") or "") or None, "web": https_o_nada(f.get("web")),
            "fotos": fotos_webp(lid, f.get("fotos", [])), "activo": True, "alta": hoy.isoformat(),
            "pagado_hasta": sumar_meses(hoy, int(f.get("meses", 1))).isoformat(),
        }
        db["locales"].append(local)
        guardar(db)
        print("alta:", lid, "pagado hasta", local["pagado_hasta"])
        return
    loc = next((x for x in db["locales"] if x["id"] == (args[0] if args else "")), None)
    if not loc:
        print("no existe:", args[:1]); return
    if cmd == "renovar":
        desde = max(hoy, datetime.date.fromisoformat(loc.get("pagado_hasta") or hoy.isoformat()))
        loc["pagado_hasta"] = sumar_meses(desde, int(args[1])).isoformat()
        loc["activo"] = True
    elif cmd == "baja":
        loc["activo"] = False
    elif cmd == "alta-local":
        loc["activo"] = True
    else:
        print(__doc__); return
    guardar(db)
    print(cmd, loc["id"], "pagado hasta", loc.get("pagado_hasta"), "activo" if loc["activo"] else "baja")


if __name__ == "__main__":
    main()
