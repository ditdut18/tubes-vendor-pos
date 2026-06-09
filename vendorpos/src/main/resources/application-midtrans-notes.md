Catatan Midtrans (vendorpos)

- midtrans.server-key diambil dari env: MIDTRANS_SERVER_KEY
- midtrans.client-key diambil dari env: MIDTRANS_CLIENT_KEY (tidak dipakai di backend untuk Snap server-to-server)
- midtrans.is-production diambil dari env: MIDTRANS_IS_PRODUCTION (false = sandbox)

Webhook endpoint: POST /api/transactions/midtrans-webhook
Endpoint payment: POST /api/transactions/pay

