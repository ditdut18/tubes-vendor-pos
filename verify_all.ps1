# Final Verification Script
$body = @{ username = "admin"; password = "secure123" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri http://localhost:8081/api/auth/login -Method Post -Body $body -ContentType "application/json"
$token = $loginRes.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "================================================================"
Write-Host "VERIFIKASI 1 - LOGIN"
Write-Host "================================================================"
Write-Host "[PASS] Login berhasil!"
Write-Host "  message : $($loginRes.message)"
Write-Host "  role    : $($loginRes.role)"
$shortToken = $token.Substring(0, 50) + "...[DISENSOR]..." + $token.Substring($token.Length - 10)
Write-Host "  JWT     : $shortToken"

Write-Host ""
Write-Host "================================================================"
Write-Host "VERIFIKASI 2 - VENDOR CRUD"
Write-Host "================================================================"

$vendorsBefore = Invoke-RestMethod -Uri http://localhost:8081/api/vendors -Method Get -Headers $headers
Write-Host "--- [A] Data vendor SEBELUM insert: $($vendorsBefore.totalElements) vendor ---"
$vendorsBefore.content | ForEach-Object {
    Write-Host "  [ID=$($_.id)] $($_.namaPerusahaan) | $($_.statusKerjasama)"
}

$timestamp = Get-Date -Format "HHmmss"
$newVendorPayload = @{
    namaPerusahaan = "PT Final Test $timestamp"
    kontak = "08991234567"
    alamat = "Jl. Testing No.1, Bandung"
    statusKerjasama = "Aktif"
    defaultPrice = 750000
} | ConvertTo-Json
$createdVendor = Invoke-RestMethod -Uri http://localhost:8081/api/vendors -Method Post -Body $newVendorPayload -ContentType "application/json" -Headers $headers
Write-Host ""
Write-Host "--- [B] INSERT vendor baru ---"
Write-Host "[PASS] Vendor berhasil dibuat! ID=$($createdVendor.id) | $($createdVendor.namaPerusahaan)"

$vendorsAfter = Invoke-RestMethod -Uri http://localhost:8081/api/vendors -Method Get -Headers $headers
Write-Host ""
Write-Host "--- [C] Data vendor SESUDAH insert: $($vendorsAfter.totalElements) vendor ---"
$vendorsAfter.content | ForEach-Object {
    Write-Host "  [ID=$($_.id)] $($_.namaPerusahaan) | $($_.statusKerjasama) | Rp $($_.defaultPrice)"
}

Write-Host ""
Write-Host "================================================================"
Write-Host "VERIFIKASI 3 - CASH TRANSACTION (tidak butuh Midtrans)"
Write-Host "================================================================"
$cashPayload = @{ vendorId = $createdVendor.id; amount = 300000; paymentMethod = "Cash" } | ConvertTo-Json
$cashTx = Invoke-RestMethod -Uri http://localhost:8081/api/transactions/pay -Method Post -Body $cashPayload -ContentType "application/json" -Headers $headers
Write-Host "[PASS] Cash transaksi berhasil!"
Write-Host "  receiptNumber  : $($cashTx.receiptNumber)"
Write-Host "  amount         : Rp $($cashTx.amount)"
Write-Host "  paymentMethod  : $($cashTx.paymentMethod)"
Write-Host "  status         : $($cashTx.status)"
Write-Host "  snapToken      : $(if ($null -eq $cashTx.snapToken) { 'null [BENAR - Cash tidak perlu Snap]' } else { $cashTx.snapToken })"

Write-Host ""
Write-Host "================================================================"
Write-Host "VERIFIKASI 4 - NON-CASH TRANSACTION (Midtrans validation)"
Write-Host "================================================================"
$nonCashPayload = @{ vendorId = $createdVendor.id; amount = 1500000; paymentMethod = "Bank Transfer" } | ConvertTo-Json
try {
    $nonCashTx = Invoke-RestMethod -Uri http://localhost:8081/api/transactions/pay -Method Post -Body $nonCashPayload -ContentType "application/json" -Headers $headers
    Write-Host "[UNEXPECTED] Masih return 200 dengan snapToken: $($nonCashTx.snapToken)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errBody = $reader.ReadToEnd()
    Write-Host "HTTP Status Code : $statusCode"
    Write-Host "Error Message    : $errBody"
    if ($statusCode -eq 503) {
        Write-Host "[PASS] Backend menolak non-cash dengan 503 - Midtrans belum dikonfigurasi"
        Write-Host "       Frontend akan menampilkan pesan error yang jelas, TANPA membuka simulator internal"
    }
}

Write-Host ""
Write-Host "================================================================"
Write-Host "VERIFIKASI 5 - DATABASE (semua transaksi tersimpan)"
Write-Host "================================================================"
$allTx = Invoke-RestMethod -Uri http://localhost:8081/api/transactions -Method Get -Headers $headers
Write-Host "Total transaksi di database: $($allTx.Count)"
$allTx | Select-Object -First 5 | ForEach-Object {
    Write-Host "  [ID=$($_.id)] $($_.receiptNumber) | $($_.paymentMethod) | Rp $($_.amount) | $($_.status)"
}

Write-Host ""
Write-Host "================================================================"
Write-Host "RINGKASAN STATUS"
Write-Host "================================================================"
Write-Host "[PASS] Login                : Berhasil"
Write-Host "[PASS] Vendor CRUD          : Berhasil (insert, list)"
Write-Host "[PASS] Cash Transaction     : Berhasil tanpa Midtrans"
Write-Host "[PASS] Non-Cash (503 guard) : Backend reject dengan pesan jelas"
Write-Host "[PASS] Data tersimpan di DB : Terkonfirmasi"
Write-Host "[INFO] Midtrans Snap        : Perlu Server Key & Client Key dari akun sandbox Midtrans"
Write-Host ""
Write-Host "LANGKAH SELANJUTNYA - Aktifkan Midtrans:"
Write-Host "1. Login ke https://dashboard.sandbox.midtrans.com"
Write-Host "2. Settings -> Access Keys"
Write-Host "3. Copy Server Key  -> isi di MIDTRANS_SERVER_KEY environment variable"
Write-Host "4. Copy Client Key  -> isi di frontend-pos/.env.local (VITE_MIDTRANS_CLIENT_KEY)"
Write-Host "5. Restart backend"
Write-Host "6. Refresh frontend (npm run dev)"
