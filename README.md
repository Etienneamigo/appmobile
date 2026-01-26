# Activités - Qu'est-ce qu'on fait ce soir ?

Application web de type "Planity" pour les activités de loisirs (bowling, escape game, bar dansant, karaoké, etc.).

## Stack technique

- **Framework** : Next.js 16 (App Router) + TypeScript
- **UI** : Tailwind CSS + shadcn/ui
- **Base de données** : PostgreSQL + Prisma ORM
- **Authentification** : NextAuth.js v5 (Credentials)
- **Cartes** : Leaflet + OpenStreetMap
- **Géocodage** : Nominatim (OpenStreetMap)

## Fonctionnalités

### Espace Utilisateur (compte optionnel)
- Recherche d'activités par ville ou géolocalisation
- Filtres : type d'activité, distance, nombre de personnes, prix max
- Affichage des résultats en liste ou sur carte
- Page détail avec galerie d'images, informations et itinéraire
- Favoris (utilisateurs connectés uniquement)

### Espace Établissement (compte obligatoire)
- Dashboard avec statistiques (vues, favoris)
- CRUD complet des activités
- Upload d'images et ajout de vidéos
- Géocodage automatique des adresses
- Statut brouillon/publié

## Prérequis

- Node.js 18+
- Docker & Docker Compose
- npm

## Installation

### 1. Cloner le repository

```bash
git clone <repository-url>
cd saas-v-nement-activit-
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Copier le fichier d'exemple et le modifier si nécessaire :

```bash
cp .env.example .env
```

Variables par défaut (pour développement local) :
```env
DATABASE_URL="postgresql://activite_user:activite_password@localhost:5432/activite_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-key-change-in-production-abc123xyz"
```

### 4. Démarrer PostgreSQL

```bash
docker compose up -d
```

Vérifier que le conteneur est démarré :
```bash
docker compose ps
```

### 5. Initialiser la base de données

```bash
npx prisma migrate dev --name init
```

### 6. Seeder la base de données (données d'exemple)

```bash
npm run db:seed
```

### 7. Lancer l'application

```bash
npm run dev
```

L'application est accessible sur : **http://localhost:3000**

## Comptes de test

Après le seed, les comptes suivants sont disponibles :

| Type | Email | Mot de passe |
|------|-------|--------------|
| Utilisateur | user@test.com | password123 |
| Établissement | bowling.paris@test.com | password123 |
| Établissement | loisirs.boulogne@test.com | password123 |

## Tester les fonctionnalités

### En tant qu'utilisateur

1. Accéder à http://localhost:3000
2. Utiliser la recherche sur la page d'accueil (par ville ou géolocalisation)
3. Filtrer les résultats par type d'activité, distance, etc.
4. Cliquer sur une activité pour voir les détails
5. Se connecter avec `user@test.com` pour ajouter aux favoris
6. Consulter ses favoris via le menu utilisateur

### En tant qu'établissement

1. Se connecter avec `bowling.paris@test.com`
2. Accéder au dashboard : http://localhost:3000/etablissement/dashboard
3. Voir les statistiques des activités
4. Créer une nouvelle activité avec le bouton "Nouvelle activité"
5. Modifier une activité existante (clic sur l'icône crayon)
6. Ajouter des images à une activité
7. Publier/dépublier une activité

## Scripts disponibles

```bash
# Développement
npm run dev           # Lancer le serveur de développement

# Base de données
npm run db:migrate    # Appliquer les migrations
npm run db:seed       # Seeder la base de données
npm run db:studio     # Ouvrir Prisma Studio
npm run db:reset      # Réinitialiser la base de données

# Production
npm run build         # Construire l'application
npm run start         # Démarrer en production
npm run lint          # Linter le code
```

## Structure du projet

```
├── prisma/
│   ├── schema.prisma      # Schéma de la base de données
│   └── seed.ts            # Script de seed
├── public/
│   └── uploads/           # Fichiers uploadés
├── src/
│   ├── app/
│   │   ├── (public)/      # Pages publiques
│   │   ├── actions/       # Server Actions
│   │   ├── api/           # Routes API
│   │   ├── auth/          # Pages d'authentification
│   │   └── etablissement/ # Espace établissement
│   ├── components/
│   │   ├── forms/         # Formulaires
│   │   ├── layout/        # Composants de layout
│   │   ├── map/           # Composants carte
│   │   ├── providers/     # Providers React
│   │   └── ui/            # Composants shadcn/ui
│   ├── lib/
│   │   ├── auth.ts        # Configuration NextAuth
│   │   ├── constants.ts   # Constantes (types d'activités)
│   │   ├── db.ts          # Client Prisma
│   │   ├── geo.ts         # Utilitaires géographiques
│   │   ├── utils.ts       # Utilitaires généraux
│   │   └── validations.ts # Schémas Zod
│   └── types/             # Types TypeScript
├── docker-compose.yml     # Configuration Docker
└── .env.example           # Variables d'environnement
```

## Types d'activités supportés

- 🎳 Bowling
- 🔐 Escape Game
- 💃 Bar dansant
- 🎤 Karaoké
- 🔫 Laser Game
- 🎬 Cinéma
- 🤸 Trampoline Park

## API / Endpoints

L'application utilise principalement des Server Actions Next.js :

- `loginAction` / `registerUserAction` / `registerEstablishmentAction` - Auth
- `createActivity` / `updateActivity` / `deleteActivity` - CRUD activités
- `searchActivities` - Recherche avec filtres et calcul de distance
- `toggleFavorite` - Gestion des favoris
- `POST /api/upload` - Upload de fichiers

## Calcul de distance

La distance est calculée avec la formule de Haversine côté serveur (JavaScript).
Le rayon de recherche peut être configuré (1km, 5km, 10km, 25km, 50km).

## Géocodage

Le géocodage utilise l'API Nominatim d'OpenStreetMap (gratuit, pas de clé API requise).

## Limitations V1

- Pas de système de paiement/réservation
- Upload local uniquement (pas de cloud storage)
- Pas de PostGIS (calcul de distance en JS)
- Horaires en texte libre (pas de créneaux structurés)
