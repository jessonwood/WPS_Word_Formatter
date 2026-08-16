# WPS Word Formatter - Offline Deployment Script
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

$pkgJsonPath = Join-Path $projectRoot "package.json"
$pkgJson = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
$version = $pkgJson.version
if (-not $version) { throw "package.json version is missing" }

$distDir = Join-Path $projectRoot "dist"
$targetJsAddonsDir = "$env:APPDATA\kingsoft\wps\jsaddons"
$folderName = "WpsWordFormatter_$version"
$addonFolder = Join-Path $targetJsAddonsDir $folderName
$targetPublishXml = Join-Path $targetJsAddonsDir "publish.xml"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " WPS Word Formatter - Offline Deployment" -ForegroundColor Cyan
Write-Host " Project Version: v$version" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "[1/3] Building production bundle..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path $targetJsAddonsDir)) {
    New-Item -ItemType Directory -Path $targetJsAddonsDir -Force | Out-Null
}

Write-Host "[2/3] Deploying files to $folderName..." -ForegroundColor Yellow
if (Test-Path $addonFolder) {
    Remove-Item $addonFolder -Recurse -Force
}
New-Item -ItemType Directory -Path $addonFolder -Force | Out-Null
Copy-Item "$distDir\*" $addonFolder -Recurse -Force

Write-Host "[3/3] Updating publish.xml without touching other add-ins..." -ForegroundColor Yellow

function New-PublishDocument {
    $doc = New-Object System.Xml.XmlDocument
    $decl = $doc.CreateXmlDeclaration("1.0", "utf-8", $null)
    [void]$doc.AppendChild($decl)
    $root = $doc.CreateElement("jsplugins")
    [void]$doc.AppendChild($root)
    return $doc
}

$xml = $null
if (Test-Path $targetPublishXml) {
    try {
        $xml = New-Object System.Xml.XmlDocument
        $xml.PreserveWhitespace = $true
        $xml.Load($targetPublishXml)
        if (-not $xml.DocumentElement -or $xml.DocumentElement.Name -ne "jsplugins") {
            throw "Unexpected publish.xml root element"
        }
    } catch {
        $backupPath = "$targetPublishXml.before-WpsWordFormatter.$((Get-Date).ToString('yyyyMMdd_HHmmss')).bak"
        Copy-Item $targetPublishXml $backupPath -Force
        Write-Warning "Existing publish.xml could not be parsed. A backup was created at $backupPath; installation will not overwrite it."
        throw "Cannot safely update existing publish.xml"
    }
} else {
    $xml = New-PublishDocument
}

$existingNodes = @($xml.DocumentElement.SelectNodes("jsplugin[@name='WpsWordFormatter']"))
foreach ($node in $existingNodes) {
    [void]$xml.DocumentElement.RemoveChild($node)
}

$plugin = $xml.CreateElement("jsplugin")
$plugin.SetAttribute("version", $version)
$plugin.SetAttribute("name", "WpsWordFormatter")
$plugin.SetAttribute("url", $folderName)
$plugin.SetAttribute("enable", "enable_dev")
$plugin.SetAttribute("type", "wps")
[void]$xml.DocumentElement.AppendChild($plugin)

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Encoding = New-Object System.Text.UTF8Encoding($false)
$settings.Indent = $true
$settings.NewLineChars = "`r`n"
$writer = [System.Xml.XmlWriter]::Create($targetPublishXml, $settings)
try { $xml.Save($writer) } finally { $writer.Close() }

Write-Host ""
Write-Host "Offline deployment succeeded! Version: v$version" -ForegroundColor Green
Write-Host "Folder: $addonFolder" -ForegroundColor Gray
Write-Host "Config: $targetPublishXml" -ForegroundColor Gray
Write-Host "Other WPS JS add-in registrations were preserved." -ForegroundColor Green
Write-Host "Please restart WPS Writer." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
