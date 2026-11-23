"""
Membuat kos_bersih.csv dan migrasi.sql dari data mentah. TIDAK mengubah file asli
(kos_scored.csv dst); semua keluaran ditulis di folder ini.

Masukan (folder ini + ..):
  ../kos_scored.csv            data teman (357 baris)
  ukuran_kamar_asli.csv        teks ukuran kamar dari xlsx asli (mis. "3x4")
  geokode_semua_status.csv     hasil geokoder + status
  koordinat_manual.csv         pengecekan manual (Mamikos / Google Maps)

Jalankan:  python buat_kos_bersih.py
"""
import csv, re, collections, os

HERE = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(HERE, *a)

KONTRAKAN_IDS = ["10145377", "44117935", "45096476"]   # hanya ada di Supabase (360 baris)

# alamat dari balasan Mamikos (data pasti)
ALAMAT_MANUAL = {
    "12128999": "Blk. C No.28, Sayang, Jatinangor, Kabupaten Sumedang",
    "39746537": "Jl. Cikuda No.16, Hegarmanah, Kec. Jatinangor, Kabupaten Sumedang",
    "98684595": "Jl. Raya Jatinangor No.207, Hegarmanah, Kec. Jatinangor, Kabupaten Sumedang",
    "71292308": "Jl. Caringin Garden Residence Blok B No.4, Sayang, Jatinangor, Kabupaten Sumedang",
    "64324498": "Jl. Caringin Garden Residence Blok B No.4, Sayang, Jatinangor, Kabupaten Sumedang",
    "45048480": "Jl. Caringin Garden Residence Blok B No.4, Sayang, Jatinangor, Kabupaten Sumedang",
}

def num(x):
    x = (x or "").strip()
    return float(x) if x != "" else None

def idstr(x):
    return str(int(float(x)))

sc = list(csv.DictReader(open(P("..", "kos_scored.csv"), encoding="utf-8")))
ukuran = {idstr(r["id"]): r["ukuran_kamar"] for r in csv.DictReader(open(P("ukuran_kamar_asli.csv"), encoding="utf-8"))}
geo = {idstr(r["id"]): r for r in csv.DictReader(open(P("geokode_semua_status.csv"), encoding="utf-8"))}
man = {idstr(r["id"]): r for r in csv.DictReader(open(P("koordinat_manual.csv"), encoding="utf-8"))}

pat = re.compile(r"^\s*(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)\s*$")
def luas_dari_teks(t):
    m = pat.match(str(t)) if t is not None else None
    if not m:
        return None
    a = float(m.group(1).replace(",", ".")) * float(m.group(2).replace(",", "."))
    a = round(a, 2)
    return a if 4 <= a <= 40 else None          # di luar itu = tidak masuk akal

def bersih_alamat(a):
    a = re.sub(r"^[0-9A-Z]{4}\+[0-9A-Z]{2,3},?\s*", "", a or "").strip()
    return a or None

dibuang = []   # (id, alasan)
hasil = []
for r in sc:
    i = idstr(r["id"])
    if i not in geo:
        dibuang.append((i, "di luar Jatinangor (Rancaekek/Cileunyi)")); continue
    g = geo[i]; m = man.get(i)
    st = g["status_final"]
    if st == "manual_buang" or (m and m["status"] == "buang"):
        dibuang.append((i, "tutup permanen / dibuang manual")); continue

    lat_lama, lng_lama = num(r["lat"]), num(r["lng"])
    alamat = None
    if m and m["status"] == "pasti":
        lat, lng, ks = num(m["lat"]), num(m["lng"]), "terverifikasi"
        alamat = ALAMAT_MANUAL.get(i)
    elif m and m["status"] == "perlu_konfirmasi":
        lat, lng, ks = num(m["lat"]), num(m["lng"]), "perkiraan"
    elif (m and m["status"] == "pakai_koordinat_lama_perkiraan") or st == "pakai_koordinat_lama_perkiraan":
        lat, lng, ks = lat_lama, lng_lama, "perkiraan"
    elif st == "terima":
        lat, lng, ks = num(g["lat"]), num(g["lng"]), "geokode"
        alamat = bersih_alamat(g["alamat_google"])
    elif st == "terima_perkiraan":
        lat, lng, ks = num(g["lat"]), num(g["lng"]), "perkiraan"
    else:
        raise SystemExit("status tak dikenal: %s %s" % (i, st))

    luas = luas_dari_teks(ukuran.get(i))
    harga = float(r["harga"])
    hasil.append(dict(
        id=i, nama=r["nama"].strip(), alamat=alamat, lat=lat, lng=lng,
        tipe_penghuni=r["tipe_penghuni"], harga=r["harga"],
        luas=luas, luas_status="tercantum" if luas is not None else "tidak_tercantum",
        koordinat_status=ks,
        basis_harga="tahun_dibagi_12" if harga != int(harga) else "bulan",
        fas={k: r[k] for k in ["termasuk_listrik","jendela","k_mandi_dalam","kloset_duduk","kloset_jongkok","shower","air_panas","cctv","wifi","penjaga","ac","parkir_mobil","parkir_motor_sepeda","tv","ruang_tamu","ruang_jemur","pembayaran_per_bulan","pembayaran_per_tahun"]},
    ))

# nama ganda: yang pertama (id terkecil) tetap, berikutnya diberi " (2)", " (3)"
hasil.sort(key=lambda d: int(d["id"]))
seen = collections.Counter()
for d in hasil:
    key = d["nama"].lower()
    seen[key] += 1
    if seen[key] > 1:
        d["nama"] = "%s (%d)" % (d["nama"], seen[key])
nama_unik = len({d["nama"].lower() for d in hasil}) == len(hasil)

# ---------- kos_bersih.csv ----------
FAS = list(hasil[0]["fas"].keys())
cols = ["id","nama","alamat","lat","lng","tipe_penghuni","harga","luas_kamar_m2","jarak_unpad_km","jarak_itb_km",
        "C1","C2","C4","koordinat_status","luas_status","basis_harga"] + FAS
with open(P("kos_bersih.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(cols)
    for d in hasil:
        w.writerow([d["id"], d["nama"], d["alamat"] or "", d["lat"], d["lng"], d["tipe_penghuni"], d["harga"],
                    "" if d["luas"] is None else d["luas"], "", "", d["harga"], "", "" if d["luas"] is None else d["luas"],
                    d["koordinat_status"], d["luas_status"], d["basis_harga"]] + [d["fas"][k] for k in FAS])

# ---------- migrasi.sql ----------
q = lambda s: "NULL" if s is None or s == "" else "'" + str(s).replace("'", "''") + "'"
ids_hapus = KONTRAKAN_IDS + [i for i, _ in dibuang]
vals = ",\n".join(
    "  (%s,%s,%s,%s,%s,%s,%s,%s,%s)" % (
        q(d["id"]), q(d["nama"]), q(d["alamat"]), q(d["lat"]), q(d["lng"]),
        q(d["luas"]), q(d["koordinat_status"]), q(d["luas_status"]), q(d["basis_harga"]))
    for d in hasil)
sql = f"""-- migrasi.sql  (dibuat oleh buat_kos_bersih.py)
-- JALANKAN DI Supabase > SQL Editor. LANGKAH WAJIB SEBELUMNYA: ekspor tabel public.kos ke CSV (cadangan).
--
-- Yang diubah : nama (ganda diberi "(2)"), alamat, lat, lng, luas (luas_kamar_m2 + "C4"),
--               "C2"/jarak (dikosongkan dulu, diisi setelah hitung_jarak.py), kolom baru status.
-- Yang TIDAK disentuh: foto_url_1..5, fasilitas, harga, tipe_penghuni, "C1".
-- Perkiraan jumlah baris sesudah: {len(hasil)}.
--
-- PREFLIGHT (jalankan sendiri dulu, pastikan hasilnya sama dengan dugaan):
--   select count(*) from public.kos;                                   -- harus 360
--   select column_name from information_schema.columns
--     where table_schema='public' and table_name='kos' and column_name in ('C2','C4','lat','lng');  -- 4 baris

begin;

alter table public.kos
  add column if not exists koordinat_status text,   -- terverifikasi | geokode | perkiraan
  add column if not exists luas_status      text,   -- tercantum | tidak_tercantum
  add column if not exists basis_harga      text,   -- bulan | tahun_dibagi_12
  add column if not exists jarak_unpad_km   numeric,
  add column if not exists jarak_itb_km     numeric;

-- hapus: 3 rumah kontrakan, 2 kos di luar Jatinangor, 1 kos tutup permanen
delete from public.kos where id::text in ({", ".join(q(i) for i in ids_hapus)});

update public.kos k set
  nama             = v.nama,
  alamat           = nullif(v.alamat,''),
  lat              = v.lat::numeric,
  lng              = v.lng::numeric,
  luas_kamar_m2    = nullif(v.luas,'')::numeric,
  "C4"             = nullif(v.luas,'')::numeric,
  koordinat_status = v.koordinat_status,
  luas_status      = v.luas_status,
  basis_harga      = v.basis_harga,
  jarak_unpad_km   = null,
  jarak_itb_km     = null,
  "C2"             = null
from (values
{vals}
) as v(id, nama, alamat, lat, lng, luas, koordinat_status, luas_status, basis_harga)
where k.id::text = v.id;

-- cek hasil (harus {len(hasil)} baris, tanpa nama ganda)
select count(*) as jumlah, count(distinct nama) as nama_unik,
       count(*) filter (where koordinat_status is null) as tanpa_status
from public.kos;

commit;
"""
open(P("migrasi.sql"), "w", encoding="utf-8").write(sql)

# ---------- ringkasan ----------
print("kos_bersih:", len(hasil), "| dibuang:", dibuang, "| nama unik:", nama_unik)
print("koordinat_status:", collections.Counter(d["koordinat_status"] for d in hasil))
print("luas tidak tercantum:", sum(d["luas"] is None for d in hasil), "| basis tahun:", sum(d["basis_harga"] != "bulan" for d in hasil))
print("alamat terisi:", sum(bool(d["alamat"]) for d in hasil))
print("diganti nama (2):", [d["nama"] for d in hasil if re.search(r"\(\d\)$", d["nama"])][:8], sum(bool(re.search(r"\(\d\)$", d["nama"])) for d in hasil))
