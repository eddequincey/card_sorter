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
- Export saved sorts as JSON
- Clear saved sorts button

## Run

No build step is required.

1. Open `index.html` in a browser.
2. Start sorting.

## Data Storage

Saved sorts are stored in browser `localStorage` under:

- `card-sorter-rounds`

Each saved sort includes:
- timestamp (`savedAt`)
- criterion (`criterion`)
- piles (`pileName` + card list)

## Export

Use **Export Saved Sorts** to download a JSON file of all saved sorts.

## Customize Cards

Edit `PET_TYPES` in `app.js`:

```js
const PET_TYPES = [
  "Dog",
  "Cat",
  // ...
];
```

## Logo

The header logo is loaded from:

- `card-sorter-logo.png`

Update the file or change the `src` in `index.html` if needed.
