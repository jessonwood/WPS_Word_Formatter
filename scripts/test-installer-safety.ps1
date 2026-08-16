# CI smoke test for release installer/uninstaller safety.
# Uses an isolated fake APPDATA and verifies unrelated publish.xml entries survive.
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$originalAppData = $env:APPDATA
$tempRoot = Join-Path $env:RUNNER_TEMP ("wps-word-formatter-installer-test-" + [guid]::NewGuid().ToString('N'))
$fakeAppData = Join-Path $tempRoot 'AppData\Roaming'
$jsaddons = Join-Path $fakeAppData 'kingsoft\wps\jsaddons'
$publishXml = Join-Path $jsaddons 'publish.xml'
$fakeAddonSource = Join-Path $repoRoot 'WpsWordFormatter_0.9.0-beta.1'

try {
    New-Item -ItemType Directory -Path $jsaddons -Force | Out-Null
    New-Item -ItemType Directory -Path $fakeAddonSource -Force | Out-Null
    Set-Content -Path (Join-Path $fakeAddonSource 'index.html') -Value '<html>synthetic prebuilt payload</html>' -Encoding UTF8

    @'
<jsplugins>
  <jsplugin version="1.2.3" name="OtherAddon" url="OtherAddon_1.2.3" enable="enable_dev" type="wps" />
</jsplugins>
'@ | Set-Content -Path $publishXml -Encoding UTF8

    $env:APPDATA = $fakeAppData

    # PowerShell scripts signal failure via terminating exceptions because ErrorActionPreference=Stop.
    # $LASTEXITCODE is reserved for native executables and may be $null after a successful .ps1 call.
    & (Join-Path $repoRoot 'scripts\install-prebuilt.ps1')

    [xml]$afterInstall = Get-Content $publishXml -Raw
    $otherAfterInstall = $afterInstall.SelectSingleNode("/jsplugins/jsplugin[@name='OtherAddon']")
    $oursAfterInstall = $afterInstall.SelectSingleNode("/jsplugins/jsplugin[@name='WpsWordFormatter']")

    if (-not $otherAfterInstall) { throw 'Installer removed unrelated OtherAddon entry.' }
    if (-not $oursAfterInstall) { throw 'Installer failed to register WpsWordFormatter.' }

    $installedDir = Join-Path $jsaddons 'WpsWordFormatter_0.9.0-beta.1'
    if (-not (Test-Path $installedDir)) { throw 'Installer failed to copy prebuilt add-in folder.' }

    & (Join-Path $repoRoot 'scripts\uninstall-offline.ps1')

    [xml]$afterUninstall = Get-Content $publishXml -Raw
    $otherAfterUninstall = $afterUninstall.SelectSingleNode("/jsplugins/jsplugin[@name='OtherAddon']")
    $oursAfterUninstall = $afterUninstall.SelectSingleNode("/jsplugins/jsplugin[@name='WpsWordFormatter']")

    if (-not $otherAfterUninstall) { throw 'Uninstaller removed unrelated OtherAddon entry.' }
    if ($oursAfterUninstall) { throw 'Uninstaller left WpsWordFormatter registration behind.' }
    if (Test-Path $installedDir) { throw 'Uninstaller left WpsWordFormatter program folder behind.' }

    Write-Host '[PASS] Installer/uninstaller preserved unrelated publish.xml entries.' -ForegroundColor Green
}
finally {
    $env:APPDATA = $originalAppData
    if (Test-Path $fakeAddonSource) { Remove-Item $fakeAddonSource -Recurse -Force }
    if (Test-Path $tempRoot) { Remove-Item $tempRoot -Recurse -Force }
}
