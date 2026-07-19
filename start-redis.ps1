$dest = "d:\ZiniChat\redis-local"
$zipPath = "$dest\redis.zip"

if (-not (Test-Path $dest)) {
    Write-Host "Creating directory..."
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
}

if (-not (Test-Path "$dest\redis-server.exe")) {
    Write-Host "Downloading Redis for Windows..."
    Invoke-WebRequest -Uri "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip" -OutFile $zipPath
    Write-Host "Extracting Redis..."
    Expand-Archive -Path $zipPath -DestinationPath $dest -Force
    Remove-Item $zipPath
}

Write-Host "Starting Redis server in the background..."
Start-Process -FilePath "$dest\redis-server.exe" -WindowStyle Hidden
Write-Host "Redis is now running on port 6379!"
