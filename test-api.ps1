Write-Host "=== Multitenancy API Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Register Company A
Write-Host "Test 1: Register Company A" -ForegroundColor Yellow
$registerBody = @{
    email       = "test-a@example.com"
    password    = "password123"
    name        = "User A"
    companyName = "Company A"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody `
        -SessionVariable sessionA `
        -UseBasicParsing
    
    Write-Host "SUCCESS: Registration completed" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2: Get user info
Write-Host "Test 2: Get user info" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/me" `
        -Method GET `
        -WebSession $sessionA `
        -UseBasicParsing
    
    Write-Host "SUCCESS: User info retrieved" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 3: Create division for Company A
Write-Host "Test 3: Create division for Company A" -ForegroundColor Yellow
$divisionBody = @{
    name = "Division A1"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/divisions" `
        -Method POST `
        -ContentType "application/json" `
        -Body $divisionBody `
        -WebSession $sessionA `
        -UseBasicParsing
    
    Write-Host "SUCCESS: Division created" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 4: Register Company B
Write-Host "Test 4: Register Company B" -ForegroundColor Yellow
$registerBodyB = @{
    email       = "test-b@example.com"
    password    = "password123"
    name        = "User B"
    companyName = "Company B"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBodyB `
        -SessionVariable sessionB `
        -UseBasicParsing
    
    Write-Host "SUCCESS: Registration completed" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 5: Get divisions for Company B (should be empty - data isolation test)
Write-Host "Test 5: Get divisions for Company B (Data Isolation Test)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/divisions" `
        -Method GET `
        -WebSession $sessionB `
        -UseBasicParsing
    
    $divisions = $response.Content | ConvertFrom-Json
    if ($divisions.Count -eq 0) {
        Write-Host "SUCCESS: Data isolation working! Company B cannot see Company A data" -ForegroundColor Green
    }
    else {
        Write-Host "FAILED: Data isolation broken! Company B can see other company data" -ForegroundColor Red
    }
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 6: Get divisions for Company A (should have data)
Write-Host "Test 6: Get divisions for Company A" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/divisions" `
        -Method GET `
        -WebSession $sessionA `
        -UseBasicParsing
    
    $divisions = $response.Content | ConvertFrom-Json
    if ($divisions.Count -gt 0) {
        Write-Host "SUCCESS: Company A data retrieved correctly" -ForegroundColor Green
    }
    else {
        Write-Host "FAILED: Company A data not found" -ForegroundColor Red
    }
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
