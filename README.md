# Scan Inventaire PWA

Application Progressive Web App (PWA) pour scanner des codes-barres et gérer un inventaire.

## Fonctionnalités

- 📷 Scan de codes-barres en temps réel avec la caméra
- 📱 Compatible mobile et desktop
- 💾 Stockage local des codes scannés
- 🔄 Application PWA installable

## Installation

```bash
npm install
```

## Développement

### Configuration HTTPS (requis pour l'accès mobile)

1. **Créer les certificats SSL** (une seule fois) :

   **Option 1 - Script Windows (recommandé)** :
   ```bash
   create-cert.bat
   ```

   **Option 2 - Script Bash (Git Bash)** :
   ```bash
   bash create-cert.sh
   ```

   **Option 3 - Commandes manuelles** :
   ```bash
   mkdir certs
   openssl genrsa -out certs/localhost-key.pem 2048
   openssl req -new -x509 -key certs/localhost-key.pem -out certs/localhost.pem -days 365 -subj "/CN=192.168.1.13/CN=localhost/CN=127.0.0.1" -addext "subjectAltName=IP:192.168.1.13,IP:127.0.0.1,DNS:localhost"
   ```

2. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```

L'application sera accessible sur :
- **Local** : `https://localhost:5173`
- **Réseau** : `https://192.168.1.13:5173` (depuis votre smartphone)

**Note** : Vous devrez accepter le certificat auto-signé dans votre navigateur (avertissement de sécurité normal pour les certificats locaux).

## Build pour production

```bash
npm run build
```

## Utilisation

1. Cliquez sur "Démarrer" pour activer la caméra
2. Pointez la caméra vers un code-barres
3. Le code sera automatiquement détecté et ajouté à la liste
4. Les codes scannés s'affichent avec leur horodatage

## Technologies

- React 18
- Vite
- html5-qrcode pour le scan de codes-barres (EAN-13, EAN-8, CODE-128, etc.)
- PWA avec vite-plugin-pwa

## Permissions

L'application nécessite l'accès à la caméra pour fonctionner. Assurez-vous d'autoriser l'accès lorsque demandé.

