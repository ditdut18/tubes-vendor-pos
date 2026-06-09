$body = @{ username = "admin"; password = "secure123" } | ConvertTo-Json
$res = Invoke-RestMethod -Uri http://localhost:8081/api/auth/login -Method Post -Body $body -ContentType "application/json"
$token = $res.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "--- Testing GET /api/vendors ---"
Invoke-RestMethod -Uri http://localhost:8081/api/vendors -Method Get -Headers $headers | ConvertTo-Json -Depth 3

Write-Host "--- Testing POST /api/vendors ---"
$vendorBody = @{ namaPerusahaan = "Test Vendor"; kontak = "08123456789"; alamat = "Test Address"; statusKerjasama = "Aktif"; defaultPrice = 50000 } | ConvertTo-Json
$newVendor = Invoke-RestMethod -Uri http://localhost:8081/api/vendors -Method Post -Body $vendorBody -ContentType "application/json" -Headers $headers
$newVendor | ConvertTo-Json

$vid = $newVendor.id
Write-Host "--- Testing GET /api/vendors/$vid/contract ---"
# Contract PDF usually is a download, we'll just check the response code
try {
    Invoke-WebRequest -Uri "http://localhost:8081/api/vendors/$vid/contract" -Method Get -Headers $headers -OutFile test_contract.pdf
    Write-Host "Contract PDF downloaded successfully."
} catch {
    Write-Host "Contract error: $_"
}

Write-Host "--- Testing POST /api/transactions/pay ---"
$txBody = @{ vendorId = $vid; amount = 150000; paymentMethod = "Bank Transfer" } | ConvertTo-Json
$newTx = Invoke-RestMethod -Uri http://localhost:8081/api/transactions/pay -Method Post -Body $txBody -ContentType "application/json" -Headers $headers
$newTx | ConvertTo-Json
