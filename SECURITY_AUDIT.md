# Audit Securite - Wadelo Mobile (Expo)

**Date**: 2026-03-05
**Scope**: `Etienneamigo/appmobile` (Expo / React Native)
**Auditeur**: Claude (audit automatise)

---

## Resume executif

L'application mobile Wadelo presente une **bonne posture securite de base** :
- Tokens stockes via `expo-secure-store` (pas AsyncStorage)
- Pas de secrets commites dans le repo
- Pas de XSS (React Native natif, pas de `dangerouslySetInnerHTML`)
- Pas de SQL injection cote client (tout passe par API REST + Prisma cote serveur)
- Les routes owner dans `saas-patches/` verifient bien le role + ownership

**Vulnerabilites identifiees** : 2 high (deps), 1 medium (info leak prod), plusieurs low.

---

## Findings

### P0 - CRITIQUE

_Aucun P0 identifie._

### P1 - HIGH

#### H1. Dependances vulnerables : `minimatch` (ReDoS) et `tar` (path traversal)

| Champ | Detail |
|-------|--------|
| **Severite** | HIGH |
| **Source** | `npm audit --omit=dev` |
| **Impact** | `minimatch <=3.1.3` : ReDoS via wildcards. `tar <=7.5.9` : lecture/ecriture arbitraire via symlink chain |
| **Exploitabilite** | Faible en runtime mobile (pas d'appel direct), mais bloque TestFlight/Play Store review et supply-chain risk |

**Arbre de dependances** :
```
minimatch@3.1.2
  <- glob@7.2.3 <- rimraf@3.0.2 <- chromium-edge-launcher (dev middleware)
  <- glob@7.2.3 <- @react-native/codegen
  <- glob@7.2.3 <- react-native
  <- test-exclude <- babel-plugin-istanbul <- babel-jest <- react-native
minimatch@9.0.5 (OK - non vulnerable)
minimatch@10.2.0 (OK - non vulnerable)

tar@7.5.7
  <- @expo/cli <- expo
```

**Fix applique** : `overrides` dans `package.json` pour forcer les versions patchees :
```json
{
  "overrides": {
    "minimatch@<=3.1.3": "3.1.4",
    "tar@<=7.5.9": "7.5.10"
  }
}
```

**Commandes de validation** :
```bash
rm -rf node_modules package-lock.json
npm install
npm audit --omit=dev  # Doit afficher "found 0 vulnerabilities"
npm ls minimatch | grep "3.1.2"  # Ne doit rien retourner (toutes en 3.1.4+)
npm ls tar  # Doit afficher 7.5.10 (overridden)
npx expo start  # Verifier que l'app demarre
```

---

### P2 - MEDIUM

#### M1. Section "Debug" exposee en production

| Champ | Detail |
|-------|--------|
| **Fichier** | `mobile/src/screens/common/AccountScreen.tsx:123-146` |
| **Severite** | MEDIUM |
| **Impact** | Fuite de l'URL API backend, User ID, Establishment ID en production. Facilite la reconnaissance et le probing IDOR. |

**Fix applique** : La section Debug est conditionnee par `__DEV__` pour n'apparaitre qu'en developpement.

#### M2. `console.warn` non gate par `__DEV__` dans FeedScreen

| Champ | Detail |
|-------|--------|
| **Fichier** | `mobile/src/screens/public/FeedScreen.tsx:307` |
| **Severite** | LOW-MEDIUM |
| **Impact** | En production, les erreurs de fetch videos sont loguees avec le contenu de l'erreur, qui peut contenir des details serveur. |

**Fix applique** : Le `console.warn` est maintenant conditionne par `__DEV__`.

---

### P2 - LOW

#### L1. Politique de mot de passe faible (6 caracteres minimum)

| Champ | Detail |
|-------|--------|
| **Fichier** | `mobile/src/screens/auth/RegisterScreen.tsx:50-53` |
| **Severite** | LOW |
| **Impact** | Permet des mots de passe faibles. La politique serveur est le vrai rempart. |

**Fix applique** : Minimum porte a 8 caracteres avec exigence d'au moins une lettre et un chiffre.

#### L2. `openLink` sans validation URL dans ActivityDetailScreen

| Champ | Detail |
|-------|--------|
| **Fichier** | `mobile/src/screens/public/ActivityDetailScreen.tsx:132` |
| **Severite** | LOW |
| **Impact** | Les URLs telephone/website sont ouvertes sans validation. Impact faible car les donnees viennent du serveur. |

**Recommandation** : Pas de fix dans ce PR. Le serveur doit valider les URLs a la creation de l'etablissement.

#### L3. Pas de `maxLength` sur les champs de formulaire

| Champ | Detail |
|-------|--------|
| **Fichier** | `mobile/src/screens/establishment/ActivityCreateScreen.tsx`, `ActivityEditScreen.tsx` |
| **Severite** | LOW |
| **Impact** | Un proprietaire pourrait soumettre des textes tres longs. Le serveur (Zod) est le vrai garde-fou. |

**Recommandation** : Ajouter des `maxLength` dans un prochain PR UX. Pas bloquant securite.

#### L4. Video URL sans validation client dans MediaManagerScreen

| Champ | Detail |
|-------|--------|
| **Fichier** | `mobile/src/screens/establishment/MediaManagerScreen.tsx:92-105` |
| **Severite** | LOW |
| **Impact** | Un proprietaire peut soumettre une URL video non valide. Le serveur doit valider. |

**Recommandation** : Ajouter validation URL basique cote client dans un prochain PR.

---

## Observations positives (pas de probleme)

| Categorie | Observation |
|-----------|-------------|
| **Stockage tokens** | `expo-secure-store` utilise correctement (`secureStore.ts`) |
| **Pas de secrets commites** | Aucun `.env`, cle API, token trouve dans le repo ou l'historique git |
| **EXPO_PUBLIC_*** | Seul `EXPO_PUBLIC_API_BASE_URL` est utilise, avec fallback sur l'URL de prod. Pas de secret expose. |
| **Auth flow** | Token JWT en `Authorization: Bearer`, 401 global handler, logout automatique |
| **Logs dev** | `client.ts` gate correctement les logs derriere `__DEV__` (sauf FeedScreen - corrige) |
| **Upload** | `uploadFile` utilise FormData, pas de path traversal possible cote client |
| **API patches RBAC** | Toutes les routes owner verifient `role === ESTABLISHMENT` + `establishmentId === id` |
| **Rate limiting** | Toutes les routes saas-patches utilisent `enforceApiRateLimit` |
| **Pas de XSS** | React Native natif, aucun `dangerouslySetInnerHTML` ou `eval` |
| **Pas de SQL injection** | Prisma ORM uniquement, pas de raw SQL |

---

## Recommandations serveur (hors scope - a appliquer dans le repo SaaS)

Ces findings concernent les fichiers `saas-patches/` qui sont des references pour le backend :

1. **Endpoint public sans auth** : `GET /api/mobile/establishments/[id]/reservations/settings` n'a pas d'authentification. Ajouter au moins `optionalMobileAuth` pour logger les acces.
2. **PATCH establishment** : Utiliser un schema Zod au lieu de la validation manuelle. Valider les URLs (`bookingUrl`, `website`).
3. **Parametres date non valides** : Les GET query params `dateFrom`/`dateTo` dans les routes owner doivent etre valides avant `new Date()`.

---

## Validation post-fix

```bash
# 1. Reinstall clean
cd mobile
rm -rf node_modules package-lock.json
npm install

# 2. Verifier 0 high vulns
npm audit --omit=dev

# 3. Verifier que l'app compile
npx expo start --no-dev

# 4. Tests
npm test

# 5. Build preview
eas build --platform ios --profile preview
```
