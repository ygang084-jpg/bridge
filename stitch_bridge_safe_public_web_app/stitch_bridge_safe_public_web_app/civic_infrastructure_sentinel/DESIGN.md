---
name: Civic Infrastructure Sentinel
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#44474e'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#75777f'
  outline-variant: '#c5c6cf'
  surface-tint: '#4e5e81'
  primary: '#031635'
  on-primary: '#ffffff'
  primary-container: '#1a2b4b'
  on-primary-container: '#8293b8'
  inverse-primary: '#b6c6ef'
  secondary: '#006d37'
  on-secondary: '#ffffff'
  secondary-container: '#6bfe9c'
  on-secondary-container: '#00743a'
  tertiary: '#735c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cea700'
  on-tertiary-container: '#4e3e00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#b6c6ef'
  on-primary-fixed: '#081b3a'
  on-primary-fixed-variant: '#364768'
  secondary-fixed: '#6bfe9c'
  secondary-fixed-dim: '#4ae183'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005228'
  tertiary-fixed: '#ffe084'
  tertiary-fixed-dim: '#eec209'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#574500'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Noto Sans KR
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Noto Sans KR
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Noto Sans KR
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption:
    fontFamily: Noto Sans KR
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system is built on the pillars of **reliability, clarity, and civic responsibility**. It aims to transform complex structural engineering data into an accessible, "life-oriented" experience for both government officials and the general public. 

The visual style is **Modern Corporate with a Digital Twin aesthetic**. It utilizes a clean, card-based interface that feels organized and structural. By combining high-density data visualizations with soft, rounded UI elements and ample white space, the system avoids the "heavy" feeling of legacy industrial software. The mood is calm and informative, providing a sense of security through transparent, real-time communication.

## Colors

The palette is anchored by **Deep Navy (#1A2B4B)**, representing the strength of steel and the authority of public safety institutions. This is contrasted against a high-value neutral background to ensure maximum legibility and a "Digital Twin" cleanliness.

A semantic signaling system is used for bridge status:
- **Success (Safe):** #2ECC71 - Used for stable structures and optimal weather conditions.
- **Warning (Caution):** #F1C40F - Used for maintenance alerts or high winds.
- **Danger (Critical):** #E74C3C - Used for immediate safety hazards or structural closures.

Secondary accents use a lighter **Steel Blue (#E2E8F0)** for borders and dividers to maintain a soft, modern transition between cards.

## Typography

This design system uses **Hanken Grotesk** for headlines to provide a sharp, technical, and modern feel that aligns with "Smart City" aesthetics. For body text and labels, **Noto Sans KR** (or Pretendard) is utilized to ensure perfect legibility for Korean characters and high accessibility in data-heavy contexts.

Hierarchy is maintained through clear weight distinctions. Display sizes use tight letter spacing for a more authoritative look, while body text uses a generous line height (1.5x) to prevent user fatigue when reading safety reports or technical specifications.

## Layout & Spacing

The system employs a **Fluid Grid** with a 12-column structure for desktop and a 4-column structure for mobile. 

- **Map-Centric Dashboard:** The primary view features a full-bleed map background with floating, translucent card modules.
- **Card-Based Interface:** Information is compartmentalized into cards to manage cognitive load. 
- **Spacing Rhythm:** An 8px linear scale governs all padding and margins. Large `xl` (80px) vertical spacing is used between major sections to mimic the airy, premium feel of modern architecture websites.
- **Safe Areas:** On desktop, content is constrained to a max-width of 1440px for optimal readability, while the map beneath scales to fill the viewport.

## Elevation & Depth

To achieve the "Digital Twin" aesthetic, the design system utilizes **Tonal Layering** and **Ambient Shadows**. 

1.  **Level 0 (Base):** The map or canvas layer.
2.  **Level 1 (Surface):** Default cards. These use a white fill with a very soft, diffused shadow (15% opacity Deep Navy, 20px blur) and a subtle 1px border (#E2E8F0).
3.  **Level 2 (Overlay):** Modals and hover-states. These use a slightly more pronounced shadow to indicate interactivity and focus.

Backdrop blurs (10px - 20px) are applied to navigation bars and side panels to maintain a sense of space and context, allowing the map colors to bleed through subtly without compromising text legibility.

## Shapes

The shape language is defined by **Rounded (0.5rem)** corners. This softens the industrial nature of the content, making the application feel more "life-oriented" and approachable. 

- **Standard Cards:** 1rem (rounded-lg) for a friendly, modern feel.
- **Buttons & Inputs:** 0.5rem for a precise but non-aggressive profile.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons are solid Deep Navy (#1A2B4B) with white text. Secondary buttons use a ghost style with a Steel Blue border. All buttons include a subtle transition on hover.
- **Status Chips:** Small, pill-shaped indicators with a light background tint of the status color and a darker text color (e.g., Light Green background with Dark Green text) for high contrast and accessibility.
- **Bridge Info Cards:** Feature a simplified vector illustration of the bridge type at the top, followed by a clear status heading and a grid of "Weather Factors" (Wind, Humidity, Temp) using soft, rounded line icons.
- **Input Fields:** Clean, white backgrounds with 1px light gray borders. On focus, the border transitions to Primary Navy.
- **Interactive Maps:** Custom map styles using a monochromatic "Silver" or "Water" base to let the colored status pins (Green/Yellow/Red) pop.
- **Data Visualizations:** Line charts and gauges use the semantic color palette. Lines are smoothed (curved) rather than jagged to maintain the soft aesthetic.