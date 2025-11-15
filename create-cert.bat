@echo off
echo ========================================
echo Creation du certificat SSL pour HTTPS
echo ========================================
echo.

REM Creer le dossier certs s'il n'existe pas
if not exist "certs" mkdir certs

echo Verification d'OpenSSL...
where openssl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERREUR: OpenSSL n'est pas installe ou n'est pas dans le PATH.
    echo.
    echo Options pour installer OpenSSL:
    echo 1. Installer Git for Windows (inclut OpenSSL)
    echo    https://git-scm.com/download/win
    echo.
    echo 2. Installer OpenSSL via Chocolatey:
    echo    choco install openssl
    echo.
    echo 3. Installer OpenSSL via winget:
    echo    winget install ShiningLight.OpenSSL
    echo.
    echo 4. Telecharger OpenSSL manuellement:
    echo    https://slproweb.com/products/Win32OpenSSL.html
    echo.
    pause
    exit /b 1
)

echo OpenSSL trouve!
echo.
echo Generation du certificat SSL...
echo.

REM Generer la cle privee
openssl genrsa -out certs\localhost-key.pem 2048

REM Generer le certificat auto-signe avec l'IP et localhost
openssl req -new -x509 -key certs\localhost-key.pem -out certs\localhost.pem -days 365 -subj "/CN=192.168.1.13/CN=localhost/CN=127.0.0.1" -addext "subjectAltName=IP:192.168.1.13,IP:127.0.0.1,DNS:localhost"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Certificat cree avec succes!
    echo ========================================
    echo.
    echo Fichiers crees:
    echo   - certs\localhost-key.pem
    echo   - certs\localhost.pem
    echo.
    echo Vous pouvez maintenant lancer: npm run dev
    echo.
    echo Acces depuis votre smartphone:
    echo   https://192.168.1.13:5173
    echo.
    echo Note: Vous devrez accepter le certificat auto-signe
    echo        dans votre navigateur (avertissement de securite normal)
    echo.
) else (
    echo.
    echo ERREUR lors de la creation du certificat.
    echo.
)

pause

