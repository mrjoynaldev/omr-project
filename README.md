# OMR Test Manager — Teacher PWA

Production-quality, mobile-first education web app for teachers.

Workflow: Existing Question Paper → Extract Questions → Teacher Review → Answer Key → Generate OMR → Scan → Review → Auto Marking → Results → Export.

## Stack (no build step, PWA-ready)
- Static PWA: `index.html` + `styles.css` + `js/*` (ES modules)
- Offline-first: localStorage data layer (`js/store.js`)
- OCR: Tesseract.js (images) + pdf.js (PDF text) + mammoth.js (DOCX) + regex parser (`js/ocr.js`)
- OMR: printable A4 HTML with corner markers (`js/omr.js`)
- Scan: camera (getUserMedia) + upload + canvas darkness heuristic + mandatory review (`js/scan.js`)
- Marking: deterministic, transparent (`js/marking.js`)
- Export: CSV / Excel (SheetJS) / print-PDF (`js/export.js`)

AI never silently decides answers. All AI suggestions are labelled and require teacher confirmation.

## Run (GitHub Pages)
- Enable Pages: Settings → Pages → Deploy from branch `main` / root, or via workflow `.github/workflows/pages.yml`
- Open `https://mrjoynaldev.github.io/omr-project/`
- Install to home screen from browser for app-like use.

## Data model
Teacher → Test → Questions[] → AnswerKey → OMR Template → Submissions[] → DetectedAnswers[] → Results[]

Privacy: all MVP data stays on device (localStorage). No uploads to server.

## Project structure
```
index.html
styles.css
manifest.webmanifest
sw.js
js/store.js js/ocr.js js/omr.js js/scan.js js/marking.js js/export.js js/app.js
```
