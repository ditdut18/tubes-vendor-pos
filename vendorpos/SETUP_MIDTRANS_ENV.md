# SETUP_MIDTRANS_ENV (vendorpos)

Dokumen ini menjelaskan cara mengisi konfigurasi Midtrans menggunakan **environment variables**.

## 1) Isi Environment Variable
Di Windows (CMD) contoh:

```bat
set MIDTRANS_SERVER_KEY=SB-Mid-server-ISI_DENGAN_SERVER_KEY_KAMU
set MIDTRANS_CLIENT_KEY=SB-Mid-client-ISI_DENGAN_CLIENT_KEY_KAMU
set MIDTRANS_IS_PRODUCTION=false
```

Catatan:
- `MIDTRANS_SERVER_KEY` wajib untuk Basic Auth di endpoint Midtrans (Snap token & status).
- `MIDTRANS_IS_PRODUCTION`:
  - `false` untuk sandbox
  - `true` untuk production

## 2) Jalankan aplikasi
Dari folder `vendorpos`:

```bat
mvnw spring-boot:run
```

## 3) Verifikasi
- Endpoint pembuatan pembayaran: `POST http://localhost:8081/api/transactions/pay`
- Endpoint webhook: `POST http://localhost:8081/api/transactions/midtrans-webhook`

Pastikan nilai `snapToken` bisa terbentuk saat `paymentMethod` bukan `Cash`.

