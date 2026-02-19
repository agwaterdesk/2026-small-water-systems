# PowerShell version of `make github` – deploy to GitHub Pages

npm run build

if (Test-Path docs) {
    Remove-Item -Recurse -Force docs
}
Copy-Item -Recurse dist docs
New-Item -ItemType File -Path "docs\.nojekyll" -Force | Out-Null
