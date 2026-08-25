/* ============================================================
   Friends Trading Centre — shared data & auth layer
   ------------------------------------------------------------
   Everything lives in a Firebase Firestore database in the cloud,
   so every friend sees the same accounts, toys and coins from
   ANY computer or phone.

   How it works:
     • startStore() switches on live listeners and fills a local
       cache, so all the get* functions below stay instant.
     • Anything that CHANGES data is async — always `await` it.
     • When another computer changes something, the listener fires
       and the page redraws itself. No refresh button needed.

   Only the "who is logged in on this device" session stays local.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, CONFIG_OK } from "./firebase-config.js";

export { CONFIG_OK };

export const SITE_NAME = "Friends Trading Centre";
export const COIN = "🪙";
export const START_BALANCE = 50;
export const ADMIN_NAME = "deshna"; // this friend gets the admin dashboard
export const ADMIN_DISPLAY_NAME = "Deshna";
export const ADMIN_PIN = "8351";

// The only thing still kept per-device: who is logged in here.
const SESSION_KEY = "ftc_session";

const COLLECTIONS = ["users", "items", "requests", "swaps", "txns", "transfers"];

let db = null;
const _cache = { users: [], items: [], requests: [], swaps: [], txns: [], transfers: [] };

export function isAdmin(user) {
  return !!user && user.username.toLowerCase() === ADMIN_NAME;
}

/* ---------- fast look-ups ----------
   Pages ask the same questions once per friend and once per toy while they
   draw ("how many toys has Aria posted?", "who is `aria`?"). Walking every
   array each time is fine with 5 friends and slow with 50, so the answers are
   counted ONCE per change and kept in these little maps. Any snapshot throws
   them away, so they can never go stale.                                   */
let _index = null;
function _idx() {
  if (_index) return _index;

  const byName = new Map(); // lowercased name → user
  const listed = new Map(); // who posted how many toys (the leaderboard score)
  const bought = new Map(); // toys each friend has bought
  const sold = new Map(); // toys each friend has sold
  const asked = new Map(); // buy requests still waiting, per buyer
  const swapped = new Map(); // finished swaps, per friend
  const bump = (map, key) => key != null && map.set(key, (map.get(key) || 0) + 1);

  _cache.users.forEach((u) => byName.set(u.username.toLowerCase(), u));
  _cache.items.forEach((i) => bump(listed, i.listedBy || i.owner));
  _cache.txns.forEach((t) => {
    bump(bought, t.buyer);
    bump(sold, t.seller);
  });
  _cache.requests.forEach((r) => r.status === "pending" && bump(asked, r.buyer));
  _cache.swaps.forEach((s) => {
    if (s.status !== "accepted") return;
    bump(swapped, s.from);
    bump(swapped, s.to);
  });

  _index = { byName, listed, bought, sold, asked, swapped };
  return _index;
}
const _count = (map, key) => map.get(key) || 0;

/* ---------- connecting ---------- */
// Call this once per page before drawing anything.
// onChange() runs whenever ANY friend, on any computer, changes something.
let _live = false;
export async function startStore(onChange) {
  if (!CONFIG_OK) throw new Error("Firebase is not set up yet — see js/firebase-config.js");
  if (!db) db = getFirestore(initializeApp(firebaseConfig));

  // One trade can change three collections at once (item, request, coins).
  // Redrawing three times in a row just makes the page flicker, so the
  // redraws are gathered up and run once on the next animation frame.
  let queued = false;
  const redrawSoon = () => {
    if (queued || !onChange) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      onChange();
    });
  };

  await Promise.all(
    COLLECTIONS.map(
      (name) =>
        new Promise((resolve, reject) => {
          let first = true;
          onSnapshot(
            collection(db, name),
            (snap) => {
              _cache[name] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
              _index = null; // the counted answers are out of date now
              if (first) {
                first = false;
                resolve();
              } else if (_live) {
                redrawSoon();
              }
            },
            (err) => (first ? reject(err) : console.error(name, err))
          );
        })
    )
  );

  await _seedAdmin();
  _live = true;
}

function _col(name) {
  return collection(db, name);
}
function _doc(name, id) {
  return doc(db, name, id);
}
// A fresh, never-used document id.
function _newId(name) {
  return doc(_col(name)).id;
}
function _now() {
  return new Date().toISOString();
}

/* ---------- users & auth ---------- */
export function getUsers() {
  return _cache.users.slice();
}
export function findUser(username) {
  return _idx().byName.get((username || "").trim().toLowerCase()) || null;
}
// Everyone Deshna has said yes to AND hasn't paused — the friends who can
// actually play right now.
export function getApprovedUsers() {
  return _cache.users.filter((u) => u.status === "approved");
}
// A paused friend keeps their account, coins and toys, but can't log in
// until Deshna switches them back on.
export function isPaused(user) {
  return !!user && user.status === "paused";
}
// Everyone who is in the club, playing or paused (not the ones still waiting).
export function getMemberUsers() {
  return _cache.users
    .filter((u) => u.status === "approved" || u.status === "paused")
    .sort((a, b) => a.joined.localeCompare(b.joined));
}
// Friends still waiting for Deshna to say yes.
export function getPendingUsers() {
  return _cache.users
    .filter((u) => u.status === "pending")
    .sort((a, b) => a.joined.localeCompare(b.joined));
}

// New friends wait in line — Deshna accepts or declines them on the admin page.
export async function register(username, pin) {
  username = (username || "").trim();
  if (username.length < 2) return { ok: false, msg: "Please pick a name (at least 2 letters)." };
  if (!/^\d{4}$/.test(pin)) return { ok: false, msg: "PIN must be exactly 4 digits." };

  // The lowercased name is the document id, so two computers can never
  // create the same friend twice.
  const ref = _doc("users", username.toLowerCase());
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) throw new Error("taken");
      tx.set(ref, {
        username,
        pin,
        balance: START_BALANCE,
        level: 0,
        joined: _now(),
        status: "pending",
      });
    });
  } catch (e) {
    if (e.message === "taken") return { ok: false, msg: "That name is already taken. Try another." };
    return { ok: false, msg: "Could not reach the internet. Try again in a moment." };
  }

  return {
    ok: true,
    msg: `Thanks, ${username}! ${ADMIN_DISPLAY_NAME} has to say yes before you can log in. ⏳`,
  };
}

export async function login(username, pin) {
  const snap = await getDoc(_doc("users", (username || "").trim().toLowerCase()));
  if (!snap.exists()) return { ok: false, msg: "No friend with that name. Register first!" };
  const user = snap.data();
  if (user.pin !== pin) return { ok: false, msg: "Wrong PIN. Try again." };
  if (user.status === "pending")
    return { ok: false, msg: `${ADMIN_DISPLAY_NAME} hasn't said yes to you yet. Please wait a bit! ⏳` };
  if (user.status === "paused")
    return { ok: false, msg: `Your account is paused. Ask ${ADMIN_DISPLAY_NAME} to switch it back on. ⏸️` };
  localStorage.setItem(SESSION_KEY, user.username);
  return { ok: true, msg: `Welcome back, ${user.username}!` };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function currentUser() {
  const name = localStorage.getItem(SESSION_KEY);
  const user = name ? findUser(name) : null;
  // Paused (or removed) part-way through a visit? Then nobody is logged in
  // here any more, and every page bounces them back to the home page.
  return user && user.status === "approved" ? user : null;
}

/* ---------- countries (Deshna picks one for each friend) ---------- */
// A short world tour — enough choice for a club of friends without a
// 200-item dropdown. Add a line here and it appears in the admin picker.
export const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TR", name: "Türkiye", flag: "🇹🇷" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
];

export function findCountry(code) {
  return COUNTRIES.find((c) => c.code === code) || null;
}
export function countryOf(username) {
  const u = findUser(username);
  return u && u.country ? findCountry(u.country) : null;
}
// Just the flag, for tucking next to a name.
export function countryFlag(username) {
  const c = countryOf(username);
  return c ? `<span class="flag" title="${escapeHtml(c.name)}">${c.flag}</span>` : "";
}
// Flag + name, for the places with room for it.
export function countryTag(username) {
  const c = countryOf(username);
  return c ? `<span class="country-tag">${c.flag} ${escapeHtml(c.name)}</span>` : "";
}

// You trade with friends from your own country. A friend Deshna hasn't given
// a country to yet can still trade with everyone, so nobody is stuck waiting.
export function sameCountry(nameA, nameB) {
  const a = countryOf(nameA);
  const b = countryOf(nameB);
  return !a || !b || a.code === b.code;
}
// The "sorry, different country" line, with both flags in it.
export function differentCountryMsg(me, them) {
  const mine = countryOf(me);
  const theirs = countryOf(them);
  return `${them} is in ${theirs.flag} ${theirs.name} and you're in ${mine.flag} ${mine.name} — you can only trade inside your own country. 🌍`;
}

// Deshna picks a friend's country. An empty code clears it again.
export async function setUserCountry(username, code) {
  const u = findUser(username);
  if (!u) return { ok: false, msg: "Friend not found." };
  if (code && !findCountry(code)) return { ok: false, msg: "That country isn't on the list." };

  await updateDoc(_doc("users", username.toLowerCase()), { country: code || null });
  const c = findCountry(code);
  return {
    ok: true,
    msg: c ? `${u.username} is flying the ${c.flag} ${c.name} flag!` : `${u.username} has no country now.`,
  };
}

/* ---------- profile pictures ---------- */
// The photo is shrunk in the browser and kept right on the account, so there
// is nothing extra to set up. Same 1 MB record limit as a toy photo.
export async function setAvatar(username, dataUrl) {
  const u = findUser(username);
  if (!u) return { ok: false, msg: "Friend not found." };
  if (!dataUrl) return { ok: false, msg: "Pick a picture first. 📸" };
  if (dataUrl.length > 400000) return { ok: false, msg: "That picture is too big. Try a smaller one. 📸" };

  await updateDoc(_doc("users", username.toLowerCase()), { avatar: dataUrl });
  return { ok: true, msg: "Looking good! Your new picture is up. 💖" };
}

export async function removeAvatar(username) {
  if (!findUser(username)) return { ok: false, msg: "Friend not found." };
  await updateDoc(_doc("users", username.toLowerCase()), { avatar: null });
  return { ok: true, msg: "Picture removed — you're back to your letter." };
}

// The little round face used all over the site: their photo if they picked
// one, otherwise the first letter of their name.
export function avatarHtml(username, extraClass) {
  const u = findUser(username);
  const cls = `avatar${extraClass ? " " + extraClass : ""}`;
  const name = escapeHtml(username || "?");
  return u && u.avatar
    ? `<span class="${cls} has-pic"><img src="${u.avatar}" alt="${name}" /></span>`
    : `<span class="${cls}">${escapeHtml((username || "?")[0].toUpperCase())}</span>`;
}

export function getBalance(username) {
  const u = findUser(username);
  return u ? u.balance : 0;
}

/* ---------- items ---------- */
export function getItems() {
  return _cache.items.slice();
}
export function getItemsByOwner(username) {
  return _cache.items.filter((i) => i.owner === username);
}
// Available toys from everyone EXCEPT the given user. Toys are hidden when
// their owner is paused (they can't log in to say yes) or lives in another
// country (you only trade inside your own).
export function getMarketItems(username) {
  const playing = new Set(getApprovedUsers().map((u) => u.username));
  return _cache.items.filter(
    (i) =>
      i.status === "available" &&
      i.owner !== username &&
      playing.has(i.owner) &&
      sameCountry(username, i.owner)
  );
}

export async function addItem({ owner, name, condition, category, price, description, image }) {
  const item = {
    owner,
    listedBy: owner, // never changes, even after a swap — this is what the leaderboard counts
    name: (name || "").trim(),
    condition: condition || "used",
    category: (category || "Toy").trim(),
    price: Math.max(0, Math.round(Number(price) || 0)),
    description: (description || "").trim(),
    image: image || "images/placeholder.svg",
    status: "available",
    buyer: null,
    createdAt: _now(),
  };
  // A whole photo has to fit in one database record (1 MB limit).
  if (item.image.length > 900000)
    return { ok: false, msg: "That photo is too big. Try a smaller one. 📸" };

  // Counted before the write, because the live cache won't have the new toy
  // for another moment yet.
  const listedAfter = _cache.items.filter((i) => (i.listedBy || i.owner) === owner).length + 1;

  const id = _newId("items");
  await setDoc(_doc("items", id), item);

  const { paid, levelUp } = await _rewardForListing(owner, listedAfter);
  return { ok: true, item: { ...item, id }, paid, levelUp };
}

export async function deleteItem(id, owner) {
  const item = _cache.items.find((i) => i.id === id);
  if (!item) return { ok: false, msg: "Item not found." };
  if (item.owner !== owner) return { ok: false, msg: "You can only remove your own toys." };
  if (item.status === "sold") return { ok: false, msg: "Sold toys stay in your history." };
  await deleteDoc(_doc("items", id));
  await _cancelPendingFor([id]);
  return { ok: true };
}

/* ---------- levels (a badge for every 10 toys you post) ---------- */
export const LEVEL_STEP = 10; // toys posted per level
export const LEVEL_BONUS = 5; // coins for reaching a new level
export const LIST_REWARD = 1; // coins for posting one toy
export const PENALTY_COINS = 3; // coins lost when Deshna takes down a fake toy

// The chart everyone is climbing. Past the last row the badge stays Legend
// and only the level number keeps going up.
export const LEVELS = [
  { level: 0, name: "Starter", icon: "🌱" },
  { level: 1, name: "Bronze", icon: "🥉" },
  { level: 2, name: "Silver", icon: "🥈" },
  { level: 3, name: "Gold", icon: "🥇" },
  { level: 4, name: "Platinum", icon: "💎" },
  { level: 5, name: "Diamond", icon: "👑" },
  { level: 6, name: "Legend", icon: "🏆" },
].map((l) => ({ ...l, toys: l.level * LEVEL_STEP }));

export function levelBadge(level) {
  const l = LEVELS[Math.min(Math.max(level, 0), LEVELS.length - 1)];
  // Level 7, 8, 9… all wear the Legend badge, with their number on it.
  return level > LEVELS.length - 1 ? { ...l, name: `${l.name} ${level}`, level } : l;
}

// Everything a page needs to draw one friend's level: the badge they've
// earned, how many toys they've posted, and what the next level costs.
export function levelOf(username) {
  const user = findUser(username);
  const listed = _count(_idx().listed, username);
  // A level is earned for good — taking a toy back down never demotes you.
  const level = Math.max(user ? user.level || 0 : 0, Math.floor(listed / LEVEL_STEP));
  const nextAt = (level + 1) * LEVEL_STEP;
  return { ...levelBadge(level), listed, nextAt, toGo: Math.max(0, nextAt - listed) };
}

// Called right after a toy is posted: LIST_REWARD coins for the toy itself,
// plus LEVEL_BONUS more for every 10-toy mark it pushed the friend past.
// The level reached is stored on the account, so taking toys down and
// re-listing them can never pay the level bonus twice.
async function _rewardForListing(username, listedAfter) {
  const ref = _doc("users", (username || "").toLowerCase());
  const reached = Math.floor(listedAfter / LEVEL_STEP);

  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { paid: 0, levelUp: null };

      const earned = snap.data().level || 0;
      // What they were on before this toy — the badge saved on their account,
      // or the one their earlier toys already earned them (toys listed before
      // levels existed still count, but they aren't paid for twice over).
      const before = Math.max(earned, Math.floor((listedAfter - 1) / LEVEL_STEP));
      const bonus = reached > before ? LEVEL_BONUS * (reached - before) : 0;
      const paid = LIST_REWARD + bonus;

      const update = { balance: snap.data().balance + paid };
      if (reached > earned) update.level = reached;
      tx.update(ref, update);

      return { paid, levelUp: bonus ? { ...levelBadge(reached), reward: bonus } : null };
    });
  } catch (e) {
    // A missed coin is never worth failing the toy listing over.
    console.error("listing reward failed", e);
    return { paid: 0, levelUp: null };
  }
}

/* ---------- leaderboard ---------- */
// Who has put the most toys up for trade? Toys listed is the score;
// trades done breaks a tie, then whoever joined first.
export function leaderboard() {
  const idx = _idx();

  return getApprovedUsers()
    .map((u) => {
      const listed = _count(idx.listed, u.username);
      const sold = _count(idx.sold, u.username);
      const bought = _count(idx.bought, u.username);
      const swapped = _count(idx.swapped, u.username);
      return { username: u.username, listed, sold, bought, swapped, trades: sold + bought + swapped, joined: u.joined };
    })
    .sort((a, b) => b.listed - a.listed || b.trades - a.trades || a.joined.localeCompare(b.joined));
}

/* ---------- fair-trade rule: buy one, list one ---------- */
// You can only buy as many toys as you keep on the site. Every toy YOU put up
// for trade earns you one buy; toys you bought or swapped for don't count
// (they were listed by whoever put them up), so nobody can just collect.
// Asks that are still waiting count too, or you could ask for ten toys at once.
export function buyAllowance(username) {
  const idx = _idx();
  const listed = _count(idx.listed, username);
  const bought = _count(idx.bought, username);
  const waiting = _count(idx.asked, username);
  return { listed, bought, waiting, left: Math.max(0, listed - bought - waiting) };
}

/* ---------- buy requests (ask → seller says yes/no) ---------- */
export function getRequests() {
  return _cache.requests.slice();
}
export function hasPendingRequest(itemId, buyerName) {
  return _cache.requests.some((r) => r.itemId === itemId && r.buyer === buyerName && r.status === "pending");
}
// A buyer asks to buy a toy. Coins do NOT move until the seller says yes.
export async function askToBuy(itemId, buyerName) {
  const item = _cache.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, msg: "This toy is gone." };
  if (item.status !== "available") return { ok: false, msg: "Sorry, that toy is already taken." };
  if (item.owner === buyerName) return { ok: false, msg: "That's your own toy! 😄" };
  if (!sameCountry(buyerName, item.owner))
    return { ok: false, msg: differentCountryMsg(buyerName, item.owner) };
  if (hasPendingRequest(itemId, buyerName)) return { ok: false, msg: "You already asked for this toy." };

  // One toy in, one toy out — list a toy before you take one home.
  const allowance = buyAllowance(buyerName);
  if (allowance.left <= 0)
    return {
      ok: false,
      msg: allowance.listed
        ? `You've used up all ${allowance.listed} of your buys. List another toy to buy another one! 🧸`
        : "List one of your own toys first — then you can buy one. 🧸",
    };

  const buyer = findUser(buyerName);
  if (buyer.balance < item.price)
    return { ok: false, msg: `You need ${COIN} ${item.price} but only have ${COIN} ${buyer.balance}.` };

  await setDoc(_doc("requests", _newId("requests")), {
    itemId: item.id,
    itemName: item.name,
    image: item.image,
    seller: item.owner,
    buyer: buyerName,
    price: item.price,
    status: "pending",
    date: _now(),
  });
  return { ok: true, msg: `You asked ${item.owner} to buy "${item.name}"! 🙋 Wait for a yes.` };
}

export function requestsForSeller(sellerName) {
  return getRequests()
    .filter((r) => r.seller === sellerName && r.status === "pending")
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function requestsByBuyer(buyerName) {
  return getRequests()
    .filter((r) => r.buyer === buyerName)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Seller says YES → move coins, mark sold, cancel other asks for that toy.
// Done as one transaction so two computers can't sell the same toy twice.
export async function acceptRequest(reqId, sellerName) {
  const cached = _cache.requests.find((r) => r.id === reqId);
  if (!cached) return { ok: false, msg: "This request is no longer waiting." };

  // Countries can change between the ask and the yes.
  if (!sameCountry(sellerName, cached.buyer))
    return { ok: false, msg: differentCountryMsg(sellerName, cached.buyer) };

  // They may have taken a toy back down since they asked — one toy in, one out.
  const fair = buyAllowance(cached.buyer);
  if (fair.bought >= fair.listed)
    return {
      ok: false,
      msg: `${cached.buyer} has to list another toy before they can buy one more. 🧸 Their ask stays here until then.`,
    };

  const txnId = _newId("txns");
  let result;
  try {
    result = await runTransaction(db, async (tx) => {
      const reqRef = _doc("requests", reqId);
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) return { ok: false, msg: "This request is no longer waiting." };
      const req = reqSnap.data();
      if (req.status !== "pending") return { ok: false, msg: "This request is no longer waiting." };
      if (req.seller !== sellerName) return { ok: false, msg: "That's not your toy." };

      const itemRef = _doc("items", req.itemId);
      const buyerRef = _doc("users", req.buyer.toLowerCase());
      const sellerRef = _doc("users", sellerName.toLowerCase());
      const [itemSnap, buyerSnap, sellerSnap] = [await tx.get(itemRef), await tx.get(buyerRef), await tx.get(sellerRef)];

      if (!itemSnap.exists() || itemSnap.data().status !== "available")
        return { ok: false, msg: "That toy is already taken." };
      if (!buyerSnap.exists() || buyerSnap.data().balance < req.price) {
        tx.update(reqRef, { status: "declined" });
        return { ok: false, msg: `${req.buyer} doesn't have enough coins anymore. Request removed.` };
      }

      const item = itemSnap.data();
      const soldAt = _now();
      tx.update(buyerRef, { balance: buyerSnap.data().balance - req.price });
      tx.update(sellerRef, { balance: sellerSnap.data().balance + req.price });
      tx.update(itemRef, { status: "sold", buyer: req.buyer, soldAt });
      tx.update(reqRef, { status: "accepted" });
      tx.set(_doc("txns", txnId), {
        itemId: req.itemId,
        itemName: item.name,
        image: item.image,
        seller: item.owner,
        buyer: req.buyer,
        price: req.price,
        date: soldAt,
      });

      return {
        ok: true,
        itemId: req.itemId,
        msg: `Sold "${item.name}" to ${req.buyer}! 🎉 Hand it over when you meet.`,
      };
    });
  } catch (e) {
    console.error(e);
    return { ok: false, msg: "Something went wrong. Try again." };
  }

  // Everyone else who asked for that toy is out of luck.
  if (result.ok) await _cancelPendingFor([result.itemId], null, reqId);
  return result;
}

export async function declineRequest(reqId, sellerName) {
  const req = _cache.requests.find((r) => r.id === reqId);
  if (!req || req.seller !== sellerName) return { ok: false, msg: "Can't do that." };
  await updateDoc(_doc("requests", reqId), { status: "declined" });
  return { ok: true, msg: "Maybe next time! Request said no." };
}

/* ---------- trading board (toy for toy, no coins) ---------- */
export function getSwaps() {
  return _cache.swaps.slice();
}

// Offers waiting for me to say yes (someone wants one of my toys).
export function swapsForOwner(name) {
  return getSwaps()
    .filter((s) => s.to === name && s.status === "pending")
    .sort((a, b) => b.date.localeCompare(a.date));
}
// Offers I made, whatever happened to them.
export function swapsByOfferer(name) {
  return getSwaps()
    .filter((s) => s.from === name)
    .sort((a, b) => b.date.localeCompare(a.date));
}
// Swaps that actually happened, for either side.
export function swapHistoryFor(name) {
  return getSwaps()
    .filter((s) => s.status === "accepted" && (s.from === name || s.to === name))
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function hasPendingSwap(giveId, getId) {
  return _cache.swaps.some((s) => s.giveId === giveId && s.getId === getId && s.status === "pending");
}

// "I'll give you my Pop It for your Fidget Cube."
export async function offerSwap(giveId, getId, fromName) {
  const items = getItems();
  const give = items.find((i) => i.id === giveId);
  const get = items.find((i) => i.id === getId);

  if (!give) return { ok: false, msg: "Pick one of your toys to swap." };
  if (!get) return { ok: false, msg: "That toy is gone." };
  if (give.owner !== fromName) return { ok: false, msg: "You can only offer your own toys." };
  if (get.owner === fromName) return { ok: false, msg: "That's your own toy! 😄" };
  if (!sameCountry(fromName, get.owner)) return { ok: false, msg: differentCountryMsg(fromName, get.owner) };
  if (give.status !== "available") return { ok: false, msg: "That toy of yours is already sold." };
  if (get.status !== "available") return { ok: false, msg: "Sorry, that toy is already taken." };
  if (hasPendingSwap(giveId, getId)) return { ok: false, msg: "You already offered that swap." };

  await setDoc(_doc("swaps", _newId("swaps")), {
    from: fromName,
    to: get.owner,
    giveId: give.id,
    giveName: give.name,
    giveImage: give.image,
    getId: get.id,
    getName: get.name,
    getImage: get.image,
    status: "pending",
    date: _now(),
  });
  return { ok: true, msg: `You offered "${give.name}" for ${get.owner}'s "${get.name}"! 🔄 Wait for a yes.` };
}

// Owner says YES → the two toys change hands. No coins move at all.
export async function acceptSwap(swapId, ownerName) {
  const waiting = _cache.swaps.find((x) => x.id === swapId);
  if (waiting && !sameCountry(ownerName, waiting.from))
    return { ok: false, msg: differentCountryMsg(ownerName, waiting.from) };

  let result;
  try {
    result = await runTransaction(db, async (tx) => {
      const swapRef = _doc("swaps", swapId);
      const swapSnap = await tx.get(swapRef);
      if (!swapSnap.exists() || swapSnap.data().status !== "pending")
        return { ok: false, msg: "This swap is no longer waiting." };
      const s = swapSnap.data();
      if (s.to !== ownerName) return { ok: false, msg: "That's not your toy." };

      const giveRef = _doc("items", s.giveId);
      const getRef = _doc("items", s.getId);
      const [giveSnap, getSnap] = [await tx.get(giveRef), await tx.get(getRef)];

      if (!giveSnap.exists() || !getSnap.exists()) {
        tx.update(swapRef, { status: "declined" });
        return { ok: false, msg: "One of those toys is gone now. Swap removed." };
      }
      const give = giveSnap.data();
      const get = getSnap.data();
      if (give.status !== "available" || get.status !== "available") {
        tx.update(swapRef, { status: "declined" });
        return { ok: false, msg: "One of those toys is gone now. Swap removed." };
      }
      if (give.owner !== s.from || get.owner !== s.to) {
        tx.update(swapRef, { status: "declined" });
        return { ok: false, msg: "Those toys changed hands already. Swap removed." };
      }

      const doneAt = _now();
      tx.update(giveRef, { owner: s.to, tradedAt: doneAt });
      tx.update(getRef, { owner: s.from, tradedAt: doneAt });
      tx.update(swapRef, { status: "accepted", doneAt });

      return {
        ok: true,
        ids: [s.giveId, s.getId],
        msg: `Swapped! "${s.getName}" is yours and ${s.from} gets "${s.giveName}". 🔄 Trade them in person!`,
      };
    });
  } catch (e) {
    console.error(e);
    return { ok: false, msg: "Something went wrong. Try again." };
  }

  // Any other offer or buy request for these two toys is now out of date.
  if (result.ok) await _cancelPendingFor(result.ids, swapId);
  return result;
}

export async function declineSwap(swapId, ownerName) {
  const s = _cache.swaps.find((x) => x.id === swapId);
  if (!s || s.to !== ownerName || s.status !== "pending") return { ok: false, msg: "Can't do that." };
  await updateDoc(_doc("swaps", swapId), { status: "declined" });
  return { ok: true, msg: "Maybe next time! Swap said no." };
}

// The friend who made the offer changes their mind.
export async function cancelSwap(swapId, fromName) {
  const s = _cache.swaps.find((x) => x.id === swapId);
  if (!s || s.from !== fromName || s.status !== "pending") return { ok: false, msg: "Can't do that." };
  await updateDoc(_doc("swaps", swapId), { status: "cancelled" });
  return { ok: true, msg: "Offer taken back." };
}

// Once a toy is sold, swapped or removed, tidy up every other pending
// offer and buy request that still points at it.
async function _cancelPendingFor(itemIds, keepSwapId, keepRequestId) {
  const batch = writeBatch(db);
  let touched = false;

  _cache.swaps.forEach((s) => {
    if (s.status === "pending" && s.id !== keepSwapId && (itemIds.includes(s.giveId) || itemIds.includes(s.getId))) {
      batch.update(_doc("swaps", s.id), { status: "declined" });
      touched = true;
    }
  });
  _cache.requests.forEach((r) => {
    if (r.status === "pending" && r.id !== keepRequestId && itemIds.includes(r.itemId)) {
      batch.update(_doc("requests", r.id), { status: "declined" });
      touched = true;
    }
  });

  // Tidying up is never worth failing a finished trade over — if one of these
  // rows vanished a moment ago the batch throws, and that's fine.
  if (touched) {
    try {
      await batch.commit();
    } catch (e) {
      console.error("tidy-up failed", e);
    }
  }
}

/* ---------- sending coins (gift) ---------- */
export function getTransfers() {
  return _cache.transfers.slice();
}
export async function sendCoins(fromName, toName, amount) {
  amount = Math.round(Number(amount) || 0);
  if (amount <= 0) return { ok: false, msg: "Pick how many coins to send." };
  if (!toName || toName === fromName) return { ok: false, msg: "Choose a friend to send coins to." };

  const transferId = _newId("transfers");
  try {
    return await runTransaction(db, async (tx) => {
      const fromRef = _doc("users", fromName.toLowerCase());
      const toRef = _doc("users", toName.toLowerCase());
      const [fromSnap, toSnap] = [await tx.get(fromRef), await tx.get(toRef)];
      if (!toSnap.exists()) return { ok: false, msg: "That friend was not found." };
      const from = fromSnap.data();
      if (from.balance < amount) return { ok: false, msg: `You only have ${COIN} ${from.balance}.` };

      tx.update(fromRef, { balance: from.balance - amount });
      tx.update(toRef, { balance: toSnap.data().balance + amount });
      tx.set(_doc("transfers", transferId), { from: fromName, to: toName, amount, date: _now() });
      return { ok: true, msg: `You sent ${COIN} ${amount} to ${toName}! 💝` };
    });
  } catch (e) {
    console.error(e);
    return { ok: false, msg: "Something went wrong. Try again." };
  }
}
export function transfersForUser(name) {
  return getTransfers()
    .filter((t) => t.from === name || t.to === name)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- admin powers ---------- */
// Deshna says yes → the friend can log in from now on.
export async function approveUser(username) {
  const u = findUser(username);
  if (!u) return { ok: false, msg: "Friend not found." };
  if (u.status === "approved") return { ok: false, msg: `${username} is already in.` };
  await updateDoc(_doc("users", username.toLowerCase()), { status: "approved" });
  return { ok: true, msg: `${username} is in! 🎉 They start with ${COIN} ${u.balance}.` };
}
// Deshna says no → the sign-up is thrown away and the name is free again.
export async function declineUser(username) {
  const u = findUser(username);
  if (!u) return { ok: false, msg: "Friend not found." };
  if (u.status !== "pending") return { ok: false, msg: "You can only decline friends who are still waiting." };
  await deleteDoc(_doc("users", username.toLowerCase()));
  return { ok: true, msg: `${username}'s sign-up was removed.` };
}

// Pause a friend (they can't log in, and their toys leave the marketplace)
// or switch them back on. Nothing is deleted either way.
export async function setUserActive(username, active) {
  const u = findUser(username);
  if (!u) return { ok: false, msg: "Friend not found." };
  if (isAdmin(u)) return { ok: false, msg: "You can't pause your own admin account." };
  if (u.status === "pending") return { ok: false, msg: "Say yes to this friend first." };

  await updateDoc(_doc("users", username.toLowerCase()), { status: active ? "approved" : "paused" });
  return {
    ok: true,
    msg: active
      ? `${u.username} can log in again. ▶️`
      : `${u.username} is paused — they can't log in until you switch them back on. ⏸️`,
  };
}

// Deshna removes a friend for good: their account, the toys they still own,
// and anything that was still waiting on them.
// Finished trades stay in everyone else's history, and toys they already
// swapped away belong to their new owner and are left alone.
export async function removeUser(username) {
  const u = findUser(username);
  if (!u) return { ok: false, msg: "Friend not found." };
  if (isAdmin(u)) return { ok: false, msg: "You can't remove your own admin account." };

  const name = u.username;
  const refs = [
    _doc("users", name.toLowerCase()),
    ...getItemsByOwner(name).map((i) => _doc("items", i.id)),
    ...getRequests()
      .filter((r) => r.buyer === name || r.seller === name)
      .map((r) => _doc("requests", r.id)),
    ...getSwaps()
      .filter((s) => s.from === name || s.to === name)
      .map((s) => _doc("swaps", s.id)),
  ];

  // Firestore only takes 500 changes at a time.
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
  return { ok: true, msg: `${name} was removed, along with the toys they still had.` };
}

// Deshna can take down anybody's toy. "Penalty" is for fake or silly
// listings: the toy goes AND the friend who posted it loses PENALTY_COINS,
// so it costs something to waste everyone's time.
export async function adminRemoveItem(itemId, penalty) {
  const item = _cache.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, msg: "That toy is already gone." };

  const blame = item.listedBy || item.owner; // whoever posted it, not who holds it now
  await deleteDoc(_doc("items", itemId));
  await _cancelPendingFor([itemId]);

  if (!penalty) return { ok: true, msg: `"${item.name}" was taken down.` };

  const res = await adminAddCoins(blame, -PENALTY_COINS);
  return {
    ok: true,
    msg: res.ok
      ? `"${item.name}" was taken down and ${blame} lost ${COIN} ${PENALTY_COINS}. ${res.msg}`
      : `"${item.name}" was taken down, but ${blame}'s coins couldn't be changed.`,
  };
}

// Put every single account back on the same number of coins.
export async function adminSetAllCoins(amount) {
  amount = Math.max(0, Math.round(Number(amount) || 0));
  const batch = writeBatch(db);
  _cache.users.forEach((u) => batch.update(_doc("users", u.username.toLowerCase()), { balance: amount }));
  await batch.commit();
  return { ok: true, msg: `Everyone now has ${COIN} ${amount}. 🪙` };
}

export async function adminAddCoins(username, amount) {
  amount = Math.round(Number(amount) || 0);
  const ref = _doc("users", (username || "").toLowerCase());
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { ok: false, msg: "Friend not found." };
      const balance = Math.max(0, snap.data().balance + amount); // amount can be negative
      tx.update(ref, { balance });
      return { ok: true, msg: `${username} now has ${COIN} ${balance}.` };
    });
  } catch (e) {
    console.error(e);
    return { ok: false, msg: "Something went wrong. Try again." };
  }
}

export async function adminResetAll() {
  for (const name of COLLECTIONS) {
    const snap = await getDocs(_col(name));
    // Firestore only takes 500 changes at a time.
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  localStorage.removeItem(SESSION_KEY);
  await _seedAdmin(true); // Deshna's own account always comes back
}

/* ---------- first-run setup ---------- */
// Makes sure Deshna's admin account exists. Safe to run on every page load
// and from several computers at once — the document id is always "deshna".
async function _seedAdmin(force) {
  const ref = _doc("users", ADMIN_NAME);
  if (!force && findUser(ADMIN_NAME)) return;
  const snap = await getDoc(ref);
  if (snap.exists()) {
    if (snap.data().status !== "approved") await updateDoc(ref, { status: "approved" });
    return;
  }
  await setDoc(ref, {
    username: ADMIN_DISPLAY_NAME,
    pin: ADMIN_PIN,
    balance: START_BALANCE,
    level: 0,
    joined: _now(),
    status: "approved",
  });
}

/* ---------- transactions ---------- */
export function getTxns() {
  return _cache.txns.slice();
}
export function boughtBy(username) {
  return _cache.txns.filter((t) => t.buyer === username).sort((a, b) => b.date.localeCompare(a.date));
}
export function soldBy(username) {
  return _cache.txns.filter((t) => t.seller === username).sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- helpers ---------- */
export function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function coins(n) {
  return `${COIN} ${Number(n || 0).toLocaleString("en-IN")}`;
}

export function timeAgo(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

// Shrink an uploaded photo so it fits inside one database record (1 MB).
export function resizeImage(file, maxDim, cb) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      // Squash the quality down until the photo is small enough to store.
      let dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      [0.6, 0.45, 0.3].forEach((q) => {
        if (dataUrl.length > 700000) dataUrl = canvas.toDataURL("image/jpeg", q);
      });
      cb(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- shared navigation ---------- */
// The ☰ button for phones. Built once, then reused on every redraw.
function _setupMenuButton(links) {
  const bar = links.parentElement;
  if (!bar || bar.querySelector(".nav-toggle")) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "nav-toggle";
  toggle.setAttribute("aria-label", "Open menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "navLinks");
  toggle.textContent = "☰";
  bar.appendChild(toggle);

  const setOpen = (open) => {
    links.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    toggle.textContent = open ? "✕" : "☰";
  };

  toggle.addEventListener("click", () => setOpen(!links.classList.contains("open")));
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  // Tapping anywhere else closes it.
  document.addEventListener("click", (e) => {
    if (links.classList.contains("open") && !bar.contains(e.target)) setOpen(false);
  });
}

// Pages that require login. Redirects to index.html if logged out.
export function requireAuth() {
  if (!currentUser()) {
    location.href = "index.html?needlogin=1";
    return false;
  }
  return true;
}

export function renderNav(activePage) {
  const user = currentUser();
  const authArea = document.getElementById("navAuth");
  const links = document.getElementById("navLinks");
  if (!authArea || !links) return;

  // Little red counts, so nobody misses a friend waiting on them.
  const waitingSwaps = user ? swapsForOwner(user.username).length : 0;
  const waitingAsks = user ? requestsForSeller(user.username).length : 0;
  const waitingFriends = isAdmin(user) ? getPendingUsers().length : 0;

  // Short labels keep the bar on one line; the full name is the tooltip.
  const linkDefs = [
    { href: "index.html", icon: "🏠", label: "Home", page: "home" },
    { href: "market.html", icon: "🛒", label: "Toys", title: "Toy Marketplace", page: "market" },
    { href: "trade.html", icon: "🔄", label: "Trade", title: "Trading Board", page: "trade", count: waitingSwaps },
    { href: "mytoys.html", icon: "🧸", label: "My Toys", page: "mytoys", count: waitingAsks },
    { href: "history.html", icon: "🎒", label: "My Stuff", page: "history" },
    { href: "leaderboard.html", icon: "🏆", label: "Leaders", title: "Leaderboard", page: "leaderboard" },
  ];
  if (isAdmin(user))
    linkDefs.push({ href: "admin.html", icon: "👑", label: "Admin", page: "admin", count: waitingFriends });

  links.innerHTML = linkDefs
    .map((l) => {
      const full = l.title || l.label;
      return `<a href="${l.href}" class="nav-item${l.page === activePage ? " active-link" : ""}"
         title="${full}" aria-label="${full}">
        <span class="nav-ico">${l.icon}</span><span class="nav-text">${l.label}</span>
        ${l.count ? `<span class="nav-badge" title="${l.count} waiting for you">${l.count}</span>` : ""}
      </a>`;
    })
    .join("");

  _setupMenuButton(links);

  if (user) {
    authArea.innerHTML = `
      <span class="balance-chip" title="Your virtual coins">${COIN} ${Number(user.balance).toLocaleString("en-IN")}</span>
      <a class="who" href="history.html" title="Change your picture">
        ${avatarHtml(user.username, "tiny")}<span class="who-name">Hi, <b>${escapeHtml(user.username)}</b></span>
      </a>
      <button class="btn small ghost" id="logoutBtn">Log out</button>`;
    document.getElementById("logoutBtn").addEventListener("click", () => {
      logout();
      location.href = "index.html";
    });
  } else {
    authArea.innerHTML = `<a class="btn small" href="index.html">Login / Register</a>`;
  }
}
