# Product Design System Specification

## Goal

Give Kadris HR a coherent, responsive internal-product experience that is visually consistent with the public Kadris Support Systems website while keeping the HR workspace focused on operational work.

## Product language

Use **task** and **tasks** in user-facing copy for compliance assignments. Internal model, route, and API names may retain `requirement` for compatibility.

## Visual direction

The HR workspace uses a modern, calm operational aesthetic: a light navy-tinted canvas, restrained white surfaces, a white navigation rail, generous 13–15px corner radii, and soft low-contrast depth rather than heavy outlines or dense card borders. Typography and whitespace should make primary data easy to scan without relying on decoration. Interactive hover states use quiet blue surface shifts; magenta is reserved for focused accents and attention states.

## First-access guidance

First access uses a focused, completion-based interactive guide anchored above the workspace. It introduces three role-appropriate starting points, shows step progress, and lets the user open the relevant section from each step without obscuring the interface. The guide uses the same white-surface, navy, and blue hierarchy as the workspace.

## Brand direction

The product uses the Kadris Support Systems logo and a blue-led palette derived from the public site:

- ink: `#0F141A`
- primary blue: `#1B53A5`
- interactive blue: `#4484C4`
- magenta accent: `#A51261`
- muted text: `#6A7B8C`
- page canvas: `#E4F0F9`
- white surfaces: `#FFFFFF`

Headings use Karla when available, with a system fallback. Interface text uses Inter with a system fallback. The product does not need to duplicate the public marketing-site layout. Operational labels, table values, panel copy, and form controls use a minimum readable visual hierarchy rather than compressed microcopy.

## Application shell

- The left navigation is a white rail with a visible pale-blue divider and a restrained shadow.
- The official full-color Kadris Support Systems logo appears directly on the white navigation rail. It must remain legible at desktop, compact, and mobile navigation widths.
- Navigation labels and icons use restrained blue and slate colors. Hover states use a pale blue fill and primary-blue text.
- The main workspace uses a light-blue canvas with white panels, clear blue-gray borders, and a white top bar. Borders and shadows must provide clear separation from the canvas without relying on dark fills.
- The uncluttered top bar contains the signed-in user’s profile control at the right edge. The profile control remains available in compact desktop layouts.

## Components

- Buttons use the primary blue for their principal action, interactive blue on hover, and magenta for destructive actions.
- Panels, cards, forms, and tables use white surfaces, light-blue or slate borders, 7 to 12 pixel corner radii, and restrained shadows.
- Statuses remain semantic: blue for cleared or approved, magenta/red for blocked or destructive, and amber for warnings or pending review.
- Inputs use clear borders and a pale-blue focus ring. Text and controls must meet readable contrast against white surfaces.
- Sticky section headers use a pale Kadris-blue surface and a defined blue-gray lower edge so they remain visually separate from scrolling content.

## Responsive behavior

- Do not rely on horizontal page scrolling at any supported viewport width. Long values must wrap or truncate with a deliberate readable treatment inside their component.
- The desktop rail compacts to an icon rail at intermediate widths and becomes a wrapping top navigation on small screens.
- Page headings, action buttons, card grids, forms, access controls, and record rows reflow to one-column or stacked layouts when space is limited.
- The Users and Access section must preserve access to every field and action at mobile widths.
- When a page contains several independent, secondary information groups, use directly linkable tabs to show one group at a time rather than rendering every group in a single long view. Tabs must wrap on small screens; they must not require horizontal scrolling.
- For dashboard-style overview pages on desktop, keep the page itself within the viewport and place overflow inside a clearly bounded, scrollable data panel. Do not apply viewport locking on small screens.
- Apply the viewport-bound workspace pattern consistently to desktop operational pages. Employee directories, queues, reminder lists, requirement checklists, profile tabs, and long forms must use a bounded internal content region when they exceed available height. Settings can use section navigation or an internal workspace scroll region until its sections are separated into tabs. Small screens must continue to use normal document scrolling.

## Change control

Any feature that introduces a new reusable UI pattern, status, action type, or responsive behavior must update this specification and the feature specification in the same change set. Visual-only changes must update this specification when they alter the design system, application shell, component behavior, or responsive rules.
