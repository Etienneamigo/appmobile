# V4 - Home Search Feature (Mobile)

Version 4 aligns the mobile app's search functionality with the web application.

## Changes Summary (V4.1 Update)

### Bug Fixes
- **Type filter fix**: Changed `limit` to `pageSize` param to match backend API
- **Medias crash fix**: Made `establishmentApi.getMedias()` robust against undefined/null responses
- **Debug logging**: Added console logs in dev mode for API requests

### New Activity Types (12 added)
- KARTING, REALITE_VIRTUELLE, QUIZ_GAME, MINIGOLF, ESCALADE, PATINOIRE
- SPA_BIEN_ETRE, ATELIER, DEGUSTATION, COMEDY_CLUB, MUSEE_EXPO, CONCERT_SPECTACLE

---

## Activity Types Mapping

### Complete Type List

| Enum Value | Label | Emoji |
|------------|-------|-------|
| `BOWLING` | Bowling | 🎳 |
| `ESCAPE_GAME` | Escape Game | 🔐 |
| `BAR_DANSANT` | Bar dansant | 💃 |
| `KARAOKE` | Karaoke | 🎤 |
| `LASER_GAME` | Laser Game | 🔫 |
| `CINEMA` | Cinema | 🎬 |
| `TRAMPOLINE_PARK` | Trampoline Park | 🤸 |
| `KARTING` | Karting | 🏎️ |
| `REALITE_VIRTUELLE` | Realite Virtuelle | 🥽 |
| `QUIZ_GAME` | Quiz Game | 🧩 |
| `MINIGOLF` | Minigolf | ⛳ |
| `ESCALADE` | Escalade | 🧗 |
| `PATINOIRE` | Patinoire | ⛸️ |
| `SPA_BIEN_ETRE` | Spa & Bien-etre | 🧖 |
| `ATELIER` | Atelier | 🎨 |
| `DEGUSTATION` | Degustation | 🍷 |
| `COMEDY_CLUB` | Comedy Club | 🎭 |
| `MUSEE_EXPO` | Musee & Expo | 🏛️ |
| `CONCERT_SPECTACLE` | Concert & Spectacle | 🎵 |

### API URL Examples

```
# Filter by type only
GET /api/mobile/activities?type=KARTING&page=1&pageSize=20

# Filter by type + city
GET /api/mobile/activities?type=BOWLING&city=Paris&page=1&pageSize=20

# Filter by type + geolocation + radius
GET /api/mobile/activities?type=ESCAPE_GAME&lat=48.8566&lng=2.3522&radiusKm=10

# All filters combined
GET /api/mobile/activities?type=BAR_DANSANT&city=Lyon&lat=45.764&lng=4.8357&radiusKm=25&page=1&pageSize=20
```

---

## Query Parameters Mapping

### Web to Mobile API Mapping

| Web Param | Mobile Param | Backend Support | Notes |
|-----------|--------------|-----------------|-------|
| `city` | `city` | YES | Text search on city name |
| `type` | `type` | YES | Activity type enum (must match exactly) |
| `lat` | `lat` | YES | Latitude for geo search |
| `lng` | `lng` | YES | Longitude for geo search |
| `radius` | `radiusKm` | YES | Search radius in km (default: 10) |
| `page` | `page` | YES | Pagination page number |
| `limit` | `pageSize` | YES | Items per page (max 50) |

### Priority Logic

```typescript
if (hasGeolocation && lat && lng) {
  // Use coordinates + radius
  params = { lat, lng, radiusKm }
} else if (city) {
  // Use city text search
  params = { city }
}
// Type is always sent if selected
if (type) params.type = type
```

---

## Files Modified (V4.1)

### Mobile App

| File | Change |
|------|--------|
| `src/types/index.ts` | Added 12 new ActivityType values + labels |
| `src/constants/search.ts` | Added new types to ACTIVITY_TYPE_OPTIONS |
| `src/theme/index.ts` | Added emojis for new types |
| `src/api/activities.ts` | Fixed `limit` → `pageSize`, added debug log |
| `src/api/establishment.ts` | Made `getMedias()` robust |
| `src/screens/establishment/MediaManagerScreen.tsx` | Defensive medias handling |
| `src/screens/public/SearchScreen.tsx` | Updated category list |

### Web App (to apply)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added 12 new enum values |
| `prisma/migrations/20260201000000_add_v4_activity_types/migration.sql` | ALTER TYPE SQL |
| `src/lib/constants.ts` | Added labels + emojis |

---

## Search Components

### New Components

| Component | Path | Description |
|-----------|------|-------------|
| `LocationInput` | `src/components/search/LocationInput.tsx` | City/postal code input with geolocation button |
| `TypeSelect` | `src/components/search/TypeSelect.tsx` | Activity type dropdown selector |
| `RadiusSelect` | `src/components/search/RadiusSelect.tsx` | Search radius dropdown (1-50 km) |

### Search Card (Hero Section)

```
+----------------------------------+
|  Ou cherchez-vous ?              |
|  [City/ZIP input    ] [Locate]   |
|                                  |
|  Type d'activite  | Rayon        |
|  [Dropdown      ] | [Dropdown ]  |
|                                  |
|  [   Rechercher des activites  ] |
+----------------------------------+
```

---

## Search Behavior

### When No Filters Are Set

- Clicking "Rechercher des activites" shows ALL activities (paginated)
- "A decouvrir" section shows recent/popular activities
- No filter badges displayed

### When Filters Are Active

- Results section shows active filter badges
- "Effacer" button clears all filters
- Categories auto-trigger search when selected

### Geolocation Flow

1. User taps geolocation button
2. Permission requested via `expo-location`
3. If granted: coordinates fetched + reverse geocoding for city name
4. If denied: Alert shown, fallback to manual city input
5. Coordinates take priority over city text input

---

## Default Values

| Setting | Default | Source |
|---------|---------|--------|
| Radius | 10 km | Web behavior |
| Type | `null` (all) | Web behavior |
| City | `""` (empty) | Web behavior |
| Page Size | 20 | Backend default |

---

## Testing Checklist

- [x] Search with city/postal code only
- [x] Search with geolocation + radius only
- [x] Search with type only
- [x] Search with radius only (combined with city/geo)
- [x] Images display on activity cards
- [x] Favorites toggle works
- [x] No crash if geolocation permission denied
- [x] No crash if medias API returns undefined
- [x] Empty state when no results
- [x] Loading skeletons display correctly
- [x] Pull-to-refresh works
- [x] Infinite scroll pagination
- [x] Clear filters button works
- [x] New activity types display correctly

---

## Dependencies

```json
{
  "expo-location": "^19.0.x"
}
```

---

## Architecture Notes

### State Management

Search filters are managed locally in `SearchScreen` using `useState`:

```typescript
interface SearchFilters {
  city: string;
  lat: number | null;
  lng: number | null;
  type: ActivityType | null;
  radiusKm: number;
  hasGeolocation: boolean;
}
```

### Geolocation Hook

The `useGeolocation` hook encapsulates all location logic:
- Permission handling
- Position fetching
- Reverse geocoding (city name lookup)
- Error handling with user-friendly alerts

### Component Composition

```
SearchScreen
├── Hero (LinearGradient)
│   └── SearchCard (glassmorphism)
│       ├── LocationInput
│       ├── TypeSelect
│       ├── RadiusSelect
│       └── SearchButton
├── Categories (horizontal scroll - POPULAR_CATEGORIES subset)
├── Discover (when not searching)
└── Results (when searching)
    ├── ResultsHeader + FilterBadges
    └── ActivityCard list
```

---

## Web Migration Instructions

To deploy the new activity types on the web/backend:

1. Apply the Prisma migration:
   ```bash
   cd web-repo
   npx prisma migrate deploy
   ```

2. Regenerate Prisma client:
   ```bash
   npx prisma generate
   ```

3. The `constants.ts` already has the new types with labels/emojis.

4. Restart the server to pick up enum changes.
