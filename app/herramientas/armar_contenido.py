"""Arma el contenido de La Brújula Viajera a partir de los datos reales de Mapa para Ciclistas.

Uso:  py herramientas/armar_contenido.py            (todos los países)
      py herramientas/armar_contenido.py --sin-fotos (no reconvierte las fotos)

Salida:
  public/contenido/paises.json           público: países, conteos, versión
  public/contenido/<cc>/indice.json      público: regiones, provincias y fichas cortas de rutas
  public/contenido/<cc>/fotos/*.webp     público: fotos de las rutas (900 px)
  datos/<cc>/<provincia>.json            PROTEGIDO: rutas completas, lo sirve el servidor solo con código
  datos/ubicaciones.json                 puntos para detectar país y provincia por GPS
"""
import json, glob, os, sys, re, hashlib, datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(AQUI)
PRODUCTOS = os.path.dirname(os.path.dirname(APP))
PUB = os.path.join(APP, "public", "contenido")
DAT = os.path.join(APP, "datos")

# Productos anunciados sin rutas todavía: se muestran como «Próximamente» (no abren nada).
PROXIMOS = [{"id": "motociclismo-ar", "tema": "motociclismo", "estado": "proximamente", "pais": "AR"}]

PAISES = [
    {"cc": "AR", "carpeta": "RUTAS EN BICI AR", "bandera": "🇦🇷", "idioma": "es", "moneda": "ARS",
     "nombre": {"es": "Argentina", "en": "Argentina", "pt": "Argentina", "fr": "Argentine", "it": "Argentina", "de": "Argentinien"},
     "division": "provincia", "producto": "cc7db378", "tienda": "https://www.clubciclista.site",
     "muestra": ("neuquen", 0)},
    {"cc": "PE", "carpeta": "RUTAS EN BICI PE", "bandera": "🇵🇪", "idioma": "es", "moneda": "PEN",
     "nombre": {"es": "Perú", "en": "Peru", "pt": "Peru", "fr": "Pérou", "it": "Perù", "de": "Peru"},
     "division": "region", "producto": "d30c048a-3b54-4d02-9a87-327d825a791e", "tienda": "https://pe.clubciclista.site",
     "muestra": None},
    {"cc": "PT", "carpeta": "RUTAS EN BICI PT", "bandera": "🇵🇹", "idioma": "pt", "moneda": "EUR",
     "nombre": {"es": "Portugal", "en": "Portugal", "pt": "Portugal", "fr": "Portugal", "it": "Portogallo", "de": "Portugal"},
     "division": "distrito", "producto": "01eef2a1", "tienda": "https://pt.clubciclista.site",
     "muestra": None},
    {"cc": "BR", "carpeta": "RUTAS EN BICI BR", "bandera": "🇧🇷", "idioma": "pt", "moneda": "BRL",
     "nombre": {"es": "Brasil", "en": "Brazil", "pt": "Brasil", "fr": "Brésil", "it": "Brasile", "de": "Brasilien"},
     "division": "estado", "producto": "4713b7e2-baa8-45a1-8ae7-06701009d48d", "tienda": "https://br.clubciclista.site",
     "muestra": None},
]

SIN_FOTOS = "--sin-fotos" in sys.argv


def arg(nombre, defecto=None):
    if nombre in sys.argv:
        i = sys.argv.index(nombre)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return defecto


# --tema motociclismo|auto|autocaravana: lee los países de datos/mapas-ruedas.json y sus carpetas «<TEMA> <CC>»
# dentro de --datos (por defecto, la carpeta de productos). Sin --tema se arma ciclismo como siempre.
TEMA = arg("--tema", "ciclismo")
if arg("--datos"):
    PRODUCTOS = os.path.abspath(arg("--datos"))
if TEMA != "ciclismo":
    _cfg = json.load(open(os.path.join(DAT, "mapas-ruedas.json"), encoding="utf-8"))
    PAISES = [{**p, "carpeta": p["carpeta"].format(TEMA=TEMA.upper()),
               "muestra": tuple(p["muestra"]) if p.get("muestra") else None}
              for p in _cfg["paises"] if TEMA in p.get("temas", [])]
    PROXIMOS = []
# Los productos que ya están en paises.json y no se arman en esta corrida se conservan (ej.: ciclismo al armar motos).
SUMAR = TEMA != "ciclismo" or "--sumar" in sys.argv


def slug(s):
    import unicodedata
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def ruta_foto(carpeta, archivo):
    for base in (os.path.join(PRODUCTOS, carpeta), os.path.join(PRODUCTOS, carpeta, "_build")):
        p = os.path.join(base, archivo)
        if os.path.exists(p):
            return p
    return None


def convertir_foto(origen, destino, ancho=900):
    if SIN_FOTOS and os.path.exists(destino):
        return True
    from PIL import Image, ImageOps
    try:
        im = Image.open(origen)
        im = ImageOps.exif_transpose(im).convert("RGB")
        if im.width > ancho:
            im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
        im.save(destino, "WEBP", quality=74, method=6)
        return True
    except Exception as e:  # foto rota: la ruta queda con el fondo de mapa
        print("  foto con problema:", origen, e)
        return False


def simplificar(traza, maximo=320):
    if not traza:
        return []
    paso = max(1, len(traza) // maximo)
    pts = traza[::paso]
    if pts[-1] != traza[-1]:
        pts.append(traza[-1])
    out = []
    for p in pts:
        q = [round(p[0], 5), round(p[1], 5)]
        if len(p) > 2 and p[2] is not None:
            q.append(round(p[2]))
            if len(p) > 3 and p[3] is not None:
                q.append(round(p[3], 2))
        out.append(q)
    return out


def punto(p):
    if not p:
        return None
    return {k: p.get(k) for k in ("nombre", "lat", "lon") if p.get(k) is not None}


def sumar_a_lo_existente(resumen, ubicaciones, cajas):
    """Mezcla lo armado ahora con paises.json y ubicaciones.json actuales, sin borrar los productos de otros temas."""
    viejo = {}
    pp = os.path.join(PUB, "paises.json")
    if os.path.exists(pp):
        viejo = {p["cc"]: p for p in json.load(open(pp, encoding="utf-8"))["paises"]}
    orden = list(viejo)
    for nuevo in resumen:
        cc = nuevo["cc"]
        if cc in viejo:
            ids = {x["id"] for x in nuevo["productos"]}
            p = viejo[cc]
            p["productos"] = [x for x in p["productos"] if x["id"] not in ids] + nuevo["productos"]
            if not p.get("foto"):
                p["foto"] = nuevo["foto"]
        else:
            viejo[cc] = nuevo
            orden.append(cc)
    paises = [viejo[cc] for cc in orden]
    pu = os.path.join(DAT, "ubicaciones.json")
    if os.path.exists(pu):
        u = json.load(open(pu, encoding="utf-8"))
        hechos = {(x["cc"], x["prov"]) for x in ubicaciones}
        ubicaciones = [x for x in u.get("puntos", []) if (x["cc"], x["prov"]) not in hechos] + ubicaciones
        for cc, c in u.get("cajas", {}).items():  # cajas viejas ya traen el margen
            if cc in cajas:
                m = 1.0
                n = cajas[cc]
                cajas[cc] = [min(n[0], c[0] + m), min(n[1], c[1] + m), max(n[2], c[2] - m), max(n[3], c[3] - m)]
            else:
                cajas[cc] = [c[0] + 1.0, c[1] + 1.0, c[2] - 1.0, c[3] - 1.0]
    return paises, ubicaciones, cajas


def main():
    os.makedirs(PUB, exist_ok=True)
    resumen = []
    ubicaciones = []
    cajas = {}
    for P in PAISES:
        cc = P["cc"]
        carpeta = os.path.join(PRODUCTOS, P["carpeta"], "_build", "datos")
        archivos = [f for f in sorted(glob.glob(os.path.join(carpeta, "*.json"))) if not os.path.basename(f).startswith("_")]
        if not archivos:
            print("sin datos:", cc)
            continue
        dir_fotos = os.path.join(PUB, TEMA, cc.lower(), "fotos")
        dir_dat = os.path.join(DAT, TEMA, cc.lower())
        os.makedirs(dir_fotos, exist_ok=True)
        os.makedirs(dir_dat, exist_ok=True)
        regiones = {}
        provincias = []
        n_rutas = 0
        km_total = 0
        muestra = P["muestra"]
        portada = None
        for f in archivos:
            for prov in json.load(open(f, encoding="utf-8")):
                ps = prov.get("slug") or slug(prov["provincia"])
                fichas, completas = [], []
                lats, lons = [], []
                for i, r in enumerate(prov["rutas"]):
                    rid = f"{ps}-{i}"
                    fotos = []
                    for j, ph in enumerate(r.get("fotos", [])[:3]):
                        o = ruta_foto(P["carpeta"], ph.get("archivo", ""))
                        if not o:
                            continue
                        nombre = f"{rid}-{j}.webp"
                        if convertir_foto(o, os.path.join(dir_fotos, nombre)):
                            fotos.append({"src": f"contenido/{TEMA}/{cc.lower()}/fotos/{nombre}", "autor": ph.get("autor"),
                                          "licencia": ph.get("licencia"), "pagina": ph.get("pagina"),
                                          "que": ph.get("que_muestra")})
                    if muestra is None and r.get("estrella") and fotos:
                        muestra = (ps, i)
                    ini, fin = punto(r.get("inicio")), punto(r.get("fin"))
                    for x in (ini, fin):
                        if x and "lat" in x:
                            lats.append(x["lat"]); lons.append(x["lon"])
                    for q in (r.get("traza") or [])[::10]:
                        c = cajas.setdefault(cc, [q[0], q[1], q[0], q[1]])
                        c[0] = min(c[0], q[0]); c[1] = min(c[1], q[1]); c[2] = max(c[2], q[0]); c[3] = max(c[3], q[1])
                    ficha = {"id": rid, "nombre": r["nombre"], "km": r.get("km"), "desnivel": r.get("desnivel_m"),
                             "nivel": r.get("nivel"), "superficie": r.get("superficie"), "bici": r.get("bici"),
                             "dias": r.get("dias"), "estrella": bool(r.get("estrella")),
                             "foto": fotos[0]["src"] if fotos else None}
                    if r.get("vehiculo"):  # motos, autos y casas rodantes: qué vehículo conviene
                        ficha["vehiculo"] = r["vehiculo"]
                    fichas.append(ficha)
                    completas.append({**ficha, "resumen": r.get("resumen"), "inicio": ini, "fin": fin,
                                      "tramos": r.get("tramos", []),
                                      "descansos": [{k: d.get(k) for k in ("nombre", "tipo", "lat", "lon", "nota")} for d in r.get("descansos", [])],
                                      "miradores": [{k: d.get(k) for k in ("nombre", "lat", "lon", "que_se_ve")} for d in r.get("miradores", [])],
                                      "servicios": [{k: d.get(k) for k in ("tipo", "nombre", "marca", "lat", "lon")} for d in r.get("servicios", [])],
                                      "ojo": r.get("ojo"), "fotos": fotos,
                                      "traza": simplificar(r.get("traza") if r.get("traza_ok", True) else r.get("traza")),
                                      "fuentes": r.get("fuentes_km", [])})
                    n_rutas += 1
                    km_total += r.get("km") or 0
                info = {"slug": ps, "nombre": prov["provincia"], "region": prov.get("region"), "frase": prov.get("frase"),
                        "como_llegar": prov.get("como_llegar"), "mejor_epoca": prov.get("mejor_epoca"),
                        "tene_en_cuenta": prov.get("tene_en_cuenta")}
                json.dump({**info, "rutas": completas}, open(os.path.join(dir_dat, ps + ".json"), "w", encoding="utf-8"),
                          ensure_ascii=False, separators=(",", ":"))
                foto_prov = next((x["foto"] for x in fichas if x["estrella"] and x["foto"]), None) or next((x["foto"] for x in fichas if x["foto"]), None)
                centro = [round(sum(lats) / len(lats), 4), round(sum(lons) / len(lons), 4)] if lats else None
                if centro:
                    ubicaciones.append({"cc": cc, "prov": ps, "lat": centro[0], "lon": centro[1]})
                provincias.append({"slug": ps, "nombre": prov["provincia"], "region": prov.get("region"), "frase": prov.get("frase"),
                                   "foto": foto_prov, "centro": centro, "rutas": fichas})
                regiones.setdefault(prov.get("region") or "", []).append(ps)
                if not portada and foto_prov:
                    portada = foto_prov
        if muestra:
            for pr in provincias:
                if pr["slug"] == muestra[0]:
                    pr["rutas"][muestra[1]]["muestra"] = True
                    portada = pr["rutas"][muestra[1]]["foto"] or portada
        indice = {"cc": cc, "idioma": P["idioma"], "division": P["division"], "regiones": list(regiones.keys()),
                  "provincias": provincias, "muestra": f"{muestra[0]}-{muestra[1]}" if muestra else None}
        json.dump(indice, open(os.path.join(PUB, TEMA, cc.lower(), "indice.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        prod = {"id": f"{TEMA}-{cc.lower()}", "tema": TEMA, "estado": "activo", "provincias": len(provincias), "rutas": n_rutas,
                "km": round(km_total), "foto": portada, "tienda": P["tienda"], "muestra": indice["muestra"]}
        if P.get("pendiente"):  # sin producto de Impultienda confirmado: se ve como «Próximamente» y no abre nada
            prod = {"id": prod["id"], "tema": TEMA, "estado": "proximamente", "pais": cc}
        resumen.append({"cc": cc, "nombre": P["nombre"], "idioma": P["idioma"], "moneda": P["moneda"], "division": P["division"],
                        "foto": portada, "productos": [prod] + [x for x in PROXIMOS if x["pais"] == cc]})
        print(f"{cc}: {len(provincias)} provincias, {n_rutas} rutas, {round(km_total)} km")
    if SUMAR:
        resumen, ubicaciones, cajas = sumar_a_lo_existente(resumen, ubicaciones, cajas)
    huella = hashlib.sha1(json.dumps(resumen, sort_keys=True).encode()).hexdigest()[:8]
    version = datetime.datetime.now().strftime("%Y%m%d%H%M") + "-" + huella
    json.dump({"version": version, "paises": resumen}, open(os.path.join(PUB, "paises.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    margen = 1.0  # grados alrededor de las rutas más extremas
    cajas = {k: [round(v[0] - margen, 2), round(v[1] - margen, 2), round(v[2] + margen, 2), round(v[3] + margen, 2)] for k, v in cajas.items()}
    json.dump({"cajas": cajas, "puntos": ubicaciones}, open(os.path.join(DAT, "ubicaciones.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print("versión de contenido:", version)


if __name__ == "__main__":
    main()
