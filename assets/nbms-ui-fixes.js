(function () {
  const BASE = "/majorstructures/";
  const state = {
    critical: null,
    bridges: null,
    culverts: null,
    gallery: null,
    works: null,
    polishTimer: null,
  };
  const REVIEW_ONLY_IDS = new Set(["B005","B017","B018","B045","B046","B048","B063","B064","B065","B066","B083","B084","B086","B100","B120","B132","B133","B157","B161","B162","B171","B184","B186","B191","B193","B194","B204","B219","B221","B224","B226","B242","B243","B244","B245","B247","B250","B254","B257","B262","B273","B280","B304","B305","B306","B307","B309","B310","B311","B312","B322","B326","B329","B341","B342","B343","B350","B351","B353","B356","B358","B371","B374","B375","B376","B377","B382","B385","B386","B387","B388","B389","B391","B398","B400","B403","B404","B405","B409","B410","B412","B416","B417","B418","B419","B421","B422","B462","B545","B608","B631","B633","B636","B640","B641","B642","B643","B721","B722","B723","B726","B727","B738","B752","B762","B765","B768","B862","B871","B880","B886","B888","B889"]);

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function asset(path) {
    return BASE + String(path || "").replace(/^\/+/, "");
  }

  async function json(path) {
    const response = await fetch(asset(path), { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`${path}: ${response.status}`);
    }
    return response.json();
  }

  function injectStyle() {
    if ($("#nbms-ui-fixes-style")) return;
    const style = document.createElement("style");
    style.id = "nbms-ui-fixes-style";
    style.textContent = `
      .page-content.nbms-critical-route-overridden > :not(#nbms-critical-overlay) {
        display: none !important;
      }
      #nbms-critical-overlay {
        display: block;
        width: 100%;
        min-height: 100%;
      }
      .nbms-route-rescue {
        min-height: 100%;
        padding: 24px;
        color: var(--text-primary, #f8fafc);
        background:
          radial-gradient(circle at 10% 0%, rgba(34, 211, 238, .18), transparent 34%),
          radial-gradient(circle at 90% 10%, rgba(52, 211, 153, .13), transparent 30%),
          linear-gradient(135deg, rgba(2, 8, 23, .92), rgba(8, 18, 38, .92));
        border: 1px solid rgba(94, 234, 212, .22);
        border-radius: 10px;
        overflow: auto;
      }
      .nbms-rescue-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(125, 211, 252, .22);
      }
      .nbms-rescue-kicker {
        margin: 0 0 8px;
        color: #67e8f9;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      .nbms-rescue-title {
        margin: 0;
        font-size: clamp(20px, 2vw, 32px);
        line-height: 1.05;
        letter-spacing: 0;
      }
      .nbms-rescue-copy {
        max-width: 760px;
        margin: 10px 0 0;
        color: #a9bed4;
        line-height: 1.55;
      }
      .nbms-rescue-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .nbms-rescue-input,
      .nbms-rescue-select {
        height: 40px;
        border: 1px solid rgba(125, 211, 252, .28);
        border-radius: 8px;
        background: rgba(2, 6, 23, .72);
        color: #e8f7ff;
        padding: 0 12px;
        outline: none;
      }
      .nbms-rescue-input {
        width: min(360px, 42vw);
      }
      .nbms-rescue-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(130px, 1fr));
        gap: 12px;
        margin: 18px 0;
      }
      .nbms-rescue-stat {
        min-width: 0;
        border: 1px solid rgba(125, 211, 252, .2);
        border-radius: 8px;
        background: rgba(8, 20, 38, .72);
        padding: 14px;
      }
      .nbms-rescue-stat span {
        display: block;
        color: #7dd3fc;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .1em;
        text-transform: uppercase;
      }
      .nbms-rescue-stat strong {
        display: block;
        margin-top: 8px;
        color: #f8fafc;
        font-size: 24px;
        line-height: 1;
      }
      .nbms-critical-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
      .nbms-critical-card {
        min-width: 0;
        overflow: hidden;
        border: 1px solid rgba(248, 113, 113, .34);
        border-radius: 8px;
        background: rgba(4, 12, 26, .92);
        box-shadow: 0 18px 40px rgba(0, 0, 0, .22);
        transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
      }
      .nbms-critical-card:hover {
        transform: translateY(-2px);
        border-color: rgba(94, 234, 212, .55);
        box-shadow: 0 20px 50px rgba(20, 184, 166, .15);
      }
      .nbms-critical-photo {
        height: 162px;
        background: linear-gradient(135deg, rgba(15, 23, 42, .95), rgba(30, 41, 59, .75));
        position: relative;
        display: grid;
        place-items: center;
        color: #64748b;
      }
      .nbms-critical-photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .nbms-critical-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        border-radius: 7px;
        background: #ff4545;
        color: #fff;
        padding: 6px 8px;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .nbms-critical-badge.nbms-badge-poor,
      .nbms-polished-badge.nbms-badge-poor {
        background: linear-gradient(135deg, #ffd23f, #ff8a3d) !important;
        color: #150d02 !important;
      }
      .nbms-critical-badge.nbms-badge-review,
      .nbms-polished-badge.nbms-badge-review {
        background: linear-gradient(135deg, #67e8f9, #a78bfa) !important;
        color: #020617 !important;
      }
      .nbms-polished-badge {
        border-radius: 7px !important;
        padding: 6px 8px !important;
        font-size: 10px !important;
        font-weight: 900 !important;
        letter-spacing: .02em !important;
        text-transform: uppercase !important;
      }
      .nbms-stale-priority-card {
        border-color: rgba(103, 232, 249, .45) !important;
        box-shadow: 0 0 0 1px rgba(103, 232, 249, .16), 0 16px 44px rgba(103, 232, 249, .08) !important;
      }
      .nbms-review-condition-card {
        border-color: rgba(103, 232, 249, .45) !important;
        box-shadow: 0 0 0 1px rgba(103, 232, 249, .12), 0 14px 34px rgba(103, 232, 249, .08) !important;
      }
      .slp-condition-badge.nbms-badge-review,
      .map-detail-pane .nbms-badge-review,
      .bridge-detail-card .nbms-badge-review {
        background: linear-gradient(135deg, #67e8f9, #a78bfa) !important;
        color: #020617 !important;
      }
      .nbms-critical-body {
        padding: 16px;
      }
      .nbms-critical-body h3 {
        margin: 0 0 10px;
        font-size: 16px;
        line-height: 1.25;
      }
      .nbms-critical-meta {
        display: grid;
        gap: 7px;
        color: #9fb2ca;
        font-size: 12px;
        line-height: 1.35;
      }
      .nbms-critical-comment {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(148, 163, 184, .18);
        color: #c8d7e8;
        font-size: 12px;
        line-height: 1.45;
      }
      .nbms-img-missing {
        opacity: 0 !important;
      }
      .nbms-img-placeholder {
        display: grid;
        place-items: center;
        min-height: 54px;
        width: 100%;
        padding: 8px;
        border: 1px solid rgba(255, 210, 63, .32);
        border-radius: 8px;
        background:
          linear-gradient(135deg, rgba(255, 210, 63, .12), rgba(3, 8, 18, .86) 58%, rgba(0, 245, 255, .1)),
          rgba(3, 8, 18, .88);
        color: #ffd23f;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .08em;
        text-align: center;
        text-transform: uppercase;
      }
      @media (max-width: 760px) {
        .nbms-route-rescue {
          padding: 16px;
          border-radius: 0;
        }
        .nbms-rescue-head {
          display: block;
        }
        .nbms-rescue-actions {
          margin-top: 16px;
          justify-content: flex-start;
        }
        .nbms-rescue-input,
        .nbms-rescue-select {
          width: 100%;
        }
        .nbms-rescue-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeThumbName(fileName) {
    const name = String(fileName || "").split("/").pop();
    if (!name) return "";
    return name.replace(/(\.jpe?g)+$/i, ".jpg").replace(/\.[^.]+$/i, ".jpg");
  }

  function imageCandidates(currentSrc) {
    let url;
    try {
      url = new URL(currentSrc, location.href);
    } catch {
      return [];
    }
    if (!url.pathname.includes("/gallery/")) return [];
    const fileName = decodeURIComponent(url.pathname.split("/").pop() || "");
    const thumbName = normalizeThumbName(fileName);
    const candidates = [];
    if (thumbName) candidates.push(asset(`gallery/thumbnails/${thumbName}`));
    if (fileName) candidates.push(asset(`gallery/images/${fileName}`));
    if (fileName) candidates.push(asset(`gallery/images/${fileName.replace(/(\.jpe?g)+$/i, ".JPG")}`));
    return candidates.filter((candidate, index, list) => candidate && candidate !== url.href && list.indexOf(candidate) === index);
  }

  function replaceMissingImage(img) {
    if (!img || img.dataset.nbmsPlaceholderApplied === "1") return;
    img.dataset.nbmsPlaceholderApplied = "1";
    const context = [
      img.getAttribute("data-structure-id"),
      img.getAttribute("alt"),
      img.getAttribute("title"),
      img.currentSrc,
      img.src,
      img.closest("article, li, tr, button, .leaflet-popup-content")?.textContent,
    ].join(" ");
    const match = String(context || "").toUpperCase().match(/\b[BCM]\d{3,4}\b/);
    const placeholder = document.createElement("div");
    placeholder.className = "nbms-img-placeholder nbms-missing-photo";
    placeholder.textContent = match ? `${match[0]} photo unavailable` : "Photo unavailable";
    img.replaceWith(placeholder);
  }

  function installImageFallback() {
    document.addEventListener("error", (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const tried = Number(img.dataset.nbmsFallbackIndex || "0");
      const candidates = imageCandidates(img.currentSrc || img.src);
      if (tried < candidates.length) {
        img.dataset.nbmsFallbackIndex = String(tried + 1);
        img.src = candidates[tried];
        return;
      }
      img.classList.add("nbms-img-missing");
      img.alt = img.alt || "Photo unavailable";
      replaceMissingImage(img);
    }, true);
  }

  function activeTabLabel() {
    return $(".context-subnav-tab.active")?.innerText?.trim() || "";
  }

  function contentIsEmpty() {
    const content = $(".page-content");
    return content && !content.innerText.trim() && content.children.length === 0;
  }

  function galleryMap(items) {
    const map = new Map();
    (items || []).forEach((item) => {
      const id = item.structure_id;
      const file = item.file_name || item.filename;
      if (!id || !file || item.duplicate_of || item.web_available === false || map.has(id)) return;
      const url = item.thumbnail_available === true && item.thumbnail_path
        ? asset(item.thumbnail_path)
        : item.full_available === true && item.path
          ? asset(item.path)
          : "";
      if (url) map.set(id, url);
    });
    return map;
  }

  function ratingClass(value) {
    const text = String(value || "No Data");
    if (/^no data$|unknown|unrated|pending/i.test(text)) return "No Data";
    if (/critical|beyond|very poor/i.test(text)) return "Critical";
    if (/poor/i.test(text)) return "Poor";
    return text;
  }

  function structureIdFromText(value) {
    const match = String(value || "").toUpperCase().match(/(?:^|[^A-Z0-9])([BCM]\d{3,4})(?!\d)/);
    return match ? match[1] : "";
  }

  function priorityRows() {
    return Promise.resolve(state.critical || json("data/critical_structures.json").then((rows) => {
      state.critical = Array.isArray(rows) ? rows : [];
      return state.critical;
    })).then((rows) => Array.isArray(rows) ? rows : []);
  }

  async function conditionRows() {
    if (state.bridges && state.culverts) return [...state.bridges, ...state.culverts];
    const [bridges, culverts] = await Promise.all([
      state.bridges || json("data/bridges.json"),
      state.culverts || json("data/culverts.json"),
    ]);
    state.bridges = Array.isArray(bridges) ? bridges : [];
    state.culverts = Array.isArray(culverts) ? culverts : [];
    return [...state.bridges, ...state.culverts];
  }

  function rowStructureId(row) {
    return String(row?.BridgeNumber || row?.bridge_no || row?.new_bridge_no || row?.CulvertNumber || row?.culvert_no || row?.["Culvert No"] || "").toUpperCase();
  }

  function reviewOnlyIds(rows) {
    const ids = new Set(REVIEW_ONLY_IDS);
    (rows || []).filter((row) => {
      const eligibility = String(row?.PriorityEligibility || "").toLowerCase();
      const confidence = String(row?.ConditionConfidence || row?.condition_confidence || "").toLowerCase();
      return eligibility === "review-only-condition" || confidence === "review" || row?.ConditionReviewRequired === true || row?.condition_transfer_allowed === false;
    }).map(rowStructureId).filter(Boolean).forEach((id) => ids.add(id));
    return ids;
  }

  function priorityBadge(row, fallbackText) {
    const rating = ratingClass(row?.OverallRating || fallbackText || "");
    if (/^poor$/i.test(rating)) return { text: "Poor priority", cls: "nbms-badge-poor" };
    if (/critical|very poor|beyond/i.test(rating)) return { text: "Critical", cls: "nbms-badge-critical" };
    if (/review|marginal|fair|satisfactory|no data/i.test(rating)) return { text: "Review only", cls: "nbms-badge-review" };
    return { text: "Priority", cls: "nbms-badge-review" };
  }

  async function polishCriticalBadges() {
    const label = activeTabLabel();
    const pageText = $(".page-content")?.innerText || "";
    if (label !== "Critical Structures" && !/critical structures|priority assets|critical bridge|critical culvert/i.test(pageText)) return;
    let rows = [];
    try {
      rows = await priorityRows();
    } catch {
      rows = [];
    }
    let reviewIds = new Set();
    try {
      reviewIds = reviewOnlyIds(await conditionRows());
    } catch {
      reviewIds = new Set();
    }
    const byId = new Map(rows.map((row) => [String(row.BridgeNumber || "").toUpperCase(), row]));
    $$("body *").forEach((node) => {
      if (/^(OPTION|SELECT|INPUT|TEXTAREA|SCRIPT|STYLE)$/.test(node.tagName || "")) return;
      const text = node.childNodes.length === 1 ? node.textContent.trim() : "";
      if (!/^(critical|poor|priority)(\s+(bridge|culvert|structure))?$/i.test(text)) return;
      const cardNode = node.closest("article, li, tr, [class*='card'], [class*='item'], [class*='row']");
      const context = cardNode?.textContent || node.parentElement?.textContent || "";
      const id = structureIdFromText(context);
      const row = byId.get(id);
      const badge = row ? priorityBadge(row, text) : id && reviewIds.has(id) ? { text: "Review only", cls: "nbms-badge-review" } : priorityBadge(null, /poor/i.test(context) ? "Poor" : /critical/i.test(context) ? "Critical" : "Review");
      if (node.textContent.trim() !== badge.text) node.textContent = badge.text;
      if (!node.classList.contains("nbms-polished-badge")) node.classList.add("nbms-polished-badge");
      if (!node.classList.contains(badge.cls)) node.classList.add(badge.cls);
      if (id && !row) cardNode?.classList?.add("nbms-stale-priority-card");
    });
  }

  async function polishReviewOnlyBadges() {
    let reviewIds = new Set(REVIEW_ONLY_IDS);
    try {
      reviewIds = reviewOnlyIds(await conditionRows());
    } catch {
      reviewIds = new Set(REVIEW_ONLY_IDS);
    }
    if (!reviewIds.size) return;
    $$(".slp-item, .map-detail-pane, .bridge-detail-card, .priority-table-row, article, tr").forEach((container) => {
      const id = structureIdFromText(container.textContent || "");
      if (!id || !reviewIds.has(id)) return;
      const badges = $$(".slp-condition-badge, [class*='badge'], span, div", container).filter((node) => {
        const text = node.childNodes.length === 1 ? node.textContent.trim() : "";
        return /^(critical|poor|very poor|beyond repair)$/i.test(text);
      });
      badges.forEach((badge) => {
        badge.textContent = "Review only";
        badge.classList.add("nbms-polished-badge", "nbms-badge-review");
        badge.classList.remove("nbms-badge-critical", "nbms-badge-poor");
      });
      container.classList.add("nbms-review-condition-card");
    });
  }

  function queueCriticalBadgePolish() {
    clearTimeout(state.polishTimer);
    state.polishTimer = setTimeout(() => {
      polishCriticalBadges();
      polishReviewOnlyBadges();
    }, 80);
  }

  function renderCritical(rows, gallery) {
    const content = $(".page-content");
    if (!content) return;
    injectStyle();
    const photos = galleryMap(gallery);
    const ratings = ["All", ...Array.from(new Set(rows.map((row) => ratingClass(row.OverallRating)).filter(Boolean))).sort()];
    const stations = new Set(rows.map((row) => row.MaintenanceStation).filter(Boolean));
    let overlay = $("#nbms-critical-overlay", content);
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "nbms-critical-overlay";
      content.appendChild(overlay);
    }
    content.classList.add("nbms-critical-route-overridden");
    overlay.innerHTML = `
      <section class="nbms-route-rescue" data-nbms-rescue="critical">
        <header class="nbms-rescue-head">
          <div>
            <p class="nbms-rescue-kicker">Priority engineering queue</p>
            <h1 class="nbms-rescue-title">Critical Structures Network</h1>
            <p class="nbms-rescue-copy">Verified poor-or-worse bridges and major culverts requiring engineering review. Includes condition status, route context, maintenance station, dimensions and available evidence photos.</p>
          </div>
          <div class="nbms-rescue-actions">
            <input class="nbms-rescue-input" type="search" placeholder="Search bridge, route, station..." aria-label="Search critical structures">
            <select class="nbms-rescue-select" aria-label="Filter by rating">
              ${ratings.map((rating) => `<option value="${escapeHtml(rating)}">${escapeHtml(rating)}</option>`).join("")}
            </select>
          </div>
        </header>
        <div class="nbms-rescue-stats">
          <article class="nbms-rescue-stat"><span>Priority assets</span><strong>${rows.length.toLocaleString()}</strong></article>
          <article class="nbms-rescue-stat"><span>Critical or very poor</span><strong>${rows.filter((row) => /critical|beyond|very poor/i.test(row.OverallRating || "")).length.toLocaleString()}</strong></article>
          <article class="nbms-rescue-stat"><span>Maintenance stations</span><strong>${stations.size.toLocaleString()}</strong></article>
          <article class="nbms-rescue-stat"><span>Photo matches</span><strong>${rows.filter((row) => photos.has(row.BridgeNumber)).length.toLocaleString()}</strong></article>
        </div>
        <div class="nbms-critical-grid"></div>
      </section>
    `;

    const section = $("[data-nbms-rescue='critical']", overlay);
    const input = $(".nbms-rescue-input", section);
    const select = $(".nbms-rescue-select", section);
    const grid = $(".nbms-critical-grid", section);

    const paint = () => {
      const query = input.value.trim().toLowerCase();
      const selected = select.value;
      const filtered = rows.filter((row) => {
        const rating = ratingClass(row.OverallRating);
        const matchRating = selected === "All" || rating === selected;
        const haystack = [row.BridgeNumber, row.BridgeName, row.LinkName, row.MaintenanceStation, row.Comment].join(" ").toLowerCase();
        return matchRating && (!query || haystack.includes(query));
      });
      grid.innerHTML = filtered.map((row) => card(row, photos.get(row.BridgeNumber))).join("");
    };

    input.addEventListener("input", paint);
    select.addEventListener("change", paint);
    paint();
  }

  function criticalRouteIsStale(content, rows) {
    if (!content || content.querySelector("[data-nbms-rescue='critical']")) return false;
    if (contentIsEmpty()) return true;
    const valid = new Set((rows || []).map((row) => String(row.BridgeNumber || "").toUpperCase()).filter(Boolean));
    const visibleIds = Array.from(new Set((content.innerText.match(/\b[BCM]\d{3,4}\b/g) || []).map((id) => id.toUpperCase())));
    const staleIds = visibleIds.filter((id) => !valid.has(id));
    return staleIds.length > 0 || /High-priority bridges and major culverts requiring immediate intervention/i.test(content.innerText || "");
  }

  function card(row, photo) {
    const rating = ratingClass(row.OverallRating);
    const dims = [row.BridgeLength && `${row.BridgeLength} m long`, row.BridgeWidth && `${row.BridgeWidth} m wide`].filter(Boolean).join(" / ");
    return `
      <article class="nbms-critical-card">
        <div class="nbms-critical-photo">
          ${photo ? `<img src="${escapeAttr(photo)}" alt="${escapeAttr(row.BridgeName || row.BridgeNumber || "Bridge photo")}" loading="lazy">` : `<span>No photo indexed</span>`}
          <span class="nbms-critical-badge">${escapeHtml(rating)}</span>
        </div>
        <div class="nbms-critical-body">
          <h3>${escapeHtml(row.BridgeNumber || "-")} - ${escapeHtml(row.BridgeName || "Unnamed bridge")}</h3>
          <div class="nbms-critical-meta">
            <span>${escapeHtml(row.LinkName || "Route not assigned")}</span>
            <span>${escapeHtml(row.MaintenanceStation || "Station not assigned")}</span>
            ${dims ? `<span>${escapeHtml(dims)}</span>` : ""}
          </div>
          ${row.Comment ? `<p class="nbms-critical-comment">${escapeHtml(row.Comment)}</p>` : ""}
        </div>
      </article>
    `;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function clearCriticalOverlay() {
    const content = $(".page-content");
    const overlay = $("#nbms-critical-overlay", content || document);
    overlay?.remove();
    content?.classList.remove("nbms-critical-route-overridden");
  }

  async function rescueRoutes() {
    const label = activeTabLabel();
    if (label !== "Critical Structures") {
      clearCriticalOverlay();
      queueCriticalBadgePolish();
      return;
    }

    try {
      const [critical, gallery] = await Promise.all([
        state.critical || json("data/critical_structures.json"),
        state.gallery || json("gallery/index.json"),
      ]);
      state.critical = critical;
      state.gallery = gallery;
      const content = $(".page-content");
      if (criticalRouteIsStale(content, critical)) renderCritical(critical, gallery);
    } catch (error) {
      console.error("NBMS critical route rescue failed:", error);
    }
    queueCriticalBadgePolish();
  }

  function boot() {
    injectStyle();
    installImageFallback();
    rescueRoutes();
    document.addEventListener("click", () => setTimeout(rescueRoutes, 120), true);
    document.addEventListener("input", () => setTimeout(() => {
      polishCriticalBadges();
      polishReviewOnlyBadges();
    }, 160), true);
    const observer = new MutationObserver(() => rescueRoutes());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    let sweeps = 0;
    const sweepTimer = setInterval(() => {
      polishCriticalBadges();
      polishReviewOnlyBadges();
      sweeps += 1;
      if (sweeps >= 30) clearInterval(sweepTimer);
    }, 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
