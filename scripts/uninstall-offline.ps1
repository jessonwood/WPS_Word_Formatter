# WPS Word Formatter - Offline Uninstallation Script
$ErrorActionPreference = "Stop"

$targetJsAddonsDir = "$env:APPDATA\kingsoft\wps\jsaddons"
$targetPublishXml = Join-Path $targetJsAddonsDir "publish.xml"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " WPS Word Formatter - Offline Uninstall" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if (Test-Path $targetPublishXml) {
    $xml = New-Object System.Xml.XmlDocument
    $xml.PreserveWhitespace = $true
    $xml.Load($targetPublishXml)

    if (-not $xml.DocumentElement -or $xml.DocumentElement.Name -ne "jsplugins") {
        throw "Unexpected publish.xml root element; refusing to modify it."
    }

    $nodes = @($xml.DocumentElement.SelectNodes("jsplugin[@name='WpsWordFormatter']"))
    foreach ($node in $nodes) {
        [void]$xml.DocumentElement.RemoveChild($node)
    }

    if ($nodes.Count -gt 0) {
        if ($xml.DocumentElement.SelectNodes("jsplugin").Count -eq 0) {
            Remove-Item -Path $targetPublishXml -Force
            Write-Host "[OK] Removed WpsWordFormatter registration; publish.xml had no other add-ins." -ForegroundColor Green
        } else {
            $settings = New-Object System.Xml.XmlWriterSettings
            $settings.Encoding = New-Object System.Text.UTF8Encoding($false)
            $settings.Indent = $true
            $settings.NewLineChars = "`r`n"
            $writer = [System.Xml.XmlWriter]::Create($targetPublishXml, $settings)
            try { $xml.Save($writer) } finally { $writer.Close() }
            Write-Host "[OK] Removed only WpsWordFormatter registration; other add-ins were preserved." -ForegroundColor Green
        }
    } else {
        Write-Host "[INFO] WpsWordFormatter registration was not present." -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] No publish.xml was found." -ForegroundColor Yellow
}

# Remove only folders owned by this add-in. User data under %APPDATA%\WPSWordFormatter is intentionally retained.
Get-ChildItem -Path $targetJsAddonsDir -Directory -Filter "WpsWordFormatter_*" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force
    Write-Host "[OK] Removed add-in folder: $($_.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Uninstall complete. Restart WPS Writer." -ForegroundColor Green
Write-Host "User templates/settings/backups were preserved." -ForegroundColor Gray
Write-Host "=========================================" -ForegroundColor Cyan
