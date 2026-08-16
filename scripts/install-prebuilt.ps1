# WPS Word Formatter - Prebuilt Release Installer
# Installs a release archive without Node.js/npm/build tooling.
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$releaseRoot = Split-Path -Parent $scriptDir
$targetJsAddonsDir = "$env:APPDATA\kingsoft\wps\jsaddons"
$targetPublishXml = Join-Path $targetJsAddonsDir "publish.xml"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " WPS Word Formatter - Release Installer" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$addonSource = Get-ChildItem -Path $releaseRoot -Directory -Filter "WpsWordFormatter_*" |
    Sort-Object Name -Descending |
    Select-Object -First 1

if (-not $addonSource) {
    throw "Prebuilt add-in folder not found. Expected WpsWordFormatter_<version> next to the installer."
}

$folderName = $addonSource.Name
$version = $folderName -replace '^WpsWordFormatter_', ''
$addonTarget = Join-Path $targetJsAddonsDir $folderName

if (-not (Test-Path $targetJsAddonsDir)) {
    New-Item -ItemType Directory -Path $targetJsAddonsDir -Force | Out-Null
}

Write-Host "[1/2] Copying prebuilt add-in v$version..." -ForegroundColor Yellow
if (Test-Path $addonTarget) {
    Remove-Item $addonTarget -Recurse -Force
}
Copy-Item $addonSource.FullName $addonTarget -Recurse -Force

Write-Host "[2/2] Updating WPS publish.xml without touching other add-ins..." -ForegroundColor Yellow

[xml]$xml = $null
if (Test-Path $targetPublishXml) {
    try {
        $xml = [xml](Get-Content $targetPublishXml -Raw)
    } catch {
        throw "Existing publish.xml is not valid XML. Refusing to overwrite it: $targetPublishXml"
    }
}

if (-not $xml -or -not $xml.DocumentElement -or $xml.DocumentElement.Name -ne 'jsplugins') {
    $xml = New-Object System.Xml.XmlDocument
    $decl = $xml.CreateXmlDeclaration('1.0', 'utf-8', $null)
    [void]$xml.AppendChild($decl)
    [void]$xml.AppendChild($xml.CreateElement('jsplugins'))
}

$root = $xml.DocumentElement
$existing = @($root.SelectNodes("jsplugin[@name='WpsWordFormatter']"))
foreach ($node in $existing) {
    [void]$root.RemoveChild($node)
}

$plugin = $xml.CreateElement('jsplugin')
$plugin.SetAttribute('version', $version)
$plugin.SetAttribute('name', 'WpsWordFormatter')
$plugin.SetAttribute('url', $folderName)
$plugin.SetAttribute('enable', 'enable_dev')
$plugin.SetAttribute('type', 'wps')
[void]$root.AppendChild($plugin)

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Indent = $true
$settings.Encoding = New-Object System.Text.UTF8Encoding($false)
$writer = [System.Xml.XmlWriter]::Create($targetPublishXml, $settings)
try {
    $xml.Save($writer)
} finally {
    $writer.Close()
}

Write-Host ""
Write-Host "Installation succeeded." -ForegroundColor Green
Write-Host "Version: v$version" -ForegroundColor Gray
Write-Host "Folder:  $addonTarget" -ForegroundColor Gray
Write-Host "Config:  $targetPublishXml" -ForegroundColor Gray
Write-Host "Restart WPS Writer to load the add-in." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
