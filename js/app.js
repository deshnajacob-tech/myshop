/* ============================================================
   Friends Trading Centre — page logic
   Runs the right code based on <body data-page="...">

   The data lives in the cloud, so:
     • the page waits for startStore() before drawing anything
     • anything that changes data is awaited
     • when a friend on another computer changes something, the
       page redraws itself through _redraw
   ============================================================ */

import {
  CONFIG_OK,
  startStore,
  renderNav,
  requireAuth,
  currentUser,
  isAdmin,
  COIN,
  START_BALANCE,
  SITE_NAME,
  coins,
  escapeHtml,
  timeAgo,
  resizeImage,
  register,
  login,
  setAvatar,
  removeAvatar,
  avatarHtml,
  COUNTRIES,
  countryOf,
  countryFlag,
  countryTag,
  setUserCountry,
  getApprovedUsers,
  getPendingUsers,
  getMemberUsers,
  isPaused,
  approveUser,
  declineUser,
  setUserActive,
  removeUser,
  getItems,
  getItemsByOwner,
  getMarketItems,
  itemImage,
  describeError,
  buyAllowance,
  INTERESTS,
  interestsOf,
  setInterests,
  rememberSearch,
  forgetSearches,
  forYou,
  dailyGift,
  claimDailyGift,
  DAILY_COINS,
  VOUCHER_EVERY,
  myVouchers,
  bestVoucher,
  RESERVE_HOURS,
  reservationOf,
  isHeldByOther,
  reserveItem,
  releaseItem,
  friendsOf,
  friendRequests,
  friendState,
  askToBeFriends,
  acceptFriend,
  declineFriend,
  unfriend,
  arePostsReady,
  POSTS_OFF_MSG,
  POST_MAX_CHARS,
  POSTS_PER_FRIEND,
  postsBy,
  feedFor,
  likedByMe,
  addPost,
  deletePost,
  toggleLike,
  gamePlaysLeft,
  awardGameCoins,
  THEMES,
  applyTheme,
  savedThemeId,
  themeOf,
  setTheme,
  startPresence,
  lastSeenText,
  presenceDot,
  toCollect,
  confirmReceipt,
  refundPurchase,
  txnStatus,
  isChatReady,
  CHAT_OFF_MSG,
  CHAT_LIMIT,
  chatWith,
  chatTime,
  sendMessage,
  markChatRead,
  unreadFrom,
  LEVELS,
  LEVEL_STEP,
  LEVEL_BONUS,
  LIST_REWARD,
  levelOf,
  levelBadge,
  addItem,
  deleteItem,
  hasPendingRequest,
  askToBuy,
  requestsForSeller,
  requestsByBuyer,
  acceptRequest,
  declineRequest,
  swapsForOwner,
  swapsByOfferer,
  swapHistoryFor,
  hasPendingSwap,
  offerSwap,
  acceptSwap,
  declineSwap,
  cancelSwap,
  sendCoins,
  boughtBy,
  soldBy,
  leaderboard,
  getTxns,
  adminAddCoins,
  adminSetAllCoins,
  adminRemoveItem,
  adminResetAll,
  PENALTY_COINS,
} from "./store.js";

// Writing the same HTML again makes the browser throw away every photo and
// decode it a second time, so only touch the DOM when something really
// changed. Returns true when it did — if it didn't, the old buttons are
// still there with their click handlers, so DON'T attach them again.
function setHtml(el, html) {
  if (!el || el._lastHtml === html) return false;
  el._lastHtml = html;
  el.innerHTML = html;
  return true;
}

// Paint this browser's last-known colours on immediately, so the page never
// flashes the wrong palette while the cloud is still answering.
applyTheme(savedThemeId());

// Each page sets this to its own draw function so live updates from other
// computers can refresh what's on screen.
let _redraw = null;

/* ---------- toy lists: search, newest first, 10 to a page ---------- */
const PAGE_SIZE = 10;

// Wait until the typing stops before redrawing the whole grid.
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// One search box searches the toy's name, its category, what it says about
// itself, and whose toy it is.
function toyMatches(item, query) {
  if (!query) return true;
  return `${item.name} ${item.category} ${item.description} ${item.owner}`.toLowerCase().includes(query);
}

// Newest toy first, then cut the list into pages of ten.
function toyPage(list, query, page) {
  const found = list
    .filter((i) => toyMatches(i, query))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pages); // a page can vanish when a toy sells
  return {
    shown: found.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    page: safePage,
    pages,
    total: found.length,
  };
}

// The "Ask to buy" button, in whichever of its four states applies. Shared by
// the Marketplace and the For You page so they can never disagree.
function askButton(item, meName, allowance, balance) {
  if (hasPendingRequest(item.id, meName)) return `<button class="btn small ghost" disabled>Asked ⏳</button>`;
  if (isHeldByOther(item, meName))
    return `<button class="btn small ghost" disabled title="Someone is holding this toy">🔖 Reserved</button>`;
  if (allowance.left <= 0)
    return `<button class="btn small ghost" disabled title="You can buy one toy for every toy you list">List a toy first 🧸</button>`;
  const voucher = bestVoucher(meName);
  const price = Math.max(0, item.price - (voucher ? voucher.off : 0));
  if (balance < price) return `<button class="btn small ghost" disabled>Need more 🪙</button>`;
  return `<button class="btn small ask-btn" data-id="${item.id}">Ask to buy 🙋</button>`;
}

// 🔖 Reserve / Let it go — one held toy per friend, for a day.
function reserveButton(item, meName) {
  const held = reservationOf(item);
  if (held && held.by === meName)
    return `<button class="btn small ghost release-btn" data-id="${item.id}"
              title="You're holding this for ${held.hoursLeft} more hours">🔖 Holding · let go</button>`;
  if (held) return "";
  return `<button class="btn small ghost reserve-btn" data-id="${item.id}"
            title="Hold this toy for ${RESERVE_HOURS} hours">🔖 Reserve</button>`;
}

// One toy card. `ribbon` is the little "because you like Cars" line.
function toyCard(item, buttonHtml, ribbon) {
  const held = reservationOf(item);
  return `
      <article class="card">
        <div class="card-img">
          <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
          <div class="card-badges">
            <span class="badge ${item.condition === "new" ? "new" : "handmade"}">${item.condition}</span>
            ${held ? `<span class="badge held">🔖 ${escapeHtml(held.by)} · ${held.hoursLeft}h</span>` : ""}
          </div>
        </div>
        <div class="card-body">
          ${ribbon || ""}
          <span class="card-cat">${escapeHtml(item.category)} · from ${escapeHtml(item.owner)} ${countryFlag(item.owner)}</span>
          <h3 class="card-title">${escapeHtml(item.name)}</h3>
          <p class="card-desc">${escapeHtml(item.description) || "No description."}</p>
          <div class="card-foot">
            <span class="price">${coins(item.price)}</span>
            ${buttonHtml}
          </div>
        </div>
      </article>`;
}

// ◀ Back · Page 2 of 4 · Next ▶ — hidden when everything fits on one page.
function drawPager(el, info, go) {
  if (!el) return;
  const html =
    info.pages > 1
      ? `<button class="btn small ghost pg-back"${info.page === 1 ? " disabled" : ""}>◀ Back</button>
         <span class="pager-now">Page <b>${info.page}</b> of ${info.pages} · ${info.total} toys</span>
         <button class="btn small ghost pg-next"${info.page === info.pages ? " disabled" : ""}>Next ▶</button>`
      : "";
  if (!setHtml(el, html) || !html) return;

  el.querySelector(".pg-back").addEventListener("click", () => go(info.page - 1));
  el.querySelector(".pg-next").addEventListener("click", () => go(info.page + 1));
}

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!CONFIG_OK) {
    showOverlay(
      "Almost there! 🔌",
      `<p>${SITE_NAME} needs its cloud database before it can run.</p>
       <p class="hint">Open <b>js/firebase-config.js</b> and paste in your Firebase project settings.
       Step-by-step instructions are in the <b>README</b>.</p>`
    );
    return;
  }

  showOverlay("Connecting… ⏳", `<p class="hint">Fetching everyone's toys and coins.</p>`);
  try {
    await startStore(() => {
      // Someone (probably the admin) wiped the account we're logged in as.
      if (page !== "home" && !currentUser()) {
        location.href = "index.html";
        return;
      }
      renderNav(page);
      if (_redraw) _redraw();
    });
  } catch (err) {
    console.error(err);
    showOverlay(
      "Can't reach the internet 📡",
      `<p>${SITE_NAME} couldn't load your friends' toys.</p>
       <p class="hint">Check your connection and refresh the page. If this keeps happening, make sure the
       Firestore database exists and its rules allow reading and writing.</p>
       <p class="hint" style="opacity:.7">${escapeHtml(err.message || err)}</p>`
    );
    return;
  }
  hideOverlay();

  // The account is the truth: a friend who changed their colours on another
  // computer gets them here too.
  const signedIn = currentUser();
  if (signedIn) applyTheme(themeOf(signedIn.username));

  // Tell everyone I'm here, and keep saying it while the tab is open.
  startPresence();
  // Nobody writes anything when a friend simply closes their laptop, so the
  // page checks the clock now and then to let them fade to offline.
  setInterval(() => {
    renderNav(page);
    if (_redraw) _redraw();
  }, 45000);

  renderNav(page);

  if (page === "home") initHome();
  if (page === "market") initMarket();
  if (page === "foryou") initForYou();
  if (page === "game") initGame();
  if (page === "posts") initPosts();
  if (page === "trade") initTrade();
  if (page === "mytoys") initMyToys();
  if (page === "friends") initFriends();
  if (page === "history") initHistory();
  if (page === "leaderboard") initLeaderboard();
  if (page === "admin") initAdmin();
});

/* ---------- full-page message (loading / setup / offline) ---------- */
function showOverlay(title, html) {
  let o = document.getElementById("cloudOverlay");
  if (!o) {
    o = document.createElement("div");
    o.id = "cloudOverlay";
    o.className = "cloud-overlay";
    document.body.appendChild(o);
  }
  o.innerHTML = `<div class="cloud-card"><h2>${title}</h2>${html}</div>`;
  o.style.display = "grid";
}
function hideOverlay() {
  const o = document.getElementById("cloudOverlay");
  if (o) o.style.display = "none";
}

/* ---------- toast ---------- */
let _toastTimer;
function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove("show"), 3400);
}

// Stops double-clicks turning into double trades while we wait for the cloud.
async function busy(btn, work) {
  if (btn.disabled) return;
  btn.disabled = true;
  try {
    await work();
  } catch (err) {
    // Say what actually broke — "something went wrong" helps nobody.
    toast(describeError(err, "button"));
  } finally {
    btn.disabled = false;
  }
}

/* ============================================================
   HOME  (landing + login / register)
   ============================================================ */
function initHome() {
  const user = currentUser();
  const authWrap = document.getElementById("authWrap");
  const welcome = document.getElementById("welcomeBack");

  // Friendly nudge if a protected page bounced them here.
  if (location.search.includes("needlogin")) {
    toast("Please log in to continue 🙂");
  }

  if (user && authWrap && welcome) {
    authWrap.style.display = "none";
    welcome.style.display = "block";
    document.getElementById("wbName").textContent = user.username;
    document.getElementById("wbBalance").textContent = coins(user.balance);
    return;
  }

  // Tab switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });

  // Register
  const regForm = document.getElementById("registerForm");
  if (regForm) {
    regForm.addEventListener("submit", (e) => {
      e.preventDefault();
      busy(regForm.querySelector("button[type=submit]"), async () => {
        const name = document.getElementById("regName").value;
        const pin = document.getElementById("regPin").value;
        const res = await register(name, pin);
        toast(res.msg);
        if (res.ok) {
          // No login yet — Deshna has to accept them on the admin page first.
          regForm.reset();
          document.querySelector('.tab[data-target="loginPanel"]').click();
        }
      });
    });
  }

  // Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      busy(loginForm.querySelector("button[type=submit]"), async () => {
        const name = document.getElementById("logName").value;
        const pin = document.getElementById("logPin").value;
        const res = await login(name, pin);
        toast(res.msg);
        if (res.ok) setTimeout(() => (location.href = "market.html"), 600);
      });
    });
  }
}

/* ============================================================
   MARKETPLACE  (all friends' available toys)
   ============================================================ */
function initMarket() {
  if (!requireAuth()) return;
  const me = currentUser();
  let activeCond = "All";
  let query = "";
  let page = 1;

  const filtersEl = document.getElementById("condFilters");
  if (filtersEl) {
    ["All", "new", "used"].forEach((c) => {
      const b = document.createElement("button");
      b.className = "chip" + (c === "All" ? " active" : "");
      b.textContent = c === "All" ? "All" : c[0].toUpperCase() + c.slice(1);
      b.addEventListener("click", () => {
        activeCond = c;
        page = 1; // a new filter always starts at the first page
        filtersEl.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        draw();
      });
      filtersEl.appendChild(b);
    });
  }

  const searchEl = document.getElementById("marketSearch");
  if (searchEl) {
    // Arriving from a "you keep looking for…" chip on the For You page.
    const fromLink = new URLSearchParams(location.search).get("q");
    if (fromLink) {
      searchEl.value = fromLink;
      query = fromLink.trim().toLowerCase();
    }
    searchEl.addEventListener(
      "input",
      debounce(() => {
        query = searchEl.value.trim().toLowerCase();
        rememberSearch(me.username, query); // feeds the For You page
        page = 1;
        draw();
      }, 200)
    );
  }

  // "You can buy 2 more toys" — the one-in, one-out rule, in plain words,
  // plus a reminder of whose toys you're allowed to see.
  function drawAllowance(allowance) {
    const bar = document.getElementById("buyAllowance");
    if (!bar) return;
    bar.style.display = "block";
    const mine = countryOf(me.username);
    const countryLine = mine
      ? `<br/>🌍 These are the toys from friends in ${mine.flag} <b>${escapeHtml(mine.name)}</b> — that's who you trade with.`
      : `<br/>🌍 You don't have a country yet, so you can trade with everyone. Ask Deshna to pick yours!`;
    const listed = `You've listed <b>${allowance.listed} toy${allowance.listed === 1 ? "" : "s"}</b>`;
    let buys;
    if (!allowance.listed) {
      buys = `🧸 <b>List a toy to start buying.</b> You can buy one toy for every toy you put up for
        trade — <a href="mytoys.html" style="color:var(--rose)">list your first toy</a>!`;
    } else if (allowance.left > 0) {
      buys = `🧸 ${listed}, so you can buy <b>${allowance.left} more</b>.
        ${allowance.waiting ? `(${allowance.waiting} ask${allowance.waiting === 1 ? "" : "s"} still waiting.)` : ""}`;
    } else {
      buys = `🧸 ${listed} and used them all up.
        <a href="mytoys.html" style="color:var(--rose)">List another toy</a> to buy another one!`;
    }
    bar.innerHTML = buys + countryLine;
  }

  function draw() {
    const grid = document.getElementById("marketGrid");
    const fresh = currentUser();
    const allowance = buyAllowance(me.username);
    drawAllowance(allowance);
    let list = getMarketItems(me.username);
    if (activeCond !== "All") list = list.filter((i) => i.condition === activeCond);

    // Newest toys first, ten to a page.
    const info = toyPage(list, query, page);
    page = info.page;
    drawPager(document.getElementById("marketPager"), info, (p) => {
      page = p;
      draw();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    if (!info.shown.length) {
      setHtml(
        grid,
        query
          ? `<div class="empty">No toys match “${escapeHtml(query)}” 🔍<br/>Try another word!</div>`
          : `<div class="empty">No toys up for trade right now 🧸<br/>
        Ask your friends to list some, or <a href="mytoys.html" style="color:var(--rose)">list your own</a>!</div>`
      );
      return;
    }

    const html = info.shown
      .map((i) =>
        toyCard(i, askButton(i, me.username, allowance, fresh.balance) + reserveButton(i, me.username))
      )
      .join("");

    // Same toys as last time? Then the buttons below are already wired up.
    if (!setHtml(grid, html)) return;

    grid.querySelectorAll(".reserve-btn").forEach((btn) =>
      btn.addEventListener("click", () =>
        busy(btn, async () => {
          toast((await reserveItem(btn.dataset.id, me.username)).msg);
          draw();
        })
      )
    );
    grid.querySelectorAll(".release-btn").forEach((btn) =>
      btn.addEventListener("click", () =>
        busy(btn, async () => {
          toast((await releaseItem(btn.dataset.id, me.username)).msg);
          draw();
        })
      )
    );

    grid.querySelectorAll(".ask-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        busy(btn, async () => {
          const res = await askToBuy(btn.dataset.id, me.username);
          toast(res.msg);
          draw();
        })
      );
    });
  }

  _redraw = draw;
  draw();
}

/* ============================================================
   TRADING BOARD  (toy for toy — no coins, like fidget trading)
   ============================================================ */
function initTrade() {
  if (!requireAuth()) return;
  const me = currentUser();
  let query = "";
  let page = 1;

  const searchEl = document.getElementById("tradeSearch");
  if (searchEl)
    searchEl.addEventListener(
      "input",
      debounce(() => {
        query = searchEl.value.trim().toLowerCase();
        rememberSearch(me.username, query); // feeds the For You page
        page = 1;
        drawBoard();
      }, 200)
    );

  // A little "my toy 🔄 their toy" strip used in every offer row.
  function pairRow(giveImg, giveName, getImg, getName, title, sub, buttons) {
    return `
      <div class="mini swap-row">
        <div class="swap-pair">
          <img src="${giveImg}" alt="${escapeHtml(giveName)}" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
          <span class="swap-arrow">🔄</span>
          <img src="${getImg}" alt="${escapeHtml(getName)}" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
        </div>
        <div class="info">
          <b>${title}</b>
          <small>${sub}</small>
        </div>
        <div class="yn">${buttons}</div>
      </div>`;
  }

  // Offers other friends sent me
  function drawInbox() {
    const panel = document.getElementById("inboxPanel");
    const wrap = document.getElementById("swapInbox");
    const offers = swapsForOwner(me.username);
    panel.style.display = offers.length ? "block" : "none";
    if (!offers.length) return;

    const html = offers
      .map((s) =>
        pairRow(
          itemImage(s.giveId, s.giveImage),
          s.giveName,
          itemImage(s.getId, s.getImage),
          s.getName,
          `${escapeHtml(s.from)} wants to swap`,
          `Their <b>${escapeHtml(s.giveName)}</b> for your <b>${escapeHtml(s.getName)}</b>`,
          `<button class="icon-btn yes swap-yes" data-id="${s.id}" title="Yes, swap them!" aria-label="Yes, swap them">✔</button>
           <button class="icon-btn no swap-no" data-id="${s.id}" title="No thanks" aria-label="No thanks">✖</button>`
        )
      )
      .join("");
    if (!setHtml(wrap, html)) return;

    wrap.querySelectorAll(".swap-yes").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          toast((await acceptSwap(b.dataset.id, me.username)).msg);
          drawAll();
        })
      )
    );
    wrap.querySelectorAll(".swap-no").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          toast((await declineSwap(b.dataset.id, me.username)).msg);
          drawAll();
        })
      )
    );
  }

  // Offers I sent out
  function drawOutbox() {
    const panel = document.getElementById("outboxPanel");
    const wrap = document.getElementById("swapOutbox");
    const mine = swapsByOfferer(me.username).filter((s) => s.status !== "accepted");
    panel.style.display = mine.length ? "block" : "none";
    if (!mine.length) return;

    const labels = {
      pending: `<span class="status sold">Waiting… ⏳</span>`,
      declined: `<span class="status sold">Said no ❌</span>`,
      cancelled: `<span class="status sold">You took it back</span>`,
    };
    const html = mine
      .map((s) =>
        pairRow(
          itemImage(s.giveId, s.giveImage),
          s.giveName,
          itemImage(s.getId, s.getImage),
          s.getName,
          `You asked ${escapeHtml(s.to)}`,
          `Your <b>${escapeHtml(s.giveName)}</b> for their <b>${escapeHtml(s.getName)}</b><br/>${labels[s.status] || s.status}`,
          s.status === "pending"
            ? `<button class="icon-btn undo swap-cancel" data-id="${s.id}" title="Take this offer back" aria-label="Take this offer back">↩</button>`
            : ""
        )
      )
      .join("");
    if (!setHtml(wrap, html)) return;

    wrap.querySelectorAll(".swap-cancel").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          toast((await cancelSwap(b.dataset.id, me.username)).msg);
          drawAll();
        })
      )
    );
  }

  // Everyone else's toys, each with a picker of my toys
  function drawBoard() {
    const grid = document.getElementById("tradeGrid");
    const myToys = getItemsByOwner(me.username).filter((i) => i.status === "available");
    const theirs = getMarketItems(me.username);

    document.getElementById("noToysNote").style.display = myToys.length ? "none" : "block";

    // Whose toys am I allowed to swap for?
    const mine = countryOf(me.username);
    const countryBar = document.getElementById("tradeCountry");
    countryBar.style.display = "block";
    countryBar.innerHTML = mine
      ? `🌍 Swaps happen inside your own country — these are the toys from friends in
         ${mine.flag} <b>${escapeHtml(mine.name)}</b>.`
      : `🌍 You don't have a country yet, so you can swap with everyone. Ask Deshna to pick yours!`;

    // Newest toys first, ten to a page.
    const info = toyPage(theirs, query, page);
    page = info.page;
    drawPager(document.getElementById("tradePager"), info, (p) => {
      page = p;
      drawBoard();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    if (!info.shown.length) {
      setHtml(
        grid,
        query
          ? `<div class="empty">No toys match “${escapeHtml(query)}” 🔍<br/>Try another word!</div>`
          : `<div class="empty">No toys to swap for right now 🧸<br/>
        Ask your friends to list some in <a href="mytoys.html" style="color:var(--rose)">My Toys</a>!</div>`
      );
      return;
    }

    const html = info.shown
      .map((i) => {
        const options = myToys
          .map(
            (m) =>
              `<option value="${m.id}" ${hasPendingSwap(m.id, i.id) ? "disabled" : ""}>${escapeHtml(m.name)}${
                hasPendingSwap(m.id, i.id) ? " (already offered)" : ""
              }</option>`
          )
          .join("");
        const picker = myToys.length
          ? `<div class="swap-pick">
               <div class="swap-pick-row">
                 <select class="give-pick" data-get="${i.id}" aria-label="Which of your toys?">${options}</select>
                 <button class="icon-btn add offer-btn" data-get="${i.id}"
                         title="Offer this swap" aria-label="Offer this swap">➕</button>
               </div>
               <small class="swap-hint">Pick your toy, then press ➕ to offer the swap</small>
             </div>`
          : `<div class="swap-pick"><button class="btn small ghost" disabled>List a toy first 🧸</button></div>`;

        return `
      <article class="card">
        <div class="card-img">
          <img src="${i.image}" alt="${escapeHtml(i.name)}" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
          <div class="card-badges">
            <span class="badge ${i.condition === "new" ? "new" : "handmade"}">${i.condition}</span>
          </div>
        </div>
        <div class="card-body">
          <span class="card-cat">${escapeHtml(i.category)} · from ${escapeHtml(i.owner)} ${countryFlag(i.owner)}</span>
          <h3 class="card-title">${escapeHtml(i.name)}</h3>
          <p class="card-desc">${escapeHtml(i.description) || "No description."}</p>
          ${picker}
        </div>
      </article>`;
      })
      .join("");

    // Unchanged board? The pickers and buttons are already wired up.
    if (!setHtml(grid, html)) return;

    grid.querySelectorAll(".offer-btn").forEach((btn) =>
      btn.addEventListener("click", () =>
        busy(btn, async () => {
          const getId = btn.dataset.get;
          const select = grid.querySelector(`.give-pick[data-get="${getId}"]`);
          const res = await offerSwap(select.value, getId, me.username);
          toast(res.msg);
          drawAll();
        })
      )
    );
  }

  // Swaps that already happened
  function drawHistory() {
    const panel = document.getElementById("historyPanel");
    const wrap = document.getElementById("swapHistory");
    const done = swapHistoryFor(me.username);
    panel.style.display = done.length ? "block" : "none";
    if (!done.length) return;

    const html = done
      .map((s) => {
        const iGave = s.from === me.username ? s.giveName : s.getName;
        const iGot = s.from === me.username ? s.getName : s.giveName;
        const friend = s.from === me.username ? s.to : s.from;
        return pairRow(
          s.from === me.username ? itemImage(s.giveId, s.giveImage) : itemImage(s.getId, s.getImage),
          iGave,
          s.from === me.username ? itemImage(s.getId, s.getImage) : itemImage(s.giveId, s.giveImage),
          iGot,
          `Swapped with ${escapeHtml(friend)}`,
          `You gave <b>${escapeHtml(iGave)}</b> and got <b>${escapeHtml(iGot)}</b> · ${timeAgo(s.doneAt || s.date)}`,
          ""
        );
      })
      .join("");
    setHtml(wrap, html);
  }

  function drawAll() {
    drawInbox();
    drawOutbox();
    drawBoard();
    drawHistory();
  }

  _redraw = drawAll;
  drawAll();
}

/* ============================================================
   MY TOYS  (list a toy + manage listings)
   ============================================================ */
function initMyToys() {
  if (!requireAuth()) return;
  const me = currentUser();
  let imageData = "";

  const fileInput = document.getElementById("toyImage");
  const previewBox = document.getElementById("previewBox");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) {
        imageData = "";
        previewBox.innerHTML = "<span>Photo preview</span>";
        return;
      }
      resizeImage(file, 560, (dataUrl) => {
        imageData = dataUrl;
        previewBox.innerHTML = `<img src="${dataUrl}" alt="preview" />`;
      });
    });
  }

  const form = document.getElementById("toyForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    busy(form.querySelector("button[type=submit]"), async () => {
      const name = document.getElementById("toyName").value.trim();
      const price = Number(document.getElementById("toyPrice").value);
      const condition = form.querySelector('input[name="condition"]:checked').value;
      const category = document.getElementById("toyCategory").value.trim() || "Toy";
      const description = document.getElementById("toyDesc").value.trim();

      if (!name) return toast("Please give your toy a name.");
      if (isNaN(price) || price < 0) return toast("Please set a valid price in coins.");

      const res = await addItem({
        owner: me.username,
        name,
        condition,
        category,
        price,
        description,
        image: imageData || "images/placeholder.svg",
      });
      if (!res.ok) return toast(res.msg);

      form.reset();
      imageData = "";
      previewBox.innerHTML = "<span>Photo preview</span>";
      toast(`"${name}" is up for trade! 🎉 +${coins(LIST_REWARD)} and one more toy you can buy.`);
      // A new badge deserves its own moment, right after the first toast.
      if (res.levelUp)
        setTimeout(
          () => toast(`${res.levelUp.icon} Level up! You're ${res.levelUp.name} now. +${coins(res.levelUp.reward)}`),
          2600
        );
      renderNav("mytoys");
      drawMine();
      drawFairNote();
    });
  });

  // Reminder of the one-in, one-out rule, with your own numbers in it.
  function drawFairNote() {
    const note = document.getElementById("fairNote");
    const a = buyAllowance(me.username);
    const rule = "🧸 <b>One toy in, one toy out.</b> You can buy one toy for every toy you list.";
    const lv = levelOf(me.username);
    const next = levelBadge(lv.level + 1);
    const levelLine = `<br/>${lv.icon} You're <b>${lv.name}</b> — post <b>${lv.toGo} more</b>
      for ${next.icon} <b>${next.name}</b> (+${coins(LEVEL_BONUS)}). Every toy pays ${coins(LIST_REWARD)}.`;
    note.innerHTML =
      (a.listed
        ? `${rule} You've listed <b>${a.listed}</b>, bought <b>${a.bought}</b>${
            a.waiting ? ` and asked for <b>${a.waiting}</b> more` : ""
          } — so you can buy <b>${a.left}</b> right now.`
        : `${rule} List your first toy above and you can buy one!`) + levelLine;
  }

  function drawMine() {
    const wrap = document.getElementById("myList");
    const mine = getItemsByOwner(me.username).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const allRequests = requestsForSeller(me.username) || [];
    if (!mine.length) {
      setHtml(wrap, `<p class="hint">You haven't listed any toys yet. Add your first bored toy above! 🧸</p>`);
      return;
    }
    const html = mine
      .map(
        (i) => {
          const wantCount = (allRequests || []).filter(r => r.itemId === i.id && r.status === "pending").length;
          return `
      <div class="mini">
        <img src="${i.image}" alt="" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
        <div class="info">
          <b>${escapeHtml(i.name)}</b>
          <small>${escapeHtml(i.category)} · ${i.condition} · ${coins(i.price)}</small>
          <small class="status ${i.status}">${i.status === "sold" ? "Sold to " + escapeHtml(i.buyer) : "Available"}</small>
          ${wantCount > 0 ? `<small class="wants-badge">👀 ${wantCount} ${wantCount === 1 ? "person wants" : "people want"} this</small>` : ""}
        </div>
        ${i.status === "available" ? `<button class="del-btn" data-id="${i.id}">Remove</button>` : `<span class="sold-tag">SOLD</span>`}
      </div>`;
        }
      )
      .join("");

    wrap.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        busy(btn, async () => {
          if (!confirm("Remove this toy from the marketplace?")) return;
          const res = await deleteItem(btn.dataset.id, me.username);
          toast(res.ok ? "Toy removed. That's one buy less, too." : res.msg);
          drawMine();
          drawFairNote();
        })
      );
    });
  }

  function drawRequests() {
    const panel = document.getElementById("requestPanel");
    const wrap = document.getElementById("requestList");
    const reqs = requestsForSeller(me.username);
    if (!reqs.length) {
      panel.style.display = "none";
      return;
    }
    panel.style.display = "block";
    const html = reqs
      .map(
        (r) => `
      <div class="mini request-row">
        <img src="${itemImage(r.itemId, r.image)}" alt="" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
        <div class="info">
          <b>${escapeHtml(r.itemName)}</b>
          <small><b>${escapeHtml(r.buyer)}</b> wants to buy this for ${coins(r.price)}</small>
        </div>
        <div class="yn">
          <button class="btn small yes-btn" data-id="${r.id}">✅ Yes!</button>
          <button class="btn small ghost no-btn" data-id="${r.id}">❌ No</button>
        </div>
      </div>`
      )
      .join("");

    wrap.querySelectorAll(".yes-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        busy(btn, async () => {
          const res = await acceptRequest(btn.dataset.id, me.username);
          toast(res.msg);
          renderNav("mytoys");
          drawBoth();
        })
      );
    });
    wrap.querySelectorAll(".no-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        busy(btn, async () => {
          const res = await declineRequest(btn.dataset.id, me.username);
          toast(res.msg);
          drawRequests();
        })
      );
    });
  }

  function drawStats() {
    const mine = getItemsByOwner(me.username) || [];
    const allRequests = requestsForSeller(me.username) || [];
    const available = mine.filter(i => i.status === "available").length;
    const sold = mine.filter(i => i.status === "sold").length;
    const wantingCount = allRequests.filter(r => r.status === "pending").length;

    const statsPanel = document.getElementById("listingStats");
    if (mine.length > 0) {
      statsPanel.style.display = "grid";
      document.getElementById("statTotalListings").textContent = mine.length;
      document.getElementById("statAvailable").textContent = available;
      document.getElementById("statSold").textContent = sold;
      document.getElementById("statWanting").textContent = wantingCount;
    } else {
      statsPanel.style.display = "none";
    }
  }

  function drawBoth() {
    drawStats();
    drawRequests();
    drawMine();
    drawFairNote();
  }

  _redraw = drawBoth;
  drawBoth();
}

/* ============================================================
   MY POSTS  (things about your life, for your friends)
   ============================================================ */
function initPosts() {
  if (!requireAuth()) return;
  const me = currentUser();
  let photo = "";

  if (!arePostsReady()) {
    const warn = document.getElementById("postsWarning");
    warn.style.display = "block";
    warn.innerHTML = `🔒 ${escapeHtml(POSTS_OFF_MSG)}`;
  }

  /* --- writing one --- */
  const textEl = document.getElementById("postText");
  const countEl = document.getElementById("postCount");
  const preview = document.getElementById("postPreview");

  textEl.addEventListener("input", () => {
    const left = POST_MAX_CHARS - textEl.value.length;
    countEl.textContent = `${left} letter${left === 1 ? "" : "s"} left`;
  });

  document.getElementById("postImage").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    resizeImage(file, 420, (dataUrl) => {
      photo = dataUrl;
      preview.style.display = "block";
      preview.innerHTML = `<img src="${dataUrl}" alt="Your photo" />
        <button type="button" class="btn small ghost" id="dropPhoto">Remove photo</button>`;
      document.getElementById("dropPhoto").addEventListener("click", () => {
        photo = "";
        preview.style.display = "none";
        preview.innerHTML = "";
        document.getElementById("postImage").value = "";
      });
    });
  });

  document.getElementById("postForm").addEventListener("submit", (e) => {
    e.preventDefault();
    busy(e.target.querySelector("button[type=submit]"), async () => {
      const res = await addPost(me.username, textEl.value, photo);
      toast(res.msg);
      if (!res.ok) return;
      textEl.value = "";
      photo = "";
      preview.style.display = "none";
      preview.innerHTML = "";
      document.getElementById("postImage").value = "";
      countEl.textContent = `${POST_MAX_CHARS} letters left`;
      draw();
    });
  });

  /* --- showing them --- */
  function postCard(p) {
    const mine = p.author === me.username;
    const likes = Array.isArray(p.likes) ? p.likes : [];
    const iLike = likedByMe(p, me.username);
    return `
      <article class="post">
        <div class="post-head">
          ${avatarHtml(p.author)}
          <div class="info">
            <b>${presenceDot(p.author)}${escapeHtml(p.author)} ${countryFlag(p.author)}</b>
            <small>${timeAgo(p.date)} · ${chatTime(p.date)}</small>
          </div>
          ${
            mine || isAdmin(me)
              ? `<button class="del-btn post-del" data-id="${p.id}">Delete</button>`
              : ""
          }
        </div>
        <p class="post-text">${escapeHtml(p.text)}</p>
        ${p.image ? `<img class="post-photo" src="${p.image}" alt="" loading="lazy" decoding="async" />` : ""}
        <div class="post-foot">
          <button class="like-btn${iLike ? " liked" : ""}" data-id="${p.id}"
                  aria-pressed="${iLike}" title="${iLike ? "Take back your like" : "Like this"}">
            ${iLike ? "❤️" : "🤍"} ${likes.length}
          </button>
          ${likes.length ? `<small class="post-likers">${escapeHtml(likes.slice(0, 3).join(", "))}${likes.length > 3 ? ` +${likes.length - 3}` : ""}</small>` : ""}
        </div>
      </article>`;
  }

  function wirePosts(wrap) {
    wrap.querySelectorAll(".like-btn").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          const res = await toggleLike(b.dataset.id, me.username);
          if (!res.ok) toast(res.msg);
          draw();
        })
      )
    );
    wrap.querySelectorAll(".post-del").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          if (!confirm("Delete this post for good?")) return;
          toast((await deletePost(b.dataset.id, me.username)).msg);
          draw();
        })
      )
    );
  }

  function draw() {
    const mine = postsBy(me.username);
    const pals = friendsOf(me.username);
    const theirs = feedFor(me.username).filter((p) => p.author !== me.username);

    document.getElementById("mineNote").textContent = mine.length
      ? `Your newest ${POSTS_PER_FRIEND} posts are kept — ${mine.length} so far.`
      : "Nothing yet — write your first post above!";

    const myWrap = document.getElementById("myPosts");
    if (setHtml(myWrap, mine.length ? mine.map(postCard).join("") : `<div class="empty">No posts yet 📝</div>`))
      wirePosts(myWrap);

    document.getElementById("feedNote").innerHTML = pals.length
      ? `Posts from your ${pals.length} friend${pals.length === 1 ? "" : "s"}.`
      : `You haven't added any friends yet — <a href="friends.html" style="color:var(--rose)">find some on the Friends page</a>!`;

    const feedWrap = document.getElementById("friendPosts");
    if (
      setHtml(
        feedWrap,
        theirs.length
          ? theirs.map(postCard).join("")
          : `<div class="empty">${
              pals.length ? "Your friends haven't posted yet 💭" : "Add a friend to see their posts 💜"
            }</div>`
      )
    )
      wirePosts(feedWrap);
  }

  _redraw = draw;
  draw();
}

/* ============================================================
   TOY MATCH  (find the pairs, win coins — 3 paying games a day)
   ============================================================ */
function initGame() {
  if (!requireAuth()) return;
  const me = currentUser();

  const TOYS = ["🧸", "🚗", "🪀", "🎲", "🧩", "🎨", "🪁", "🚀", "🎸", "⚽"];
  const PAIRS = 6;
  const board = document.getElementById("gBoard");
  const message = document.getElementById("gMessage");

  let deck = []; // [{ toy, done }]
  let up = []; // the one or two cards facing up
  let moves = 0;
  let found = 0;
  let peeking = false; // true while a wrong pair is on show
  let over = false;

  // How many coins a win is worth — quick games pay more.
  function prize(turns) {
    if (turns <= 10) return 6;
    if (turns <= 14) return 5;
    if (turns <= 20) return 4;
    return 2;
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function newGame() {
    const picked = shuffle(TOYS.slice()).slice(0, PAIRS);
    deck = shuffle(picked.concat(picked).map((toy) => ({ toy, done: false })));
    up = [];
    moves = 0;
    found = 0;
    peeking = false;
    over = false;

    board.innerHTML = deck
      .map(
        (card, i) => `
      <button type="button" class="memo" data-i="${i}" aria-label="Card ${i + 1}">
        <span class="memo-inner">
          <span class="memo-face back">?</span>
          <span class="memo-face front">${card.toy}</span>
        </span>
      </button>`
      )
      .join("");
    board.querySelectorAll(".memo").forEach((b) => b.addEventListener("click", () => flip(Number(b.dataset.i))));

    say("Press a card to start! 🧸");
    tally();
  }

  function cardEl(i) {
    return board.querySelector(`.memo[data-i="${i}"]`);
  }
  function say(html) {
    message.innerHTML = html;
  }
  function tally() {
    document.getElementById("gMoves").textContent = moves;
    document.getElementById("gPairs").textContent = `${found} / ${PAIRS}`;
    document.getElementById("gLeft").textContent = gamePlaysLeft(me.username);
  }

  function flip(i) {
    if (peeking || over || deck[i].done || up.includes(i)) return;

    up.push(i);
    cardEl(i).classList.add("up");
    if (up.length < 2) return;

    moves++;
    const [a, b] = up;
    if (deck[a].toy === deck[b].toy) {
      deck[a].done = deck[b].done = true;
      found++;
      up = [];
      [a, b].forEach((n) => cardEl(n).classList.add("done"));
      tally();
      if (found === PAIRS) win();
      else say("Match! 🎉 Keep going.");
      return;
    }

    // Not a pair — let them look, then turn both back over.
    peeking = true;
    say("Not a pair — have a good look! 👀");
    tally();
    setTimeout(() => {
      [a, b].forEach((n) => cardEl(n).classList.remove("up"));
      up = [];
      peeking = false;
    }, 850);
  }

  async function win() {
    over = true;
    const coinsWon = prize(moves);
    say(`🎉 <b>All found in ${moves} turns!</b> Counting your coins…`);

    const res = await awardGameCoins(me.username, coinsWon);
    say(
      res.ok
        ? `🎉 <b>${escapeHtml(res.msg)}</b> ${res.left ? `You have ${res.left} paying game${res.left === 1 ? "" : "s"} left today.` : "That was your last paying game today — play again just for fun! 🌙"}`
        : `You found them all in ${moves} turns! ${escapeHtml(res.msg)}`
    );
    if (res.ok) toast(res.msg);
    renderNav("game");
    tally();
  }

  document.getElementById("gNew").addEventListener("click", newGame);
  _redraw = tally; // someone else changing something shouldn't reshuffle the board
  newGame();
}

/* ============================================================
   FOR YOU  (picked from what you like + what you search for)
   ============================================================ */
function initForYou() {
  if (!requireAuth()) return;
  const me = currentUser();
  let chosen = new Set(interestsOf(me.username));

  /* --- the "what do you like?" chips --- */
  const chipWrap = document.getElementById("interestChips");
  function drawChips() {
    setHtml(
      chipWrap,
      INTERESTS.map(
        (name) =>
          `<button type="button" class="chip interest-chip${chosen.has(name) ? " active" : ""}"
                   data-name="${escapeHtml(name)}" aria-pressed="${chosen.has(name)}">${escapeHtml(name)}</button>`
      ).join("")
    );
    chipWrap.querySelectorAll(".interest-chip").forEach((c) =>
      c.addEventListener("click", () => {
        const name = c.dataset.name;
        chosen.has(name) ? chosen.delete(name) : chosen.add(name);
        drawChips();
        document.getElementById("interestSaved").textContent = "Press save when you're done 👉";
      })
    );
  }

  document.getElementById("saveInterests").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const res = await setInterests(me.username, [...chosen]);
      toast(res.msg);
      document.getElementById("interestSaved").textContent = res.ok ? "Saved ✨" : "";
      draw();
    })
  );

  /* --- words they keep searching --- */
  function drawSearches(searches) {
    const panel = document.getElementById("searchPanel");
    panel.style.display = searches.length ? "block" : "none";
    if (!searches.length) return;

    const wrap = document.getElementById("searchChips");
    if (
      setHtml(
        wrap,
        searches
          .map(
            (s) =>
              `<a class="chip" href="market.html?q=${encodeURIComponent(s.term)}"
                  title="Looked for ${s.count} time${s.count === 1 ? "" : "s"}">🔍 ${escapeHtml(s.term)}</a>`
          )
          .join("")
      )
    ) {
      // nothing to wire — they're plain links to the Marketplace
    }
  }

  document.getElementById("forgetSearch").addEventListener("click", () => {
    if (!confirm("Forget the words you've searched for on this device?")) return;
    forgetSearches(me.username);
    toast("Forgotten. Your likes are still saved. 🧽");
    draw();
  });

  /* --- the two grids --- */
  function draw() {
    const fresh = currentUser();
    const allowance = buyAllowance(me.username);
    const picks = forYou(me.username);

    drawChips();
    drawSearches(picks.searches);

    document.getElementById("pickedNote").textContent = picks.hasTaste
      ? "Based on your likes and the things you search for."
      : "Tap a few things you like above, and this fills up with toys just for you!";

    const pickedGrid = document.getElementById("pickedGrid");
    const pickedHtml = picks.picked.length
      ? picks.picked
          .map(({ item, why }) =>
            toyCard(
              item,
              askButton(item, me.username, allowance, fresh.balance),
              why.length ? `<span class="why-tag">✨ because you like ${escapeHtml(why.join(" & "))}</span>` : ""
            )
          )
          .join("")
      : `<div class="empty">Nothing picked out yet 💭<br/>
         Choose what you like above, or go and search for a toy you want!</div>`;
    if (setHtml(pickedGrid, pickedHtml)) wireAsk(pickedGrid);

    const freshGrid = document.getElementById("freshGrid");
    const freshHtml = picks.fresh.length
      ? picks.fresh.map((i) => toyCard(i, askButton(i, me.username, allowance, fresh.balance))).join("")
      : `<div class="empty">No other toys right now 🧸</div>`;
    if (setHtml(freshGrid, freshHtml)) wireAsk(freshGrid);
  }

  // Both grids use the same Ask-to-buy button as the Marketplace.
  function wireAsk(grid) {
    grid.querySelectorAll(".ask-btn").forEach((btn) =>
      btn.addEventListener("click", () =>
        busy(btn, async () => {
          toast((await askToBuy(btn.dataset.id, me.username)).msg);
          draw();
        })
      )
    );
  }

  _redraw = draw;
  draw();
}

/* ============================================================
   FRIENDS  (one chat box per friend)
   ============================================================ */
function initFriends() {
  if (!requireAuth()) return;
  const me = currentUser();
  const wrap = document.getElementById("friendsList");
  let openWith = null; // whose chat box is open right now
  let shownFor = null; // whose box was on screen when we last drew

  if (!isChatReady()) {
    const warn = document.getElementById("chatWarning");
    warn.style.display = "block";
    warn.innerHTML = `🔒 ${escapeHtml(CHAT_OFF_MSG)}`;
  }

  // The messages, then the box to write a new one.
  function chatBox(friend) {
    const msgs = chatWith(me.username, friend);
    const log = msgs.length
      ? msgs
          .map(
            (m) => `
        <div class="bubble ${m.from === me.username ? "me" : "them"}">
          ${escapeHtml(m.text)}
          <span class="bubble-time">${chatTime(m.date)}</span>
        </div>`
          )
          .join("")
      : `<p class="hint chat-empty">No messages yet. Say hi! 👋</p>`;

    const left = CHAT_LIMIT - msgs.length;
    return `
      <div class="chat-box">
        <div class="chat-log" id="chatLog">${log}</div>
        <div class="chat-meter${left <= 2 ? " nearly-full" : ""}">
          ${msgs.length} of ${CHAT_LIMIT} messages${
            left <= 0
              ? " — the next one starts a fresh chat 🧹"
              : left <= 2
                ? ` — ${left} left before it starts over`
                : ""
          }
        </div>
        <form class="chat-form" id="chatForm">
          <input type="text" id="chatText" maxlength="300" autocomplete="off"
                 placeholder="Write to ${escapeHtml(friend)}…" aria-label="Message for ${escapeHtml(friend)}" />
          <button type="submit" class="btn small">Send 💬</button>
        </form>
      </div>`;
  }

  // People who have asked to be my friend
  function drawRequests() {
    const panel = document.getElementById("friendReqPanel");
    const wants = friendRequests(me.username);
    panel.style.display = wants.length ? "block" : "none";
    document.getElementById("friendReqCount").textContent = wants.length ? `(${wants.length})` : "";
    if (!wants.length) return;

    const list = document.getElementById("friendReqList");
    const changed = setHtml(
      list,
      wants
        .map(
          (name) => `
      <div class="mini">
        ${avatarHtml(name)}
        <div class="info">
          <b>${escapeHtml(name)} ${countryFlag(name)}</b>
          <small>${presenceDot(name)} ${escapeHtml(lastSeenText(name))}</small>
        </div>
        <div class="yn">
          <button class="icon-btn yes fr-yes" data-u="${escapeHtml(name)}" title="Yes, be friends!" aria-label="Yes, be friends">✔</button>
          <button class="icon-btn no fr-no" data-u="${escapeHtml(name)}" title="No thanks" aria-label="No thanks">✖</button>
        </div>
      </div>`
        )
        .join("")
    );
    if (!changed) return;

    list.querySelectorAll(".fr-yes").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          toast((await acceptFriend(me.username, b.dataset.u)).msg);
          draw();
        })
      )
    );
    list.querySelectorAll(".fr-no").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          toast((await declineFriend(me.username, b.dataset.u)).msg);
          draw();
        })
      )
    );
  }

  // The button that turns a stranger into a friend.
  function friendButton(name) {
    switch (friendState(me.username, name)) {
      case "friends":
        return `<button class="btn small ghost unfriend-btn" data-u="${escapeHtml(name)}" title="You're friends">💜 Friends</button>`;
      case "sent":
        return `<button class="btn small ghost" disabled>Asked ⏳</button>`;
      case "waiting":
        return `<button class="btn small add-btn" data-u="${escapeHtml(name)}">✔ Say yes!</button>`;
      default:
        return `<button class="btn small add-btn" data-u="${escapeHtml(name)}">💜 Add</button>`;
    }
  }

  function draw() {
    drawRequests();

    const friends = getApprovedUsers().filter((u) => u.username !== me.username);
    if (!friends.length) {
      setHtml(wrap, `<p class="hint">No other friends yet. Ask someone to register on the home page! 🎈</p>`);
      return;
    }
    if (openWith && !friends.some((u) => u.username === openWith)) openWith = null;

    const html = friends
      .map((u) => {
        const open = openWith === u.username;
        const unread = unreadFrom(me.username, u.username);
        const lv = levelOf(u.username);
        return `
      <div class="mini friend-row${open ? " open" : ""}">
        <div class="friend-top">
          ${avatarHtml(u.username)}
          <div class="info">
            <b>${escapeHtml(u.username)} ${countryFlag(u.username)}
              <span class="level-tag">${lv.icon} ${lv.name}</span></b>
            <small>${presenceDot(u.username)} ${escapeHtml(lastSeenText(u.username))} · ${coins(u.balance)} · ${lv.listed} toy(s) posted</small>
          </div>
          <div class="yn">
            ${friendButton(u.username)}
            <button class="btn small ${open ? "ghost " : ""}chat-btn" data-u="${escapeHtml(u.username)}">
              ${open ? "Close ✖" : "Chat 💬"}${!open && unread ? `<span class="chat-count">${unread}</span>` : ""}
            </button>
          </div>
        </div>
        ${open ? chatBox(u.username) : ""}
      </div>`;
      })
      .join("");

    // Nothing new? Then the boxes, buttons AND whatever is half-typed in the
    // message field are all exactly as they should be — leave them alone.
    const sameChat = shownFor === openWith;
    const box = document.getElementById("chatText");
    const draft = box && sameChat ? box.value : "";
    const wasTyping = box && sameChat && document.activeElement === box;
    if (!setHtml(wrap, html)) return;
    shownFor = openWith;

    wrap.querySelectorAll(".chat-btn").forEach((b) =>
      b.addEventListener("click", () => {
        openWith = openWith === b.dataset.u ? null : b.dataset.u;
        const friend = openWith;
        draw();
        if (friend) markChatRead(me.username, friend); // clears the red badge
      })
    );

    wrap.querySelectorAll(".add-btn").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          toast((await askToBeFriends(me.username, b.dataset.u)).msg);
          draw();
        })
      )
    );
    wrap.querySelectorAll(".unfriend-btn").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          if (!confirm(`Stop being friends with ${b.dataset.u}?\n\nYou won't see each other's posts any more.`))
            return;
          toast((await unfriend(me.username, b.dataset.u)).msg);
          draw();
        })
      )
    );

    const form = document.getElementById("chatForm");
    if (form) {
      const input = document.getElementById("chatText");
      input.value = draft;
      if (wasTyping) input.focus();

      // Newest message at the bottom, like a real chat app.
      const log = document.getElementById("chatLog");
      if (log) log.scrollTop = log.scrollHeight;

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = input.value;
        // Empty the box the moment they press send — waiting for the cloud
        // makes it feel like nothing happened.
        input.value = "";
        busy(form.querySelector("button[type=submit]"), async () => {
          const res = await sendMessage(me.username, openWith, text);
          if (!res.ok) {
            input.value = text; // put their words back so nothing is lost
            return toast(res.msg);
          }
          if (res.restarted) toast(res.msg);
          draw();
          const next = document.getElementById("chatText");
          if (next) next.focus();
        });
      });
    }

    // Anything unread in the open chat has just been seen.
    if (openWith && unreadFrom(me.username, openWith)) markChatRead(me.username, openWith);
  }

  _redraw = draw;
  draw();
}

/* ============================================================
   HISTORY  (sold + bought)
   ============================================================ */
function initHistory() {
  if (!requireAuth()) return;
  const me = currentUser();

  // ----- profile picture -----
  const avatarFile = document.getElementById("avatarFile");
  const avatarRemove = document.getElementById("avatarRemove");

  function drawAvatar() {
    const box = document.getElementById("myAvatar");
    const fresh = currentUser();
    box.innerHTML = avatarHtml(me.username, "big");
    avatarRemove.style.display = fresh && fresh.avatar ? "inline-block" : "none";

    // Deshna sets everyone's country — here you just see yours.
    const flag = document.getElementById("myCountry");
    const tag = countryTag(me.username);
    flag.innerHTML = tag || `<span class="hint">No country yet — ask Deshna to pick yours! 🌍</span>`;
  }

  avatarFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Small and square-ish: a face doesn't need to be big.
    resizeImage(file, 240, async (dataUrl) => {
      try {
        const res = await setAvatar(me.username, dataUrl);
        toast(res.msg);
      } catch (err) {
        console.error(err);
        toast("Couldn't save your picture. Try again. 📡");
      }
      avatarFile.value = "";
      renderNav("history");
      drawAvatar();
    });
  });

  avatarRemove.addEventListener("click", () =>
    busy(avatarRemove, async () => {
      toast((await removeAvatar(me.username)).msg);
      renderNav("history");
      drawAvatar();
    })
  );

  function drawStats() {
    const fresh = currentUser();
    const bought = boughtBy(fresh.username);
    const sold = soldBy(fresh.username);
    document.getElementById("statBalance").textContent = coins(fresh.balance);
    document.getElementById("statEarned").textContent = coins(sold.reduce((s, t) => s + t.price, 0));
    document.getElementById("statSpent").textContent = coins(bought.reduce((s, t) => s + t.price, 0));
    document.getElementById("statTraded").textContent = bought.length + sold.length;
    renderTxnList("boughtList", bought, "seller", "Bought from");
    renderTxnList("soldList", sold, "buyer", "Sold to");
  }

  // Send-coins friend dropdown (everyone except me)
  const select = document.getElementById("sendTo");
  function fillFriends() {
    const keep = select.value;
    const others = getApprovedUsers().filter((u) => u.username !== me.username);
    select.innerHTML = others.length
      ? others.map((u) => `<option value="${escapeHtml(u.username)}">${escapeHtml(u.username)}</option>`).join("")
      : `<option value="">No friends yet</option>`;
    if (keep) select.value = keep;
  }

  const sendForm = document.getElementById("sendForm");
  sendForm.addEventListener("submit", (e) => {
    e.preventDefault();
    busy(sendForm.querySelector("button[type=submit]"), async () => {
      const to = select.value;
      const amount = document.getElementById("sendAmount").value;
      const res = await sendCoins(me.username, to, amount);
      toast(res.msg);
      if (res.ok) {
        document.getElementById("sendAmount").value = "";
        renderNav("history");
        drawStats();
      }
    });
  });

  // My asks (buy requests I made)
  function drawAsks() {
    const wrap = document.getElementById("myAsks");
    const asks = requestsByBuyer(me.username);
    if (!asks.length) {
      setHtml(wrap, `<p class="hint">You haven't asked for any toys yet. Go find some! 🛒</p>`);
      return;
    }
    const labels = {
      pending: `<span class="status sold">Waiting… ⏳</span>`,
      accepted: `<span class="status available">Got it! ✅</span>`,
      declined: `<span class="status sold">Said no ❌</span>`,
    };
    const html = asks
      .map(
        (r) => `
      <div class="mini">
        <img src="${itemImage(r.itemId, r.image)}" alt="" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
        <div class="info">
          <b>${escapeHtml(r.itemName)}</b>
          <small>from <b>${escapeHtml(r.seller)}</b> · ${coins(r.price)}</small>
          <small>${labels[r.status] || r.status}</small>
        </div>
      </div>`
      )
      .join("");
    setHtml(wrap, html);
  }

  // ----- the daily gift -----
  const giftBtn = document.getElementById("claimGift");
  giftBtn.addEventListener("click", () =>
    busy(giftBtn, async () => {
      const res = await claimDailyGift(me.username);
      toast(res.msg);
      renderNav("history");
      drawGift();
    })
  );

  function drawGift() {
    const gift = dailyGift(me.username);
    const vouchers = myVouchers(me.username);

    giftBtn.disabled = gift.claimed;
    giftBtn.textContent = gift.claimed ? "Opened — see you tomorrow 🌙" : "Open today's gift 🎁";
    // What tomorrow holds if they keep the streak going.
    const nextDay = gift.streak + 1;
    const nextCoins = DAILY_COINS[Math.min(nextDay - 1, DAILY_COINS.length - 1)];
    const nextVoucher = nextDay % VOUCHER_EVERY === 0;
    document.getElementById("giftLine").innerHTML = gift.claimed
      ? `Tomorrow: <b>${coins(nextCoins)}</b>${nextVoucher ? " and another <b>🎟️ voucher</b>" : ""} — don't break your streak!`
      : `Waiting for you: <b>${coins(gift.coins)}</b>${gift.voucher ? ` and a <b>🎟️ ${gift.voucher}-coin voucher</b>` : ""}.`;
    document.getElementById("giftStreak").innerHTML = `🔥 <b>Day ${gift.streak}</b> in a row`;

    setHtml(
      document.getElementById("myVouchers"),
      vouchers.length
        ? `<p class="hint" style="margin:14px 0 8px">Your vouchers come off your next toy automatically:</p>` +
            vouchers
              .map((v) => `<span class="voucher">🎟️ ${v.off} coins off</span>`)
              .join("")
        : ""
    );
  }

  // ----- colour system -----
  function drawThemes() {
    const mine = themeOf(me.username);
    ["pastel", "standard"].forEach((family) => {
      const wrap = document.getElementById(family === "pastel" ? "themesPastel" : "themesStandard");
      const changed = setHtml(
        wrap,
        THEMES.filter((t) => t.family === family)
          .map(
            (t) => `
        <button type="button" class="theme-card${t.id === mine ? " picked" : ""}" data-theme="${t.id}"
                aria-pressed="${t.id === mine}" title="${escapeHtml(t.name)}">
          <span class="theme-dots">${t.swatch
            .map((c) => `<span class="theme-dot" style="background:${c}"></span>`)
            .join("")}</span>
          <span class="theme-name">${escapeHtml(t.name)}</span>
        </button>`
          )
          .join("")
      );
      if (!changed) return;

      wrap.querySelectorAll(".theme-card").forEach((card) =>
        card.addEventListener("click", () =>
          busy(card, async () => {
            const res = await setTheme(me.username, card.dataset.theme);
            toast(res.msg);
            drawThemes();
          })
        )
      );
    });
  }

  // Toys I've paid for that haven't been handed over yet.
  function drawCollect() {
    const panel = document.getElementById("collectPanel");
    const wrap = document.getElementById("collectList");
    const waiting = toCollect(me.username);

    panel.style.display = waiting.length ? "block" : "none";
    document.getElementById("collectCount").textContent = waiting.length ? `(${waiting.length})` : "";
    if (!waiting.length) return;

    const changed = setHtml(
      wrap,
      waiting
        .map(
          (t) => `
      <div class="mini request-row">
        <img src="${itemImage(t.itemId, t.image)}" alt="" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
        <div class="info">
          <b>${escapeHtml(t.itemName)}</b>
          <small>from <b>${escapeHtml(t.seller)}</b> ${countryFlag(t.seller)} · you paid ${coins(t.price)} · ${timeAgo(t.date)}</small>
        </div>
        <div class="yn">
          <button class="btn small got-btn" data-id="${t.id}" data-name="${escapeHtml(t.itemName)}">Got it! ✅</button>
          <button class="btn small ghost lost-btn" data-id="${t.id}" data-name="${escapeHtml(t.itemName)}">Didn't get it ❌</button>
        </div>
      </div>`
        )
        .join("")
    );
    if (!changed) return;

    wrap.querySelectorAll(".got-btn").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          if (!confirm(`Did ${b.dataset.name} really reach you?\n\nPress OK only once you're holding it.`)) return;
          toast((await confirmReceipt(b.dataset.id, me.username)).msg);
          drawEverything();
        })
      )
    );
    wrap.querySelectorAll(".lost-btn").forEach((b) =>
      b.addEventListener("click", () =>
        busy(b, async () => {
          if (!confirm(`You never got "${b.dataset.name}"?\n\nYour coins come back and the toy goes back to your friend.`))
            return;
          toast((await refundPurchase(b.dataset.id, me.username)).msg);
          renderNav("history");
          drawEverything();
        })
      )
    );
  }

  function drawEverything() {
    drawGift();
    drawThemes();
    drawCollect();
    drawAvatar();
    fillFriends();
    drawStats();
    drawAsks();
  }

  _redraw = drawEverything;
  drawEverything();
}

/* ============================================================
   LEADERBOARD  (who has listed the most toys)
   ============================================================ */
function initLeaderboard() {
  if (!requireAuth()) return;
  const me = currentUser();
  const MEDALS = ["🥇", "🥈", "🥉"];

  function toys(n) {
    return `${n} toy${n === 1 ? "" : "s"}`;
  }

  // The level chart: one row per badge, with whoever is standing on it.
  function drawLevels() {
    const chart = document.getElementById("levelChart");
    const mineBox = document.getElementById("myLevel");
    const top = LEVELS[LEVELS.length - 1];
    const mine = levelOf(me.username);
    const myRow = Math.min(mine.level, top.level);

    // Who is on each rung right now?
    const byLevel = {};
    getApprovedUsers().forEach((u) => {
      const row = Math.min(levelOf(u.username).level, top.level);
      byLevel[row] = byLevel[row] || [];
      byLevel[row].push(u.username);
    });

    chart.innerHTML =
      LEVELS.map((l) => {
        const here = byLevel[l.level] || [];
        return `
      <div class="level-row${l.level === myRow ? " level-me" : ""}">
        <span class="level-ico">${l.icon}</span>
        <div class="info">
          <b>${l.name}</b>
          <small>${l.toys ? `${l.toys}+ toys posted · +${coins(LEVEL_BONUS)} bonus` : "Just starting out"}</small>
        </div>
        <span class="level-who">${
          here.length ? here.map((n) => escapeHtml(n) + (n === me.username ? " (you)" : "")).join(", ") : "—"
        }</span>
      </div>`;
      }).join("") +
      `<p class="hint level-more">Past ${top.toys} toys the badge stays ${top.icon} ${top.name} and the
        number keeps climbing — every ${LEVEL_STEP} toys is still +${coins(LEVEL_BONUS)}.</p>`;

    const next = levelBadge(mine.level + 1);
    mineBox.style.display = "block";
    mineBox.innerHTML = `${mine.icon} <b>You're ${mine.name}</b> with ${toys(mine.listed)} posted.
      Post <b>${mine.toGo} more</b> to reach ${next.icon} <b>${next.name}</b> and pick up +${coins(LEVEL_BONUS)}!`;
  }

  function draw() {
    const board = leaderboard();
    const podium = document.getElementById("podium");
    const list = document.getElementById("rankList");
    const youAre = document.getElementById("youAre");

    drawLevels();

    // Nobody has listed anything yet — be encouraging, not empty.
    if (!board.some((p) => p.listed > 0)) {
      setHtml(podium, "");
      youAre.style.display = "none";
      setHtml(
        list,
        `<div class="empty">No toys listed yet 🧸<br/>
        Be the very first — <a href="mytoys.html" style="color:var(--rose)">list a toy</a> and you're #1!</div>`
      );
      return;
    }

    // Top three on the podium (silver, gold, bronze — gold in the middle)
    const top = board.slice(0, 3);
    const order = top.length === 3 ? [1, 0, 2] : top.length === 2 ? [1, 0] : [0];
    setHtml(
      podium,
      order
        .map((idx) => {
          const p = top[idx];
          const lv = levelOf(p.username);
          return `
      <div class="podium-card place-${idx + 1}${p.username === me.username ? " is-me" : ""}">
        <div class="podium-medal">${MEDALS[idx]}</div>
        ${avatarHtml(p.username, "big")}
        <b>${presenceDot(p.username)}${escapeHtml(p.username)} ${countryFlag(p.username)}</b>
        <span class="level-tag">${lv.icon} ${lv.name}</span>
        <span class="podium-score">${toys(p.listed)}</span>
        <small>${p.trades} trade${p.trades === 1 ? "" : "s"} done</small>
      </div>`;
        })
        .join("")
    );

    // Where am I, and what would it take to climb one place?
    const myIndex = board.findIndex((p) => p.username === me.username);
    if (myIndex === -1) {
      youAre.style.display = "none";
    } else {
      const mine = board[myIndex];
      const above = board[myIndex - 1];
      let nudge;
      if (!above) {
        nudge = `You're top of the board with ${toys(mine.listed)}. Keep listing to stay there! 👑`;
      } else {
        const gap = above.listed - mine.listed + 1;
        nudge = `List ${gap} more toy${gap === 1 ? "" : "s"} to pass <b>${escapeHtml(above.username)}</b>! 🚀`;
      }
      youAre.style.display = "block";
      youAre.innerHTML = `<b>You're #${myIndex + 1}</b> with ${toys(mine.listed)} listed. ${nudge}`;
    }

    // The full ranking
    const rankHtml = board
      .map((p, i) => {
        const badge = MEDALS[i] || `#${i + 1}`;
        const lv = levelOf(p.username);
        return `
      <div class="mini rank-row${p.username === me.username ? " rank-me" : ""}">
        <span class="rank-num">${badge}</span>
        ${avatarHtml(p.username)}
        <div class="info">
          <b>${presenceDot(p.username)}${escapeHtml(p.username)}${p.username === me.username ? " (you)" : ""} ${countryFlag(p.username)}
            <span class="level-tag" title="${lv.listed} toys posted">${lv.icon} ${lv.name}</span></b>
          <small>${p.sold} sold · ${p.bought} bought · ${p.swapped} swapped</small>
        </div>
        <span class="rank-score">${p.listed}<small>toys</small></span>
      </div>`;
      })
      .join("");
    setHtml(list, rankHtml);
  }

  _redraw = draw;
  draw();
}

/* ============================================================
   ADMIN  (Deshna only)
   ============================================================ */
function initAdmin() {
  if (!requireAuth()) return;
  const me = currentUser();
  if (!isAdmin(me)) {
    toast("Only Deshna can open the admin page.");
    setTimeout(() => (location.href = "market.html"), 800);
    return;
  }

  function draw() {
    const users = getApprovedUsers();
    const members = getMemberUsers(); // playing + paused
    const waiting = getPendingUsers();
    const items = getItems();
    const txns = getTxns();

    const pausedCount = members.length - users.length;
    document.getElementById("aFriends").textContent = users.length;
    document.getElementById("aPaused").textContent = pausedCount;
    document.getElementById("aToys").textContent = items.length;
    document.getElementById("aTrades").textContent = txns.length;
    document.getElementById("aCoins").textContent = coins(users.reduce((s, u) => s + u.balance, 0));

    // Friends waiting to be let in
    const pWrap = document.getElementById("pendingList");
    document.getElementById("aPendingCount").textContent = waiting.length ? `(${waiting.length})` : "";
    const pendingChanged = setHtml(
      pWrap,
      waiting.length
        ? waiting
            .map(
              (u) => `
        <div class="mini">
          ${avatarHtml(u.username)}
          <div class="info">
            <b>${escapeHtml(u.username)}</b>
            <small>asked to join ${timeAgo(u.joined)} · will start with ${coins(u.balance)}</small>
          </div>
          <div class="yn">
            <button class="btn small ok-btn" data-u="${escapeHtml(u.username)}">✅ Yes!</button>
            <button class="btn small ghost nope-btn" data-u="${escapeHtml(u.username)}">❌ No</button>
          </div>
        </div>`
            )
            .join("")
        : `<p class="hint">Nobody is waiting right now. 🎈</p>`
    );

    if (pendingChanged) {
      pWrap.querySelectorAll(".ok-btn").forEach((b) =>
        b.addEventListener("click", () =>
          busy(b, async () => {
            toast((await approveUser(b.dataset.u)).msg);
            draw();
          })
        )
      );
      pWrap.querySelectorAll(".nope-btn").forEach((b) =>
        b.addEventListener("click", () =>
          busy(b, async () => {
            if (!confirm(`Remove ${b.dataset.u}'s sign-up?`)) return;
            toast((await declineUser(b.dataset.u)).msg);
            draw();
          })
        )
      );
    }

    // Friends: coins, pause / switch on, and remove for good
    const fWrap = document.getElementById("friendList");
    const friendsHtml = members.length
      ? members
          .map((u) => {
            const toys = getItemsByOwner(u.username).length;
            const paused = isPaused(u);
            const name = escapeHtml(u.username);
            const lv = levelOf(u.username);
            return `
        <div class="mini${paused ? " paused-row" : ""}">
          ${avatarHtml(u.username)}
          <div class="info">
            <b>${name} ${isAdmin(u) ? "👑" : ""}
              <span class="level-tag" title="${lv.listed} toys posted">${lv.icon} ${lv.name}</span></b>
            <small>${presenceDot(u.username)} ${escapeHtml(lastSeenText(u.username))} · ${coins(u.balance)} · ${toys} toy(s)</small>
            <small class="status ${paused ? "sold" : "available"}">
              ${paused ? "Paused ⏸️ — can't log in" : "Playing ✅"}
            </small>
            <label class="country-pick">
              🌍
              <select class="country-sel" data-u="${name}" aria-label="Country for ${name}">
                <option value="">No country yet</option>
                ${COUNTRIES.map(
                  (c) =>
                    `<option value="${c.code}"${u.country === c.code ? " selected" : ""}>${c.flag} ${escapeHtml(
                      c.name
                    )}</option>`
                ).join("")}
              </select>
            </label>
          </div>
          <div class="yn">
            <button class="btn small give-btn" data-u="${name}">+50 🪙</button>
            <button class="btn small ghost take-btn" data-u="${name}">−50</button>
            ${
              isAdmin(u)
                ? ""
                : `<button class="btn small ${paused ? "" : "ghost "}pause-btn" data-u="${name}" data-on="${paused ? "1" : "0"}">
                     ${paused ? "▶️ Switch on" : "⏸️ Pause"}
                   </button>
                   <button class="del-btn kick-btn" data-u="${name}">Remove</button>`
            }
          </div>
        </div>`;
          })
          .join("")
      : `<p class="hint">No friends have registered yet.</p>`;

    // Only re-wire the buttons when the list actually changed.
    const friendsChanged = setHtml(fWrap, friendsHtml);
    if (friendsChanged) {
      fWrap.querySelectorAll(".give-btn").forEach((b) =>
        b.addEventListener("click", () =>
          busy(b, async () => {
            await adminAddCoins(b.dataset.u, 50);
            toast(`Gave ${COIN} 50 to ${b.dataset.u}`);
            renderNav("admin");
            draw();
          })
        )
      );
      fWrap.querySelectorAll(".take-btn").forEach((b) =>
        b.addEventListener("click", () =>
          busy(b, async () => {
            await adminAddCoins(b.dataset.u, -50);
            toast(`Took ${COIN} 50 from ${b.dataset.u}`);
            renderNav("admin");
            draw();
          })
        )
      );
      // Pick which country a friend flies the flag of
      fWrap.querySelectorAll(".country-sel").forEach((sel) =>
        sel.addEventListener("change", async () => {
          sel.disabled = true;
          try {
            toast((await setUserCountry(sel.dataset.u, sel.value)).msg);
          } catch (err) {
            console.error(err);
            toast("Couldn't reach the internet. Try again. 📡");
          }
          sel.disabled = false;
          draw();
        })
      );
      // Pause a friend (they can't log in) or switch them back on
      fWrap.querySelectorAll(".pause-btn").forEach((b) =>
        b.addEventListener("click", () =>
          busy(b, async () => {
            const name = b.dataset.u;
            const turnOn = b.dataset.on === "1";
            if (!turnOn && !confirm(`Pause ${name}?\n\nThey stay in the club with all their coins and toys, but can't log in until you switch them back on.`))
              return;
            toast((await setUserActive(name, turnOn)).msg);
            draw();
          })
        )
      );
      // Remove a friend for good
      fWrap.querySelectorAll(".kick-btn").forEach((b) =>
        b.addEventListener("click", () =>
          busy(b, async () => {
            const name = b.dataset.u;
            if (!confirm(`Remove ${name} from the club for good?\n\nTheir account and the toys they still own are deleted and can't be brought back. Pause them instead if you might change your mind.`))
              return;
            toast((await removeUser(name)).msg);
            renderNav("admin");
            draw();
          })
        )
      );
    }

    // All toys — Deshna can take any of them down
    const tWrap = document.getElementById("allToys");
    const toysChanged = setHtml(
      tWrap,
      items.length
        ? items
            .slice()
            .reverse()
            .map(
              (i) => `
        <div class="mini">
          <img src="${i.image}" alt="" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
          <div class="info">
            <b>${escapeHtml(i.name)}</b>
            <small>${escapeHtml(i.owner)} ${countryFlag(i.owner)} · ${i.condition} · ${coins(i.price)}</small>
            <small class="status ${i.status}">${i.status === "sold" ? "Sold to " + escapeHtml(i.buyer) : "Available"}</small>
          </div>
          <div class="yn">
            <button class="del-btn toy-del" data-id="${i.id}" data-name="${escapeHtml(i.name)}">Remove</button>
            <button class="del-btn danger toy-pen" data-id="${i.id}" data-name="${escapeHtml(i.name)}"
                    title="Fake or silly toy: take it down and fine the friend who posted it">
              Penalty −${COIN} ${PENALTY_COINS}
            </button>
          </div>
        </div>`
            )
            .join("")
        : `<p class="hint">No toys listed yet.</p>`
    );

    // Take a toy down, with or without the coin fine.
    // (Skipped when the list didn't change — those buttons already work.)
    const takeDown = (btn, penalty) =>
      busy(btn, async () => {
        const name = btn.dataset.name;
        const question = penalty
          ? `Take "${name}" down AND fine the friend who posted it ${COIN} ${PENALTY_COINS}?\n\nUse this for fake or silly toys.`
          : `Take "${name}" down?\n\nThe toy is deleted and any asks or swap offers for it are cancelled.`;
        if (!confirm(question)) return;
        toast((await adminRemoveItem(btn.dataset.id, penalty)).msg);
        renderNav("admin");
        draw();
      });
    if (toysChanged) {
      tWrap.querySelectorAll(".toy-del").forEach((b) => b.addEventListener("click", () => takeDown(b, false)));
      tWrap.querySelectorAll(".toy-pen").forEach((b) => b.addEventListener("click", () => takeDown(b, true)));
    }

    // All trades
    const trWrap = document.getElementById("allTrades");
    const sorted = txns.slice().sort((a, b) => b.date.localeCompare(a.date));
    setHtml(
      trWrap,
      sorted.length
        ? sorted
            .map(
              (t) => `
        <div class="mini">
          <img src="${t.image}" alt="" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
          <div class="info">
            <b>${escapeHtml(t.itemName)}</b>
            <small>${escapeHtml(t.seller)} → ${escapeHtml(t.buyer)} · ${timeAgo(t.date)}</small>
          </div>
          <span class="price">${coins(t.price)}</span>
        </div>`
            )
            .join("")
        : `<p class="hint">No trades yet.</p>`
    );
  }

  const setAllBtn = document.getElementById("setAllBtn");
  setAllBtn.textContent = `Set everyone to ${COIN} ${START_BALANCE}`;
  setAllBtn.addEventListener("click", () =>
    busy(setAllBtn, async () => {
      if (!confirm(`Give every account exactly ${COIN} ${START_BALANCE}? Their current coins are replaced.`)) return;
      toast((await adminSetAllCoins(START_BALANCE)).msg);
      renderNav("admin");
      draw();
    })
  );

  const resetBtn = document.getElementById("resetBtn");
  resetBtn.addEventListener("click", () =>
    busy(resetBtn, async () => {
      if (!confirm("Really erase EVERYTHING for EVERYONE? This cannot be undone.")) return;
      await adminResetAll();
      toast("All data cleared.");
      setTimeout(() => (location.href = "index.html"), 700);
    })
  );

  _redraw = draw;
  draw();
}

function renderTxnList(elId, list, who, label) {
  const wrap = document.getElementById(elId);
  if (!list.length) {
    setHtml(wrap, `<p class="hint">Nothing here yet.</p>`);
    return;
  }
  const marks = {
    waiting: `<small class="status sold">Waiting to be handed over 📦</small>`,
    received: `<small class="status available">Handed over ✅</small>`,
    refunded: `<small class="status sold">Never arrived — coins returned 🔄</small>`,
  };
  const html = list
    .map(
      (t) => `
    <div class="mini">
      <img src="${t.image}" alt="" loading="lazy" decoding="async" onerror="this.src='images/placeholder.svg'" />
      <div class="info">
        <b>${escapeHtml(t.itemName)}</b>
        <small>${label} <b>${escapeHtml(t[who])}</b> · ${timeAgo(t.date)}</small>
        ${marks[txnStatus(t)] || ""}
      </div>
      <span class="price">${coins(t.price)}</span>
    </div>`
    )
    .join("");
  setHtml(wrap, html);
}
