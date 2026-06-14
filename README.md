<div align="center">

# 📓 FY Note

**Free, local-first digital notebook for students. No subscription. No account. Yours.**

[Live App](https://note.forgeyours.space) · [ForgeYours Platform](https://forgeyours.space) · [MIT License](LICENSE)

</div>

-----

## What is FY Note?

FY Note is a free digital notebook that runs entirely in your browser.
Primary input is handwriting on canvas — just like a real notebook.
No installation. No account. No subscription. Your notes stay on your device.

It is part of the [ForgeYours](https://forgeyours.space) platform — a collection of free, open-source tools built as a right, not a product.

**Built for students who are tired of paying for tools they deserve for free.**

-----

## Features

**Handwriting Canvas**

- Pressure-sensitive pen with smooth Bezier stroke rendering
- Pen, highlighter, and eraser tools
- Pen colour presets and custom colour picker
- Highlighter with adjustable opacity
- Eraser with adjustable size
- Undo / Redo
- Clear page
- Pinch to zoom, scroll when zoomed

**Organisation**

- Folders → Notebooks → Pages hierarchy
- Create, rename, delete folders, notebooks, and pages
- Multiple pages per notebook
- Search across all notes and text

**Page Layouts**

- Plain, ruled, grid, and dotted paper backgrounds
- A4 page simulation
- Zoom controls

**Rich Media on Canvas**

- Text blocks — drag, resize, rich text inside
- Image blocks — insert from device or URL, drag and resize
- PDF import — annotate directly on top of PDF pages

**Flashcards**

- Create flashcard decks per notebook
- Spaced repetition review with SM-2 algorithm
- Card confidence rating: Again / Hard / Good / Easy
- Review progress tracking

**Export**

- Export page as PNG
- Export page as PDF
- Export notebook as ZIP
- Export annotated PDF

**AI Assistant**

- Built-in AI study assistant powered by Gemini
- Summarise notes on the current page
- Generate flashcards from selected text
- Explain concepts
- Bring your own Gemini API key

**Platform**

- PWA — installable, works fully offline after first load
- Service worker with stale-while-revalidate caching
- Dark mode, light mode, and sepia (coffee) theme
- Google Drive sync
- Local device storage — IndexedDB, unlimited
- Responsive — works on desktop, tablet, and iPad

-----

## Philosophy

FY Note exists because students should not have to pay for a notebook.

Collanote, Noteshelf, GoodNotes — all paid. All locked to specific platforms.
FY Note runs in any browser on any device. Free. Forever.

Your notes are yours. They live on your device. We never see them.

[Read the full ForgeYours manifesto →](https://github.com/forgeyours/platform)

-----

## Getting Started

**Use it now:** [note.forgeyours.space](https://note.forgeyours.space)

No setup needed. Open the link and start writing.

**Install as an app:**
On iPad/iPhone — tap Share → Add to Home Screen
On Android — tap the browser menu → Install App
On desktop — click the install icon in your browser’s address bar

-----

## Local Development

```bash
git clone https://github.com/forgeyours/note
cd note
npm install
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local for AI features
npm run dev
```

Open <http://localhost:3000>

**AI features** require a Gemini API key.
Get one free at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

**Google Drive sync** requires a Google OAuth access token entered directly in the app settings.

-----

## Tech Stack

|Technology         |Purpose                  |
|-------------------|-------------------------|
|React 19           |UI                       |
|Vite 6             |Build tool               |
|TypeScript 5.8     |Type safety              |
|Tailwind CSS v4    |Styling                  |
|Zustand 5          |Global state             |
|Canvas API         |Handwriting engine       |
|IndexedDB          |Local storage — unlimited|
|Google Drive API v3|Cloud sync               |
|react-pdf          |PDF rendering            |
|jsPDF              |PDF export               |
|JSZip              |Notebook ZIP export      |
|Gemini API         |AI study assistant       |
|Lucide React       |Icons                    |
|React Hot Toast    |Notifications            |
|Service Worker     |Offline PWA caching      |

-----

## Project Structure

```
src/
├── App.tsx                    — root layout orchestrator
├── index.css                  — global styles and CSS variables
├── main.tsx                   — entry point
├── types.ts                   — shared TypeScript interfaces
├── components/
│   ├── GlobalTooltip.tsx      — shared tooltip system
│   ├── canvas/
│   │   ├── PageCanvas.tsx     — main canvas orchestrator
│   │   ├── HandwritingLayer.tsx — pen/highlighter/eraser engine
│   │   ├── TextBlock.tsx      — draggable rich text blocks
│   │   ├── ImageBlock.tsx     — draggable image blocks
│   │   └── PDFBackground.tsx  — PDF page rendering layer
│   ├── modals/
│   │   ├── FlashcardModal.tsx — flashcard creation and review
│   │   ├── ExportModal.tsx    — export options
│   │   ├── ImportModal.tsx    — import files
│   │   ├── InstallModal.tsx   — PWA install prompt
│   │   └── SettingsModal.tsx  — app settings and Drive sync
│   ├── sidebar/
│   │   ├── Sidebar.tsx        — collapsible left sidebar
│   │   ├── FolderItem.tsx     — folder with notebook list
│   │   ├── NotebookItem.tsx   — notebook with page list
│   │   └── SidebarSearch.tsx  — search across all notes
│   └── toolbar/
│       ├── PageToolbar.tsx    — main toolbar
│       ├── PenPicker.tsx      — pen colour and width
│       ├── HighlighterPicker.tsx — highlighter colour and opacity
│       └── EraserPicker.tsx   — eraser size
├── data/
│   └── defaultContent.ts      — welcome notebook seed data
├── lib/
│   ├── canvasEngine.ts        — stroke rendering and smoothing
│   ├── db.ts                  — IndexedDB CRUD operations
│   ├── exportEngine.ts        — PNG, PDF, ZIP export
│   ├── pdfLoader.ts           — PDF.js integration
│   └── spacedRepetition.ts    — SM-2 flashcard algorithm
└── store/
    └── appStore.ts            — Zustand global state
```

-----

## Contributing

FY Note is open source and welcomes contributors.

See [CONTRIBUTING.md](https://github.com/forgeyours/platform/blob/main/CONTRIBUTING.md) for the full guide.

The short version:

1. Fork this repo
1. Build your improvement
1. Open a Pull Request

All contributions are credited in this README and on the platform.

**Good first contributions:**

- Improve stroke smoothing algorithm
- Add shape tools (rectangle, circle, arrow)
- Add lasso selection for strokes
- Add Cornell notes template
- Improve mobile touch handling

-----

## Roadmap

- [ ] Shape tools — rectangle, circle, arrow, line
- [ ] Lasso selection for strokes
- [ ] Audio recording with canvas pins
- [ ] Full text search across all pages
- [ ] Tags and starred pages
- [ ] Ruler and protractor overlay
- [ ] More page templates — Cornell notes, mind map, planner
- [ ] Collaborative notebooks via WebRTC

-----

## Support

ForgeYours has no ads, no subscriptions, and no investors.

If FY Note helped you study or saved you money — there is a support button inside the app. Any amount, any currency, any time. No pressure.

Every contribution is publicly accounted for at [forgeyours.space/finances](https://forgeyours.space/finances)

-----

## License

MIT — copy it, modify it, build on it.

See <LICENSE> for details.

-----

<div align="center">

**ForgeYours — forgeyours.space**

*Cognitive tools are a basic human right.*

</div>
