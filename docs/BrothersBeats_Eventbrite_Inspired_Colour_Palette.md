# BrothersBeats Website Colour Palette  
## Eventbrite-Inspired Direction

This palette takes inspiration from Eventbrite’s bright, energetic and discovery-led visual style, while keeping BrothersBeats distinctive through its Irish green, white and orange identity.

The website should be **light-first rather than predominantly black**. Use generous white space, bold typography, colourful event imagery, clean cards and a strong orange booking action.

---

## 1. Core Brand Palette

| Role | Colour Name | Hex | Recommended Use |
|---|---|---:|---|
| Main Background | Warm White | `#FFFDF8` | Main page background and spacious content areas |
| Surface | Pure White | `#FFFFFF` | Event cards, forms, menus and modal windows |
| Primary Text | Warm Ink | `#221D19` | Headlines, navigation and important information |
| Secondary Text | Soft Charcoal | `#615D59` | Descriptions, metadata and supporting copy |
| Primary Brand Green | Brothers Green | `#087A3E` | Logo, links, selected states and brand moments |
| Bright Green Accent | Electric Lime | `#CEFF58` | Badges, category highlights and playful sections |
| Primary Action | Event Orange | `#FF5E30` | Book-now buttons, important CTAs and active elements |
| Orange Hover | Deep Orange | `#D94520` | Button hover and pressed states |
| Irish White | Soft Ivory | `#F7F5EF` | Tricolour details, light panels and logo balance |
| Border | Light Stone | `#E4E1DC` | Card borders, dividers and form controls |

---

## 2. Supporting Event Colours

These colours can differentiate event categories without weakening the core BrothersBeats identity.

| Event Category | Colour | Hex | Suggested Use |
|---|---|---:|---|
| Community Events | Fresh Lime | `#CEFF58` | Category badges and promotional panels |
| Weddings & Celebrations | Soft Blush | `#FEC2EB` | Romantic event cards and backgrounds |
| Birthdays & Parties | Electric Blue | `#6C85FF` | Youthful party and nightlife content |
| Entertainment & Live Shows | Bright Red | `#FB3A35` | Live-event highlights and urgency |
| Corporate Events | Sage Green | `#94AF67` | Professional events and business content |
| Premium Experiences | Golden Yellow | `#FFD84D` | Featured and premium-event labels |

Use these as supporting accents rather than as primary brand colours.

---

## 3. Background Tints

| Role | Colour | Hex |
|---|---|---:|
| Soft Green Section | Pale Green | `#E9F6C4` |
| Soft Orange Section | Pale Peach | `#FFF0E9` |
| Soft Blue Section | Pale Periwinkle | `#EEF1FF` |
| Soft Pink Section | Pale Blush | `#FFF0FA` |
| Neutral Section | Soft Stone | `#F5F3EF` |

These work well behind featured-event collections, category sections and promotional blocks.

---

## 4. Recommended Colour Hierarchy

### Primary Website Colours

Use these most frequently:

- **Warm White:** `#FFFDF8`
- **Warm Ink:** `#221D19`
- **Brothers Green:** `#087A3E`
- **Event Orange:** `#FF5E30`

### Secondary Colours

Use these for personality and event discovery:

- **Electric Lime:** `#CEFF58`
- **Electric Blue:** `#6C85FF`
- **Soft Blush:** `#FEC2EB`
- **Sage Green:** `#94AF67`

---

## 5. Suggested Colour Balance

- **55%** warm white and neutral backgrounds
- **25%** white cards and surfaces
- **10%** dark text and navigation
- **5%** Brothers green
- **5%** orange and supporting accents

The website should feel colourful because of its event photography and accent blocks—not because every background is strongly coloured.

---

## 6. Website Component Usage

### Header

| Element | Colour |
|---|---:|
| Background | `#FFFFFF` |
| Logo | Brothers green, ivory and orange |
| Navigation text | `#221D19` |
| Navigation hover | `#087A3E` |
| Main CTA | `#FF5E30` |
| Bottom border | `#E4E1DC` |

### Hero Section

- Background: `#FFFDF8`
- Main headline: `#221D19`
- Highlighted headline word: `#FF5E30`
- Supporting text: `#615D59`
- Main button: `#FF5E30`
- Secondary action: `#087A3E`
- Decorative accent: `#CEFF58`

A large event photograph or rotating event collage should provide most of the visual energy.

### Search Bar

```css
.event-search {
  background: #FFFFFF;
  color: #221D19;
  border: 1px solid #E4E1DC;
  box-shadow: 0 8px 24px rgba(34, 29, 25, 0.08);
}
```

Focused state:

```css
.event-search:focus-within {
  border-color: #087A3E;
  box-shadow: 0 0 0 3px rgba(8, 122, 62, 0.14);
}
```

### Event Cards

```css
.event-card {
  background: #FFFFFF;
  border: 1px solid #E4E1DC;
  color: #221D19;
}
```

Suggested details:

- Event title: `#221D19`
- Date and time: `#FF5E30`
- Venue and description: `#615D59`
- Category badge: category-specific accent colour
- Favourite icon: `#087A3E`
- Card hover border: `#C9C4BD`

### Footer

A dark footer creates contrast without making the whole website dark.

- Background: `#221D19`
- Main text: `#FFFFFF`
- Secondary text: `#D8D4CE`
- Links on hover: `#CEFF58`
- CTA accent: `#FF5E30`

---

## 7. Button Palette

### Primary Booking Button

```css
.btn-primary {
  background: #FF5E30;
  color: #FFFFFF;
  border: 1px solid #FF5E30;
}

.btn-primary:hover {
  background: #D94520;
  border-color: #D94520;
}
```

### Secondary Brand Button

```css
.btn-secondary {
  background: #087A3E;
  color: #FFFFFF;
  border: 1px solid #087A3E;
}

.btn-secondary:hover {
  background: #065E31;
  border-color: #065E31;
}
```

### Outline Button

```css
.btn-outline {
  background: transparent;
  color: #221D19;
  border: 1px solid #221D19;
}

.btn-outline:hover {
  background: #221D19;
  color: #FFFFFF;
}
```

### Playful Category Button

```css
.btn-category {
  background: #CEFF58;
  color: #221D19;
  border: none;
}
```

---

## 8. Brand Gradients

The main website should rely more on flat colours than gradients. Gradients can be used sparingly in promotional banners, logo moments or featured-event sections.

### Irish Energy Gradient

```css
background: linear-gradient(
  110deg,
  #087A3E 0%,
  #CEFF58 38%,
  #FFFDF8 55%,
  #FF5E30 100%
);
```

### Event Energy Gradient

```css
background: linear-gradient(
  120deg,
  #FF5E30 0%,
  #FFD84D 35%,
  #CEFF58 65%,
  #6C85FF 100%
);
```

### Soft Promotional Background

```css
background: linear-gradient(
  135deg,
  #FFF0E9 0%,
  #FFFDF8 50%,
  #E9F6C4 100%
);
```

---

## 9. Typography Colours

| Content | Colour |
|---|---:|
| Main heading | `#221D19` |
| Section heading | `#221D19` |
| Body text | `#615D59` |
| Date and time | `#FF5E30` |
| Links | `#087A3E` |
| Muted metadata | `#77726D` |
| Text on orange | `#FFFFFF` |
| Text on lime | `#221D19` |
| Text on dark footer | `#FFFFFF` |

Avoid using green or orange for long paragraphs. They should guide attention, not replace readable body text.

---

## 10. Accessibility Notes

- Use `#221D19` for text on light backgrounds.
- Use white text on `#087A3E`, `#D94520` and other dark colours.
- Use dark text—not white—on `#CEFF58`, `#FFD84D`, `#FEC2EB` and pale backgrounds.
- Do not place white text on `#FF5E30` at very small sizes without checking contrast.
- Use icons, labels or patterns alongside colour when indicating event status.

---

## 11. CSS Variables

```css
:root {
  /* Foundations */
  --bb-bg-main: #FFFDF8;
  --bb-bg-surface: #FFFFFF;
  --bb-bg-neutral: #F5F3EF;
  --bb-border: #E4E1DC;

  /* Typography */
  --bb-text-primary: #221D19;
  --bb-text-secondary: #615D59;
  --bb-text-muted: #77726D;

  /* Core brand */
  --bb-green: #087A3E;
  --bb-green-dark: #065E31;
  --bb-lime: #CEFF58;
  --bb-orange: #FF5E30;
  --bb-orange-dark: #D94520;
  --bb-ivory: #F7F5EF;

  /* Event accents */
  --bb-blue: #6C85FF;
  --bb-pink: #FEC2EB;
  --bb-red: #FB3A35;
  --bb-sage: #94AF67;
  --bb-yellow: #FFD84D;

  /* Soft backgrounds */
  --bb-pale-green: #E9F6C4;
  --bb-pale-orange: #FFF0E9;
  --bb-pale-blue: #EEF1FF;
  --bb-pale-pink: #FFF0FA;

  /* States */
  --bb-success: #087A3E;
  --bb-warning: #C76A00;
  --bb-error: #C92A2A;

  /* Gradients */
  --bb-gradient-irish: linear-gradient(
    110deg,
    #087A3E 0%,
    #CEFF58 38%,
    #FFFDF8 55%,
    #FF5E30 100%
  );

  --bb-gradient-event: linear-gradient(
    120deg,
    #FF5E30 0%,
    #FFD84D 35%,
    #CEFF58 65%,
    #6C85FF 100%
  );
}
```

---

## 12. Final Recommendation

BrothersBeats should borrow the **energy and clarity** of an Eventbrite-style experience rather than copying Eventbrite’s branding.

The strongest direction is:

- A bright, warm-white website
- Large dark typography
- Clean white event cards
- Orange booking and enquiry buttons
- Green brand elements
- Colourful category accents
- Strong event photography
- A dark contrasting footer

This gives BrothersBeats the approachable, event-discovery feel of a major events platform while preserving its own Irish identity.
