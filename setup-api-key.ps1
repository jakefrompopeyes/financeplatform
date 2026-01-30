# PowerShell script to setup Twelve Data API key
Write-Host "Creating .env.local file with your Twelve Data API key..." -ForegroundColor Green
"TWELVE_DATA_API_KEY=85cae53013c54d9d892031c93fc7e310" | Out-File -FilePath .env.local -Encoding utf8
Write-Host ""
Write-Host "✓ Done! .env.local file created successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm install"
Write-Host "2. Run: npm run dev"
Write-Host "3. Open: http://localhost:3000"
Write-Host ""




