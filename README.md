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
- 📸 **List toys** (new / used) with a photo, price and description — **🪙 1 coin** for every
  toy you post
- 🏅 **Levels** — a new badge every 10 toys posted (Bronze → Silver → Gold → …), each one
  worth a **🪙 5** bonus
- 🛒 **Marketplace** — logged-in friends see everyone *else's* available toys
- 🙋 **Ask to buy** — the owner says **Yes!** or **No** before any coins move
- 🧸 **One toy in, one toy out** — you can only buy as many toys as you've listed yourself
- 🔄 **Trading Board** — swap a toy straight for another toy, fidget-trading style (no coins)
- 💝 **Send coins** — gift coins to a friend
- 📜 **History page** — bought, sold, your asks, and a coin summary
- 🏆 **Leaderboard** — friends ranked by how many toys they've listed, with a podium, the
  level chart and a "list 2 more to pass Aria" nudge
- ⏸️ **Pause a friend** — they keep everything but can't log in until Deshna switches them on
- 🗑️ **Remove a friend** — deletes their account and the toys they still own, for good
- 👑 **Admin dashboard** (for Deshna) — accept/decline sign-ups, see all friends, top up/take coins,
  pause / switch on / remove friends, **set everyone back to 🪙 50** with one button,
  view all toys & trades, reset everything
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

### Levels and rewards 🏅
Posting toys pays. Every toy you list gives you **🪙 1** straight away, and every **10 toys
posted** moves you up the level chart for a **🪙 5** bonus:

| Badge | Level | Toys posted | Bonus |
|-------|-------|-------------|-------|
| 🌱 | Starter | 0 | — |
| 🥉 | Bronze | 10 | 🪙 5 |
| 🥈 | Silver | 20 | 🪙 5 |
| 🥇 | Gold | 30 | 🪙 5 |
| 💎 | Platinum | 40 | 🪙 5 |
| 👑 | Diamond | 50 | 🪙 5 |
| 🏆 | Legend | 60 | 🪙 5 |

Past Legend the badge stays 🏆 and the number climbs (Legend 7, Legend 8…), still 🪙 5 every
10 toys. The full chart is on the **Leaderboard** page with everyone's badge on it, plus a
line telling you how many more toys you need for the next one.

Only toys **you** posted count (the `listedBy` field), and the level you reach is saved on
your account — so taking a toy back down never takes your badge away, and re-listing the
same toy can't be farmed for bonuses.

### One toy in, one toy out 🧸
So the site stays a *trading* club and not a shop, **you can only buy as many toys as you
keep on the site**: every toy you list earns you one buy.

- List 3 toys → you can buy 3 toys. Buy them all and the **Ask to buy** buttons turn into
  **List a toy first 🧸** until you put up another toy.
- Asks that are still waiting for a yes count too, so you can't ask ten friends at once
  with only one toy listed.
- Only toys **you** put up count. Toys you bought or swapped for belong to whoever listed
  them, so you can't recycle them to earn more buys.
- Toys that already sold still count for you — selling never costs you a buy.
- Swapping toy-for-toy on the Trading Board is always allowed; it's already one-for-one.

The Marketplace shows a banner with how many buys you have left, and **My Toys** shows the
same sum under your listings. If someone takes a listing back down after asking for a toy,
the seller sees "…has to list another toy" instead of the trade going through — the ask
just waits until they do.

### Pausing and removing friends ⏸️ 🗑️
Every friend in the 👥 **Friends** list on the admin page has two buttons besides the coin
ones:

- **⏸️ Pause** — the friend can't log in any more ("Your account is paused. Ask Deshna to
  switch it back on."), and their toys disappear from the Marketplace, Trading Board,
  Leaderboard and the send-coins list, because nobody can trade with someone who isn't
  there. **Nothing is deleted** — their coins, toys and history all wait for them. If they
  were logged in on their own device, the next time their page updates they're logged out.
  The button turns into **▶️ Switch on**, which puts everything back exactly as it was.
- **Remove** — deletes the account and the toys they still own for good, along with any buy
  requests and swap offers that were still waiting on them. Toys they already swapped away
  stay with their new owner, and finished trades stay in everyone else's history. It asks
  "are you sure?" first, because it can't be undone — pause is the friendlier choice.

Deshna's own admin account can't be paused or removed, so you can never lock yourself out.
A paused friend is greyed out in the list and counted in the **Paused** box at the top.

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
2. Go to **My Toys** and list a toy you're bored with (add a photo + price) — that's
   🪙 1 in your pocket and one toy you're allowed to buy.
3. Have your friends register (and get accepted) and list their toys too —
   from their own computers or phones.
4. Open the **Marketplace** to see friends' toys and **Buy** the ones you like —
   remember you get one buy for every toy you list — or use the **Trading Board** to swap
   one of your toys for one of theirs.
5. Check **History** to see your trades and coin balance.
6. When you all meet up, **hand over the real toys!** 🤝

Made with 💜 by Deshna.
