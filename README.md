# Card Sorter (Repeated Single-Criterion)

A browser-based card sorting tool for repeated single-criterion sorts.

Participants:
- enter a criterion,
- drag cards into free-form piles,
- name their piles,
- save the sort,
- and repeat with a different criterion.

## Features

- Deck + workspace sorting UI
- Criterion required before card movement
- Free-form pile creation by dropping cards in workspace
- Draggable piles (to avoid overlap)
- Automatic review modal when all cards are sorted
- Save options:
  - `Save & sort again`
  - `Save & stop`
  - `Go back`
- Validation that default pile names (e.g. `Pile 1`) are not allowed on save
- Tutorial animation
- Local persistence in `localStorage`
- Default cards loaded from `cards.json`
- Export saved sorts as JSON
- Clear saved sorts button
- Optional admin setup mode via querystring

## Run

No build step is required.

1. Open `index.html` in a browser.
2. Start sorting.

## Admin Mode

You can open admin setup before participants start by using:

- `index.html?admin=1`

In admin mode:
- an **Admin Setup** panel appears first,
- sort/results panels are hidden initially,
- admin enters cards (one per line or comma-separated),
- clicks **Save Cards & Start**,
- then the tutorial and participant flow begin.

## Data Storage

Saved sorts are stored in browser `localStorage` under:

- `card-sorter-rounds`
- `card-sorter-card-set` (current active card set)

Each saved sort includes:
- timestamp (`savedAt`)
- criterion (`criterion`)
- piles (`pileName` + card list)

## Export

Use **Export Saved Sorts** to download a JSON file of all saved sorts.

## Customize Cards

Default card set:
- edit `cards.json`

Admin/local override:
- open `index.html?admin=1`
- enter one card per line (or comma-separated)
- click **Save Cards & Start**

Notes:
- Admin setup saves the active card set to `localStorage` (`card-sorter-card-set`).
- If `cards.json` cannot be loaded (for example, strict local-file restrictions), the app falls back to built-in defaults in `app.js`.

## Logo

The header logo is loaded from:

- `card-sorter-logo.png`

Update the file or change the `src` in `index.html` if needed.
