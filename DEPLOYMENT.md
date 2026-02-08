# Guide de Déploiement - SaaS Activités

## Prérequis

- Docker et Docker Compose
- PostgreSQL 16+
- (Optionnel) Redis 7+ pour le rate limiting multi-instances
- (Optionnel) Serveur SMTP pour les emails
- (Optionnel) Compte Stripe pour les abonnements
- (Optionnel) Compte Cloudflare pour Turnstile (CAPTCHA)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Caddy/Nginx   │────▶│   Next.js App   │
│   (Reverse      │     │   (Port 3000)   │
│    Proxy)       │     └────────┬────────┘
└─────────────────┘              │
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │     │     Redis       │     │     Volume      │
│   (Database)    │     │  (Rate Limit)   │     │   (Uploads)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Déploiement avec Docker

### 1. Configuration

```bash
# Cloner le projet
git clone <repository-url>
cd saas-v-nement-activit-

# Copier et configurer l'environnement
cp .env.example .env
nano .env  # Remplir les valeurs requises
```

### 2. Variables d'environnement requises

```bash
# OBLIGATOIRE
DATABASE_URL="postgresql://user:password@host:5432/db"
AUTH_SECRET="<générer avec: openssl rand -hex 32>"

# OPTIONNEL mais recommandé en production
AUTH_URL="https://votre-domaine.com"
```

### 3. Démarrage

```bash
# Avec le fichier de production
cd infra
docker-compose -f docker-compose.activites.yml up -d

# Appliquer les migrations
docker exec activites-web npx prisma migrate deploy

# Vérifier le statut
docker exec activites-web wget -qO- http://localhost:3000/api/health
```

### 4. Configuration Caddy (Reverse Proxy)

Ajouter au Caddyfile :

```
votre-domaine.com {
    reverse_proxy activites-web:3000

    # Headers de sécurité (complémentaires au middleware Next.js)
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
}
```

## Migrations Base de Données

### Développement

```bash
# Créer une migration
npm run db:migrate -- --name description_migration

# Appliquer en dev
npm run db:push

# Voir l'état
npx prisma migrate status
```

### Production

```bash
# TOUJOURS utiliser migrate deploy en production
npx prisma migrate deploy

# Jamais migrate dev en production !
```

## Volumes et Persistance

### Données persistantes

| Volume | Contenu | Chemin |
|--------|---------|--------|
| `activites_pg` | Base de données | `/var/lib/postgresql/data` |
| `activites_uploads` | Images/vidéos uploadées | `/app/public/uploads` |

### Sauvegarde

```bash
# Sauvegarde base de données
docker exec activites-db pg_dump -U activite_user activite_db > backup.sql

# Sauvegarde uploads
docker cp activites-web:/app/public/uploads ./uploads-backup
```

## Sécurité

### Checklist Production

- [ ] `AUTH_SECRET` généré de manière sécurisée (32+ caractères)
- [ ] `NODE_ENV=production`
- [ ] HTTPS activé (Caddy le gère automatiquement)
- [ ] Mot de passe PostgreSQL fort
- [ ] Variables sensibles non commitées
- [ ] Rate limiting activé (Redis recommandé)
- [ ] Webhooks Stripe vérifiés avec signature

### Rate Limiting

Le système supporte deux modes :

1. **In-Memory** (par défaut) : Suffisant pour une seule instance
2. **Redis** : Requis pour plusieurs instances

```bash
# Ajouter Redis dans docker-compose
services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

## Healthcheck

L'endpoint `/api/health` vérifie :

- Connexion à la base de données
- Temps de réponse

```bash
# Test manuel
curl http://localhost:3000/api/health

# Réponse attendue
{
  "status": "healthy",
  "timestamp": "2026-01-28T...",
  "uptime": 12345,
  "checks": {
    "database": { "status": "up", "latency": 5 }
  }
}
```

## Monitoring

### Logs

```bash
# Logs de l'application
docker logs -f activites-web

# Logs de la base
docker logs -f activites-db
```

### Métriques recommandées

- Temps de réponse API
- Utilisation mémoire/CPU
- Nombre de connexions DB
- Taux d'erreurs 5xx

## Mise à jour

```bash
# Arrêter l'ancien conteneur
docker-compose -f docker-compose.activites.yml down

# Pull les nouvelles images ou rebuild
docker-compose -f docker-compose.activites.yml build --no-cache

# Redémarrer
docker-compose -f docker-compose.activites.yml up -d

# Appliquer les migrations
docker exec activites-web npx prisma migrate deploy
```

## Dépannage

### Problème de connexion DB

```bash
# Vérifier que PostgreSQL est accessible
docker exec activites-web npx prisma db pull
```

### Uploads non persistants

Vérifier que le volume est correctement monté :

```bash
docker exec activites-web ls -la /app/public/uploads
```

### Rate limiting bloquant

Vérifier les logs pour les warnings `[Rate Limit]` :

```bash
docker logs activites-web | grep "Rate Limit"
```

## API Mobile

L'application expose une API REST pour les applications mobiles, séparée de l'auth web NextAuth.

### Configuration

```bash
# Optionnel mais recommandé (sinon utilise AUTH_SECRET)
MOBILE_JWT_SECRET="<générer avec: openssl rand -hex 32>"
```

### Endpoints

#### POST /api/mobile/login

Authentification et obtention du token JWT.

```bash
curl -X POST https://wadelo.com/api/mobile/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret"}'
```

Réponse succès (200) :
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "establishmentId": null
  }
}
```

Réponse erreur (401) :
```json
{ "error": "Email ou mot de passe incorrect" }
```

#### GET /api/mobile/me

Récupère le profil de l'utilisateur connecté.

```bash
curl https://wadelo.com/api/mobile/me \
  -H "Authorization: Bearer <token>"
```

#### GET /api/mobile/ping

Endpoint de test pour valider l'authentification.

```bash
curl https://wadelo.com/api/mobile/ping \
  -H "Authorization: Bearer <token>"
```

Réponse :
```json
{
  "pong": true,
  "timestamp": "2026-01-28T...",
  "userId": "clx...",
  "role": "USER"
}
```

### Intégration Mobile

```typescript
// Exemple React Native / Expo
const API_URL = "https://wadelo.com"

async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/mobile/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error)
  }

  const { token, user } = await res.json()
  // Stocker le token (AsyncStorage, SecureStore, etc.)
  return { token, user }
}

async function fetchWithAuth(endpoint: string, token: string) {
  return fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
```

### Sécurité Mobile

- Tokens JWT valides 30 jours
- Rate limiting strict sur /login (3 req/min par IP)
- Les tokens sont vérifiés à chaque requête (user actif, existe en DB)
- Utilisez un secret différent de AUTH_SECRET pour isoler les sessions web/mobile

## Support

Pour les problèmes techniques, vérifier :

1. Les logs Docker
2. L'endpoint `/api/health`
3. L'état des migrations Prisma
