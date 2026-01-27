# Activites - Qu'est-ce qu'on fait ce soir ?

Application web de type "Planity" pour les activites de loisirs (bowling, escape game, bar dansant, karaoke, etc.).

## Stack technique

- **Framework** : Next.js 16 (App Router) + TypeScript
- **UI** : Tailwind CSS + shadcn/ui
- **Base de donnees** : PostgreSQL + Prisma ORM
- **Authentification** : NextAuth.js v5 (Credentials)
- **Paiement** : Stripe (abonnements)
- **Cartes** : Leaflet + OpenStreetMap
- **Geocodage** : Nominatim (OpenStreetMap)

## Fonctionnalites

### Espace Utilisateur (compte optionnel)
- Recherche d'activites par ville ou geolocalisation
- Filtres : type d'activite, distance, nombre de personnes, prix max
- Affichage des resultats en liste ou sur carte
- Page detail avec galerie d'images, video et itineraire
- Favoris (utilisateurs connectes uniquement)

### Espace Etablissement (compte obligatoire)
- Dashboard avec statistiques detaillees (impressions, clics, CTR)
- Gestion de l'activite unique (1 etablissement = 1 activite)
- Upload d'images et de videos (max 30 Mo, 10-14 secondes)
- Geocodage automatique des adresses
- Statut brouillon/publie
- Abonnement avec 2 mois d'essai gratuit puis 15EUR/mois
- Codes promo pour periodes d'essai etendues

### Espace Admin
- Tableau de bord avec statistiques globales
- Gestion des utilisateurs (activation/desactivation)
- Gestion des etablissements et abonnements
- Creation et gestion des codes promo

## Prerequis

- Node.js 18+
- Docker & Docker Compose
- npm
- Compte Stripe (pour les paiements)

## Installation

### 1. Cloner le repository

```bash
git clone <repository-url>
cd saas-v-nement-activit-
```

### 2. Installer les dependances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Copier le fichier d'exemple et le modifier :

```bash
cp .env.example .env
```

Variables d'environnement requises :

```env
# Base de donnees
DATABASE_URL="postgresql://activite_user:activite_password@localhost:5432/activite_db?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-key-change-in-production-abc123xyz"

# Stripe (requis pour les abonnements)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 4. Configurer Stripe

1. Creer un compte sur [Stripe Dashboard](https://dashboard.stripe.com)
2. Creer un produit et un prix mensuel (15EUR)
3. Copier les cles API et l'ID du prix dans `.env`
4. Configurer le webhook pour `customer.subscription.*` et `checkout.session.completed`

### 5. Demarrer PostgreSQL

```bash
docker compose up -d
```

Verifier que le conteneur est demarre :
```bash
docker compose ps
```

### 6. Initialiser la base de donnees

```bash
npx prisma migrate dev --name init
```

### 7. Seeder la base de donnees (donnees d'exemple)

```bash
npm run db:seed
```

### 8. Lancer l'application

```bash
npm run dev
```

L'application est accessible sur : **http://localhost:3000**

## Comptes de test

Apres le seed, les comptes suivants sont disponibles :

| Type | Email | Mot de passe | Notes |
|------|-------|--------------|-------|
| Admin | admin@test.com | admin123 | Acces complet |
| Utilisateur | user@test.com | password123 | Compte standard |
| Etablissement | bowling.paris@test.com | password123 | Essai actif |
| Etablissement | loisirs.boulogne@test.com | password123 | Code promo utilise |
| Etablissement | escape.lyon@test.com | password123 | Essai expire |

### Codes promo de test

| Code | Jours bonus | Limite | Statut |
|------|-------------|--------|--------|
| BIENVENUE2024 | +30 jours | Illimite | Actif |
| ETE2024 | +60 jours | 100 max | Expire 30/09/2024 |
| VIP | +90 jours | 10 max | Actif |

## Tester les fonctionnalites

### En tant qu'utilisateur

1. Acceder a http://localhost:3000
2. Utiliser la recherche sur la page d'accueil (par ville ou geolocalisation)
3. Filtrer les resultats par type d'activite, distance, etc.
4. Cliquer sur une activite pour voir les details
5. Se connecter avec `user@test.com` pour ajouter aux favoris
6. Consulter ses favoris via le menu utilisateur

### En tant qu'etablissement

1. Se connecter avec `bowling.paris@test.com`
2. Acceder au dashboard : http://localhost:3000/etablissement/dashboard
3. Voir les statistiques detaillees (impressions, clics, CTR)
4. Modifier l'activite et ajouter des medias
5. Gerer l'abonnement : http://localhost:3000/etablissement/abonnement

### En tant qu'admin

1. Se connecter avec `admin@test.com`
2. Acceder a l'administration : http://localhost:3000/admin
3. Gerer les utilisateurs, etablissements et codes promo

## Scripts disponibles

```bash
# Developpement
npm run dev           # Lancer le serveur de developpement

# Base de donnees
npm run db:migrate    # Appliquer les migrations
npm run db:seed       # Seeder la base de donnees
npm run db:studio     # Ouvrir Prisma Studio
npm run db:reset      # Reinitialiser la base de donnees

# Production
npm run build         # Construire l'application
npm run start         # Demarrer en production
npm run lint          # Linter le code
```

## Structure du projet

```
├── prisma/
│   ├── schema.prisma      # Schema de la base de donnees
│   └── seed.ts            # Script de seed
├── public/
│   └── uploads/           # Fichiers uploades
│       ├── images/        # Images uploadees
│       └── videos/        # Videos uploadees
├── src/
│   ├── app/
│   │   ├── (public)/      # Pages publiques
│   │   ├── actions/       # Server Actions
│   │   ├── admin/         # Espace admin
│   │   ├── api/           # Routes API (upload, webhooks)
│   │   ├── auth/          # Pages d'authentification
│   │   └── etablissement/ # Espace etablissement
│   ├── components/
│   │   ├── forms/         # Formulaires
│   │   ├── layout/        # Composants de layout
│   │   ├── map/           # Composants carte
│   │   ├── providers/     # Providers React
│   │   └── ui/            # Composants shadcn/ui
│   ├── lib/
│   │   ├── auth.ts        # Configuration NextAuth
│   │   ├── constants.ts   # Constantes (types d'activites)
│   │   ├── db.ts          # Client Prisma
│   │   ├── geo.ts         # Utilitaires geographiques
│   │   ├── stripe.ts      # Configuration Stripe
│   │   ├── utils.ts       # Utilitaires generaux
│   │   └── validations.ts # Schemas Zod
│   └── types/             # Types TypeScript
├── docker-compose.yml     # Configuration Docker
└── .env.example           # Variables d'environnement
```

## Types d'activites supportes

- Bowling
- Escape Game
- Bar dansant
- Karaoke
- Laser Game
- Cinema
- Trampoline Park

## API / Endpoints

L'application utilise principalement des Server Actions Next.js :

### Auth
- `loginAction` - Connexion
- `registerUserAction` - Inscription utilisateur
- `registerEstablishmentAction` - Inscription etablissement (avec code promo)

### Activites
- `createActivity` / `updateActivity` / `deleteActivity` - CRUD activites
- `addMediaToActivity` / `deleteMedia` - Gestion des medias
- `toggleActivityStatus` - Publier/depublier

### Recherche
- `searchActivities` - Recherche avec filtres et calcul de distance
- `geocodeCity` - Geocodage de ville

### Favoris
- `toggleFavorite` - Ajouter/retirer des favoris

### Analytics
- `trackImpressions` / `trackClick` - Tracking des statistiques
- `getActivityStats` - Recuperer les stats

### Stripe
- `createCheckoutSession` - Creer une session de paiement
- `createBillingPortalSession` - Acces au portail de facturation
- `getSubscriptionStatus` - Statut de l'abonnement

### Admin
- `toggleUserActive` / `deleteUser` - Gestion utilisateurs
- `createPromoCode` / `updatePromoCode` / `deletePromoCode` - Gestion codes promo
- `toggleEstablishmentSubscription` - Override abonnement

### API Routes
- `POST /api/upload` - Upload de fichiers (images et videos)
- `POST /api/webhooks/stripe` - Webhook Stripe

## Calcul de distance

La distance est calculee avec la formule de Haversine cote serveur (JavaScript).
Le rayon de recherche peut etre configure (1km, 5km, 10km, 25km, 50km).

## Geocodage

Le geocodage utilise l'API Nominatim d'OpenStreetMap (gratuit, pas de cle API requise).

## Modele d'abonnement

- **Periode d'essai** : 2 mois gratuits a l'inscription
- **Abonnement** : 15EUR/mois apres la periode d'essai
- **Codes promo** : Jours d'essai supplementaires
- **Facturation** : Geree via Stripe Billing Portal

## Limitations

- Upload local uniquement (pas de cloud storage)
- Pas de PostGIS (calcul de distance en JS)
- Horaires en texte libre (pas de creneaux structures)
- 1 etablissement = 1 activite (contrainte 1:1)
