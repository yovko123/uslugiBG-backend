$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    email = "test@example.com"
    password = "password123"
    firstName = "John"
    lastName = "Doe"
    phone = "1234567890"
    userType = "customer"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3005/api/auth/register" -Headers $headers -Body $body


$login_body = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -uri "http://localhost:3005/api/auth/login" -headers $headers -body $login_body


$body = @{
    email = "test@example.com"
    password = "password123"
    firstName = "Test"
    lastName = "User"
    phone = "1234567890"
    userType = "customer"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3005/api/auth/register" -Method Post -Body $body -ContentType "application/json"