# Deshna's Delights 🎁

A simple, attractive **static gift-shop website** — no payments, no database. Just
HTML, CSS and JavaScript, with gift data kept in a JSON file and images in a folder.
This is a prototype.

## What's inside

```
myshop/
├── index.html        ← Landing page: hero + gift gallery
├── admin.html        ← Add new gifts (form + image, saves to browser & exports JSON)
├── css/
│   └── style.css     ← All the styling (blush + plum theme)
├── js/
│   ├── main.js       ← Loads gifts.json + shows the gallery, filters, popups
│   └── admin.js      ← Handles the "add a gift" form and JSON export
├── data/
│   └── gifts.json    ← All gift details live here
└── images/           ← Gift images (SVG samples included)
```

## How to run it

Because the site loads `data/gifts.json` with `fetch`, open it through a small local
server (not by double-clicking the HTML file).

**Option A — Python (already on most machines):**
```powershell
cd d:\GitHub\myshop
python -m http.server 8000
```
Then visit **http://localhost:8000**

**Option B — VS Code:** install the "Live Server" extension, right-click
`index.html` → "Open with Live Server".

## How to add gifts

1. Open **Add a Gift** (top-right button) or go to `admin.html`.
2. Fill in the name, price, category, description, tags and choose an image.
3. Click **Add Gift to Shop** — it appears instantly on the landing page
   (saved in your browser).
4. To make it permanent for everyone:
   - Click **Download gifts.json** and replace `data/gifts.json` with it.
   - Save your image into the `images/` folder using the same file name.

That's it — refresh and your gift is part of the shop for good. 💜

Made with 💜 by Deshna.
