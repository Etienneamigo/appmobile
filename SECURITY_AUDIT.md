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

**Vulnerabilites identifiees** : 2 high (deps), 3 medium (info leak, credentials log, JWT), plusieurs low.

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

#### M2. Credentials (email/password) loguees en dev via console.log

| Champ | Detail |
|-------|--------|
| **Fichier** | `mobile/src/api/client.ts:82` |
| **Severite** | MEDIUM |
| **Impact** | Le body de CHAQUE requete est logue en dev, y compris `/api/mobile/login` qui contient email+password en clair. Si un build dev fuit ou si les logs sont captures par un outil de crash reporting, les credentials sont exposees. |

**Fix applique** : Les endpoints sensibles (`/api/mobile/login`, `/api/auth/register`) sont redactes dans les logs dev.

#### M3. Pas de verification client-side de l'expiration JWT

| Champ | Detail |
|-------|--------|
| **Fichier** | `mobile/src/storage/secureStore.ts`, `mobile/src/context/AuthContext.tsx` |
| **Severite** | MEDIUM |
| **Impact** | Le token est stocke comme string opaque. Si le serveur est injoignable (avion, timeout), un token expire reste en memoire et sera renvoye au retour de la connexion. |

**Fix applique** : `secureStore.getToken()` decode maintenant le payload JWT et verifie `exp` localement (avec 60s de marge). Un token expire est automatiquement supprime du SecureStore.

#### M4. `uploadFile` declenche un logout global sur 401

| Champ | Detail |
|-------|--------|
| **Fichier** | `mobile/src/api/client.ts:207-209` |
| **Severite** | LOW-MEDIUM |
| **Impact** | Contrairement a `request()` qui scope le logout aux endpoints auth-check, `uploadFile()` appelait `onUnauthorized()` sur tout 401, causant des deconnexions intempestives pendant les uploads. |

**Fix applique** : `uploadFile` ne declenche plus le logout global, il throw simplement l'erreur 401 pour que l'ecran la gere.

#### M5. `console.warn` non gate par `__DEV__` dans FeedScreen

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

## Findings serveur (hors scope mobile - a appliquer dans le repo SaaS)

Ces findings concernent les fichiers `saas-patches/` qui sont des references pour le backend.
**Ils ne sont PAS corriges dans cette PR** car ils vivent dans le repo SaaS.

### P1 - IDOR sur custom field definitions (URGENT)

| Champ | Detail |
|-------|--------|
| **Fichier** | `saas-patches/mobile-owner/establishments/[id]/reservations/settings/route.ts:178-189` |
| **Severite** | P1 - HIGH |
| **Impact** | Un owner peut modifier les custom fields d'un AUTRE etablissement en fournissant un `field.id` etranger dans le PUT |

Le `update` Prisma sur `reservationCustomFieldDef` filtre par `id` seul, sans verifier `settingsId`.

**Fix** : Ajouter `settingsId: settings.id` au `where` :
```ts
await prisma.reservationCustomFieldDef.update({
  where: { id: field.id, settingsId: settings.id },
  data: { ... },
})
```

### P1 - PATCH establishment sans validation Zod

| Champ | Detail |
|-------|--------|
| **Fichier** | `saas-patches/mobile-establishment-route.ts:37-58` |
| **Severite** | P1 - HIGH |
| **Impact** | Pas de Zod, parse error silencieux (`body = {}`), pas de validation type/longueur sur phone/website/bookingUrl/address, pas de bornes lat/lng |

**Fix** : Remplacer la validation manuelle par un schema Zod :
```ts
const schema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(2048).optional().nullable(),
  bookingUrl: z.string().url().max(2048).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  // ...
})
```

### P1 - Parametres date/status non valides

| Champ | Detail |
|-------|--------|
| **Fichiers** | `mobile-owner/.../reservations/route.ts:28-37`, `mobile-owner/.../slots/route.ts:40-45` |
| **Severite** | P1 |
| **Impact** | `status` passe directement au `where` Prisma sans validation enum. `dateFrom`/`dateTo` passes a `new Date()` sans format check -> erreurs 500 non gerees |

**Fix** :
```ts
const validStatuses = ["CONFIRMED", "CANCELLED", "NO_SHOW", "COMPLETED"]
if (status && !validStatuses.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 })

const dateRegex = /^\d{4}-\d{2}-\d{2}$/
if (dateFrom && !dateRegex.test(dateFrom)) return NextResponse.json({ error: "Invalid dateFrom" }, { status: 400 })
```

### P1 - weeklySchedule keys non validees (0-6)

| Champ | Detail |
|-------|--------|
| **Fichier** | `saas-patches/mobile-owner/.../settings/route.ts:64,152-153` |
| **Severite** | P1 |
| **Impact** | Les cles du record `weeklySchedule` acceptent n'importe quelle string. `parseInt("foo")` = `NaN` stocke en DB. |

**Fix** : `z.record(z.string().regex(/^[0-6]$/), z.array(timeRangeSchema))`

### P2 - Rate limiting manquant sur /api/mobile/me

| Champ | Detail |
|-------|--------|
| **Fichier** | `saas-patches/mobile-me/route.ts` |
| **Severite** | P2 |
| **Impact** | Seul endpoint sans `enforceApiRateLimit`. Permet le probing JWT illimite. |

**Fix** : Ajouter `const limited = await enforceApiRateLimit(request, "api"); if (limited) return limited;`

### P2 - Pas de try/catch global sur 12/13 routes

Toutes les routes sauf `mobile-me/route.ts` n'ont pas de try/catch. Les erreurs Prisma non gerees peuvent leaker des details internes en dev.

**Fix** : Wrapper function `withErrorHandling()` ou try/catch sur chaque handler.

### P2 - Pas de pagination sur owner reservations et slots

| Champ | Detail |
|-------|--------|
| **Fichiers** | `mobile-owner/.../reservations/route.ts`, `mobile-owner/.../slots/route.ts` |
| **Severite** | P2 |
| **Impact** | Pas de `take`/`skip` -> un etablissement avec des milliers de lignes retourne tout en une requete (DoS possible) |

### P2 - Strings illimitees (confirmationMessage, cancellationPolicyText)

`z.string().optional()` sans `.max()` -> un attaquant peut envoyer des strings de plusieurs Mo.

### P2 - imageUrl accepte les schemes non-HTTPS

`z.string().url()` sur les resources accepte `data:` URLs. Restreindre a `https://` uniquement.

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
