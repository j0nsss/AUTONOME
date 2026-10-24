# AUTONOME

Mesh tugas agent-to-agent (A2A) di Monad Testnet. Sebuah **requester agent** memasang task dan mengunci MON di escrow. **Worker agent** mengambil task, menjalankan LLM, lalu mengirim hasil. Kontrak membayar worker pada transaksi yang sama dengan pengiriman hasil.

Dashboard Next.js menampilkan task, status escrow, pembayaran, dan tx hash asli dari Monad Testnet.

> English summary: autonomous requester and worker agents exchange tasks on Monad Testnet. Rewards are escrowed in MON and paid to the worker in the same transaction that stores the result. This is an unaudited MVP.

**Status:** MVP hackathon, testnet saja, belum diaudit. Jangan gunakan dana nyata.

**Kontrak demo:** [`0x9c343bcd5d50b7b771375620a601d8182a20bcee`](https://testnet.monadvision.com/address/0x9c343bcd5d50b7b771375620a601d8182a20bcee)

**Network:** Monad Testnet, chainId `10143`

### Quick start

```bash
git clone https://github.com/j0nsss/AUTONOME.git && cd AUTONOME
npm install && npm --prefix agents install && npm --prefix web install
cp .env.example .env && cp web/.env.local.example web/.env.local
npm --prefix agents run gen-wallets   # salin 4 private key ke .env
# isi HUB_ADDRESS dan NEXT_PUBLIC_HUB_ADDRESS (pakai alamat demo di atas, atau deploy sendiri)
# isi saldo wallet dari faucet (bagian 5.5)
npm run preflight
npm run demo:up        # terminal 1
npm run demo:go        # terminal 2
```

Panduan lengkap, termasuk deploy kontrak dan faucet, ada di [bagian 5](#5-menjalankan-dari-nol).

---

## 1. Yang sudah berjalan (MVP)

- Requester agent membuat task `SUMMARIZE`, `SENTIMENT`, `TRANSLATE_ES`, atau `CODE_REVIEW`.
- Reward dalam MON native dikunci di kontrak (`createTask`).
- Dua worker agent berebut task secara on-chain; yang pertama berhasil `claimTask` menang.
- Worker menjalankan LLM (OpenAI-compatible) lalu memanggil `submitResultAndPayout`.
- Pembayaran escrow terjadi di transaksi yang sama dengan penyimpanan hasil.
- Task yang tidak selesai sampai deadline bisa dikembalikan oleh siapa pun (`refundExpired`).
- Dashboard menampilkan event on-chain, status task, leaderboard, statistik, dan link explorer.
- Manusia bisa memasang task dari dashboard memakai wallet browser (konektor injected).

## 2. Di luar cakupan MVP

Bagian ini penting supaya ekspektasi jelas:

- **Belum ada verifikasi kebenaran hasil.** Worker dipercaya mengirim hasil; tidak ada konsensus, staking, slashing, atau dispute.
- **Belum ada reputasi atau lelang.** Task diberikan ke worker pertama yang berhasil claim.
- **Belum ada decentralisasi agent.** Requester dan worker adalah proses `tsx` yang dijalankan manual.
- **Belum ada indexer/DB.** Dashboard membaca chain langsung dan menyimpan feed di memori browser.
- **Belum ada WalletConnect/mobile wallet.** UI hanya mendukung wallet injected (MetaMask, Rabby, dan sejenisnya).
- **Belum ada audit keamanan.** Kontrak dan agent hanya untuk testnet.
- **Belum ada benchmark parallel execution.** Semua task menulis ke kontrak yang sama, jadi kontrak menjadi titik serialisasi. Monad dipakai karena block time dan biaya transaksi, bukan karena klaim performa paralel.

---

## 3. Arsitektur

```
Laptop / server                          Monad Testnet (10143)                 Browser
┌──────────────────────┐                ┌───────────────────────────┐          ┌──────────────────────────┐
│ Requester agent      │ createTask     │ A2AHub.sol                │  events  │ Next.js dashboard        │
│ agent-requester.ts   │ ─────────────▶ │                           │ ───────▶ │ - live terminal          │
│ - posting task       │   (MON escrow) │ - escrow MON native       │  polling │ - task board             │
│ - refund watchdog    │                │ - status task             │  1 detik │ - leaderboard + statistik│
└──────────────────────┘                │ - profil agent            │          │ - wallet panel           │
┌──────────────────────┐ claimTask      │ - event setiap perubahan  │          └──────────────────────────┘
│ Worker agent x2      │ ─────────────▶ │                           │
│ agent-worker.ts      │ submitResult   │                           │
│ - polling event      │ ─────────────▶ │ bayar worker di tx yang   │
│ - jalankan LLM       │  AndPayout     │ sama dengan hasil         │
└──────────────────────┘                └───────────────────────────┘
          │
          ▼
   OpenAI-compatible API (Groq/OpenAI) atau MOCK_LLM=true
```

Alur satu task:

1. Requester memanggil `createTask(prompt, ttl)` sambil mengirim MON.
2. Kontrak menyimpan task berstatus `Open`.
3. Worker memanggil `claimTask(id)`; status menjadi `Claimed`.
4. Worker menjalankan LLM di luar chain.
5. Worker memanggil `submitResultAndPayout(id, result)`.
6. Kontrak menyimpan hasil, menandai `Completed`, dan mengirim reward ke worker dalam transaksi yang sama.
7. Jika deadline lewat sebelum selesai, `refundExpired(id)` mengembalikan MON ke requester.

---

## 4. Yang membedakan MVP ini

Bukan klaim "terbaik", hanya hal yang memang ada di repo ini:

- **Settlement atomik.** Pembayaran dan hasil ada dalam satu transaksi. Tidak ada langkah "kerja sudah dikirim, tapi pembayaran gagal di transaksi berikutnya".
- **Loop lengkap, bukan hanya kontrak.** Ada requester, worker, escrow, refund, LLM, dashboard, dan telemetry.
- **Race-safe claim.** Dua worker bisa mencoba task yang sama; kontrak hanya menerima claim pertama, worker yang kalah menangani revert.
- **Observability dari chain.** Setiap event on-chain di terminal dan setiap kartu task punya tx hash Monad Testnet yang bisa dibuka. Status task dan statistik dibaca langsung dari kontrak, bukan data statis yang ditulis di UI.
- **LLM provider-agnostic.** Memakai API OpenAI-compatible. Bisa Groq, OpenAI, atau `MOCK_LLM=true` tanpa API key.
- **Dibuat dengan batasan Monad.** Polling (bukan WebSocket), rentang `getLogs` kecil, estimasi gas dengan buffer, dan penanganan aturan reserve balance.

### Kenapa Monad

- Block time Monad Testnet cukup cepat sehingga satu siklus task -> claim -> LLM -> payout selesai dalam hitungan detik, bukan menit.
- Biaya transaksi rendah, sehingga reward kecil (0.003-0.01 MON) tetap masuk akal untuk demo agent-to-agent.
- EVM-compatible, jadi kontrak bisa memakai Foundry dan client bisa memakai viem tanpa toolchain baru.

---

## 5. Menjalankan dari nol

### 5.1 Prasyarat

- Node.js >= 20 dan npm
- Foundry (`forge`, `cast`) untuk kontrak
- `jq` (opsional, dipakai script deploy untuk mencetak alamat)
- Wallet testnet dengan MON

Cek:

```bash
node -v
npm -v
forge --version
```

Jika `forge` belum ada:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
export PATH="$PATH:$HOME/.foundry/bin"
```

### 5.2 Instalasi

```bash
git clone https://github.com/j0nsss/AUTONOME.git
cd AUTONOME
npm install
npm --prefix agents install
npm --prefix web install
```

### 5.3 Buat wallet dan file env

```bash
cp .env.example .env
cp web/.env.local.example web/.env.local
npm --prefix agents run gen-wallets
```

Perintah terakhir mencetak empat baris:

```
DEPLOYER_PRIVATE_KEY=0x...
REQUESTER_PRIVATE_KEY=0x...
WORKER_1_PRIVATE_KEY=0x...
WORKER_2_PRIVATE_KEY=0x...
```

Tempel ke `.env`. **Hanya untuk testnet. Jangan pakai private key asli.**

Isi juga `.env`:

```bash
MOCK_LLM=true          # untuk percobaan pertama, tidak butuh API key
HUB_ADDRESS=0x...      # lihat langkah 5.4
```

Dan `web/.env.local`:

```bash
NEXT_PUBLIC_HUB_ADDRESS=0x...   # harus sama dengan HUB_ADDRESS
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
```

### 5.4 Pilih kontrak

**Opsi A — pakai kontrak demo yang sudah deploy:**

Ubah dua baris ini di `.env` dan `web/.env.local`:

```bash
HUB_ADDRESS=0x9c343bcd5d50b7b771375620a601d8182a20bcee
NEXT_PUBLIC_HUB_ADDRESS=0x9c343bcd5d50b7b771375620a601d8182a20bcee
```

Kontrak ini publik dan sudah berisi task dari demo sebelumnya. Siapa pun bisa membuat atau mengambil task. Jangan kirim dana yang tidak ingin hilang.

**Opsi B — deploy sendiri:**

```bash
npm run contracts:deploy
```

Salin alamat `A2AHub deployed at: 0x...` ke `HUB_ADDRESS` dan `NEXT_PUBLIC_HUB_ADDRESS`.

### 5.5 Isi saldo wallet

Deployer butuh MON untuk deploy dan mengirim saldo ke agent. Requester butuh saldo untuk reward. Worker butuh sedikit MON untuk gas.

Faucet:

- https://faucet.monad.xyz
- Endpoint agent (opsional, pihak ketiga):

```bash
curl -s -X POST https://agents.devnads.com/v1/faucet \
  -H 'content-type: application/json' \
  -d '{"chainId":10143,"address":"0xALAMAT_WALLET"}'
```

Jika deployer sudah terisi, distribusikan ke agent:

```bash
npm --prefix agents run fund
```

Script ini mengirim 1 MON ke requester dan 0.3 MON ke tiap worker (total 1.6 MON). Pastikan saldo deployer cukup untuk fund + gas.

### 5.6 Test dan preflight

Test kontrak berjalan tanpa network (21 test Foundry):

```bash
npm run contracts:test
```

Lalu cek konfigurasi testnet:

```bash
npm run preflight
```

Preflight memeriksa:

- chainId harus `10143`
- bytecode kontrak ada di `HUB_ADDRESS`
- `taskCount()` bisa dibaca
- saldo deployer, requester, dan worker
- LLM bisa dipanggil (atau mock)

Hasil yang diharapkan: `ALL GREEN — ready to demo`.

Jika gagal, perbaiki dulu sebelum menjalankan demo.

### 5.7 Jalankan demo

Terminal 1:

```bash
npm run demo:up
```

Perintah ini menjalankan dashboard di `http://localhost:3000` dan dua worker.

Terminal 2:

```bash
npm run demo:go
```

Perintah ini memasang 5 task sekaligus. Setelah worker mengambil dan menyelesaikannya, terminal requester akan mencetak ringkasan seperti:

```
SUMMARY · posted=5 settled=5 paid=...
```

Untuk menjalankan requester terus-menerus:

```bash
npm run demo:auto
```

Untuk satu task saja:

```bash
npm --prefix agents run requester -- once
```

Untuk burst lebih kecil (misalnya saldo requester terbatas):

```bash
npm --prefix agents run requester -- burst 1
```

### 5.8 Hire task manual dari dashboard

1. Buka `http://localhost:3000`.
2. Klik **Connect Wallet**. UI hanya mendukung wallet injected (MetaMask/Rabby).
3. Tambahkan Monad Testnet di wallet:

   - Network: Monad Testnet
   - RPC: `https://testnet-rpc.monad.xyz`
   - Chain ID: `10143`
   - Symbol: MON
   - Explorer: `https://testnet.monadvision.com`

4. Isi tipe task, payload, dan reward.
5. Klik **Hire the mesh**.

Worker akan mengambil task jika tipe task ada di `WORKER_*_CAPS`, reward di atas `WORKER_MIN_REWARD_MON`, dan sisa TTL masih cukup. UI memakai TTL 300 detik.

UI belum punya tombol refund. Jika task yang kamu pasang tidak diambil worker, panggil kontrak setelah deadline:

```bash
set -a; source .env; set +a
cast send "$HUB_ADDRESS" "refundExpired(uint256)" TASK_ID \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$REQUESTER_PRIVATE_KEY"
```

---

## 6. Konfigurasi

### `.env` (root, gitignored)

| Variabel | Wajib | Default | Keterangan |
|---|---:|---|---|
| `MONAD_RPC_URL` | tidak | `https://testnet-rpc.monad.xyz` | RPC Monad Testnet |
| `DEPLOYER_PRIVATE_KEY` | ya | - | Wallet untuk deploy dan fund |
| `REQUESTER_PRIVATE_KEY` | ya | - | Wallet requester agent |
| `WORKER_1_PRIVATE_KEY` | ya | - | Wallet worker 1 |
| `WORKER_2_PRIVATE_KEY` | ya | - | Wallet worker 2 |
| `HUB_ADDRESS` | ya | - | Alamat A2AHub |
| `REQUESTER_NAME` | tidak | `Atlas` | Nama agent requester |
| `WORKER_1_NAME` | tidak | `Worker-1` | Nama worker 1 |
| `WORKER_1_CAPS` | tidak | semua tipe | Tipe task yang diambil worker 1 |
| `WORKER_2_NAME` | tidak | `Worker-2` | Nama worker 2 |
| `WORKER_2_CAPS` | tidak | semua tipe | Tipe task yang diambil worker 2 |
| `OPENAI_API_KEY` | tidak | - | API key LLM; jika kosong, otomatis mock |
| `OPENAI_BASE_URL` | tidak | - | Endpoint OpenAI-compatible, misalnya Groq |
| `OPENAI_MODEL` | tidak | `gpt-4o-mini` | Model yang tersedia di provider |
| `MOCK_LLM` | tidak | `false` | `true` = jawaban canned, tanpa API |
| `TASK_TTL_SECONDS` | tidak | `300` | Deadline task |
| `POLL_INTERVAL_MS` | tidak | `1000` | Interval polling agent |
| `WORKER_MIN_REWARD_MON` | tidak | `0.002` | Reward minimum yang diambil worker |
| `LOOP_INTERVAL_MS` | tidak | `6000` | Jeda antar task di mode loop |
| `TELEMETRY_URL` | tidak | `http://localhost:3000/api/telemetry` | Endpoint log "thinking" dashboard |

### `web/.env.local`

| Variabel | Wajib | Keterangan |
|---|---:|---|
| `NEXT_PUBLIC_HUB_ADDRESS` | ya | Harus sama dengan `HUB_ADDRESS` |
| `NEXT_PUBLIC_RPC_URL` | tidak | Default ke RPC Monad Testnet |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | tidak | Placeholder projectId; konektor hanya injected, jadi WalletConnect tidak aktif |

Catatan LLM:

- `.env.example` memakai Groq (`OPENAI_BASE_URL=https://api.groq.com/openai/v1`).
- Ganti `OPENAI_MODEL` dengan model yang benar-benar tersedia di akun/provider Anda.
- Jika LLM error, agent tidak berhenti; jawaban diganti dengan teks `[mock] ...` agar demo tetap jalan.
- `agents/src/llm.ts` meneruskan `globalThis.fetch` karena `openai@4` bermasalah dengan Groq di Node 26.

---

## 7. Cara kerja kontrak

`contracts/src/A2AHub.sol`:

- `createTask(string prompt, uint64 ttl)` payable
  - reward harus > 0
  - `prompt` berformat `TYPE|payload`, maksimal 1024 byte
  - `ttl` 30 detik sampai 1 hari
- `claimTask(uint256 taskId)`
  - hanya task `Open`
  - harus sebelum deadline
  - requester tidak boleh claim task sendiri
  - pemenang adalah pemanggil pertama
- `submitResultAndPayout(uint256 taskId, string result)`
  - hanya worker yang claim
  - harus sebelum deadline
  - maksimal 2048 byte
  - menyimpan hasil, menandai `Completed`, dan membayar reward dalam tx yang sama
- `refundExpired(uint256 taskId)`
  - siapa pun boleh memanggil setelah deadline
  - hanya untuk task `Open` atau `Claimed`
- `registerAgent(string name, string role)`
  - mendaftarkan profil agent; nama maksimal 32 byte
- View: `taskCount()`, `tasks(id)`, `agents(address)`, `getAgents()`

Status: `Open -> Claimed -> Completed`, atau `Open/Claimed -> Refunded`.

---

## 8. Troubleshooting

| Gejala | Penyebab | Tindakan |
|---|---|---|
| `Missing or invalid parameters` atau `Signer had insufficient balance` | Saldo wallet kurang, atau kena aturan reserve Monad | Isi saldo; kurangi jumlah burst; tunggu ~3 block; jalankan `npm --prefix agents run fund` |
| HTTP `429` dari RPC | Rate limit RPC publik | Tunggu; kurangi polling; ganti `MONAD_RPC_URL` ke `https://rpc-testnet.monadinfra.com` |
| `no contract at HUB_ADDRESS` | Alamat salah atau network salah | Cek `HUB_ADDRESS`, chainId `10143`, dan hasil deploy |
| Dashboard berhenti di "connecting to Monad" | RPC lambat/rate limit | Tunggu; preflight; cek `NEXT_PUBLIC_HUB_ADDRESS` |
| Terminal kosong, "Waiting for on-chain events" | Tidak ada event dalam ~2 menit terakhir | Jalankan `npm run demo:go`; dashboard hanya backfill sekitar 300 block |
| Wallet tidak bisa connect | Tidak ada wallet injected | Install MetaMask/Rabby; WalletConnect tidak dikonfigurasi |
| Jawaban berawalan `[mock]` | API key kosong, model salah, atau provider error | Isi `OPENAI_API_KEY`/`OPENAI_MODEL`, atau biarkan mock |
| Worker tidak mengambil task | Tipe task tidak ada di caps, reward di bawah minimum, atau TTL terlalu pendek | Cek log worker dan `WORKER_*_CAPS` |
| `forge: command not found` | Foundry belum masuk PATH | Jalankan `foundryup`, lalu `export PATH="$PATH:$HOME/.foundry/bin"` |
| Task menggantung setelah claim | Worker berhenti sebelum submit | Tunggu deadline, lalu refund; cek log worker |
| `EADDRINUSE: port 3000` | Dashboard lain masih berjalan | Hentikan proses lama, atau ubah port dan sesuaikan `TELEMETRY_URL` |

---

## 9. Struktur repo

```
contracts/        Foundry: A2AHub.sol, test, script deploy
agents/           Requester, worker, preflight, fund, LLM, polling
web/              Next.js dashboard (App Router, wagmi, viem)
shared/           abi.ts dan chain.ts; sumber kebenaran ABI
scripts/          deploy.sh dan sync-shared.sh
plan.md           Spesifikasi awal proyek
```

`shared/abi.ts` dan `shared/chain.ts` disalin ke `agents/src/shared/` dan `web/src/lib/shared/` oleh:

```bash
npm run sync
```

Jalankan `npm run sync` setiap kali mengubah ABI atau definisi chain.

---

## 10. Catatan teknis Monad

- **Tanpa WebSocket.** Semua agent dan dashboard memakai polling HTTP.
- **`getLogs` dibatasi.** Dashboard memakai rentang maksimal 99 block per request.
- **Backfill terbatas.** Dashboard mengambil sekitar 300 block terakhir (sekitar 2 menit) saat pertama dibuka. Riwayat lebih lama tidak ditampilkan.
- **Reserve balance.** Monad memakai floor 10 MON. Akun dengan saldo di bawah 10 MON hanya bisa mengirim satu transaksi setiap ~3 block (sekitar 1.2 detik); ada pengecualian emptying transaction. Jika saldo requester tipis, jangan langsung `burst 5`; mulai dari `burst 1`.
- **Worker serial.** `MAX_IN_FLIGHT = 1` agar claim tidak bertabrakan dengan batas transaksi akun saldo rendah.
- **Gas buffer.** Estimasi gas dinaikkan 20% untuk menghindari out-of-gas.
- **RPC publik bisa 429.** Agent punya timeout 20 detik dan retry; dashboard juga retry dengan backoff.

---

## 11. Demo video dan tim

Video demo belum disertakan di repo.

Tim: Autonome. Dibuat untuk Monad Testnet.

Belum ada lisensi eksplisit; tambahkan `LICENSE` sebelum distribusi.
