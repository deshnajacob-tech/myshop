# Friends Trading Centre 🧸

A simple, attractive **website for trading toys with friends** using virtual coins —
no real money. Plain HTML, CSS and JavaScript, with a free Firebase Firestore database
so everyone shares the same toys and coins from **any computer**.

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
- 🏆 **Leaderboard** — friends ranked by how many toys they've listed, with a podium and a
  "list 2 more to pass Aria" nudge
- 👑 **Admin dashboard** (for Deshna) — accept/decline sign-ups, see all friends, top up/take coins,
  **set everyone back to 🪙 50** with one button, view all toys & trades, reset everything
- ☁️ **Works on any computer** — shared cloud database, updates live for everyone
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
├── leaderboard.html ← Who has listed the most toys
├── admin.html      ← Admin dashboard (only shows for "deshna")
├── css/style.css   ← All the styling
├── firestore.rules ← Database rules to paste into the Firebase console
├── js/
│   ├── firebase-config.js  ← YOUR Firebase project settings (paste them here)
│   ├── store.js    ← Cloud data + accounts + coins (the database layer)
│   └── app.js      ← Page logic
└── images/
    └── placeholder.svg  ← Shown when a toy has no photo
```

## Where the data lives

Accounts, toys, coins, swaps and trades all live in a **Firebase Firestore** database
in the cloud, so **every friend sees the same thing from any computer or phone**.
Changes appear live — when a friend lists a toy or accepts a swap, everyone else's page
updates by itself, no refresh needed.

The only thing stored on your own device is *which friend is logged in on this browser*.

Photos are shrunk in the browser and saved inside the toy's database record, so there's
nothing else to set up and no paid Firebase Storage needed.

> ⚠️ The PIN is a simple prototype login, not real security. It is stored in the database
> and checked in the browser, so a technical person could read it. Use a throwaway
> 4-digit PIN and never one you use anywhere important.

## Setting up your Firebase database (do this once)

> ✅ **Already done for this repo** — it points at the Firebase project `myshop-2d5ff`.
> These steps are only needed if you ever start a fresh project.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and
   **Add project** (any name, e.g. `friends-trading-centre`). Google Analytics is
   not needed. The free **Spark** plan is plenty — no card required.
2. In the left menu pick **Build → Firestore Database → Create database**.
   Choose a location near you and start in **production mode** (the rules come next).
3. Open the **Rules** tab, replace everything with the contents of
   [`firestore.rules`](firestore.rules) from this repo, and press **Publish**.
   (Read the warning at the top of that file first.)
4. Back on the project overview, click the **web icon `</>`** to register a web app.
   Give it a nickname, skip Hosting, and copy the `firebaseConfig` object it shows you.
5. Paste those values into [`js/firebase-config.js`](js/firebase-config.js), replacing
   every `PASTE_...` placeholder.
6. Push to GitHub. The site redeploys to GitHub Pages and works from any computer.

If you skip this, the site opens with a friendly "Almost there!" message instead of
crashing. **Deshna's admin account (PIN `8351`) is created automatically** the first
time anyone opens the site.

## How to run it

The pages use JavaScript modules, so open the site through a small local server
rather than double-clicking the HTML file.

- **VS Code (easiest):** install the **Live Server** extension, right-click
  `index.html` → **Open with Live Server**.
- **Python:** `python -m http.server 8000` then visit http://localhost:8000
- **Live site:** pushing to `main` deploys to GitHub Pages automatically.

## How to play

1. **Register** on the home page (name + 4-digit PIN), then ask Deshna to accept you
   from the 👑 **Admin** page — after that you can log in with 🪙 50.
2. Go to **My Toys** and list a toy you're bored with (add a photo + price).
3. Have your friends register (and get accepted) and list their toys too —
   from their own computers or phones.
4. Open the **Marketplace** to see friends' toys and **Buy** the ones you like —
   or use the **Trading Board** to swap one of your toys for one of theirs.
5. Check **History** to see your trades and coin balance.
6. When you all meet up, **hand over the real toys!** 🤝

Made with 💜 by Deshna.
