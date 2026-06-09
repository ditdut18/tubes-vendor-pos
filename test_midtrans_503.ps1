# Test 503 response when Midtrans not configured
$body = @{ username = "admin"; password = "secure123" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri http://localhost:8081/api/auth/login -Method Post -Body $body -ContentType "application/json"
$token = $loginRes.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "================================================================"
Write-Host "TEST: Non-Cash transaksi saat Midtrans belum dikonfigurasi"
Write-Host "Expected: HTTP 503 Service Unavailable"
Write-Host "================================================================"

$txBody = @{ vendorId = 1; amount = 500000; paymentMethod = "Bank Transfer" } | ConvertTo-Json

try {
    $txRes = Invoke-RestMethod -Uri http://localhost:8081/api/transactions/pay `
        -Method Post -Body $txBody -ContentType "application/json" -Headers $headers
    Write-Host "[UNEXPECTED 200] snapToken = $($txRes.snapToken)"
    Write-Host "MASALAH: Backend masih return 200 dengan snapToken null"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    
    Write-Host "HTTP Status Code : $statusCode"
    Write-Host "Response Body    : $responseBody"
    
    if ($statusCode -eq 503) {
        Write-Host ""
        Write-Host "[PASS] Backend kini mengembalikan 503 ketika Midtrans tidak dikonfigurasi."
        Write-Host "       Frontend akan menampilkan pesan error yang jelas, BUKAN membuka simulator internal."
    } elseif ($statusCode -eq 502) {
        Write-Host "[PASS] Backend mengembalikan 502 - error komunikasi ke Midtrans API."
    } else {
        Write-Host "[INFO] Unexpected status code: $statusCode"
    }
}

Write-Host ""
Write-Host "================================================================"
Write-Host "TEST: Cash transaksi - harus tetap berhasil (Cash tidak butuh Midtrans)"
Write-Host "Expected: HTTP 200 OK"
Write-Host "================================================================"

$cashTxBody = @{ vendorId = 1; amount = 75000; paymentMethod = "Cash" } | ConvertTo-Json
try {
    $cashRes = Invoke-RestMethod -Uri http://localhost:8081/api/transactions/pay `
        -Method Post -Body $cashTxBody -ContentType "application/json" -Headers $headers
    Write-Host "[PASS] Cash transaksi berhasil"
    Write-Host "  receiptNumber : $($cashRes.receiptNumber)"
    Write-Host "  amount        : $($cashRes.amount)"
    Write-Host "  paymentMethod : $($cashRes.paymentMethod)"
    Write-Host "  status        : $($cashRes.status)"
    Write-Host "  snapToken     : $(if ($null -eq $cashRes.snapToken) { 'null (benar, Cash tidak perlu Snap)' } else { $cashRes.snapToken })"
} catch {
    Write-Host "[FAIL] Cash transaksi gagal: $_"
}
