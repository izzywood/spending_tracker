# Shopping Tracker

A lightweight, client-side web app to record and manage shopping purchases. Data is stored in your browser's localStorage.

## Features
- Add, edit, delete purchases
- Persist data locally (no server required)
- Totals: item count, quantity sum, amount sum
- Filters: text, category, date range
- Import/Export JSON
- Responsive, accessible UI

## Usage
1. Open `index.html` in a modern browser (Chrome, Edge, Safari, Firefox).
2. Add purchases using the form. Data saves automatically.
3. Filter using text/category/date inputs.
4. Export to JSON for backup; import the JSON later to restore.

## Development
No build tools required. Edit `index.html`, `styles.css`, and `app.js`.

## Notes
- Data is stored under the localStorage key `shopping-tracker:purchases`.
- Currency display uses your locale; amounts are stored as numbers.
