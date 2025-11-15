#!/bin/bash

echo "========================================"
echo "Création du certificat SSL pour HTTPS"
echo "========================================"
echo ""

# Créer le dossier certs s'il n'existe pas
mkdir -p certs

# Vérifier si OpenSSL est installé
if ! command -v openssl &> /dev/null; then
    echo "ERREUR: OpenSSL n'est pas installé."
    echo ""
    echo "Pour installer OpenSSL sur Windows:"
    echo "1. Installer Git for Windows (inclut OpenSSL)"
    echo "2. Installer OpenSSL via Chocolatey: choco install openssl"
    echo "3. Installer OpenSSL via winget: winget install ShiningLight.OpenSSL"
    exit 1
fi

echo "OpenSSL trouvé!"
echo ""
echo "Génération du certificat SSL..."
echo ""

# Générer la clé privée
openssl genrsa -out certs/localhost-key.pem 2048

# Générer le certificat auto-signé avec l'IP et localhost
openssl req -new -x509 -key certs/localhost-key.pem -out certs/localhost.pem -days 365 \
    -subj "/CN=192.168.1.13/CN=localhost/CN=127.0.0.1" \
    -addext "subjectAltName=IP:192.168.1.13,IP:127.0.0.1,DNS:localhost"

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Certificat créé avec succès!"
    echo "========================================"
    echo ""
    echo "Fichiers créés:"
    echo "  - certs/localhost-key.pem"
    echo "  - certs/localhost.pem"
    echo ""
    echo "Vous pouvez maintenant lancer: npm run dev"
    echo ""
    echo "Accès depuis votre smartphone:"
    echo "  https://192.168.1.13:5173"
    echo ""
    echo "Note: Vous devrez accepter le certificat auto-signé"
    echo "      dans votre navigateur (avertissement de sécurité normal)"
    echo ""
else
    echo ""
    echo "ERREUR lors de la création du certificat."
    echo ""
    exit 1
fi

