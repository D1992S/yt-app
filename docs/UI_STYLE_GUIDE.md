# UI Style Guide & Design System

## Overview
InsightEngine Desktop uses a premium dark theme optimized for data density and readability. The interface is built with Tailwind CSS and a set of custom CSS variables for theming.

## Color Tokens (Dark Mode)

| Token | Value (Approx) | Usage |
|-------|----------------|-------|
| `--bg` | `#09090b` (Zinc-950) | Main application background |
| `--panel` | `#18181b` (Zinc-900) | Cards, Modals, Sidebar backgrounds |
| `--panel-2` | `#27272a` (Zinc-800) | Secondary backgrounds, hover states |
| `--border` | `#27272a` (Zinc-800) | Borders, dividers |
| `--text` | `#f4f4f5` (Zinc-100) | Primary text, headings |
| `--text-muted` | `#a1a1aa` (Zinc-400) | Secondary text, labels, descriptions |
| `--accent` | `#3b82f6` (Blue-500) | Primary actions, active states, focus rings |
| `--danger` | `#ef4444` (Red-500) | Error states, destructive actions |
| `--success` | `#22c55e` (Green-500) | Success states, positive trends |

## Typography
Font Family: `Segoe UI`, Tahoma, Geneva, Verdana, sans-serif.

- **Headings**: 18px - 24px, Bold (`font-bold`), Color: `--text`
- **Body**: 14px - 15px, Regular (`font-normal`), Color: `--text`
- **Auxiliary**: 12px - 13px, Regular, Color: `--text-muted`
- **Monospace**: For IDs and technical data.

## Layout Principles

### Grid System
- Use CSS Grid for main layouts.
- **Wide Screens (>1280px)**: 3-column layout (2 cols for data, 1 col for tools).
- **Medium Screens (1024px - 1280px)**: 2-column layout or stacked sections.
- **Small Screens (<1024px)**: 1-column layout.

### Spacing
- **Container Padding**: Responsive (`p-4` mobile, `p-6` tablet, `p-8` desktop).
- **Gap**: Standard gap is `gap-6` (24px) between major sections.

### Responsiveness
- **No Horizontal Scroll**: Content must wrap or truncate with tooltips.
- **Sticky Elements**:
  - Header is always sticky (`top-0`).
  - On small screens, a sticky footer (`bottom-0`) ensures the primary action is accessible.

## Components

### Card
- Background: `--panel`
- Border: 1px solid `--border`
- Radius: `rounded-xl`
- Shadow: `shadow-sm` (subtle)

### Button
- **Primary**: Background `--accent`, Text White.
- **Secondary**: Background `--panel-2`, Border `--border`.
- **Ghost**: Transparent, hover background `--panel-2`.
- Height: `h-10` (40px) standard.

### Inputs
- Background: `--bg`
- Border: `--border`
- Focus: Ring 2px `--accent`

## Electron Specifics
- Window Background: `#09090b` (Matches `--bg` to prevent white flash).
- Min Width: 900px.
- Min Height: 650px.
