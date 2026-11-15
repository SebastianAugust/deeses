@AGENTS.md

# Kosjati — Frontend DSS Kos Jatinangor

- Acuan desain: baca `design/DESIGN.md` dulu, lalu mockup di `design/mockups/` (00-home … 06-desktop-hasil). Tiru layout, ukuran, dan token warnanya; terjemahkan ke React + Tailwind, jangan salin runtime mockup.
- Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + dnd-kit + lucide-react. Data nanti dari Supabase Postgres.
- Kontrak API: `POST /api/rank` in `{budget, tipe, urutan_kriteria}` → out `[{id, nama, rank, skor_saw, skor_topsis, skor_kriteria:{C1..C8}}]` (+ harga, jarak_km, tipe, foto_url, url untuk tampilan).
- Bahasa UI: Indonesia. Format angka Indonesia (Rp 1.050.000, 0,82).
- JANGAN git commit atau push. Pemilik repo yang commit & push sendiri.
