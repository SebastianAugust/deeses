@AGENTS.md

# CariKos — Frontend DSS Kos Jatinangor

- Nama tampilan "CariKos", slug "carikos": satu sumber di `src/config/site.ts`; logo sementara di `src/components/ui/logo.tsx`.
- Acuan desain: baca `design/DESIGN.md` dulu, lalu mockup di `design/mockups/` (00-home … 10-kriteria-lego-mobile). Tiru layout, ukuran, dan token warnanya; terjemahkan ke React + Tailwind, jangan salin runtime mockup.
- Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + dnd-kit + lucide-react. Data nanti dari Supabase Postgres.
- Kriteria = katalog "lego" di `src/config/kriteria.ts` (satu sumber): user memasang 1–12 piece yang datanya tersedia, urutan = prioritas (bobot rank-sum, n = jumlah terpasang).
- Kontrak API: `POST /api/rank` in `{budget, tipe, kriteria: string[]}` (kode piece urut prioritas) → out `{hasil: [{id, nama, rank, skor_saw, skor_topsis, skor_kriteria:{<kode>: 0..1}, harga, jarak_km, tipe, foto_url, url}], kriteria_dipakai: [{kode, bobot}], jumlah_tanpa_data, tanpa_data_per_kriteria, spearman}`. `GET /api/kriteria` → katalog tersedia terkelompok per kategori.
- Bahasa UI: Indonesia. Format angka Indonesia (Rp 1.050.000, 0,82).
- JANGAN git commit atau push. Pemilik repo yang commit & push sendiri.
