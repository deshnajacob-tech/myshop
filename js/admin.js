/* ===== Deshna's Delights — admin (add gifts) logic ===== */
const LS_KEY = "deshna_gifts_added";

let currentImageData = ""; // base64 data URL of the chosen image (for instant preview)

/* ---------- storage helpers ---------- */
function getAdded() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}
function saveAdded(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

/* ---------- image preview ---------- */
document.getElementById("image").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const box = document.getElementById("previewBox");
  if (!file) {
    currentImageData = "";
    box.innerHTML = "<span>Image preview</span>";
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    currentImageData = ev.target.result;
    box.innerHTML = `<img src="${currentImageData}" alt="preview" />`;
  };
  reader.readAsDataURL(file);
});

/* ---------- add gift ---------- */
document.getElementById("giftForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const price = Number(document.getElementById("price").value);
  const category = document.getElementById("category").value.trim() || "Gift";
  const description = document.getElementById("description").value.trim();
  const tags = [...document.querySelectorAll(".tag-cb:checked")].map((c) => c.value);

  if (!name || isNaN(price)) {
    showToast("Please add a name and price 🙏");
    return;
  }

  const fileInput = document.getElementById("image");
  const fileName = fileInput.files[0] ? fileInput.files[0].name : "";

  const gift = {
    id: "g" + Date.now(),
    name,
    price,
    category,
    description,
    // Use the base64 preview so it shows instantly. Also remember the suggested
    // file path for when the image is saved into images/ permanently.
    image: currentImageData || "images/placeholder.svg",
    imageFile: fileName ? "images/" + fileName : "",
    tags,
  };

  const list = getAdded();
  list.push(gift);
  saveAdded(list);

  e.target.reset();
  currentImageData = "";
  document.getElementById("previewBox").innerHTML = "<span>Image preview</span>";
  renderAdded();
  showToast("Gift added to your shop! 🎉");
});

/* ---------- render added list ---------- */
function renderAdded() {
  const list = getAdded();
  const wrap = document.getElementById("addedList");
  if (!list.length) {
    wrap.innerHTML = `<p class="hint">No gifts added yet. Fill the form to create your first one!</p>`;
    return;
  }
  wrap.innerHTML = list
    .map(
      (g, i) => `
      <div class="mini">
        <img src="${g.image || "images/placeholder.svg"}" alt="" onerror="this.src='images/placeholder.svg'" />
        <div class="info">
          <b>${escapeHtml(g.name)}</b>
          <small>${escapeHtml(g.category)} · ₹${Number(g.price).toLocaleString("en-IN")}</small>
        </div>
        <button class="del-btn" data-i="${i}">Remove</button>
      </div>`
    )
    .join("");

  wrap.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const arr = getAdded();
      arr.splice(Number(btn.dataset.i), 1);
      saveAdded(arr);
      renderAdded();
      showToast("Gift removed");
    });
  });
}

/* ---------- download combined gifts.json ---------- */
document.getElementById("downloadBtn").addEventListener("click", async () => {
  let base = { shop: {}, gifts: [] };
  try {
    const res = await fetch("data/gifts.json", { cache: "no-store" });
    base = await res.json();
  } catch {
    base.shop = {
      name: "Deshna's Delights",
      tagline: "Handpicked gifts, wrapped with love",
      owner: "Deshna",
      currency: "₹",
    };
  }

  // For the exported file, prefer the intended images/ path over the big base64 blob.
  const added = getAdded().map((g) => {
    const copy = { ...g };
    if (copy.imageFile) copy.image = copy.imageFile;
    delete copy.imageFile;
    return copy;
  });

  const out = { shop: base.shop, gifts: [...(base.gifts || []), ...added] };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gifts.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("gifts.json downloaded ⬇ Replace data/gifts.json with it.");
});

/* ---------- clear all ---------- */
document.getElementById("clearAllBtn").addEventListener("click", () => {
  if (confirm("Remove all gifts you added in this browser?")) {
    localStorage.removeItem(LS_KEY);
    renderAdded();
    showToast("Cleared your additions");
  }
});

/* ---------- toast ---------- */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- init ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
renderAdded();
