# PowerShell script to fix Reports button conflict
$filePath = "app.js"

# Read the file
$content = Get-Content $filePath -Raw

# Define what to find and replace
$oldPattern = @"
    // Reports button \(placeholder\)
    const reportsBtn = document\.getElementById\('reportsBtn'\);
    if \(reportsBtn\) \{
        reportsBtn\.addEventListener\('click', \(\) => \{
            alert\('📊 Reports feature coming soon!.*?'\);
        \}\);
    \}
"@

$replacement = @"
    // Reports button - Now handled by reports-modal.js
    // (Old placeholder code removed)
"@

# Replace using regex
$newContent = $content -replace $oldPattern, $replacement

# Write back
Set-Content -Path $filePath -Value $newContent

Write-Host "✅ Fixed! Old Reports placeholder removed." -ForegroundColor Green
Write-Host "📊 Reports modal should now work. Refresh your browser!" -ForegroundColor Cyan
