param(
  [string]$OutputFile
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$appVersion = (Get-Content -LiteralPath (Join-Path $projectRoot 'app.json') -Raw | ConvertFrom-Json).expo.version
if (-not $OutputFile) { $OutputFile = "release/mixroom-alpha-$appVersion.apk" }
$temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$buildDirectory = [IO.Path]::GetFullPath((Join-Path $temporaryRoot ("mixroom-build-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))))

if (-not $buildDirectory.StartsWith($temporaryRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Unsafe temporary build path'
}

New-Item -ItemType Directory -Path $buildDirectory | Out-Null
& robocopy.exe $projectRoot $buildDirectory /E /XD .gradle-cache .android-home .expo /NFL /NDL /NJH /NJS /NP
$copyExitCode = $LASTEXITCODE
if ($copyExitCode -gt 7) {
  throw "Project copy failed with robocopy exit code $copyExitCode"
}

$androidSdk = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Android/Sdk'))
if (-not (Test-Path -LiteralPath $androidSdk)) {
  throw "Android SDK not found at $androidSdk"
}
$javaHome = Join-Path $env:USERPROFILE '.gradle/jdks/eclipse_adoptium-17-amd64-windows.2'
if (-not (Test-Path -LiteralPath (Join-Path $javaHome 'bin/java.exe'))) {
  throw "Android Studio Java runtime not found at $javaHome"
}
$env:JAVA_HOME = $javaHome
$env:Path = (Join-Path $javaHome 'bin') + [IO.Path]::PathSeparator + $env:Path

$localProperties = 'sdk.dir=' + $androidSdk.Replace('\', '/')
Set-Content -LiteralPath (Join-Path $buildDirectory 'android/local.properties') -Value $localProperties -Encoding ascii
$gradleProperties = Join-Path $buildDirectory 'android/gradle.properties'
Add-Content -LiteralPath $gradleProperties -Value "`nandroid.overridePathCheck=true" -Encoding ascii

$gradle = Join-Path $buildDirectory 'android/gradlew.bat'
Push-Location (Join-Path $buildDirectory 'android')
try {
  & $gradle assembleRelease --no-daemon
  if ($LASTEXITCODE -ne 0) { throw "Gradle failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

$apk = Join-Path $buildDirectory 'android/app/build/outputs/apk/release/app-release.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw 'Release APK was not created' }
$destination = [IO.Path]::GetFullPath((Join-Path $projectRoot $OutputFile))
New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
Copy-Item -LiteralPath $apk -Destination $destination -Force
Get-FileHash -Algorithm SHA256 -LiteralPath $destination
