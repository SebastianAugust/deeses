"""Membaca hasil ekspor Google My Maps (.kmz/.kml) dan membandingkan dengan koordinat lama.
Pemakaian: python baca_kml.py uji20.kmz kos_untuk_mymaps_uji20.csv
"""
import sys, zipfile, re, math
import xml.etree.ElementTree as ET
from pathlib import Path
import pandas as pd

kmz, csv = sys.argv[1], sys.argv[2]
base = Path(__file__).resolve().parent
if kmz.lower().endswith(".kmz"):
    with zipfile.ZipFile(base / kmz) as z:
        nama_kml = next(n for n in z.namelist() if n.lower().endswith(".kml"))
        xml = z.read(nama_kml)
else:
    xml = (base / kmz).read_bytes()
ns = {"k": "http://www.opengis.net/kml/2.2"}
root = ET.fromstring(xml)
baris = []
for pm in root.iter("{http://www.opengis.net/kml/2.2}Placemark"):
    nama = (pm.findtext("k:name", default="", namespaces=ns) or "").strip()
    koor = pm.findtext(".//k:coordinates", default="", namespaces=ns).strip()
    if not koor:
        continue
    lon, lat = [float(x) for x in koor.split(",")[:2]]
    data = {d.get("name"): (d.findtext("k:value", default="", namespaces=ns) or "").strip()
            for d in pm.iter("{http://www.opengis.net/kml/2.2}Data")}
    baris.append({"id": nama, "lat_mm": lat, "lng_mm": lon, "teks_data": data.get("pencarian", "")})
mm = pd.DataFrame(baris)
mm["id"] = pd.to_numeric(mm["id"], errors="coerce")

uji = pd.read_csv(base / csv)
lama = pd.read_csv(base.parent / "kos_scored.csv")[["id", "lat", "lng"]]
m = uji.merge(mm[["id", "lat_mm", "lng_mm"]], on="id", how="left").merge(lama, on="id", how="left")

def hv(a, b, c, d):
    if any(pd.isna(x) for x in (a, b, c, d)): return float("nan")
    R = 6371; p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))
m["selisih_km"] = [hv(r.lat, r.lng, r.lat_mm, r.lng_mm) for r in m.itertuples()]
m["status"] = m["lat_mm"].isna().map({True: "GAGAL"}).fillna("ok")
pd.set_option("display.width", 220); pd.set_option("display.max_colwidth", 38)
print(m[["id", "nama_asli", "status", "lat_mm", "lng_mm", "lat", "lng", "selisih_km"]].round(5).to_string(index=False))
ok = m[m.status == "ok"]
print("\nberhasil:", len(ok), "dari", len(m), "| gagal:", (m.status == "GAGAL").sum())
print("selisih vs koordinat lama (km): median %.2f | <0.3: %d | 0.3-1: %d | >1: %d" % (
    ok.selisih_km.median(), (ok.selisih_km < .3).sum(), ((ok.selisih_km >= .3) & (ok.selisih_km <= 1)).sum(), (ok.selisih_km > 1).sum()))
m.to_csv(base / ("hasil_" + Path(csv).stem + ".csv"), index=False)
