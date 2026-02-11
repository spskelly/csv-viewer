# CSV Viewer PWA

A lightweight, fast CSV file viewer with sorting, filtering, and statistics. Set it as your default `.csv` handler for instant data inspection.

## Features

- 🚀 **Instant loading** - Offline-first PWA with service worker caching
- 📂 **File handler** - Set as default app for `.csv`, `.tsv` files (Chromium browsers)
- 🔍 **Search/Filter** - Full-text search across all columns
- ↕️ **Sortable columns** - Click headers to sort (numbers and text)
- 📊 **Column statistics** - Min, max, avg, median, sum, top values
- 💾 **Export filtered** - Save your filtered/sorted results
- 🎨 **Dark/Light mode** - Toggle between themes
- 🔄 **Reset All** - Clear search, sort, and filters in one click
- 📄 **Pagination** - Handle large files efficiently (configurable rows per page)
- 📱 **Responsive** - Works great on desktop and mobile

## Quick Start

### Option A: Use the hosted version

Visit the GitHub Pages deployment linked on this repo — no install needed.

### Option B: Run locally

```bash
cd csv-viewer
python3 -m http.server 8000
```
Then visit: http://localhost:8000

### 2. Install as PWA

1. Open the app in Chrome/Edge/Brave
2. Look for the install icon in the address bar
3. Click to install

### 3. Set as default file handler

After installing:
1. Right-click any `.csv` file
2. Choose "Open with" → "Choose another app"
3. Select "CSV Viewer" from the list
4. Check "Always use this app"

Now every CSV file opens instantly with sorting and filtering!

## Features in Detail

### Sorting
Click any column header to sort. Click again to reverse direction. Works intelligently:
- Detects numbers and sorts numerically (handles comma-formatted numbers)
- Falls back to alphabetical for text
- Shows sort indicator (↑/↓)
- Sorting and search compose — filtering keeps your sort, sorting keeps your filter

### Search/Filter
Type in the search box to filter rows. Searches across ALL columns. Great for finding specific values quickly.

### Column Statistics
Click the 📊 button on any column header to see:
- Total/unique/empty values
- For numbers: sum, average, median, min, max
- Top 10 most common values with percentages

### Export Filtered Data
After filtering/sorting, click "Export Filtered" to download a CSV with just the rows you're viewing.

## Keyboard Shortcuts

- `Ctrl/Cmd + O` - Open file
- `Ctrl/Cmd + F` - Focus search
- `Ctrl/Cmd + D` - Toggle dark/light mode

## Supported Formats

- `.csv` - Comma-separated values
- `.tsv` - Tab-separated values
- `.txt` - Generic delimited text (auto-detects delimiter)

Uses PapaParse for robust CSV parsing - handles quoted fields, embedded commas, and edge cases correctly.

## Performance

Handles large files well:
- Pagination keeps UI fast (50/100/250/500 rows per page)
- Loading spinner for large file parsing
- Efficient filtering and sorting
- Tested with files up to several MB

## Browser Support

- ✅ Chrome/Edge/Brave (full support including file handler)
- ✅ Firefox (works, but no file handler API yet)
- ✅ Safari (works, but no file handler API yet)

## Development

Files:
- `index.html` - App shell
- `app.js` - Main logic (parsing, sorting, stats)
- `styles.css` - Table styling
- `manifest.json` - PWA configuration
- `service-worker.js` - Offline caching

## Libraries Used

- **PapaParse** - CSV parsing
- **Service Worker API** - Offline support
- **File Handling API** - Default file handler

## Why This Exists

Opening CSV files shouldn't require:
- Starting Excel (heavy, slow)
- Opening Google Sheets (requires upload, internet)
- Using a text editor (no structure)

This gives you instant, beautiful CSV inspection with sorting and stats. Double-click → done.

## License

MIT - do whatever you want with it

---

Built for instant CSV inspection without the bloat 📊
