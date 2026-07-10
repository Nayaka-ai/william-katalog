// ============================================
// KONFIGURASI TOKO
// ============================================
const WA_NUMBER = "6285815381211";

// ============================================
// STATE
// ============================================
let allItems = [];
let filteredItems = [];
let activeChip = "";
let activeKategori = "";
let itemsByUid = {};
let currentOrderItem = null;
let selectedMethod = null; // "qris" atau "cash"
let currentPromo = { kode: "", persentase: 0 };

const PLATINUM_PROMO_LIMIT = 3;

const OPERATOR_LABEL = {
  SMARTFREN: "Smartfren",
  TRI: "Tri",
  XL: "XL Axiata",
  BYU: "by.U",
  INDOSAT: "Indosat Ooredoo Hutchison",
  AXIS: "AXIS",
  TELKOMSEL: "Telkomsel"
};

const PROVIDER_CHIPS = [
  { key: "", label: "Semua", icon: null },
  { key: "TELKOMSEL", label: "Telkomsel", icon: "telkomsel.png" },
  { key: "INDOSAT", label: "Indosat", icon: "indosat.png" },
  { key: "XL", label: "XL", icon: "xl.png" },
  { key: "TRI", label: "Tri", icon: "tri.png" },
  { key: "SMARTFREN", label: "Smartfren", icon: "smartfren.png" },
  { key: "AXIS", label: "AXIS", icon: "axis.png" },
  { key: "BYU", label: "by.U", icon: "byu.png" },
  { key: "__PULSA__", label: "Pulsa", icon: "pulsa.png" }
];

const ICON_MAP = {};
PROVIDER_CHIPS.forEach((c) => {
  if (c.key) ICON_MAP[c.key] = c.icon;
});

const OPERATOR_ORDER = {};
PROVIDER_CHIPS.forEach((c, idx) => {
  if (c.key) OPERATOR_ORDER[c.key] = idx;
});

// ============================================
// SESSION & PROMO USAGE
// ============================================
const SESSION_KEY = "wk_session";
const PROMO_USAGE_KEY = "wk_promo_usage";

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getPromoUsage() {
  try {
    const raw = localStorage.getItem(PROMO_USAGE_KEY);
    return raw ? JSON.parse(raw) : { kode: "", count: 0 };
  } catch (e) { return { kode: "", count: 0 }; }
}

function savePromoUsage(usage) {
  localStorage.setItem(PROMO_USAGE_KEY, JSON.stringify(usage));
}

function getPlatinumRemainingQuota() {
  const usage = getPromoUsage();
  if (usage.kode !== currentPromo.kode) return PLATINUM_PROMO_LIMIT;
  return Math.max(0, PLATINUM_PROMO_LIMIT - usage.count);
}

function incrementPlatinumUsage() {
  const usage = getPromoUsage();
  if (usage.kode !== currentPromo.kode) {
    savePromoUsage({ kode: currentPromo.kode, count: 1 });
  } else {
    savePromoUsage({ kode: currentPromo.kode, count: usage.count + 1 });
  }
}

// ============================================
// LOAD DATA
// ============================================
async function loadData() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("Gagal memuat data.json");
    const raw = await res.json();
    allItems = flattenData(raw);

    if (raw.promo_minggu_ini && raw.promo_minggu_ini.kode) {
      currentPromo = {
        kode: String(raw.promo_minggu_ini.kode).trim(),
        persentase: Number(raw.promo_minggu_ini.persentase) || 0
      };
    } else {
      currentPromo = { kode: "", persentase: 0 };
    }

    renderProviderRail();
    updateBanner();
    refreshKategoriOptions();
    applyFilters();
  } catch (err) {
    document.getElementById("catalogContainer").innerHTML =
      `<p style="text-align:center;color:#f08080;padding:30px;">
        Gagal memuat data produk (data.json). Pastikan file data.json ada di folder yang sama dengan index.html.
      </p>`;
    console.error(err);
  }
}

function normalizeOperatorKey(raw) {
  const upper = raw.toUpperCase().trim();
  if (upper === "THREE") return "TRI";
  if (upper === "BY U") return "BYU";
  return upper;
}

function operatorLabel(key) {
  return OPERATOR_LABEL[key] || key;
}

function flattenData(raw) {
  const items = [];
  const counters = {};
  let uidCounter = 0;
  itemsByUid = {};

  function nextNo(groupKey) {
    counters[groupKey] = (counters[groupKey] || 0) + 1;
    return counters[groupKey];
  }

  (raw.kuota || []).forEach((item) => {
    const opKey = normalizeOperatorKey(item.provider || "LAINNYA");
    const uid = "u" + (uidCounter++);
    const built = {
      uid,
      no: nextNo("KUOTA_" + opKey),
      jenis: "Kuota",
      operatorKey: opKey,
      operatorLabel: operatorLabel(opKey),
      kategori: item.kategori || "Lainnya",
      kuota: item.kuota || null,
      nama_varian: item.nama_varian,
      harga_jual: item.harga_jual,
      harga_jual_diskon: item.harga_jual_diskon,
      harga_setelah_diskon: item.harga_setelah_diskon,
      diskon: item.diskon,
      kode: item.kode || "",
      harga_modal: item.harga_modal || 0,
      markup: item.markup || 0
    };
    items.push(built);
    itemsByUid[uid] = built;
  });

  (raw.pulsa || []).forEach((item) => {
    const opKey = normalizeOperatorKey(item.provider || "LAINNYA");
    const uid = "u" + (uidCounter++);
    const built = {
      uid,
      no: nextNo("PULSA_" + opKey),
      jenis: "Pulsa",
      operatorKey: opKey,
      operatorLabel: operatorLabel(opKey),
      kategori: "Pulsa",
      kuota: null,
      nama_varian: item.nama_varian,
      harga_jual: item.harga_jual,
      harga_jual_diskon: item.harga_jual_diskon,
      harga_setelah_diskon: item.harga_setelah_diskon,
      diskon: item.diskon,
      kode: item.kode || "",
      harga_modal: item.harga_modal || 0,
      markup: item.markup || 0
    };
    items.push(built);
    itemsByUid[uid] = built;
  });

  return items;
}

// ============================================
// PROVIDER RAIL
// ============================================
function renderProviderRail() {
  const rail = document.getElementById("providerRail");
  rail.innerHTML = "";

  PROVIDER_CHIPS.forEach((chip) => {
    const el = document.createElement("div");
    el.className = "provider-chip" + (chip.key === activeChip ? " active" : "");
    el.dataset.key = chip.key;

    const iconWrap = document.createElement("div");
    iconWrap.className = "chip-icon-wrap";

    if (chip.icon) {
      const img = document.createElement("img");
      img.src = `assets/icons/${chip.icon}`;
      img.alt = chip.label;
      img.onerror = function () {
        iconWrap.innerHTML = `<span class="chip-icon-fallback">${chip.label.charAt(0)}</span>`;
      };
      iconWrap.appendChild(img);
    } else {
      iconWrap.innerHTML = `<span class="chip-icon-fallback">★</span>`;
    }

    const label = document.createElement("div");
    label.className = "chip-label";
    label.textContent = chip.label;

    el.appendChild(iconWrap);
    el.appendChild(label);

    el.addEventListener("click", () => {
      activeChip = chip.key;
      activeKategori = "";
      renderProviderRail();
      updateBanner();
      refreshKategoriOptions();
      applyFilters();
    });

    rail.appendChild(el);
  });
}

// ============================================
// BANNER & KATEGORI
// ============================================
function updateBanner() {
  const titleEl = document.getElementById("bannerTitle");
  let label;
  if (activeChip === "") label = "Semua Operator";
  else if (activeChip === "__PULSA__") label = "Pulsa All Operator";
  else label = operatorLabel(activeChip);
  titleEl.textContent = `Katalog Harga — ${label}`;
}

function refreshKategoriOptions() {
  const kategoriSelect = document.getElementById("kategoriFilter");
  const relevant = allItems.filter((i) => matchesChip(i));
  const uniqueKategori = [...new Set(relevant.map((i) => i.kategori))]
    .filter((k) => k !== "Pulsa")
    .sort(compareKategori);

  kategoriSelect.innerHTML = '<option value="">Semua Masa Aktif</option>';
  uniqueKategori.forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    kategoriSelect.appendChild(opt);
  });

  kategoriSelect.style.display = uniqueKategori.length ? "" : "none";
}

function matchesChip(item) {
  if (activeChip === "") return true;
  if (activeChip === "__PULSA__") return item.jenis === "Pulsa";
  return item.operatorKey === activeChip;
}

const KATEGORI_PREFIX_PRIORITY = ["VOUCHER", "BOOSTER", "TOPPING", "MASA AKTIF", "AON", "LAINNYA"];

function parseKategoriSortKey(kategori) {
  const upper = (kategori || "").trim().toUpperCase();
  let m = upper.match(/^(\d+)\s*(HARI|JAM)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const hours = m[2] === "JAM" ? n : n * 24;
    return [0, hours, upper];
  }
  for (let i = 0; i < KATEGORI_PREFIX_PRIORITY.length; i++) {
    const prefix = KATEGORI_PREFIX_PRIORITY[i];
    if (upper === prefix || upper.startsWith(prefix + " ")) {
      const rest = upper.slice(prefix.length).trim();
      const rm = rest.match(/^(\d+)\s*(HARI|JAM)$/);
      if (rm) {
        const n = parseInt(rm[1], 10);
        const hours = rm[2] === "JAM" ? n : n * 24;
        return [1, i, hours, upper];
      }
      return [1, i, Infinity, upper];
    }
  }
  return [2, 0, 0, upper];
}

function compareKategori(a, b) {
  const ka = parseKategoriSortKey(a);
  const kb = parseKategoriSortKey(b);
  const len = Math.max(ka.length, kb.length);
  for (let i = 0; i < len; i++) {
    const va = ka[i] === undefined ? 0 : ka[i];
    const vb = kb[i] === undefined ? 0 : kb[i];
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

// ============================================
// SEARCH & FILTER
// ============================================
function applyFilters() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  activeKategori = document.getElementById("kategoriFilter").value;

  filteredItems = allItems.filter((item) => {
    if (!matchesChip(item)) return false;
    if (activeKategori && item.kategori !== activeKategori) return false;
    if (query) {
      const haystack = (
        item.nama_varian + " " +
        item.operatorLabel + " " +
        item.kategori + " " +
        item.kode + " " +
        item.harga_jual_diskon
      ).toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  render();
}

// ============================================
// RENDER PRODUK
// ============================================
function formatRupiah(angka) {
  return "Rp " + angka.toLocaleString("id-ID");
}

function calcDiskonNominal(item) {
  return Math.round(item.harga_jual_diskon * (currentPromo.persentase / 100));
}

function calcHargaPromo(item) {
  return item.harga_jual_diskon - calcDiskonNominal(item);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function render() {
  const container = document.getElementById("catalogContainer");
  const emptyState = document.getElementById("emptyState");
  const resultCount = document.getElementById("resultCount");

  const baseCount = allItems.filter((i) => matchesChip(i)).length;
  resultCount.textContent = `Menampilkan ${filteredItems.length} dari ${baseCount} varian`;

  if (filteredItems.length === 0) {
    container.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  const grouped = {};
  filteredItems.forEach((item) => {
    if (!grouped[item.operatorKey]) {
      grouped[item.operatorKey] = { label: item.operatorLabel, kategoris: {} };
    }
    const opGroup = grouped[item.operatorKey];
    if (!opGroup.kategoris[item.kategori]) opGroup.kategoris[item.kategori] = [];
    opGroup.kategoris[item.kategori].push(item);
  });

  let html = "";
  Object.keys(grouped)
    .sort((a, b) => (OPERATOR_ORDER[a] ?? 999) - (OPERATOR_ORDER[b] ?? 999))
    .forEach((opKey) => {
      const opGroup = grouped[opKey];
      html += `<div class="operator-group">`;
      html += `<h2 class="operator-title">${escapeHtml(opGroup.label)}</h2>`;

      Object.keys(opGroup.kategoris).sort(compareKategori).forEach((kategori) => {
        html += `<p class="kategori-title">${escapeHtml(kategori)}</p>`;

        opGroup.kategoris[kategori].forEach((item) => {
          const hasKuota = !!item.kuota && item.kuota.trim() !== "-";
          const headline = hasKuota ? item.kuota : item.nama_varian;
          const showDesc = hasKuota;
          const iconFile = ICON_MAP[item.operatorKey];

          html += `
            <div class="product-card">
              <div class="card-top-row">
                <span class="kategori-badge">${escapeHtml(item.kategori)}</span>
                <div class="product-meta">
                  <span class="product-no">No.${escapeHtml(item.no)}</span>
                  ${iconFile ? `<img class="product-provider-icon" src="assets/icons/${iconFile}" alt="${escapeHtml(item.operatorLabel)}" onerror="this.remove();">` : ""}
                </div>
              </div>
              <div class="product-headline">${escapeHtml(headline)}</div>
              ${showDesc ? `<div class="product-desc">${escapeHtml(item.nama_varian)}</div>` : ""}
              <div class="product-price">${formatRupiah(item.harga_jual_diskon)}</div>
              <button type="button" class="buy-btn" data-uid="${item.uid}">Beli Sekarang</button>
            </div>
          `;
        });
      });

      html += `</div>`;
    });

  container.innerHTML = html;
}

// ============================================
// EVENT LISTENERS
// ============================================
document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("kategoriFilter").addEventListener("change", applyFilters);

document.getElementById("introClose").addEventListener("click", () => {
  document.getElementById("introBox").style.display = "none";
});

document.getElementById("catalogContainer").addEventListener("click", (e) => {
  const btn = e.target.closest(".buy-btn");
  if (!btn) return;
  const item = itemsByUid[btn.dataset.uid];
  if (item) openOrderModal(item);
});

// ============================================
// CEK STATUS PESANAN
// ============================================
const PHONE_PATTERN = /^[0-9]+$/;

document.getElementById("checkStatusBtn").addEventListener("click", checkStatus);
document.getElementById("checkStatusInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkStatus();
});

document.getElementById("checkStatusInput").addEventListener("input", (e) => {
  const val = e.target.value;
  const errorEl = document.getElementById("checkStatusError");
  if (val.trim() === "") {
    errorEl.hidden = true;
    return;
  }
  if (!PHONE_PATTERN.test(val)) {
    errorEl.hidden = false;
  } else {
    errorEl.hidden = true;
  }
});

async function checkStatus() {
  const input = document.getElementById("checkStatusInput");
  const resultEl = document.getElementById("checkStatusResult");
  const errorEl = document.getElementById("checkStatusError");
  const btn = document.getElementById("checkStatusBtn");

  const nomor = input.value.trim();

  if (!nomor) {
    errorEl.textContent = "Masukkan nomor HP terlebih dahulu.";
    errorEl.hidden = false;
    return;
  }

  if (!PHONE_PATTERN.test(nomor)) {
    errorEl.textContent = "Nomor HP hanya boleh berisi angka (tanpa spasi atau huruf).";
    errorEl.hidden = false;
    return;
  }

  errorEl.hidden = true;
  btn.disabled = true;
  btn.textContent = "Memeriksa...";

  try {
    const res = await fetch(`/api/check-order?nomor=${encodeURIComponent(nomor)}`);
    const data = await res.json();

    if (data.ditemukan) {
      resultEl.hidden = false;
      resultEl.innerHTML = `
        <div class="status-card">
          <div class="status-header">
            <span class="status-badge ${data.status === 'Selesai' ? 'status-selesai' : data.status === 'Diproses' ? 'status-diproses' : 'status-menunggu'}">${data.status}</span>
            <span class="status-kode">${data.kode_pesanan}</span>
          </div>
          <div class="status-body">
            <p><strong>Produk:</strong> ${escapeHtml(data.nama_produk)}</p>
            <p><strong>Harga:</strong> ${formatRupiah(data.harga_final)}</p>
            <p><strong>Metode:</strong> ${data.metode === 'qris' ? 'QRIS' : 'Cash'}</p>
          </div>
        </div>
      `;
    } else {
      resultEl.hidden = false;
      resultEl.innerHTML = `
        <div class="status-card status-not-found">
          <p>😕 Tidak ditemukan pesanan dengan nomor HP <strong>${escapeHtml(nomor)}</strong>.</p>
          <p class="status-hint">Pastikan nomor HP yang dimasukkan sudah benar (contoh: 081234567890).</p>
        </div>
      `;
    }
  } catch (err) {
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <div class="status-card status-error">
        <p>❌ Gagal memeriksa status. Coba lagi nanti.</p>
      </div>
    `;
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Cek Status";
  }
}

// ============================================
// MODAL ORDER
// ============================================
function openOrderModal(item) {
  currentOrderItem = item;
  selectedMethod = null;
  document.getElementById("modalProductSummary").textContent = item.nama_varian;

  const input = document.getElementById("modalPhoneInput");
  input.value = "";
  document.getElementById("modalInputError").hidden = true;
  document.getElementById("modalOrderBtn").disabled = true;
  document.getElementById("modalMethodError").hidden = true;

  // Reset metode
  document.querySelectorAll(".payment-method-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById("qrisArea").hidden = true;
  document.getElementById("cashArea").hidden = true;

  const promoInput = document.getElementById("modalPromoInput");
  promoInput.value = "";
  document.getElementById("modalPromoFeedback").hidden = true;

  document.getElementById("memberLoginBox").hidden = true;
  document.getElementById("memberUsernameInput").value = "";
  document.getElementById("memberPinInput").value = "";
  document.getElementById("memberLoginError").hidden = true;

  refreshMemberUI();
  updatePriceBox(false);

  document.getElementById("orderModalOverlay").hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => input.focus(), 50);
}

function closeOrderModal() {
  document.getElementById("orderModalOverlay").hidden = true;
  document.body.style.overflow = "";
  currentOrderItem = null;
  selectedMethod = null;
}

document.getElementById("modalCloseBtn").addEventListener("click", closeOrderModal);
document.getElementById("modalCancelBtn").addEventListener("click", closeOrderModal);

document.getElementById("orderModalOverlay").addEventListener("click", (e) => {
  if (e.target.id === "orderModalOverlay") closeOrderModal();
});

// ============================================
// PILIHAN METODE PEMBAYARAN
// ============================================
document.querySelectorAll(".payment-method-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".payment-method-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMethod = btn.dataset.method;
    document.getElementById("modalMethodError").hidden = true;

    // Tampilkan area sesuai metode
    if (selectedMethod === "qris") {
      document.getElementById("qrisArea").hidden = false;
      document.getElementById("cashArea").hidden = true;
    } else if (selectedMethod === "cash") {
      document.getElementById("qrisArea").hidden = true;
      document.getElementById("cashArea").hidden = false;
    }

    validateOrderForm();
  });
});

// ============================================
// VALIDASI FORM ORDER
// ============================================
function validateOrderForm() {
  const phone = document.getElementById("modalPhoneInput").value.trim();
  const phoneValid = PHONE_PATTERN.test(phone);
  const methodValid = selectedMethod !== null;
  const orderBtn = document.getElementById("modalOrderBtn");

  if (phoneValid && methodValid) {
    orderBtn.disabled = false;
  } else {
    orderBtn.disabled = true;
  }
}

document.getElementById("modalPhoneInput").addEventListener("input", (e) => {
  const val = e.target.value;
  const errorEl = document.getElementById("modalInputError");
  const orderBtn = document.getElementById("modalOrderBtn");

  if (val.trim() === "") {
    errorEl.hidden = true;
    orderBtn.disabled = true;
    return;
  }

  if (!PHONE_PATTERN.test(val)) {
    errorEl.hidden = false;
    orderBtn.disabled = true;
    return;
  }

  errorEl.hidden = true;
  validateOrderForm();
});

// ============================================
// MEMBER LOGIN
// ============================================
document.getElementById("memberLoginToggle").addEventListener("click", () => {
  const box = document.getElementById("memberLoginBox");
  box.hidden = !box.hidden;
  if (!box.hidden) {
    setTimeout(() => document.getElementById("memberUsernameInput").focus(), 50);
  }
});

document.getElementById("memberLoginSubmit").addEventListener("click", async () => {
  const username = document.getElementById("memberUsernameInput").value.trim();
  const pin = document.getElementById("memberPinInput").value.trim();
  const errorEl = document.getElementById("memberLoginError");
  const submitBtn = document.getElementById("memberLoginSubmit");

  errorEl.hidden = true;

  if (!username || !pin) {
    errorEl.textContent = "Isi username dan PIN terlebih dahulu";
    errorEl.hidden = false;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Memproses...";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, pin })
    });
    const data = await res.json();

    if (data.success) {
      setSession({ username: data.username, tier: data.tier });
      document.getElementById("memberLoginBox").hidden = true;
      refreshMemberUI();
    } else {
      errorEl.textContent = data.message || "Username atau PIN salah";
      errorEl.hidden = false;
    }
  } catch (err) {
    errorEl.textContent = "Gagal menghubungi server. Coba lagi.";
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Login";
  }
});

document.getElementById("memberLogoutBtn").addEventListener("click", () => {
  clearSession();
  document.getElementById("modalPromoInput").value = "";
  document.getElementById("modalPromoFeedback").hidden = true;
  refreshMemberUI();
  updatePriceBox(false);
});

function refreshMemberUI() {
  const session = getSession();
  const loginToggle = document.getElementById("memberLoginToggle");
  const sessionBadge = document.getElementById("memberSessionBadge");
  const promoSection = document.getElementById("promoSection");
  const promoLockedNote = document.getElementById("promoLockedNote");
  const promoQuotaNote = document.getElementById("promoQuotaNote");

  if (!session) {
    loginToggle.hidden = false;
    sessionBadge.hidden = true;
    promoSection.hidden = true;
    promoLockedNote.hidden = true;
    return;
  }

  loginToggle.hidden = true;
  sessionBadge.hidden = false;

  const tierPill = document.getElementById("memberTierPill");
  tierPill.textContent = session.tier === "reseller" ? "RESELLER" : "PLATINUM";
  tierPill.className = "tier-pill " + (session.tier === "reseller" ? "tier-reseller" : "tier-platinum");
  document.getElementById("memberUsernameLabel").textContent = session.username;

  if (!currentPromo.kode) {
    promoSection.hidden = true;
    promoLockedNote.hidden = false;
    promoLockedNote.textContent = "Belum ada kode promo aktif minggu ini.";
    return;
  }

  if (session.tier === "reseller") {
    promoSection.hidden = false;
    promoLockedNote.hidden = true;
    promoQuotaNote.hidden = false;
    promoQuotaNote.textContent = "Akun Reseller: pemakaian promo tanpa batas 🎉";
  } else {
    const remaining = getPlatinumRemainingQuota();
    if (remaining <= 0) {
      promoSection.hidden = true;
      promoLockedNote.hidden = false;
      promoLockedNote.textContent = `Kuota promo minggu ini sudah habis (${PLATINUM_PROMO_LIMIT}/${PLATINUM_PROMO_LIMIT} dipakai). Kuota akan reset saat kode promo minggu depan berganti.`;
    } else {
      promoSection.hidden = false;
      promoLockedNote.hidden = true;
      promoQuotaNote.hidden = false;
      promoQuotaNote.textContent = `Sisa pemakaian promo minggu ini: ${remaining}/${PLATINUM_PROMO_LIMIT}`;
    }
  }
}

// ============================================
// KODE PROMO
// ============================================
function isPromoValid(value) {
  const session = getSession();
  if (!session) return false;
  if (!currentPromo.kode) return false;
  if (session.tier === "platinum" && getPlatinumRemainingQuota() <= 0) return false;
  return value.trim() !== "" && value.trim().toUpperCase() === currentPromo.kode.toUpperCase();
}

function updatePriceBox(promoValid) {
  const item = currentOrderItem;
  if (!item) return;

  const originalEl = document.getElementById("modalPriceOriginal");
  const finalEl = document.getElementById("modalPriceFinal");
  const savingsEl = document.getElementById("modalPriceSavings");

  if (promoValid) {
    const diskon = calcDiskonNominal(item);
    const hargaFinal = calcHargaPromo(item);
    originalEl.hidden = false;
    originalEl.textContent = formatRupiah(item.harga_jual_diskon);
    finalEl.textContent = formatRupiah(hargaFinal);
    savingsEl.hidden = false;
    savingsEl.textContent = `Hemat ${formatRupiah(diskon)}`;
  } else {
    originalEl.hidden = true;
    finalEl.textContent = formatRupiah(item.harga_jual_diskon);
    savingsEl.hidden = true;
  }
}

document.getElementById("modalPromoInput").addEventListener("input", (e) => {
  const val = e.target.value;
  const feedback = document.getElementById("modalPromoFeedback");

  if (val.trim() === "") {
    feedback.hidden = true;
    updatePriceBox(false);
    return;
  }

  const valid = isPromoValid(val);
  feedback.hidden = false;
  feedback.className = "modal-promo-feedback " + (valid ? "valid" : "invalid");
  feedback.textContent = valid ? "Kode promo diterapkan 🎉" : "Kode promo tidak dikenali";
  updatePriceBox(valid);
});

// ============================================
// ORDER VIA WHATSAPP + SIMPAN KE GOOGLE SHEETS
// ============================================
let pendingOrder = null;

document.getElementById("modalOrderBtn").addEventListener("click", async () => {
  if (!currentOrderItem) return;
  const nomor = document.getElementById("modalPhoneInput").value.trim();
  if (!PHONE_PATTERN.test(nomor)) return;

  if (!selectedMethod) {
    document.getElementById("modalMethodError").hidden = false;
    return;
  }

  const promoValid = isPromoValid(document.getElementById("modalPromoInput").value);
  const session = getSession();

  // Jika pakai promo, tampilkan konfirmasi dulu
  if (promoValid && session) {
    pendingOrder = { item: currentOrderItem, nomor, promoValid, session, metode: selectedMethod };
    openConfirmPromoModal(pendingOrder);
    return;
  }

  // Tanpa promo, langsung proses order
  await processOrder(currentOrderItem, nomor, selectedMethod, false);
});

async function processOrder(item, nomor, metode, promoValid) {
  const session = getSession();
  const hargaFinal = promoValid && session ? calcHargaPromo(item) : item.harga_jual_diskon;

  // Tampilkan loading di tombol
  const orderBtn = document.getElementById("modalOrderBtn");
  orderBtn.disabled = true;
  orderBtn.textContent = "Memproses...";

  try {
    // Kirim ke API order
    const payload = {
      produk: item.nama_varian,
      nomor: nomor,
      metode: metode,
      kode_promo: promoValid ? currentPromo.kode : "",
      username: session ? session.username : "",
      harga_final: hargaFinal,
      kode_produk: item.kode || "",
      timestamp: new Date().toISOString()
    };

    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "Gagal menyimpan pesanan");
    }

    // Simpan pemakaian promo (jika ada)
    if (promoValid && session && session.tier === "platinum") {
      incrementPlatinumUsage();
    }

    // Tutup modal order dan tampilkan kode pesanan
    closeOrderModal();

    // Tampilkan kode pesanan di alert atau notifikasi (bisa diperbaiki dengan modal sukses)
    const metodeLabel = metode === "qris" ? "QRIS" : "Cash";
    alert(
      `✅ Pesanan Berhasil!\n\n` +
      `Kode Pesanan: ${data.kode_pesanan}\n` +
      `Produk: ${item.nama_varian}\n` +
      `Total: ${formatRupiah(hargaFinal)}\n` +
      `Metode: ${metodeLabel}\n\n` +
      `📌 Simpan Kode Pesanan ini untuk referensi.\n` +
      `Admin akan menghubungi Anda via WhatsApp dalam ±1-3 jam.`
    );

    // Redirect ke WhatsApp setelah order sukses
    const link = waLink(item, nomor, promoValid);
    showRedirectOverlay(link);

  } catch (err) {
    alert("❌ Gagal memproses pesanan: " + err.message);
    console.error(err);
  } finally {
    orderBtn.disabled = false;
    orderBtn.textContent = "Order via WhatsApp";
  }
}

function waLink(item, nomor, promoValid) {
  const nomorText = nomor ? ` Nomor tujuan: ${nomor}.` : "";
  const session = getSession();

  let hargaText;
  if (promoValid && session) {
    const diskon = calcDiskonNominal(item);
    const hargaFinal = calcHargaPromo(item);
    const tierLabel = session.tier === "reseller" ? "Reseller" : "Platinum";
    hargaText = ` Total: ${formatRupiah(hargaFinal)} (Member ${tierLabel}, kode promo ${currentPromo.kode} - hemat ${formatRupiah(diskon)}).`;
  } else {
    hargaText = ` Total: ${formatRupiah(item.harga_jual_diskon)}.`;
  }

  const pesan = `Halo, saya ingin membeli paket ${item.nama_varian} No ${item.no} (${item.operatorLabel}).${hargaText}${nomorText}`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(pesan)}`;
}

// ============================================
// MODAL KONFIRMASI PROMO
// ============================================
function openConfirmPromoModal(order) {
  const { item, nomor, session } = order;
  const diskon = calcDiskonNominal(item);
  const hargaFinal = calcHargaPromo(item);

  document.getElementById("confirmProdukName").textContent = item.nama_varian;
  document.getElementById("confirmNomor").textContent = nomor;
  document.getElementById("confirmKodePromo").textContent = currentPromo.kode;
  document.getElementById("confirmHargaFinal").textContent =
    `${formatRupiah(hargaFinal)} (hemat ${formatRupiah(diskon)})`;

  const quotaWarning = document.getElementById("confirmQuotaWarning");
  const resellerNote = document.getElementById("confirmResellerNote");

  if (session.tier === "platinum") {
    const remaining = getPlatinumRemainingQuota();
    const remainingAfter = Math.max(0, remaining - 1);
    quotaWarning.hidden = false;
    resellerNote.hidden = true;
    quotaWarning.innerHTML =
      `⚠️ Jatah pemakaian promo kamu akan <strong>berkurang jadi ${remainingAfter}/${PLATINUM_PROMO_LIMIT}</strong> setelah ini. ` +
      `Pastikan kamu benar-benar lanjut checkout via WhatsApp ya, biar diskonnya nggak kebuang percuma 🙏`;
  } else {
    quotaWarning.hidden = true;
    resellerNote.hidden = false;
  }

  document.getElementById("confirmPromoOverlay").hidden = false;
}

function closeConfirmPromoModal() {
  document.getElementById("confirmPromoOverlay").hidden = true;
}

document.getElementById("confirmPromoBack").addEventListener("click", () => {
  closeConfirmPromoModal();
  pendingOrder = null;
});

document.getElementById("confirmPromoProceed").addEventListener("click", async () => {
  if (!pendingOrder) return;
  const { item, nomor, promoValid, session, metode } = pendingOrder;

  closeConfirmPromoModal();
  pendingOrder = null;

  await processOrder(item, nomor, metode, promoValid);
});

document.getElementById("confirmPromoOverlay").addEventListener("click", (e) => {
  if (e.target.id === "confirmPromoOverlay") {
    closeConfirmPromoModal();
    pendingOrder = null;
  }
});

// ============================================
// REDIRECT OVERLAY
// ============================================
function showRedirectOverlay(link) {
  const overlay = document.getElementById("redirectOverlay");
  overlay.hidden = false;
  setTimeout(() => {
    window.open(link, "_blank");
    overlay.hidden = true;
  }, 1600);
}

// ============================================
// START
// ============================================
loadData();