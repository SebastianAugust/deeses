"""
Menghitung PERKIRAAN jarak rute (mobil) tiap kos ke gerbang Unpad dan ITB Jatinangor
lewat server OSRM publik (data OpenStreetMap). Jalankan di laptop sendiri (butuh internet):

    python hitung_jarak.py

Masukan : kos_bersih.csv
Keluaran: kos_bersih.csv (kolom jarak_unpad_km, jarak_itb_km, C2 = min keduanya diisi),
          jarak.sql (UPDATE untuk Supabase), jarak_cache.json, jarak_log.txt

Catatan kejujuran:
- Ini jarak rute OSRM, bukan Google Maps. Dari sampel kecil OSRM sekitar 15-45% lebih panjang
  dari Google dan konsisten; tidak dikalibrasi. Tampilkan sebagai "perkiraan jarak rute".
- 169 kos punya koordinat berstatus 'perkiraan' (bisa meleset 1-2 km), jadi jarak kos itu
  ikut perkiraan.
- Pemeriksaan wajar: rute 1.0x - 6.0x garis lurus (jalan Jatinangor berkelok, 2.5-4x itu normal); di luar itu dicatat di log.
- Titik tujuan (dipilih Bas dari Google Maps):
    Unpad (Tugu Makalangan / Gerlam) -6.9313996, 107.7761314
    ITB Jatinangor                   -6.9336088, 107.7682456
"""
import csv, json, math, os, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
P = lambda n: os.path.join(HERE, n)
TUJUAN = {"unpad": (-6.9313996, 107.7761314), "itb": (-6.9336088, 107.7682456)}
OSRM = "https://router.project-osrm.org/route/v1/driving/{lo1},{la1};{lo2},{la2}?overview=false"

def garis_lurus_km(a, b):
    p = math.pi / 180
    x = math.sin((b[0]-a[0])*p/2)**2 + math.cos(a[0]*p)*math.cos(b[0]*p)*math.sin((b[1]-a[1])*p/2)**2
    return 2 * 6371 * math.asin(math.sqrt(x))

cache = json.load(open(P("jarak_cache.json"))) if os.path.exists(P("jarak_cache.json")) else {}
log = open(P("jarak_log.txt"), "a", encoding="utf-8")

def rute_km(lat, lng, nama):
    key = "%.6f,%.6f>%s" % (lat, lng, nama)
    if key in cache:
        return cache[key]
    tuj = TUJUAN[nama]
    url = OSRM.format(lo1=lng, la1=lat, lo2=tuj[1], la2=tuj[0])
    for percobaan in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "tugas-dss-kos-unpad"}), timeout=30) as r:
                d = json.load(r)
            km = round(d["routes"][0]["distance"] / 1000, 2) if d.get("code") == "Ok" else None
            break
        except Exception as e:
            km = None
            time.sleep(2 * (percobaan + 1))
    cache[key] = km
    json.dump(cache, open(P("jarak_cache.json"), "w"))
    time.sleep(1.0)            # sopan ke server publik
    return km

rows = list(csv.DictReader(open(P("kos_bersih.csv"), encoding="utf-8")))
tak_wajar = gagal = 0
for n, r in enumerate(rows, 1):
    lat, lng = float(r["lat"]), float(r["lng"])
    hasil = {}
    for nama in ("unpad", "itb"):
        km = rute_km(lat, lng, nama)
        lurus = garis_lurus_km((lat, lng), TUJUAN[nama])
        if km is None:
            gagal += 1; log.write("GAGAL %s %s\n" % (r["id"], nama))
        elif lurus > 0.05 and not (1.0 <= km / lurus <= 6.0):
            tak_wajar += 1; log.write("TAK WAJAR %s %s rute=%.2f lurus=%.2f rasio=%.2f\n" % (r["id"], nama, km, lurus, km / lurus))
        hasil[nama] = km
    r["jarak_unpad_km"] = "" if hasil["unpad"] is None else hasil["unpad"]
    r["jarak_itb_km"] = "" if hasil["itb"] is None else hasil["itb"]
    ada = [v for v in hasil.values() if v is not None]
    r["C2"] = round(min(ada), 2) if ada else ""
    if n % 25 == 0:
        print("%d/%d" % (n, len(rows)), flush=True)

with open(P("kos_bersih.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

val = lambda x: "NULL" if x == "" else str(x)
with open(P("jarak.sql"), "w", encoding="utf-8") as f:
    f.write("-- jarak.sql: jalankan SETELAH migrasi.sql. Jarak rute OSRM = PERKIRAAN.\nbegin;\n")
    f.write("update public.kos k set jarak_unpad_km = v.u::numeric, jarak_itb_km = v.i::numeric, \"C2\" = v.c::numeric\nfrom (values\n")
    f.write(",\n".join("  ('%s',%s,%s,%s)" % (r["id"], *[("NULL" if r[c] == "" else "'%s'" % r[c]) for c in ("jarak_unpad_km", "jarak_itb_km", "C2")]) for r in rows))
    f.write("\n) as v(id,u,i,c) where k.id::text = v.id;\ncommit;\n")
print("selesai. gagal=%d tak_wajar=%d (lihat jarak_log.txt)" % (gagal, tak_wajar))
