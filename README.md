# Maison Apée - Application Mobile

Application mobile React Native avec Expo pour Maison Apée.

## Stack technique

- **Expo SDK 54** - Framework React Native
- **TypeScript** - Typage statique
- **React Navigation** - Bottom Tabs + Stack Navigation
- **Expo Secure Store** - Stockage sécurisé du token JWT
- **Expo Image Picker** - Upload d'images

## Structure du projet

```
src/
├── api/
│   ├── client.ts          # Client API centralisé (fetch + Bearer auth)
│   ├── auth.ts            # Endpoints authentification
│   ├── activities.ts      # Liste et détail activités
│   ├── favorites.ts       # Gestion des favoris
│   ├── establishment.ts   # API établissement
│   └── admin.ts           # API admin
├── components/
│   ├── ActivityCard.tsx   # Carte activité réutilisable
│   └── LoadingScreen.tsx  # Écran de chargement
├── context/
│   └── AuthContext.tsx    # Contexte d'authentification global
├── navigation/
│   └── AppNavigator.tsx   # Bottom Tabs + Stacks par rôle
├── screens/
│   ├── auth/
│   │   └── LoginScreen.tsx
│   ├── public/
│   │   ├── SearchScreen.tsx       # Recherche/liste activités
│   │   └── ActivityDetailScreen.tsx
│   ├── user/
│   │   └── FavoritesScreen.tsx    # Liste favoris (USER)
│   ├── establishment/
│   │   ├── EstablishmentDashboardScreen.tsx
│   │   ├── EstablishmentEditScreen.tsx
│   │   ├── ActivityEditScreen.tsx
│   │   └── MediaManagerScreen.tsx
│   ├── admin/
│   │   └── AdminDashboardScreen.tsx
│   └── common/
│       └── AccountScreen.tsx
├── storage/
│   └── secureStore.ts     # Abstraction expo-secure-store
└── types/
    └── index.ts           # Types TypeScript complets
```

## Prérequis

- Node.js >= 18
- npm ou yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (builds): `npm install -g eas-cli`
- Compte Expo (gratuit): https://expo.dev/signup

## Installation

```bash
# Cloner le repo
git clone https://github.com/Etienneamigo/appmobile.git
cd appmobile

# Installer les dépendances
npm install
```

## Développement local

### Démarrer le serveur

```bash
npm start
# ou
npx expo start
```

### Options de lancement

- `a` - Android (émulateur ou appareil)
- `i` - iOS (simulateur, macOS requis)
- `w` - Navigateur web
- Scanner QR code avec Expo Go

### Test avec tunnel (réseau différent)

```bash
npx expo start --tunnel
```

Cela permet de tester sur un appareil physique même si le PC et le téléphone ne sont pas sur le même réseau.

## Navigation par rôle

L'application adapte automatiquement les onglets selon le rôle de l'utilisateur:

| Rôle | Onglets disponibles |
|------|---------------------|
| **USER** | Explorer, Favoris, Compte |
| **ESTABLISHMENT** | Explorer, Mon établissement, Compte |
| **ADMIN** | Explorer, Admin, Compte |

## API Backend

Base URL: `https://maisonapee.com`

### Endpoints utilisés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/mobile/login` | POST | Connexion |
| `/api/mobile/me` | GET | Profil utilisateur |
| `/api/mobile/activities` | GET | Liste activités |
| `/api/mobile/activities/:id` | GET | Détail activité |
| `/api/mobile/favorites` | GET | Mes favoris |
| `/api/mobile/favorites/:id` | POST/DELETE | Toggle favori |
| `/api/mobile/establishment` | GET/PATCH | Mon établissement |
| `/api/mobile/establishment/activity` | GET/PATCH | Mon activité |
| `/api/mobile/establishment/media` | GET/POST | Médias |
| `/api/mobile/establishment/media/:id` | DELETE | Supprimer média |
| `/api/upload` | POST | Upload fichier |
| `/api/mobile/admin/stats` | GET | Stats admin |

## Build avec EAS

### Configuration initiale

```bash
eas login
eas build:configure
```

### Build Android

```bash
# APK de test
eas build --platform android --profile preview

# AAB pour Play Store
eas build --platform android --profile production
```

### Build iOS

```bash
# Simulateur
eas build --platform ios --profile development

# App Store
eas build --platform ios --profile production
```

## Fonctionnalités

### Tous les utilisateurs
- Recherche et filtrage d'activités par type/ville
- Vue détaillée des activités
- Liens externes (réservation, site web, téléphone)
- Pull-to-refresh sur toutes les listes

### Utilisateurs (USER)
- Gestion des favoris
- Ajouter/retirer des favoris

### Établissements (ESTABLISHMENT)
- Dashboard avec statistiques (vues, favoris)
- Édition des informations de l'établissement
- Édition de l'activité (description, tarifs, horaires)
- Gestion des médias (upload images, liens vidéos)
- Publication/dépublication de l'activité

### Administrateurs (ADMIN)
- Dashboard avec stats globales
- Nombre d'utilisateurs, établissements, activités
- Top 5 des activités par vues

## Configuration

Pour modifier l'URL du backend, éditer `src/api/client.ts`:

```typescript
const BASE_URL = 'https://maisonapee.com';
```

## Scripts

```bash
npm start          # Démarrer Expo
npm run android    # Android
npm run ios        # iOS (macOS)
npm run web        # Navigateur
```

## Licence

Propriétaire - Maison Apée
