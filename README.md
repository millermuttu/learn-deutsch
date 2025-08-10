# Deutsch-Weg (German Learning Web App)

A lightweight, client-side German learning app with spaced repetition, verbs (modal + irregular), nouns, and flashcards. Built with HTML, Tailwind (CDN), and vanilla JS (ES modules).

## Quick Start

- Open directly
  - Double-click `deutsch-weg.html`
  - If the browser blocks ES modules due to CORS, use a local server

- Python HTTP server (recommended)
  - PowerShell:
    - `py -m http.server 5500`
  - Open `http://localhost:5500/deutsch-weg.html`

- Node http-server
  - PowerShell:
    - `npx http-server -p 5500`
  - Open `http://localhost:5500/deutsch-weg.html`

- VS Code/Cursor Live Server
  - Right-click `deutsch-weg.html` → “Open with Live Server”

## Project Structure

```
webapp/
  deutsch-weg.html        # Main entry (modular)
  src/
    app.js                # App logic (ES module)
    data.js               # Vocabulary data (exported)
    styles.css            # Custom styles
```

## Features

- Nouns: gender and plural practice
- Verbs:
  - Modal verbs: info, list, meaning quiz
  - Irregular verbs: info, list, quizzes (meaning, present conjugation, Partizip II, perfect)
- Flashcards (DE→EN and EN→DE)
- Spaced repetition (localStorage persistence)

## Reset Progress

In browser console:

```
localStorage.removeItem('deutschWegProgressV2')
```

## Notes

- Tailwind is loaded via CDN
- ES modules are used (`src/app.js` imports `src/data.js`)
- If opening the HTML file directly causes module/CORS issues, run a local server
