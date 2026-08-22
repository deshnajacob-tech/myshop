/* ============================================================
   Deshna's Toy Trade — shared data & auth layer
   All data lives in this browser's localStorage (no server).
   Friends share one device and each log in with their 4-digit PIN.
   ============================================================ */

const SITE_NAME = "Deshna's Toy Trade";
const COIN = "🪙";
const START_BALANCE = 50;
const ADMIN_NAME = "deshna"; // this friend gets the admin dashboard
const ADMIN_DISPLAY_NAME = "Deshna";
const ADMIN_PIN = "8351";

const KEYS = {
  users: "dtt_users",
  items: "dtt_items",
  txns: "dtt_txns",
  requests: "dtt_requests",
  swaps: "dtt_swaps",
  transfers: "dtt_transfers",
  session: "dtt_session",
};

function isAdmin(user) {
  return !!user && user.username.toLowerCase() === ADMIN_NAME;
}

/* ---------- low-level storage ---------- */
function _load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}
function _save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ---------- users & auth ---------- */
function getUsers() {
  return _load(KEYS.users, []);
}
function findUser(username) {
  const u = (username || "").trim().toLowerCase();
  return getUsers().find((x) => x.username.toLowerCase() === u) || null;
}

// Everyone Deshna has already said yes to.
function getApprovedUsers() {
  return getUsers().filter((u) => u.status === "approved");
}
// Friends still waiting for Deshna to say yes.
function getPendingUsers() {
  return getUsers()
    .filter((u) => u.status === "pending")
    .sort((a, b) => a.joined.localeCompare(b.joined));
}

// New friends wait in line — Deshna accepts or declines them on the admin page.
function register(username, pin) {
  username = (username || "").trim();
  if (username.length < 2) return { ok: false, msg: "Please pick a name (at least 2 letters)." };
  if (!/^\d{4}$/.test(pin)) return { ok: false, msg: "PIN must be exactly 4 digits." };
  if (findUser(username)) return { ok: false, msg: "That name is already taken. Try another." };

  const users = getUsers();
  users.push({
    username,
    pin,
    balance: START_BALANCE,
    joined: new Date().toISOString(),
    status: "pending",
  });
  _save(KEYS.users, users);
  return {
    ok: true,
    msg: `Thanks, ${username}! ${ADMIN_DISPLAY_NAME} has to say yes before you can log in. ⏳`,
  };
}

function login(username, pin) {
  const user = findUser(username);
  if (!user) return { ok: false, msg: "No friend with that name. Register first!" };
  if (user.pin !== pin) return { ok: false, msg: "Wrong PIN. Try again." };
  if (user.status === "pending")
    return { ok: false, msg: `${ADMIN_DISPLAY_NAME} hasn't said yes to you yet. Please wait a bit! ⏳` };
  _save(KEYS.session, user.username);
  return { ok: true, msg: `Welcome back, ${user.username}!` };
}

function logout() {
  localStorage.removeItem(KEYS.session);
}

function currentUser() {
  const name = _load(KEYS.session, null);
  return name ? findUser(name) : null;
}

function getBalance(username) {
  const u = findUser(username);
  return u ? u.balance : 0;
}

function _setBalance(username, newBalance) {
  const users = getUsers();
  const u = users.find((x) => x.username === username);
  if (u) {
    u.balance = newBalance;
    _save(KEYS.users, users);
  }
}

/* ---------- items ---------- */
function getItems() {
  return _load(KEYS.items, []);
}
function getItemsByOwner(username) {
  return getItems().filter((i) => i.owner === username);
}
// Available toys from everyone EXCEPT the given user.
function getMarketItems(username) {
  return getItems().filter((i) => i.status === "available" && i.owner !== username);
}

function addItem({ owner, name, condition, category, price, description, image }) {
  const items = getItems();
  const item = {
    id: "t" + Date.now() + Math.floor((performance.now() % 1) * 1000),
    owner,
    name: (name || "").trim(),
    condition: condition || "used",
    category: (category || "Toy").trim(),
    price: Math.max(0, Math.round(Number(price) || 0)),
    description: (description || "").trim(),
    image: image || "images/placeholder.svg",
    status: "available",
    buyer: null,
    createdAt: new Date().toISOString(),
  };
  items.push(item);
  _save(KEYS.items, items);
  return item;
}

function deleteItem(id, owner) {
  let items = getItems();
  const item = items.find((i) => i.id === id);
  if (!item) return { ok: false, msg: "Item not found." };
  if (item.owner !== owner) return { ok: false, msg: "You can only remove your own toys." };
  if (item.status === "sold") return { ok: false, msg: "Sold toys stay in your history." };
  items = items.filter((i) => i.id !== id);
  _save(KEYS.items, items);
  return { ok: true };
}

/* ---------- buy requests (ask → seller says yes/no) ---------- */
function getRequests() {
  return _load(KEYS.requests, []);
}
function hasPendingRequest(itemId, buyerName) {
  return getRequests().some((r) => r.itemId === itemId && r.buyer === buyerName && r.status === "pending");
}
// A buyer asks to buy a toy. Coins do NOT move until the seller says yes.
function askToBuy(itemId, buyerName) {
  const item = getItems().find((i) => i.id === itemId);
  if (!item) return { ok: false, msg: "This toy is gone." };
  if (item.status !== "available") return { ok: false, msg: "Sorry, that toy is already taken." };
  if (item.owner === buyerName) return { ok: false, msg: "That's your own toy! 😄" };
  if (hasPendingRequest(itemId, buyerName)) return { ok: false, msg: "You already asked for this toy." };

  const buyer = findUser(buyerName);
  if (buyer.balance < item.price)
    return { ok: false, msg: `You need ${COIN} ${item.price} but only have ${COIN} ${buyer.balance}.` };

  const reqs = getRequests();
  reqs.push({
    id: "r" + Date.now(),
    itemId: item.id,
    itemName: item.name,
    image: item.image,
    seller: item.owner,
    buyer: buyerName,
    price: item.price,
    status: "pending",
    date: new Date().toISOString(),
  });
  _save(KEYS.requests, reqs);
  return { ok: true, msg: `You asked ${item.owner} to buy "${item.name}"! 🙋 Wait for a yes.` };
}

function requestsForSeller(sellerName) {
  return getRequests()
    .filter((r) => r.seller === sellerName && r.status === "pending")
    .sort((a, b) => b.date.localeCompare(a.date));
}
function requestsByBuyer(buyerName) {
  return getRequests()
    .filter((r) => r.buyer === buyerName)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Seller says YES → move coins, mark sold, cancel other asks for that toy.
function acceptRequest(reqId, sellerName) {
  const reqs = getRequests();
  const req = reqs.find((r) => r.id === reqId);
  if (!req || req.status !== "pending") return { ok: false, msg: "This request is no longer waiting." };
  if (req.seller !== sellerName) return { ok: false, msg: "That's not your toy." };

  const item = getItems().find((i) => i.id === req.itemId);
  if (!item || item.status !== "available") return { ok: false, msg: "That toy is already taken." };

  const buyer = findUser(req.buyer);
  if (!buyer || buyer.balance < req.price) {
    req.status = "declined";
    _save(KEYS.requests, reqs);
    return { ok: false, msg: `${req.buyer} doesn't have enough coins anymore. Request removed.` };
  }

  _completeSale(item, buyer.username, req.price);

  // Accept this one, auto-cancel the rest for the same toy.
  reqs.forEach((r) => {
    if (r.itemId === req.itemId && r.status === "pending") {
      r.status = r.id === reqId ? "accepted" : "declined";
    }
  });
  _save(KEYS.requests, reqs);
  return { ok: true, msg: `Sold "${item.name}" to ${buyer.username}! 🎉 Hand it over when you meet.` };
}

function declineRequest(reqId, sellerName) {
  const reqs = getRequests();
  const req = reqs.find((r) => r.id === reqId);
  if (!req || req.seller !== sellerName) return { ok: false, msg: "Can't do that." };
  req.status = "declined";
  _save(KEYS.requests, reqs);
  return { ok: true, msg: "Maybe next time! Request said no." };
}

// Shared money move + receipt.
function _completeSale(item, buyerName, price) {
  _setBalance(buyerName, getBalance(buyerName) - price);
  _setBalance(item.owner, getBalance(item.owner) + price);

  const items = getItems();
  const it = items.find((i) => i.id === item.id);
  it.status = "sold";
  it.buyer = buyerName;
  it.soldAt = new Date().toISOString();
  _save(KEYS.items, items);

  // A sold toy can't be swapped any more.
  _cancelSwapsFor(it.id);

  const txns = getTxns();
  txns.push({
    id: "x" + Date.now(),
    itemId: it.id,
    itemName: it.name,
    image: it.image,
    seller: it.owner,
    buyer: buyerName,
    price: price,
    date: new Date().toISOString(),
  });
  _save(KEYS.txns, txns);
}

/* ---------- trading board (toy for toy, no coins) ---------- */
function getSwaps() {
  return _load(KEYS.swaps, []);
}

// Offers waiting for me to say yes (someone wants one of my toys).
function swapsForOwner(name) {
  return getSwaps()
    .filter((s) => s.to === name && s.status === "pending")
    .sort((a, b) => b.date.localeCompare(a.date));
}
// Offers I made, whatever happened to them.
function swapsByOfferer(name) {
  return getSwaps()
    .filter((s) => s.from === name)
    .sort((a, b) => b.date.localeCompare(a.date));
}
// Swaps that actually happened, for either side.
function swapHistoryFor(name) {
  return getSwaps()
    .filter((s) => s.status === "accepted" && (s.from === name || s.to === name))
    .sort((a, b) => b.date.localeCompare(a.date));
}
function hasPendingSwap(giveId, getId) {
  return getSwaps().some((s) => s.giveId === giveId && s.getId === getId && s.status === "pending");
}

// "I'll give you my Pop It for your Fidget Cube."
function offerSwap(giveId, getId, fromName) {
  const items = getItems();
  const give = items.find((i) => i.id === giveId);
  const get = items.find((i) => i.id === getId);

  if (!give) return { ok: false, msg: "Pick one of your toys to swap." };
  if (!get) return { ok: false, msg: "That toy is gone." };
  if (give.owner !== fromName) return { ok: false, msg: "You can only offer your own toys." };
  if (get.owner === fromName) return { ok: false, msg: "That's your own toy! 😄" };
  if (give.status !== "available") return { ok: false, msg: "That toy of yours is already sold." };
  if (get.status !== "available") return { ok: false, msg: "Sorry, that toy is already taken." };
  if (hasPendingSwap(giveId, getId)) return { ok: false, msg: "You already offered that swap." };

  const swaps = getSwaps();
  swaps.push({
    id: "w" + Date.now(),
    from: fromName,
    to: get.owner,
    giveId: give.id,
    giveName: give.name,
    giveImage: give.image,
    getId: get.id,
    getName: get.name,
    getImage: get.image,
    status: "pending",
    date: new Date().toISOString(),
  });
  _save(KEYS.swaps, swaps);
  return { ok: true, msg: `You offered "${give.name}" for ${get.owner}'s "${get.name}"! 🔄 Wait for a yes.` };
}

// Owner says YES → the two toys change hands. No coins move at all.
function acceptSwap(swapId, ownerName) {
  const swaps = getSwaps();
  const s = swaps.find((x) => x.id === swapId);
  if (!s || s.status !== "pending") return { ok: false, msg: "This swap is no longer waiting." };
  if (s.to !== ownerName) return { ok: false, msg: "That's not your toy." };

  const items = getItems();
  const give = items.find((i) => i.id === s.giveId);
  const get = items.find((i) => i.id === s.getId);
  if (!give || !get || give.status !== "available" || get.status !== "available") {
    s.status = "declined";
    _save(KEYS.swaps, swaps);
    return { ok: false, msg: "One of those toys is gone now. Swap removed." };
  }
  if (give.owner !== s.from || get.owner !== s.to) {
    s.status = "declined";
    _save(KEYS.swaps, swaps);
    return { ok: false, msg: "Those toys changed hands already. Swap removed." };
  }

  const now = new Date().toISOString();
  give.owner = s.to;
  give.tradedAt = now;
  get.owner = s.from;
  get.tradedAt = now;
  _save(KEYS.items, items);

  s.status = "accepted";
  s.doneAt = now;
  _save(KEYS.swaps, swaps);

  // Any other offer or buy request for these two toys is now out of date.
  _cancelPendingFor([s.giveId, s.getId], swapId);

  return { ok: true, msg: `Swapped! "${s.getName}" is yours and ${s.from} gets "${s.giveName}". 🔄 Trade them in person!` };
}

function declineSwap(swapId, ownerName) {
  const swaps = getSwaps();
  const s = swaps.find((x) => x.id === swapId);
  if (!s || s.to !== ownerName || s.status !== "pending") return { ok: false, msg: "Can't do that." };
  s.status = "declined";
  _save(KEYS.swaps, swaps);
  return { ok: true, msg: "Maybe next time! Swap said no." };
}

// The friend who made the offer changes their mind.
function cancelSwap(swapId, fromName) {
  const swaps = getSwaps();
  const s = swaps.find((x) => x.id === swapId);
  if (!s || s.from !== fromName || s.status !== "pending") return { ok: false, msg: "Can't do that." };
  s.status = "cancelled";
  _save(KEYS.swaps, swaps);
  return { ok: true, msg: "Offer taken back." };
}

// Once a toy is sold or swapped, tidy up every other pending offer/request for it.
function _cancelSwapsFor(itemId, keepSwapId) {
  const swaps = getSwaps();
  let touched = false;
  swaps.forEach((s) => {
    if (s.status === "pending" && s.id !== keepSwapId && (s.giveId === itemId || s.getId === itemId)) {
      s.status = "declined";
      touched = true;
    }
  });
  if (touched) _save(KEYS.swaps, swaps);
}

function _cancelPendingFor(itemIds, keepSwapId) {
  itemIds.forEach((id) => _cancelSwapsFor(id, keepSwapId));

  const reqs = getRequests();
  let touchedReqs = false;
  reqs.forEach((r) => {
    if (r.status === "pending" && itemIds.includes(r.itemId)) {
      r.status = "declined";
      touchedReqs = true;
    }
  });
  if (touchedReqs) _save(KEYS.requests, reqs);
}

/* ---------- sending coins (gift) ---------- */
function getTransfers() {
  return _load(KEYS.transfers, []);
}
function sendCoins(fromName, toName, amount) {
  amount = Math.round(Number(amount) || 0);
  if (amount <= 0) return { ok: false, msg: "Pick how many coins to send." };
  if (!toName || toName === fromName) return { ok: false, msg: "Choose a friend to send coins to." };
  const from = findUser(fromName);
  const to = findUser(toName);
  if (!to) return { ok: false, msg: "That friend was not found." };
  if (from.balance < amount) return { ok: false, msg: `You only have ${COIN} ${from.balance}.` };

  _setBalance(fromName, from.balance - amount);
  _setBalance(toName, to.balance + amount);

  const tr = getTransfers();
  tr.push({ id: "s" + Date.now(), from: fromName, to: toName, amount, date: new Date().toISOString() });
  _save(KEYS.transfers, tr);
  return { ok: true, msg: `You sent ${COIN} ${amount} to ${toName}! 💝` };
}
function transfersForUser(name) {
  return getTransfers()
    .filter((t) => t.from === name || t.to === name)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- admin powers ---------- */
// Deshna says yes → the friend can log in from now on.
function approveUser(username) {
  const users = getUsers();
  const u = users.find((x) => x.username === username);
  if (!u) return { ok: false, msg: "Friend not found." };
  if (u.status === "approved") return { ok: false, msg: `${username} is already in.` };
  u.status = "approved";
  _save(KEYS.users, users);
  return { ok: true, msg: `${username} is in! 🎉 They start with ${COIN} ${u.balance}.` };
}
// Deshna says no → the sign-up is thrown away and the name is free again.
function declineUser(username) {
  const users = getUsers();
  const u = users.find((x) => x.username === username);
  if (!u) return { ok: false, msg: "Friend not found." };
  if (u.status !== "pending") return { ok: false, msg: "You can only decline friends who are still waiting." };
  _save(KEYS.users, users.filter((x) => x.username !== username));
  return { ok: true, msg: `${username}'s sign-up was removed.` };
}

function adminAddCoins(username, amount) {
  amount = Math.round(Number(amount) || 0);
  const u = findUser(username);
  if (!u) return { ok: false, msg: "Friend not found." };
  _setBalance(username, Math.max(0, u.balance + amount)); // amount can be negative to take away
  return { ok: true, msg: `${username} now has ${COIN} ${getBalance(username)}.` };
}
function adminResetAll() {
  [KEYS.users, KEYS.items, KEYS.txns, KEYS.requests, KEYS.swaps, KEYS.transfers, KEYS.session].forEach((k) =>
    localStorage.removeItem(k)
  );
  _seedAdmin(); // Deshna's own account always comes back
}

/* ---------- first-run setup ---------- */
// Makes sure Deshna's admin account exists, and that friends saved before
// approvals existed stay logged-in-able.
function _seedAdmin() {
  const users = getUsers();
  let changed = false;

  users.forEach((u) => {
    if (!u.status) {
      u.status = "approved";
      changed = true;
    }
  });

  const admin = users.find((x) => x.username.toLowerCase() === ADMIN_NAME);
  if (!admin) {
    users.push({
      username: ADMIN_DISPLAY_NAME,
      pin: ADMIN_PIN,
      balance: START_BALANCE,
      joined: new Date().toISOString(),
      status: "approved",
    });
    changed = true;
  } else if (admin.status !== "approved") {
    admin.status = "approved";
    changed = true;
  }

  if (changed) _save(KEYS.users, users);
}
_seedAdmin();

/* ---------- transactions ---------- */
function getTxns() {
  return _load(KEYS.txns, []);
}
function boughtBy(username) {
  return getTxns().filter((t) => t.buyer === username).sort((a, b) => b.date.localeCompare(a.date));
}
function soldBy(username) {
  return getTxns().filter((t) => t.seller === username).sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- helpers ---------- */
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function coins(n) {
  return `${COIN} ${Number(n || 0).toLocaleString("en-IN")}`;
}

function timeAgo(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

// Shrink an uploaded image so it fits comfortably in localStorage.
function resizeImage(file, maxDim, cb) {
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
      cb(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- shared navigation ---------- */
// Pages that require login. Redirects to index.html if logged out.
function requireAuth() {
  if (!currentUser()) {
    location.href = "index.html?needlogin=1";
    return false;
  }
  return true;
}

function renderNav(activePage) {
  const user = currentUser();
  const authArea = document.getElementById("navAuth");
  const links = document.getElementById("navLinks");
  if (!authArea || !links) return;

  // Show a little count when friends are waiting for a swap answer.
  const waitingSwaps = user ? swapsForOwner(user.username).length : 0;

  const linkDefs = [
    { href: "index.html", label: "🏠 Home", page: "home" },
    { href: "market.html", label: "🛒 Toys", page: "market" },
    { href: "trade.html", label: `🔄 Trading Board${waitingSwaps ? ` (${waitingSwaps})` : ""}`, page: "trade" },
    { href: "mytoys.html", label: "🧸 My Toys", page: "mytoys" },
    { href: "history.html", label: "🎒 My Stuff", page: "history" },
  ];
  if (isAdmin(user)) linkDefs.push({ href: "admin.html", label: "👑 Admin", page: "admin" });
  links.innerHTML = linkDefs
    .map(
      (l) =>
        `<a href="${l.href}" class="${l.page === activePage ? "active-link" : ""} ${l.page !== "home" ? "hide-sm" : ""}">${l.label}</a>`
    )
    .join("");

  if (user) {
    authArea.innerHTML = `
      <span class="balance-chip" title="Your virtual coins">${COIN} ${Number(user.balance).toLocaleString("en-IN")}</span>
      <span class="who">Hi, <b>${escapeHtml(user.username)}</b></span>
      <button class="btn small ghost" id="logoutBtn">Log out</button>`;
    document.getElementById("logoutBtn").addEventListener("click", () => {
      logout();
      location.href = "index.html";
    });
  } else {
    authArea.innerHTML = `<a class="btn small" href="index.html">Login / Register</a>`;
  }
}
