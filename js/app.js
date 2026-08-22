/* ============================================================
   Deshna's Toy Trade — page logic
   Runs the right code based on <body data-page="...">
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  renderNav(page);

  if (page === "home") initHome();
  if (page === "market") initMarket();
  if (page === "trade") initTrade();
  if (page === "mytoys") initMyToys();
  if (page === "history") initHistory();
  if (page === "admin") initAdmin();
});

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
      const name = document.getElementById("regName").value;
      const pin = document.getElementById("regPin").value;
      const res = register(name, pin);
      toast(res.msg);
      if (res.ok) {
        // No login yet — Deshna has to accept them on the admin page first.
        regForm.reset();
        document.querySelector('.tab[data-target="loginPanel"]').click();
      }
    });
  }

  // Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("logName").value;
      const pin = document.getElementById("logPin").value;
      const res = login(name, pin);
      if (res.ok) {
        toast(res.msg);
        setTimeout(() => (location.href = "market.html"), 600);
      } else {
        toast(res.msg);
      }
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

  const filtersEl = document.getElementById("condFilters");
  if (filtersEl) {
    ["All", "new", "used"].forEach((c) => {
      const b = document.createElement("button");
      b.className = "chip" + (c === "All" ? " active" : "");
      b.textContent = c === "All" ? "All" : c[0].toUpperCase() + c.slice(1);
      b.addEventListener("click", () => {
        activeCond = c;
        filtersEl.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        draw();
      });
      filtersEl.appendChild(b);
    });
  }

  function draw() {
    const grid = document.getElementById("marketGrid");
    let list = getMarketItems(me.username);
    if (activeCond !== "All") list = list.filter((i) => i.condition === activeCond);

    if (!list.length) {
      grid.innerHTML = `<div class="empty">No toys up for trade right now 🧸<br/>
        Ask your friends to list some, or <a href="mytoys.html" style="color:var(--rose)">list your own</a>!</div>`;
      return;
    }

    grid.innerHTML = list
      .map((i) => {
        const asked = hasPendingRequest(i.id, me.username);
        const canAfford = me.balance >= i.price;
        let btn;
        if (asked) {
          btn = `<button class="btn small ghost" disabled>Asked ⏳</button>`;
        } else if (!canAfford) {
          btn = `<button class="btn small ghost" disabled>Need more 🪙</button>`;
        } else {
          btn = `<button class="btn small ask-btn" data-id="${i.id}">Ask to buy 🙋</button>`;
        }
        return `
      <article class="card">
        <div class="card-img">
          <img src="${i.image}" alt="${escapeHtml(i.name)}" onerror="this.src='images/placeholder.svg'" />
          <div class="card-badges">
            <span class="badge ${i.condition === "new" ? "new" : "handmade"}">${i.condition}</span>
          </div>
        </div>
        <div class="card-body">
          <span class="card-cat">${escapeHtml(i.category)} · from ${escapeHtml(i.owner)}</span>
          <h3 class="card-title">${escapeHtml(i.name)}</h3>
          <p class="card-desc">${escapeHtml(i.description) || "No description."}</p>
          <div class="card-foot">
            <span class="price">${coins(i.price)}</span>
            ${btn}
          </div>
        </div>
      </article>`;
      })
      .join("");

    grid.querySelectorAll(".ask-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const res = askToBuy(btn.dataset.id, me.username);
        toast(res.msg);
        if (res.ok) draw();
      });
    });
  }

  draw();
}

/* ============================================================
   TRADING BOARD  (toy for toy — no coins, like fidget trading)
   ============================================================ */
function initTrade() {
  if (!requireAuth()) return;
  const me = currentUser();

  // A little "my toy 🔄 their toy" strip used in every offer row.
  function pairRow(giveImg, giveName, getImg, getName, title, sub, buttons) {
    return `
      <div class="mini swap-row">
        <div class="swap-pair">
          <img src="${giveImg}" alt="${escapeHtml(giveName)}" onerror="this.src='images/placeholder.svg'" />
          <span class="swap-arrow">🔄</span>
          <img src="${getImg}" alt="${escapeHtml(getName)}" onerror="this.src='images/placeholder.svg'" />
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

    wrap.innerHTML = offers
      .map((s) =>
        pairRow(
          s.giveImage,
          s.giveName,
          s.getImage,
          s.getName,
          `${escapeHtml(s.from)} wants to swap`,
          `Their <b>${escapeHtml(s.giveName)}</b> for your <b>${escapeHtml(s.getName)}</b>`,
          `<button class="btn small swap-yes" data-id="${s.id}">✅ Yes!</button>
           <button class="btn small ghost swap-no" data-id="${s.id}">❌ No</button>`
        )
      )
      .join("");

    wrap.querySelectorAll(".swap-yes").forEach((b) =>
      b.addEventListener("click", () => {
        toast(acceptSwap(b.dataset.id, me.username).msg);
        drawAll();
      })
    );
    wrap.querySelectorAll(".swap-no").forEach((b) =>
      b.addEventListener("click", () => {
        toast(declineSwap(b.dataset.id, me.username).msg);
        drawAll();
      })
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
    wrap.innerHTML = mine
      .map((s) =>
        pairRow(
          s.giveImage,
          s.giveName,
          s.getImage,
          s.getName,
          `You asked ${escapeHtml(s.to)}`,
          `Your <b>${escapeHtml(s.giveName)}</b> for their <b>${escapeHtml(s.getName)}</b><br/>${labels[s.status] || s.status}`,
          s.status === "pending"
            ? `<button class="btn small ghost swap-cancel" data-id="${s.id}">Take back</button>`
            : ""
        )
      )
      .join("");

    wrap.querySelectorAll(".swap-cancel").forEach((b) =>
      b.addEventListener("click", () => {
        toast(cancelSwap(b.dataset.id, me.username).msg);
        drawAll();
      })
    );
  }

  // Everyone else's toys, each with a picker of my toys
  function drawBoard() {
    const grid = document.getElementById("tradeGrid");
    const myToys = getItemsByOwner(me.username).filter((i) => i.status === "available");
    const theirs = getMarketItems(me.username);

    document.getElementById("noToysNote").style.display = myToys.length ? "none" : "block";

    if (!theirs.length) {
      grid.innerHTML = `<div class="empty">No toys to swap for right now 🧸<br/>
        Ask your friends to list some in <a href="mytoys.html" style="color:var(--rose)">My Toys</a>!</div>`;
      return;
    }

    grid.innerHTML = theirs
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
               <select class="give-pick" data-get="${i.id}" aria-label="Which of your toys?">${options}</select>
               <button class="btn small offer-btn" data-get="${i.id}">Offer this swap 🔄</button>
             </div>`
          : `<div class="swap-pick"><button class="btn small ghost" disabled>List a toy first 🧸</button></div>`;

        return `
      <article class="card">
        <div class="card-img">
          <img src="${i.image}" alt="${escapeHtml(i.name)}" onerror="this.src='images/placeholder.svg'" />
          <div class="card-badges">
            <span class="badge ${i.condition === "new" ? "new" : "handmade"}">${i.condition}</span>
          </div>
        </div>
        <div class="card-body">
          <span class="card-cat">${escapeHtml(i.category)} · from ${escapeHtml(i.owner)}</span>
          <h3 class="card-title">${escapeHtml(i.name)}</h3>
          <p class="card-desc">${escapeHtml(i.description) || "No description."}</p>
          ${picker}
        </div>
      </article>`;
      })
      .join("");

    grid.querySelectorAll(".offer-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        const getId = btn.dataset.get;
        const select = grid.querySelector(`.give-pick[data-get="${getId}"]`);
        const res = offerSwap(select.value, getId, me.username);
        toast(res.msg);
        if (res.ok) drawAll();
      })
    );
  }

  // Swaps that already happened
  function drawHistory() {
    const panel = document.getElementById("historyPanel");
    const wrap = document.getElementById("swapHistory");
    const done = swapHistoryFor(me.username);
    panel.style.display = done.length ? "block" : "none";
    if (!done.length) return;

    wrap.innerHTML = done
      .map((s) => {
        const iGave = s.from === me.username ? s.giveName : s.getName;
        const iGot = s.from === me.username ? s.getName : s.giveName;
        const friend = s.from === me.username ? s.to : s.from;
        return pairRow(
          s.from === me.username ? s.giveImage : s.getImage,
          iGave,
          s.from === me.username ? s.getImage : s.giveImage,
          iGot,
          `Swapped with ${escapeHtml(friend)}`,
          `You gave <b>${escapeHtml(iGave)}</b> and got <b>${escapeHtml(iGot)}</b> · ${timeAgo(s.doneAt || s.date)}`,
          ""
        );
      })
      .join("");
  }

  function drawAll() {
    renderNav("trade"); // keeps the "(2)" swap count fresh
    drawInbox();
    drawOutbox();
    drawBoard();
    drawHistory();
  }

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
      resizeImage(file, 700, (dataUrl) => {
        imageData = dataUrl;
        previewBox.innerHTML = `<img src="${dataUrl}" alt="preview" />`;
      });
    });
  }

  const form = document.getElementById("toyForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("toyName").value.trim();
    const price = Number(document.getElementById("toyPrice").value);
    const condition = form.querySelector('input[name="condition"]:checked').value;
    const category = document.getElementById("toyCategory").value.trim() || "Toy";
    const description = document.getElementById("toyDesc").value.trim();

    if (!name) return toast("Please give your toy a name.");
    if (isNaN(price) || price < 0) return toast("Please set a valid price in coins.");

    addItem({ owner: me.username, name, condition, category, price, description, image: imageData || "images/placeholder.svg" });
    form.reset();
    imageData = "";
    previewBox.innerHTML = "<span>Photo preview</span>";
    toast(`"${name}" is now up for trade! 🎉`);
    drawMine();
  });

  function drawMine() {
    const wrap = document.getElementById("myList");
    const mine = getItemsByOwner(me.username).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!mine.length) {
      wrap.innerHTML = `<p class="hint">You haven't listed any toys yet. Add your first bored toy above! 🧸</p>`;
      return;
    }
    wrap.innerHTML = mine
      .map(
        (i) => `
      <div class="mini">
        <img src="${i.image}" alt="" onerror="this.src='images/placeholder.svg'" />
        <div class="info">
          <b>${escapeHtml(i.name)}</b>
          <small>${escapeHtml(i.category)} · ${i.condition} · ${coins(i.price)}</small>
          <small class="status ${i.status}">${i.status === "sold" ? "Sold to " + escapeHtml(i.buyer) : "Available"}</small>
        </div>
        ${i.status === "available" ? `<button class="del-btn" data-id="${i.id}">Remove</button>` : `<span class="sold-tag">SOLD</span>`}
      </div>`
      )
      .join("");

    wrap.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("Remove this toy from the marketplace?")) return;
        const res = deleteItem(btn.dataset.id, me.username);
        toast(res.ok ? "Toy removed." : res.msg);
        drawMine();
      });
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
    wrap.innerHTML = reqs
      .map(
        (r) => `
      <div class="mini request-row">
        <img src="${r.image}" alt="" onerror="this.src='images/placeholder.svg'" />
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
      btn.addEventListener("click", () => {
        const res = acceptRequest(btn.dataset.id, me.username);
        toast(res.msg);
        renderNav("mytoys");
        drawRequests();
        drawMine();
      });
    });
    wrap.querySelectorAll(".no-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const res = declineRequest(btn.dataset.id, me.username);
        toast(res.msg);
        drawRequests();
      });
    });
  }

  drawRequests();
  drawMine();
}

/* ============================================================
   HISTORY  (sold + bought)
   ============================================================ */
function initHistory() {
  if (!requireAuth()) return;
  const me = currentUser();

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
    const others = getApprovedUsers().filter((u) => u.username !== me.username);
    select.innerHTML = others.length
      ? others.map((u) => `<option value="${escapeHtml(u.username)}">${escapeHtml(u.username)}</option>`).join("")
      : `<option value="">No friends yet</option>`;
  }
  fillFriends();

  document.getElementById("sendForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const to = select.value;
    const amount = document.getElementById("sendAmount").value;
    const res = sendCoins(me.username, to, amount);
    toast(res.msg);
    if (res.ok) {
      document.getElementById("sendAmount").value = "";
      renderNav("history");
      drawStats();
    }
  });

  // My asks (buy requests I made)
  function drawAsks() {
    const wrap = document.getElementById("myAsks");
    const asks = requestsByBuyer(me.username);
    if (!asks.length) {
      wrap.innerHTML = `<p class="hint">You haven't asked for any toys yet. Go find some! 🛒</p>`;
      return;
    }
    const labels = {
      pending: `<span class="status sold">Waiting… ⏳</span>`,
      accepted: `<span class="status available">Got it! ✅</span>`,
      declined: `<span class="status sold">Said no ❌</span>`,
    };
    wrap.innerHTML = asks
      .map(
        (r) => `
      <div class="mini">
        <img src="${r.image}" alt="" onerror="this.src='images/placeholder.svg'" />
        <div class="info">
          <b>${escapeHtml(r.itemName)}</b>
          <small>from <b>${escapeHtml(r.seller)}</b> · ${coins(r.price)}</small>
          <small>${labels[r.status] || r.status}</small>
        </div>
      </div>`
      )
      .join("");
  }

  drawStats();
  drawAsks();
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
    const waiting = getPendingUsers();
    const items = getItems();
    const txns = getTxns();

    document.getElementById("aFriends").textContent = users.length;
    document.getElementById("aToys").textContent = items.length;
    document.getElementById("aTrades").textContent = txns.length;
    document.getElementById("aCoins").textContent = coins(users.reduce((s, u) => s + u.balance, 0));

    // Friends waiting to be let in
    const pWrap = document.getElementById("pendingList");
    document.getElementById("aPendingCount").textContent = waiting.length ? `(${waiting.length})` : "";
    pWrap.innerHTML = waiting.length
      ? waiting
          .map(
            (u) => `
        <div class="mini">
          <div class="avatar">${escapeHtml(u.username[0].toUpperCase())}</div>
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
      : `<p class="hint">Nobody is waiting right now. 🎈</p>`;

    pWrap.querySelectorAll(".ok-btn").forEach((b) =>
      b.addEventListener("click", () => {
        toast(approveUser(b.dataset.u).msg);
        draw();
      })
    );
    pWrap.querySelectorAll(".nope-btn").forEach((b) =>
      b.addEventListener("click", () => {
        if (!confirm(`Remove ${b.dataset.u}'s sign-up?`)) return;
        toast(declineUser(b.dataset.u).msg);
        draw();
      })
    );

    // Friends with give/take coins
    const fWrap = document.getElementById("friendList");
    fWrap.innerHTML = users.length
      ? users
          .map((u) => {
            const toys = getItemsByOwner(u.username).length;
            return `
        <div class="mini">
          <div class="avatar">${escapeHtml(u.username[0].toUpperCase())}</div>
          <div class="info">
            <b>${escapeHtml(u.username)} ${isAdmin(u) ? "👑" : ""}</b>
            <small>${coins(u.balance)} · ${toys} toy(s) · joined ${timeAgo(u.joined)}</small>
          </div>
          <div class="yn">
            <button class="btn small give-btn" data-u="${escapeHtml(u.username)}">+50 🪙</button>
            <button class="btn small ghost take-btn" data-u="${escapeHtml(u.username)}">−50</button>
          </div>
        </div>`;
          })
          .join("")
      : `<p class="hint">No friends have registered yet.</p>`;

    fWrap.querySelectorAll(".give-btn").forEach((b) =>
      b.addEventListener("click", () => {
        adminAddCoins(b.dataset.u, 50);
        toast(`Gave ${COIN} 50 to ${b.dataset.u}`);
        renderNav("admin");
        draw();
      })
    );
    fWrap.querySelectorAll(".take-btn").forEach((b) =>
      b.addEventListener("click", () => {
        adminAddCoins(b.dataset.u, -50);
        toast(`Took ${COIN} 50 from ${b.dataset.u}`);
        renderNav("admin");
        draw();
      })
    );

    // All toys
    const tWrap = document.getElementById("allToys");
    tWrap.innerHTML = items.length
      ? items
          .slice()
          .reverse()
          .map(
            (i) => `
        <div class="mini">
          <img src="${i.image}" alt="" onerror="this.src='images/placeholder.svg'" />
          <div class="info">
            <b>${escapeHtml(i.name)}</b>
            <small>${escapeHtml(i.owner)} · ${i.condition} · ${coins(i.price)}</small>
            <small class="status ${i.status}">${i.status === "sold" ? "Sold to " + escapeHtml(i.buyer) : "Available"}</small>
          </div>
        </div>`
          )
          .join("")
      : `<p class="hint">No toys listed yet.</p>`;

    // All trades
    const trWrap = document.getElementById("allTrades");
    const sorted = txns.slice().sort((a, b) => b.date.localeCompare(a.date));
    trWrap.innerHTML = sorted.length
      ? sorted
          .map(
            (t) => `
        <div class="mini">
          <img src="${t.image}" alt="" onerror="this.src='images/placeholder.svg'" />
          <div class="info">
            <b>${escapeHtml(t.itemName)}</b>
            <small>${escapeHtml(t.seller)} → ${escapeHtml(t.buyer)} · ${timeAgo(t.date)}</small>
          </div>
          <span class="price">${coins(t.price)}</span>
        </div>`
          )
          .join("")
      : `<p class="hint">No trades yet.</p>`;
  }

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("Really erase EVERYTHING on this device? This cannot be undone.")) return;
    adminResetAll();
    toast("All data cleared.");
    setTimeout(() => (location.href = "index.html"), 700);
  });

  draw();
}

function renderTxnList(elId, list, who, label) {
  const wrap = document.getElementById(elId);
  if (!list.length) {
    wrap.innerHTML = `<p class="hint">Nothing here yet.</p>`;
    return;
  }
  wrap.innerHTML = list
    .map(
      (t) => `
    <div class="mini">
      <img src="${t.image}" alt="" onerror="this.src='images/placeholder.svg'" />
      <div class="info">
        <b>${escapeHtml(t.itemName)}</b>
        <small>${label} <b>${escapeHtml(t[who])}</b> · ${timeAgo(t.date)}</small>
      </div>
      <span class="price">${coins(t.price)}</span>
    </div>`
    )
    .join("");
}
