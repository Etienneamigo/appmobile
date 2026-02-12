# Design Notes - Mobile App "High-Tech 2026"

## Overview

This document describes the design system and visual choices made for the mobile app redesign, inspired by the web SaaS application at wadelo.com.

## Design Philosophy

- **Modern & Clean**: Minimalist approach with generous white space
- **High-Tech Feel**: Subtle gradients, glassmorphism effects, smooth animations
- **Mobile-First**: Optimized touch targets, thumb-friendly navigation
- **Consistent**: Unified design tokens across all components

## Color Palette

### Primary Colors
```
Primary Main:    #6366F1 (Indigo)
Primary Light:   #818CF8
Primary Dark:    #4F46E5
```

### Secondary Colors (Accents)
```
Secondary Main:  #06B6D4 (Cyan)
Secondary Light: #22D3EE
Secondary Dark:  #0891B2
```

### Semantic Colors
```
Success:   #10B981 (Green)
Warning:   #F59E0B (Amber)
Error:     #EF4444 (Red)
```

### Neutral Scale
```
50:  #FAFAFA
100: #F4F4F5
200: #E4E4E7
300: #D4D4D8
400: #A1A1AA
500: #71717A
600: #52525B
700: #3F3F46
800: #27272A
900: #18181B
950: #09090B
```

### Gradients
```
Hero:      #4F46E5 -> #7C3AED -> #EC4899 (Purple to Pink)
Primary:   #6366F1 -> #8B5CF6
Secondary: #06B6D4 -> #3B82F6
```

## Typography

### Font Sizes
```
xs:    11px   (Labels, captions)
sm:    13px   (Secondary text)
base:  15px   (Body text)
md:    16px   (Emphasized body)
lg:    18px   (Subheadings)
xl:    20px   (Section titles)
2xl:   24px   (Large titles)
3xl:   30px   (Hero subtitles)
4xl:   36px   (Hero titles)
5xl:   48px   (Giant display)
```

### Font Weights
```
Normal:    400
Medium:    500
Semibold:  600
Bold:      700
Extrabold: 800
```

## Spacing System

Based on 4px base unit:
```
xs:   4px
sm:   8px
md:   12px
lg:   16px
xl:   20px
2xl:  24px
3xl:  32px
4xl:  40px
5xl:  48px
6xl:  64px
```

## Border Radius

```
none: 0
sm:   6px
md:   10px
lg:   14px
xl:   18px
2xl:  24px
3xl:  32px
full: 9999px (Pills/circles)
```

## Shadows

Layered shadow system for depth:
```
sm:  Subtle lift (cards at rest)
md:  Standard elevation (buttons, inputs)
lg:  Prominent lift (floating cards)
xl:  High elevation (modals, overlays)
2xl: Maximum depth (hero elements)
```

### Colored Shadows
Primary and success colors have matching accent shadows for emphasis.

## Components

### Hero Section
- Full-width gradient background (purple to pink)
- Large title with text shadow for contrast
- Glassmorphism search card (white 85% opacity + blur)
- Status bar: light content for dark background

### Search Bar
- Rounded container with subtle border
- Emoji icon for visual interest
- Clear button appears when text present
- Debounced search (500ms)

### Category Cards
- 80px width, vertical layout
- Emoji icon in rounded container
- Selection state: primary color border + tinted background
- Horizontal scroll with gap spacing

### Activity Cards

#### Horizontal Variant (List)
```
+----------------------------------+
| [IMG] | Badge                 [❤] |
| 120px | Title                     |
|       | Establishment             |
|       | 📍City ⏱️30min  €15      |
+----------------------------------+
```
- 120x140px image with rounded corners
- Type badge with emoji
- Price in success-colored container
- Favorite button with bounce animation

#### Vertical Variant (Discover)
```
+------------------+
|     [IMAGE]      |
| Badge       [❤]  |
+------------------+
| Title            |
| Establishment    |
| 📍City     €15  |
+------------------+
```
- 70% screen width for horizontal scroll
- Image overlay for contrast
- Same info hierarchy as horizontal

### Skeleton Loading
- Animated opacity pulse (0.3 -> 0.7)
- Matches card layout exactly
- Used for both list and discover sections

## Animations

### Press Feedback
- Scale down to 0.98 on press
- Spring animation for natural feel
- Speed: 50, Bounciness: 4

### Favorite Toggle
- Heart bounces to 1.3x then settles
- Higher bounciness for playful feel
- Speed: 50, Bounciness: 12

### Scroll-based Header
- Opacity interpolation 0-100px scroll
- Sticky search bar appears as hero scrolls away

## Activity Type Emojis

Consistent emoji mapping across app and web:
```
BOWLING:         🎳
ESCAPE_GAME:     🔐
BAR_DANSANT:     💃
KARAOKE:         🎤
LASER_GAME:      🔫
CINEMA:          🎬
TRAMPOLINE_PARK: 🤸
```

## File Structure

```
src/
├── theme/
│   └── index.ts          # Design tokens
├── components/
│   ├── ActivityCard.tsx  # Main activity card
│   ├── CategoryCard.tsx  # Category selection
│   └── SkeletonCard.tsx  # Loading states
└── screens/
    └── public/
        └── SearchScreen.tsx  # Home screen
```

## Dependencies Added

- `expo-linear-gradient`: For hero section gradient background

## Responsive Considerations

- Safe area insets for iOS notch
- Platform-specific StatusBar height
- Touch targets minimum 44px
- Horizontal scroll for categories (no wrap)

## Accessibility

- High contrast text on gradients (white with shadow)
- Clear visual states for selection
- Animated elements respect reduce-motion (future)
- Emoji icons provide visual context

## Performance

- Animated.Value for scroll-linked animations
- useNativeDriver where possible
- Memoized callbacks to prevent re-renders
- Skeleton loading for perceived performance

---

*Design inspired by web SaaS at wadelo.com, adapted for mobile UX patterns.*
