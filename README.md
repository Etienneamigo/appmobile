# Maison Apée - Application Mobile

Application mobile React Native avec Expo pour Maison Apée.

## Stack technique

- **Expo SDK 54** - Framework React Native
- **TypeScript** - Typage statique
- **React Navigation** - Navigation native (Stack)
- **Expo Secure Store** - Stockage sécurisé du token

## Structure du projet

```
src/
├── api/
│   ├── client.ts      # Client API centralisé (fetch + auth)
│   └── auth.ts        # Endpoints authentification
├── context/
│   └── AuthContext.tsx # Contexte d'authentification global
├── navigation/
│   └── AppNavigator.tsx # Configuration de la navigation
├── screens/
│   ├── LoginScreen.tsx  # Écran de connexion
│   ├── HomeScreen.tsx   # Écran d'accueil
│   └── AccountScreen.tsx # Écran Mon compte
├── storage/
│   └── secureStore.ts   # Abstraction expo-secure-store
└── types/
    └── index.ts         # Types TypeScript
```

## Prérequis

- Node.js >= 18
- npm ou yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (pour les builds): `npm install -g eas-cli`
- Un compte Expo (gratuit): https://expo.dev/signup

## Installation

```bash
# Cloner le repo
git clone <repo-url>
cd appmobile

# Installer les dépendances
npm install
```

## Développement local

### Démarrer le serveur de dev

```bash
# Lancer Expo
npm start
# ou
npx expo start
```

### Options de lancement

- Appuyer sur `a` - Ouvrir sur Android (émulateur ou appareil)
- Appuyer sur `i` - Ouvrir sur iOS (simulateur, macOS requis)
- Appuyer sur `w` - Ouvrir dans le navigateur web
- Scanner le QR code avec l'app Expo Go sur votre téléphone

### Sur un appareil physique

1. Installer [Expo Go](https://expo.dev/client) sur votre téléphone
2. Scanner le QR code affiché dans le terminal
3. L'app se rechargera automatiquement à chaque modification

## Build avec EAS

### Configuration initiale

```bash
# Se connecter à Expo
eas login

# Configurer le projet (première fois uniquement)
eas build:configure
```

### Build Android

```bash
# APK de développement (test interne)
eas build --platform android --profile preview

# AAB pour Google Play Store
eas build --platform android --profile production
```

Le fichier APK/AAB sera disponible sur https://expo.dev après le build.

### Build iOS

```bash
# Simulateur iOS (macOS requis pour le simulateur)
eas build --platform ios --profile development

# App Store (nécessite un compte Apple Developer - 99$/an)
eas build --platform ios --profile production
```

## API Backend

L'application se connecte à:

- **Base URL**: `https://maisonapee.com`
- **Login**: `POST /api/mobile/login`
- **Mon compte**: `GET /api/mobile/me`

### Format de la réponse login

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

## Fonctionnalités

- Authentification par email/mot de passe
- Token stocké de façon sécurisée (Keychain iOS / Keystore Android)
- Gestion automatique des erreurs 401 (déconnexion)
- Pull-to-refresh sur l'écran Mon compte
- Validation des champs de formulaire

## Scripts disponibles

```bash
npm start          # Démarrer Expo
npm run android    # Lancer sur Android
npm run ios        # Lancer sur iOS (macOS uniquement)
npm run web        # Lancer dans le navigateur
```

## Variables d'environnement

Pour modifier l'URL du backend, éditer `src/api/client.ts`:

```typescript
const BASE_URL = 'https://maisonapee.com';
```

## Licence

Propriétaire - Maison Apée
