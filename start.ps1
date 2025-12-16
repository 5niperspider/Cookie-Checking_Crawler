# Starte Docker
npm run docker:up

# Starte Backend und Frontend parallel
$backend = Start-Process -NoNewWindow -PassThru -FilePath "npm" -ArgumentList "run", "start:backend"
$frontend = Start-Process -NoNewWindow -PassThru -FilePath "npm" -ArgumentList "run", "start:frontend"

# Warte auf Abbruch (Ctrl+C)
try {
    Wait-Process -Id $backend.Id, $frontend.Id
} catch {
    # Bei Abbruch: Stoppe Docker
    Write-Host "Abbruch erkannt. Stoppe Docker..."
    npm run docker:down
    exit
}

# Wenn Prozesse normal enden, stoppe Docker
npm run docker:down