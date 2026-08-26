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
- 🎮 **Toy Match** — a memory game that pays coins, three paying games a day
- 🎁 **Daily gift** — coins every day, with a streak, plus 🎟️ vouchers off your next toy
- 📣 **My Posts** — tell your friends about your day; they can ❤️ it
- 💜 **Real friendships** — ask someone to be your friend; posts are for friends only
- 🔖 **Reserve a toy** — hold one toy for 24 hours so nobody else takes it
- 📸 **List toys** (new / used) with a photo, price and description — **🪙 1 coin** for every
  toy you post
- 🏅 **Levels** — a new badge every 10 toys posted (Bronze → Silver → Gold → …), each one
  worth a **🪙 5** bonus
- 🛒 **Marketplace** — logged-in friends see everyone *else's* available toys
- 🔍 **Search + pages** — find a toy by name, friend or category; 10 toys a page, newest first
- ✨ **For You** — your own page of toys, picked from what you like and what you search for
- 🙋 **Ask to buy** — the owner says **Yes!** or **No** before any coins move
- 🧸 **One toy in, one toy out** — you can only buy as many toys as you've listed yourself
- 🔄 **Trading Board** — swap a toy straight for another toy, fidget-trading style (no coins)
- 📦 **Hand-over check** — the buyer confirms the toy really arrived, or gets their coins back
- 🟢 **Online now** — a green dot shows which friends have the site open
- 💬 **A chat box for every friend** — talk about a trade, with a red badge for new messages
- 🎨 **Your own colours** — 10 palettes (5 pastel, 5 standard); the whole site wears yours
- 😊 **Profile pictures** — add your own photo or drawing; it shows up everywhere you do
- 🌍 **Countries** — Deshna gives each friend a country, and their flag flies next to their name
- 🛂 **Trade at home** — you buy and swap with friends in your own country only
- 💝 **Send coins** — gift coins to a friend
- 📜 **History page** — bought, sold, your asks, and a coin summary
- 🏆 **Leaderboard** — friends ranked by how many toys they've listed, with a podium, the
  level chart and a "list 2 more to pass Aria" nudge
- 🧹 **Take toys down** — Deshna can remove any toy, or remove it **with a 🪙 3 penalty** for fakes
- ⏸️ **Pause a friend** — they keep everything but can't log in until Deshna switches them on
- 🗑️ **Remove a friend** — deletes their account and the toys they still own, for good
- 👑 **Admin dashboard** (for Deshna) — accept/decline sign-ups, see all friends, top up/take coins,
  pause / switch on / remove friends, **set everyone back to 🪙 50** with one button,
  view all toys & trades, reset everything
- ☁️ **Works on any computer** — shared cloud database, updates live for everyone
- 🤝 Toys delivered in person — only the coins are tracked online

### The Trading Board 🔄
Coins are one way to trade — the **Trading Board** is the other. Pick a friend's toy,
choose which of your own toys to offer from the dropdown, and press the big pink **➕**.
The owner sees it under **Swap offers for you** with two round buttons: green **✔** to
swap, red **✖** to say no thanks. Your own waiting offers get a yellow **↩** to take them
back. On a yes the two toys change
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

### Taking a toy down 🧹
Every toy in the admin **🧸 All Toys** list has two buttons:

- **Remove** — the toy is deleted, and any buy requests or swap offers still pointing at it
  are cancelled. Nobody loses coins.
- **Penalty −🪙 3** — the same, **plus** the friend who posted it loses 🪙 3. This is the one
  for fake toys, joke listings and photos of nothing. Coins never go below 🪙 0.

The fine always lands on whoever **posted** the toy (`listedBy`), not whoever happens to own
it now after a swap. Change the amount with `PENALTY_COINS` in
[`js/store.js`](js/store.js). Both buttons ask "are you sure?" first, and a toy that's
already sold can be taken down too — the trade stays in everyone's history.

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

### Did the toy actually arrive? 📦
Coins move when the seller says **✅ Yes!**, but the real toy travels later — so the buyer
has the last word. Every paid-for toy waits in **📦 Toys on their way** on your **My Stuff**
page (with a red count on the 🎒 tab) until you press one of two buttons:

- **Got it! ✅** — the trade is finished. **The toy's record is then deleted from the
  database**, which is what stops old toys piling up. The trade itself keeps the name, the
  photo and the price, so your history still shows everything.
- **Didn't get it ❌** — your coins come straight back, the toy goes back on your friend's
  shelf as available, and the trade is marked *"Never arrived — coins returned 🔄"*. A
  seller who has already spent the coins simply lands on 🪙 0.

Because delivered toys are deleted, "toys posted" is kept as a `posted` count on each
account instead of by counting toy records — so completing a trade never costs you
leaderboard places, level progress or a buy. Taking a toy down yourself (or Deshna removing
it) *does* un-count it.

> Trades made before this feature existed show up as waiting, so you can confirm them and
> let the old toy records be tidied away.

### Who's online 🟢
Each open page quietly says *"still here"* every 90 seconds. A friend counts as **online**
while that note is under 3 minutes old, so a green dot appears next to them on the
**Friends** page, the **Leaderboard** (rankings and podium) and the admin list, with
"Online now", "5 minutes ago" or "Yesterday" beside it. Closing the tab needs no goodbye
message — the note simply goes stale and the dot turns grey on everyone's screen within a
minute. Logging out marks you offline immediately.

### Friends, for real 💜
Everyone in the club can trade and chat, but **friendship** is something you choose. On the
💬 **Friends** page every friend has a **💜 Add** button:

- They see *"🙋 Want to be your friend"* at the top of their own Friends page and answer with
  the green **✔** or red **✖**.
- Once you're friends the button becomes **💜 Friends** — press it again to unfriend (it
  asks first). Both sides always change together, in one write.
- Being friends is what lets you see each other's **posts**.

Friendships are two little lists (`friends` and `requests`) on each account, so they needed
no new collection and no new database rule.

### My Posts 📣
The 📣 **Posts** tab is for life outside toys — what you did today, a joke, a drawing. Write
up to 300 letters, add a photo if you like, and press **Post it**. Underneath you'll find
**Your posts** and then **From your friends**. Anyone can press 🤍 to like a post (it turns
❤️), and you can delete your own at any time — Deshna can delete any of them.

Only your **friends** see your posts, so adding friends is what fills the page up. Your
newest **20** posts are kept; older ones drop off, which stops the database growing forever.

> Posts need one more collection, so **publish the newest
> [`firestore.rules`](firestore.rules)** — same paste as for chat. If you haven't, the page
> says so and everything else keeps working.

### Daily gift 🎁
On **My Stuff** there's a present waiting once a day. Coins grow with your streak — 🪙 2 on
day 1 up to 🪙 6 from day 7 — and **every third day** you also get a 🎟️ **voucher**: coins
off your next toy (5, or 10 once you're on a 6-day streak).

Vouchers are used **automatically**: the moment you press *Ask to buy*, your biggest voucher
comes off the price, and the seller sees the reduced price. If they say no, the voucher goes
straight back in your pocket. You can hold five at a time.

Claiming and paying happen in the same write, so a second tab can't collect twice, and a
missed day resets the streak to day 1.

### Reserve a toy 🔖
See something you want but need to think (or save up)? Press **🔖 Reserve** on any toy in the
Marketplace and it's yours to decide about for **24 hours**: nobody else can ask to buy it or
offer a swap for it, and the card shows *"🔖 Aria · 22h"* to everyone. You can hold **one toy
at a time**, press **let go** to release it early, and the owner can free their own toy too.
Nothing needs cleaning up — a hold simply stops counting when its time runs out.

### Toy Match 🎮
Short of coins? The 🎮 **Game** tab is a memory game: twelve cards face down, six pairs of
toys, find them all. Fewer turns pay more —

| Turns | 10 or fewer | up to 14 | up to 20 | more |
|-------|-------------|----------|----------|------|
| Coins | 🪙 6 | 🪙 5 | 🪙 4 | 🪙 2 |

**Three paying games a day.** After that you can keep playing for fun, but the coins stop
until tomorrow — it's a treat, not a coin machine. The count and the payout happen in the
*same* database write, so refreshing the page or opening a second tab can't get you a fourth
payday, and the amount is capped in `awardGameCoins` rather than trusted from the browser.

Change `GAME_MAX_PLAYS` or `GAME_MAX_COINS` in [`js/store.js`](js/store.js) to make it more
or less generous.

### Your own For You page ✨
The ✨ **For You** tab is different for every friend. It's built from two things:

1. **What you say you like.** Tap the chips under *"💖 What do you like?"* — Cars, Soft Toys,
   Fidgets, Trading Cards and so on — and press **Save my likes**. These live on your
   account, so they follow you to any computer.
2. **What you actually search for.** Every word you type into the Marketplace or Trading
   Board search box is counted, and *"🔍 You keep looking for…"* shows your most-used ones as
   chips — tap one to run that search again. **Forget my searches** wipes them.

**Picked for you 🎁** scores every toy you're allowed to buy: a matching category is worth
most, a word you search a lot comes next, and each card says *"✨ because you like Cars"* so
it's never a mystery. **Just arrived 🆕** shows the newest toys underneath, so the page is
never empty — even on your very first visit, before you've told it anything.

The buttons are the real Marketplace ones (**Ask to buy 🙋**, *Asked ⏳*, *Need more 🪙*,
*List a toy first 🧸*), sharing one implementation with the Marketplace so they can't drift
apart.

> Searches are counted in **your own browser**, per friend — nothing is written to the
> database when a child types, and two kids sharing a laptop don't mix their tastes. Clear
> your browser data (or press *Forget my searches*) and it starts fresh.

### Finding a toy 🔍
Both the **Marketplace** and the **Trading Board** show **10 toys to a page, newest first**,
with **◀ Back / Next ▶** and a "Page 2 of 4 · 37 toys" label underneath. The search box above
the grid looks at the toy's name, its category, its description *and* whose toy it is, so
typing `aria`, `lego` or `soft toys` all work. Searching (or switching the New/Used filter)
jumps back to page 1, and if the page you're on disappears — someone bought the last toy on
it — you're moved to the last page that still exists instead of staring at an empty grid.

Change `PAGE_SIZE` at the top of [`js/app.js`](js/app.js) to show more or fewer per page.

### Friends & chat 💬
The 💬 **Friends** tab lists everyone in the club with their flag, badge and coins. Press
**Chat 💬** on a friend and a message box opens right inside their row — type, press
**Send**, and it appears on their screen live, wherever they are. Unread messages show a red
number on that friend's Chat button and on the 💬 **Friends** tab itself, and the badge
clears the moment you open the chat. A message you're half-way through typing survives a
friend's message arriving mid-sentence.

**Each chat holds 10 messages.** The box shows "6 of 10 messages" underneath, warns you when
two are left, and when a full chat gets one more message the old ten are deleted and the
chat starts fresh — so chats can never pile up in the database. The message box empties the
instant you press **Send** (and puts your words back if the send fails).

Chat is **not** limited by country (only toy trades are), messages are capped at 300
characters, and removing a friend deletes their chats along with their account.

> ⚠️ Chat needs one extra collection. **Publish the newest [`firestore.rules`](firestore.rules)
> in the Firebase console** or the chat boxes will say so — but the rest of the site keeps
> working either way: `messages` is treated as optional so a missing rule can't take the
> whole club offline. And like the PINs, messages are not private — anyone with the project
> id could read them, so keep it to toy talk.

### Countries 🌍
Only Deshna picks countries. Each friend in the admin 👥 **Friends** panel has a 🌍 dropdown
— choose a country and it saves straight away; **No country yet** clears it again. Their
flag then flies next to their name on the leaderboard (rankings and podium), on every toy
card in the Marketplace and the Trading Board, and on their own **My Stuff** page.

The list lives in `COUNTRIES` at the top of [`js/store.js`](js/store.js) — about 38 countries
with their flags. Add a `{ code, name, flag }` line there and it appears in the dropdown
straight away; no other change needed.

**You trade inside your own country.** Toys belonging to friends in another country simply
don't appear in your Marketplace or Trading Board, and every trade path checks it again
before anything moves — asking to buy, the seller saying yes, offering a swap and accepting
one. If Deshna moves someone to another country while an ask or offer is still waiting, the
yes is refused with "…is in 🇬🇧 United Kingdom and you're in 🇮🇳 India".

A friend who hasn't been given a country yet trades with **everyone**, so nothing stops
working before Deshna gets round to setting them. Both pages say which it is: *"🌍 These are
the toys from friends in 🇮🇳 India"* or *"🌍 You don't have a country yet, so you can trade
with everyone."* Sending coins as a gift is **not** limited by country — only toy trades are.

### Your own picture 😊
On **My Stuff** there's a **😊 My Picture** panel. Choose a photo or a drawing and it's
shrunk in the browser (240px) and saved on your account, so it appears on the leaderboard,
the podium, the admin list and next to your name in the top bar. **Remove** puts you back
to the letter blob. Nothing extra to set up — the picture rides along in the same `users`
record as your coins.

### Pick your colours 🎨
On **My Stuff** there's a **🎨 My Colours** panel with ten palettes in two families:

| 🍬 Pastel | 🌈 Standard |
|-----------|-------------|
| Bubblegum · Mint · Sky · Lavender · Peach | Cherry Red · Ocean Blue · Forest Green · Grape · Sunshine |

Tap one and **the whole site changes instantly** — buttons, cards, background glows,
confetti dots, the blush on the avatars, even the scrollbar. The choice is saved on your
account, so it follows you to any computer, *and* in the browser, so the right colours are
on screen the moment a page opens rather than a second later. Only you see your colours.

It works because every themeable colour is a CSS variable at the top of
[`css/style.css`](css/style.css) (`--rose`, `--accent2`, `--btn-edge`, `--blush`, `--glow1`…)
and a theme is just a set of values for them, defined in `THEMES` in
[`js/store.js`](js/store.js). Add a row there and it appears in the picker — no CSS needed.
Colours that carry *meaning* stay put in every theme: gold medals, the green online dot, the
green ✔ and red ✖ on the Trading Board, and the warning yellows.

### Kawaii look 🌸
The theme is soft and cute on purpose: pastel pinks, lavender and mint, rounded **Baloo 2**
and **Quicksand** lettering, confetti dots in the background, squishy blob avatars with
blushing cheeks, and buttons shaped like stickers that press down when you click them.
Cards tilt when you hover, badges bob, and the swap arrow wiggles. All of it lives in
[`css/style.css`](css/style.css), and the colours come from the palette each friend picks
(see **Pick your colours** above) — Bubblegum is the one everybody starts with.

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
├── foryou.html     ← Your own page: picked toys, likes, past searches
├── game.html       ← Toy Match: a memory game that pays coins
├── posts.html      ← My Posts: your life, for your friends
├── trade.html      ← Trading Board (swap toy for toy, no coins)
├── mytoys.html     ← List a toy + manage your listings
├── friends.html    ← Friends list with a chat box for each one
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

## If something won't work

The site no longer says "Something went wrong" — every failure now says what actually
happened, and the browser console (F12) has the full error next to a label like
`acceptRequest failed:`. The one worth knowing:

> **"The database blocked that. Deshna needs to publish the newest firestore.rules…"**

That means the rules in the Firebase console are older than
[`firestore.rules`](firestore.rules) in this repo. Saying **✅ Yes!** to a buy request is the
only action that writes to the `txns` collection, so if `txns` is missing from the published
rules, *every other part of the site works and only that button fails*. Fix: open
**Firestore Database → Rules**, paste the whole file from this repo, press **Publish**.

## Keeping it fast

The site holds everything in memory and redraws from that, so a few habits keep it quick as
the club grows:

- **Counted once, not once per row.** `js/store.js` keeps small look-up maps (who is who,
  how many toys each friend posted, bought, sold and swapped). They're rebuilt only when
  the database changes, so drawing the leaderboard or the admin list no longer walks every
  toy for every friend.
- **One redraw per change.** A single trade touches three collections at once; the redraws
  are gathered up and run once on the next animation frame instead of three times in a row.
- **Unchanged lists are left alone.** Every list checks whether its HTML actually changed
  before touching the page, so photos aren't thrown away and decoded again on an unrelated
  update. (When the HTML *doesn't* change, the buttons keep the handlers they already have —
  that's why the code only re-attaches them after a real write.)
- **Each photo is stored once.** A buy request and a swap offer used to keep their own copy
  of the toy's picture, so the same ~500 KB lived in two or three places and was downloaded
  again with every page. They now point at the toy and the picture is looked up when
  drawing. (Finished trades still keep a copy, so your history keeps its photos even if the
  toy is taken down later.)
- **Photos load when they're needed** (`loading="lazy"`), and each one is shrunk in the
  browser before it's saved — 560px / ~250 KB for toys, 240px for profile pictures.
- **Coin gifts aren't downloaded.** The `transfers` record is written but never drawn, so
  the site doesn't listen to that collection at all — one less full download per page.
- **The browser keeps its own copy.** Firestore's offline cache is switched on, so the
  second visit draws from the device immediately and only asks the cloud for what changed
  since. It also survives a wobbly signal.
- **You only download your own chat.** Two small queries (`to == me`, `from == me`) instead
  of the whole postbox, so other people's conversations never touch your device.
- **Delivered toys are deleted** (see the hand-over section), so the `items` collection
  stays small no matter how many trades happen.
- **The top bar redraws only when it changes** — it carries your photo and was being
  rebuilt after every single change in the cloud.
- **Fewer fonts.** Only the four weights the site actually uses are downloaded.

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
