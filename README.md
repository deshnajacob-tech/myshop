# Friends Trading Centre 🧸

A simple, attractive **static website for trading toys with friends** using virtual
coins — no real money, no database, no backend. Just HTML, CSS and JavaScript.

The idea: give away toys you're bored with, and get "new" toys from your friends.
You buy and sell with virtual coins on the site; the actual toys are handed over
**in person when you meet**.

## Features

- 👥 **Register** with a name + a 4-digit PIN — then wait for Deshna to say yes
- ✅ **Admin approves sign-ups** — new friends can't log in until Deshna accepts them
- 🪙 Everyone starts with **50 virtual coins**
- 📸 **List toys** (new / used) with a photo, price and description
- 🛒 **Marketplace** — logged-in friends see everyone *else's* available toys
- 🙋 **Ask to buy** — the owner says **Yes!** or **No** before any coins move
- 🔄 **Trading Board** — swap a toy straight for another toy, fidget-trading style (no coins)
- 💝 **Send coins** — gift coins to a friend
- 📜 **History page** — bought, sold, your asks, and a coin summary
- 👑 **Admin dashboard** (for Deshna) — accept/decline sign-ups, see all friends, top up/take coins,
  **set everyone back to 🪙 50** with one button, view all toys & trades, reset everything
- 🤝 Toys delivered in person — only the coins are tracked online

### The Trading Board 🔄
Coins are one way to trade — the **Trading Board** is the other. Pick a friend's toy,
choose which of your own toys to offer, and press **Offer this swap**. The owner sees it
under **Swap offers for you** and presses ✅ Yes! or ❌ No. On a yes the two toys change
owners immediately (no coins move at all), both toys stay listed so they can be traded on
again, and any other offer or buy request for those two toys is tidied away. You can take
back an offer while it's still waiting, and every finished swap is listed at the bottom of
the page so you remember what to hand over in person.

### Big kid-friendly buttons
The whole site uses simple words, chunky buttons and emojis so younger kids can use it easily.

### Who is the admin?
The **Deshna** account is created automatically the first time the site opens, with the
PIN **`8351`**. Logging in as Deshna gives you the 👑 **Admin** tab; everyone else just
sees the normal pages. Nobody else can register the name "Deshna" because it's taken.

> Change the PIN in [`js/store.js`](js/store.js) (`ADMIN_PIN`) — and know that anyone who
> reads the page source can see it. It's a friendly gate, not real security.

### Letting friends in
When a friend registers they land in **🙋 Waiting to join** on the admin page and can't
log in yet. Deshna presses **✅ Yes!** (they're in, with their 🪙 50) or **❌ No** (the
sign-up is deleted and the name is free again).

## Files

```
myshop/
├── index.html      ← Home + login / register
├── market.html     ← Marketplace (buy friends' toys)
├── trade.html      ← Trading Board (swap toy for toy, no coins)
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

1. **Register** on the home page (name + 4-digit PIN), then ask Deshna to accept you
   from the 👑 **Admin** page — after that you can log in with 🪙 50.
2. Go to **My Toys** and list a toy you're bored with (add a photo + price).
3. Have your friends register (and get accepted) and list their toys too (same device).
4. Open the **Marketplace** to see friends' toys and **Buy** the ones you like —
   or use the **Trading Board** to swap one of your toys for one of theirs.
5. Check **History** to see your trades and coin balance.
6. When you all meet up, **hand over the real toys!** 🤝

Made with 💜 by Deshna.
