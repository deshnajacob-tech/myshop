# Deshna's Toy Trade 🧸

A simple, attractive **static website for trading toys with friends** using virtual
coins — no real money, no database, no backend. Just HTML, CSS and JavaScript.

The idea: give away toys you're bored with, and get "new" toys from your friends.
You buy and sell with virtual coins on the site; the actual toys are handed over
**in person when you meet**.

## Features

- 👥 **Register** with a name + a 4-digit PIN
- 🪙 Everyone starts with **500 virtual coins**
- 📸 **List toys** (new / used) with a photo, price and description
- 🛒 **Marketplace** — logged-in friends see everyone *else's* available toys
- 🙋 **Ask to buy** — the owner says **Yes!** or **No** before any coins move
- 💝 **Send coins** — gift coins to a friend
- 📜 **History page** — bought, sold, your asks, and a coin summary
- 👑 **Admin dashboard** (for Deshna) — see all friends, top up/take coins, view all toys & trades, reset everything
- 🤝 Toys delivered in person — only the coins are tracked online

### Big kid-friendly buttons
The whole site uses simple words, chunky buttons and emojis so younger kids can use it easily.

### Who is the admin?
The friend who registers with the name **`deshna`** automatically gets the 👑 **Admin** tab.
Everyone else just sees the normal pages.

## Files

```
myshop/
├── index.html      ← Home + login / register
├── market.html     ← Marketplace (buy friends' toys)
├── mytoys.html     ← List a toy + manage your listings
├── history.html    ← Your bought & sold history, send coins, your asks
├── admin.html      ← Admin dashboard (only shows for "deshna")
├── css/style.css   ← All the styling
├── js/
│   ├── store.js    ← Data + accounts + coins (the "database")
│   └── app.js      ← Page logic
└── images/
    └── placeholder.svg  ← Shown when a toy has no photo
```

## Important: where the data lives

Because this is a **fully static** site (no server), all accounts, coins and toys
are stored in the browser's `localStorage` — meaning **on this one device only**.

That makes it perfect for a group of friends who **share one computer** (say, Deshna's
laptop): each friend logs in with their own name + PIN, trades, then logs out.
Data does **not** sync across different phones or laptops — that would need a real
server, which is beyond this prototype.

> The PIN is a simple prototype login, not real security. Don't reuse a PIN you use
> anywhere important.

## How to run it

The pages load data with JavaScript, so open the site through a small local server
rather than double-clicking the HTML file.

- **VS Code (easiest):** install the **Live Server** extension, right-click
  `index.html` → **Open with Live Server**.
- **Python:** `python -m http.server 8000` then visit http://localhost:8000

## How to play

1. **Register** on the home page (name + 4-digit PIN) — you get 🪙 500.
2. Go to **My Toys** and list a toy you're bored with (add a photo + price).
3. Have your friends register and list their toys too (same device).
4. Open the **Marketplace** to see friends' toys and **Buy** the ones you like.
5. Check **History** to see your trades and coin balance.
6. When you all meet up, **hand over the real toys!** 🤝

Made with 💜 by Deshna.
