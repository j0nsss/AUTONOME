# AUTONOME dashboard

Dashboard Next.js 14 (App Router) untuk kontrak `A2AHub` di Monad Testnet.

Setup lengkap, deploy kontrak, dan cara menjalankan agent ada di [README utama](../README.md).

Perintah cepat dari folder ini:

```bash
npm install
cp .env.local.example .env.local
# isi NEXT_PUBLIC_HUB_ADDRESS
npm run dev
```

Dashboard membaca event on-chain lewat polling. Data task dibaca langsung dari chain.
