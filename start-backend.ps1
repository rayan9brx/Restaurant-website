# Start the backend with the same local database credential used by IntelliJ.
$ErrorActionPreference = 'Stop'
$previousDbPassword = $env:DB_PASSWORD
$previousJavaHome = $env:JAVA_HOME
$locationChanged = $false

try {
    if ([string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
        $ideaSettings = Join-Path $PSScriptRoot '.idea/workspace.xml'
        if (Test-Path -LiteralPath $ideaSettings) {
            $settings = [xml](Get-Content -LiteralPath $ideaSettings -Raw)
            $credential = $settings.SelectSingleNode('//env[@name="DB_PASSWORD"]')
            if ($null -ne $credential) { $env:DB_PASSWORD = $credential.value }
        }
    }

    if ([string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
        throw 'Set DB_PASSWORD to your PostgreSQL password, or configure it in the IntelliJ run configuration.'
    }

    if ([string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        $installedJava21 = Join-Path $env:USERPROFILE '.jdks/ms-21.0.12.1'
        if (Test-Path -LiteralPath (Join-Path $installedJava21 'bin/java.exe')) {
            $env:JAVA_HOME = $installedJava21
        } else {
            throw 'Set JAVA_HOME to your Java 21 installation.'
        }
    }

    # Credentials stay in the process environment and are never printed or copied into source files.
    Push-Location (Join-Path $PSScriptRoot 'Restaurant')
    $locationChanged = $true
    & .\mvnw.cmd -B spring-boot:run
    if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE." }
} finally {
    if ($locationChanged) { Pop-Location }
    $env:DB_PASSWORD = $previousDbPassword
    $env:JAVA_HOME = $previousJavaHome
}
