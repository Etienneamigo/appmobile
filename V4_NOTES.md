# V4 - Home Search Feature (Mobile)

Version 4 aligns the mobile app's search functionality with the web application.

## Changes Summary

### New Components

| Component | Path | Description |
|-----------|------|-------------|
| `LocationInput` | `src/components/search/LocationInput.tsx` | City/postal code input with geolocation button |
| `TypeSelect` | `src/components/search/TypeSelect.tsx` | Activity type dropdown selector |
| `RadiusSelect` | `src/components/search/RadiusSelect.tsx` | Search radius dropdown (1-50 km) |

### New Files

- `src/constants/search.ts` - Search constants (distance options, default values)
- `src/hooks/useGeolocation.ts` - Geolocation hook using expo-location
- `src/hooks/index.ts` - Hooks export barrel

### Modified Files

- `src/api/activities.ts` - Added `lat`, `lng`, `radiusKm` params
- `src/screens/public/SearchScreen.tsx` - Full search form integration

---

## Query Parameters Mapping

### Web to Mobile API Mapping

| Web Param | Mobile Param | Backend Support | Notes |
|-----------|--------------|-----------------|-------|
| `city` | `city` | YES | Text search on city name |
| `type` | `type` | YES | Activity type enum |
| `lat` | `lat` | NO* | Latitude for geo search |
| `lng` | `lng` | NO* | Longitude for geo search |
| `radius` | `radiusKm` | NO* | Search radius in km |

*Backend API (`/api/mobile/activities`) does not yet support geo-search parameters. The mobile app sends them but they are currently ignored. Backend enhancement required.

### Priority Logic

```
if (hasGeolocation && lat && lng) {
  // Use coordinates + radius
  params = { lat, lng, radiusKm }
} else if (city) {
  // Use city text search
  params = { city }
}
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

## UI Components

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

### Filter Badges (Results Header)

When active, displays badges like:
- `📍 Ma position` (geolocation active)
- `📍 Paris` (city filter)
- `🎳 Bowling` (type filter)
- `10 km` (radius)

---

## Default Values

| Setting | Default | Source |
|---------|---------|--------|
| Radius | 10 km | Web behavior |
| Type | `null` (all) | Web behavior |
| City | `""` (empty) | Web behavior |

---

## Backend Requirements (TODO)

For full geo-search support, the backend API needs to:

1. Accept `lat`, `lng`, `radiusKm` query params
2. Calculate distance using Haversine formula or PostGIS
3. Filter activities within radius
4. Optionally sort by distance

Example query:
```
GET /api/mobile/activities?lat=48.8566&lng=2.3522&radiusKm=10&type=BOWLING
```

---

## Testing Checklist

- [x] Search with city/postal code only
- [x] Search with geolocation + radius only
- [x] Search with type only
- [x] Search with radius only (combined with city/geo)
- [x] Images display on activity cards
- [x] Favorites toggle works
- [x] No crash if geolocation permission denied
- [x] Empty state when no results
- [x] Loading skeletons display correctly
- [x] Pull-to-refresh works
- [x] Infinite scroll pagination
- [x] Clear filters button works

---

## Dependencies Added

```json
{
  "expo-location": "^18.0.x"
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
├── Categories (horizontal scroll)
├── Discover (when not searching)
└── Results (when searching)
    ├── ResultsHeader + FilterBadges
    └── ActivityCard list
```
