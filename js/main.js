/* ===== Deshna's Delights — landing page logic ===== */
const LS_KEY = "deshna_gifts_added"; // gifts added via the admin page (browser storage)

let CURRENCY = "₹";
let allGifts = [];
let activeCat = "All";

// Load gifts from the JSON file, then merge with any added in the browser.
async function loadGifts() {
  let base = { gifts: [], shop: {} };
  try {
    const res = await fetch("data/gifts.json", { cache: "no-store" });
    base = await res.json();
  } catch (e) {
    console.warn("Could not load data/gifts.json — showing only added gifts.", e);
  }

  CURRENCY = (base.shop && base.shop.currency) || "₹";
  const added = getAddedGifts();
  allGifts = [...(base.gifts || []), ...added];

  renderFilters();
  renderGifts();
}

function getAddedGifts() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

function renderFilters() {
  const cats = ["All", ...new Set(allGifts.map((g) => g.category).filter(Boolean))];
  const wrap = document.getElementById("filters");
  wrap.innerHTML = cats
    .map(
      (c) =>
        `<button class="chip ${c === activeCat ? "active" : ""}" data-cat="${c}">${c}</button>`
    )
    .join("");
  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCat = chip.dataset.cat;
      renderFilters();
      renderGifts();
    });
  });
}

function badgeHtml(tags) {
  if (!tags || !tags.length) return "";
  return tags
    .map((t) => `<span class="badge ${t}">${t}</span>`)
    .join("");
}

function renderGifts() {
  const grid = document.getElementById("giftGrid");
  const list =
    activeCat === "All"
      ? allGifts
      : allGifts.filter((g) => g.category === activeCat);

  if (!list.length) {
    grid.innerHTML = `<div class="empty">No gifts here yet 🎁<br/>Head to <a href="admin.html" style="color:var(--rose)">Add a Gift</a> to create one!</div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (g, i) => `
      <article class="card" data-index="${allGifts.indexOf(g)}">
        <div class="card-img">
          <img src="${g.image || "images/placeholder.svg"}" alt="${escapeHtml(g.name)}"
               onerror="this.src='images/placeholder.svg'" />
          <div class="card-badges">${badgeHtml(g.tags)}</div>
        </div>
        <div class="card-body">
          <span class="card-cat">${escapeHtml(g.category || "Gift")}</span>
          <h3 class="card-title">${escapeHtml(g.name)}</h3>
          <p class="card-desc">${escapeHtml(g.description || "")}</p>
          <div class="card-foot">
            <span class="price">${CURRENCY}${Number(g.price || 0).toLocaleString("en-IN")}</span>
            <button class="btn small view-btn">View</button>
          </div>
        </div>
      </article>`
    )
    .join("");

  grid.querySelectorAll(".card").forEach((card) => {
    const idx = Number(card.dataset.index);
    const open = () => openModal(allGifts[idx]);
    card.addEventListener("click", open);
  });
}

/* ===== Modal ===== */
function openModal(g) {
  document.getElementById("mImg").src = g.image || "images/placeholder.svg";
  document.getElementById("mImg").onerror = function () {
    this.src = "images/placeholder.svg";
  };
  document.getElementById("mCat").textContent = g.category || "Gift";
  document.getElementById("mTitle").textContent = g.name;
  document.getElementById("mDesc").textContent = g.description || "";
  document.getElementById("mPrice").textContent =
    CURRENCY + Number(g.price || 0).toLocaleString("en-IN");
  document.getElementById("mBadges").innerHTML = badgeHtml(g.tags);
  document.getElementById("modal").classList.add("open");
}

function closeModal() {
  document.getElementById("modal").classList.remove("open");
}

/* ===== Helpers ===== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  loadGifts();
});
