(function () {
  const BASE = "/majorstructures/";
  const state = {
    critical: null,
    bridges: null,
    culverts: null,
    gallery: null,
    works: null,
    workflow: null,
    workflowPromise: null,
    damageCatalogue: null,
    repairMethods: null,
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
        color: #0F172A;
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        overflow: auto;
      }
      .nbms-rescue-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        padding-bottom: 18px;
        border-bottom: 1px solid #E2E8F0;
      }
      .nbms-rescue-kicker {
        margin: 0 0 8px;
        color: #2563EB;
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
        color: #0F172A;
      }
      .nbms-rescue-copy {
        max-width: 760px;
        margin: 10px 0 0;
        color: #475569;
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
        border: 1px solid #CBD5E1;
        border-radius: 8px;
        background: #FFFFFF;
        color: #0F172A;
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
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        background: #F8FAFC;
        padding: 14px;
      }
      .nbms-rescue-stat span {
        display: block;
        color: #64748B;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .1em;
        text-transform: uppercase;
      }
      .nbms-rescue-stat strong {
        display: block;
        margin-top: 8px;
        color: #0F172A;
        font-size: 24px;
        line-height: 1;
      }
      .nbms-critical-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
      .nbms-workflow-button {
        min-height: 38px;
        padding: 0 14px;
        border: 1px solid #93C5FD;
        border-radius: 8px;
        background: #EFF6FF;
        color: #1D4ED8;
        font: 700 13px/1 Arial, sans-serif;
        cursor: pointer;
      }
      .nbms-workflow-button:hover,
      .nbms-workflow-button[aria-pressed="true"] {
        border-color: #2563EB;
        background: #DBEAFE;
      }
      .nbms-workflow-panel {
        margin: 0 0 18px;
        padding: 18px;
        border: 1px solid #BFDBFE;
        border-radius: 10px;
        background: #F8FBFF;
        color: #0F172A;
        font-family: Arial, sans-serif;
      }
      .nbms-workflow-panel h2,
      .nbms-workflow-panel h3,
      .nbms-workflow-panel p { margin-top: 0; }
      .nbms-workflow-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 16px;
      }
      .nbms-workflow-head h2 { margin-bottom: 6px; font-size: 22px; }
      .nbms-workflow-head p { margin-bottom: 0; color: #475569; line-height: 1.5; }
      .nbms-workflow-select {
        min-width: 240px;
        height: 42px;
        border: 1px solid #94A3B8;
        border-radius: 8px;
        background: #FFFFFF;
        color: #0F172A;
        padding: 0 12px;
        font: 600 14px Arial, sans-serif;
      }
      .nbms-type-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(150px, 1fr));
        gap: 10px;
      }
      .nbms-type-card {
        padding: 14px;
        border: 1px solid #CBD5E1;
        border-radius: 9px;
        background: #FFFFFF;
      }
      .nbms-type-card[data-active="true"] {
        border-color: #2563EB;
        box-shadow: 0 0 0 2px #DBEAFE;
      }
      .nbms-type-card h3 { margin-bottom: 8px; font-size: 15px; }
      .nbms-type-card p { margin-bottom: 8px; color: #475569; font-size: 13px; line-height: 1.45; }
      .nbms-type-status {
        display: inline-flex;
        margin-bottom: 9px;
        padding: 4px 7px;
        border-radius: 999px;
        background: #E2E8F0;
        color: #334155;
        font-size: 11px;
        font-weight: 800;
      }
      .nbms-type-status.proposed { background: #FEF3C7; color: #92400E; }
      .nbms-workflow-detail {
        display: grid;
        grid-template-columns: 1.1fr 1fr 1fr;
        gap: 12px;
        margin-top: 14px;
      }
      .nbms-workflow-detail > div {
        padding: 14px;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        background: #FFFFFF;
      }
      .nbms-workflow-detail strong { display: block; margin-bottom: 7px; color: #1E3A8A; }
      .nbms-workflow-detail p,
      .nbms-workflow-detail ul { margin: 0; color: #475569; font-size: 13px; line-height: 1.5; }
      .nbms-workflow-steps {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 10px;
        margin: 14px 0 0;
        padding: 0;
        list-style: none;
        counter-reset: workflow-step;
      }
      .nbms-workflow-steps li {
        min-height: 74px;
        padding: 12px;
        border-left: 4px solid #2563EB;
        border-radius: 6px;
        background: #FFFFFF;
        color: #334155;
        font-size: 13px;
        line-height: 1.45;
        counter-increment: workflow-step;
      }
      .nbms-workflow-steps li::before {
        content: "Step " counter(workflow-step);
        display: block;
        margin-bottom: 5px;
        color: #1D4ED8;
        font-weight: 800;
      }
      .nbms-reference-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr);
        gap: 14px;
        margin-top: 16px;
      }
      .nbms-reference-card {
        border: 1px solid #CBD5E1;
        border-radius: 9px;
        background: #FFFFFF;
        overflow: hidden;
      }
      .nbms-reference-card h3 { margin: 0; padding: 14px; border-bottom: 1px solid #E2E8F0; }
      .nbms-reference-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .nbms-reference-table th,
      .nbms-reference-table td { padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: left; vertical-align: top; }
      .nbms-reference-table th { background: #F8FAFC; color: #475569; font-weight: 800; }
      .nbms-method-list { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 1px; margin: 0; padding: 0; background: #E2E8F0; list-style: none; }
      .nbms-method-list li { min-height: 42px; padding: 10px 12px; background: #FFFFFF; color: #334155; font-size: 12px; line-height: 1.35; }
      @media (max-width: 1050px) {
        .nbms-type-grid { grid-template-columns: repeat(2, minmax(180px, 1fr)); }
        .nbms-workflow-detail, .nbms-workflow-steps, .nbms-reference-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 640px) {
        .nbms-workflow-head { display: block; }
        .nbms-workflow-select { width: 100%; min-width: 0; margin-top: 12px; }
        .nbms-type-grid { grid-template-columns: 1fr; }
        .nbms-workflow-panel { padding: 14px; }
      }
      .nbms-cad-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: grid;
        grid-template-rows: auto auto 1fr;
        background: #F1F5F9;
        color: #0F172A;
        font-family: Arial, sans-serif;
      }
      .nbms-cad-head,
      .nbms-cad-tools {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-bottom: 1px solid #CBD5E1;
        background: #FFFFFF;
        flex-wrap: wrap;
      }
      .nbms-cad-head { justify-content: space-between; }
      .nbms-cad-head h2 { margin: 0; font-size: 20px; }
      .nbms-cad-head p { margin: 4px 0 0; color: #64748B; font-size: 12px; }
      .nbms-cad-button,
      .nbms-cad-tools select,
      .nbms-cad-tools input[type="text"] {
        min-height: 36px;
        border: 1px solid #94A3B8;
        border-radius: 7px;
        background: #FFFFFF;
        color: #0F172A;
        padding: 0 10px;
        font: 600 12px Arial, sans-serif;
      }
      .nbms-cad-button { cursor: pointer; }
      .nbms-cad-button:hover,
      .nbms-cad-button.active { border-color: #2563EB; background: #DBEAFE; color: #1D4ED8; }
      .nbms-cad-file { display: none; }
      .nbms-cad-stage {
        overflow: auto;
        padding: 20px;
        background-color: #E2E8F0;
        background-image: linear-gradient(#CBD5E1 1px, transparent 1px), linear-gradient(90deg, #CBD5E1 1px, transparent 1px);
        background-size: 20px 20px;
      }
      .nbms-cad-sheet {
        position: relative;
        width: 1200px;
        height: 800px;
        margin: 0 auto;
        border: 1px solid #64748B;
        background: #FFFFFF;
        box-shadow: 0 10px 35px rgba(15,23,42,.18);
        transform-origin: top left;
      }
      .nbms-cad-sheet img,
      .nbms-cad-sheet svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .nbms-cad-sheet img { object-fit: contain; pointer-events: none; }
      .nbms-cad-sheet svg { cursor: crosshair; }
      .nbms-cad-empty {
        position: absolute;
        inset: 0;
        display: grid;
        place-content: center;
        text-align: center;
        color: #64748B;
        pointer-events: none;
      }
      .nbms-cad-empty strong { color: #0F172A; font-size: 18px; }
      .nbms-cad-status { margin-left: auto; color: #475569; font-size: 12px; }
      .nbms-plan-body { overflow: auto; padding: 18px; }
      .nbms-plan-grid { display: grid; grid-template-columns: minmax(300px,.75fr) minmax(480px,1.25fr); gap: 16px; }
      .nbms-plan-card { padding: 16px; border: 1px solid #CBD5E1; border-radius: 9px; background: #FFFFFF; }
      .nbms-plan-card h3 { margin: 0 0 14px; }
      .nbms-plan-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .nbms-plan-form label { display: grid; gap: 5px; color: #475569; font-size: 12px; font-weight: 700; }
      .nbms-plan-form label.wide { grid-column: 1 / -1; }
      .nbms-plan-form input, .nbms-plan-form select, .nbms-plan-form textarea {
        width: 100%; min-height: 38px; border: 1px solid #94A3B8; border-radius: 7px; background: #FFFFFF; color: #0F172A; padding: 8px 10px; font: 13px Arial, sans-serif;
      }
      .nbms-plan-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .nbms-plan-table th, .nbms-plan-table td { padding: 9px; border-bottom: 1px solid #E2E8F0; text-align: left; vertical-align: top; }
      .nbms-plan-table th { color: #475569; background: #F8FAFC; }
      .nbms-plan-empty { padding: 24px; text-align: center; color: #64748B; }
      .nbms-plan-progress { display: flex; gap: 5px; flex-wrap: wrap; }
      .nbms-plan-progress span { padding: 4px 7px; border-radius: 999px; background: #E2E8F0; color: #475569; }
      .nbms-plan-progress span.done { background: #DCFCE7; color: #166534; }
      @media (max-width: 760px) {
        .nbms-cad-tools { align-items: stretch; }
        .nbms-cad-tools input[type="text"], .nbms-cad-tools select { width: calc(50% - 4px); }
        .nbms-cad-status { width: 100%; margin-left: 0; }
        .nbms-plan-grid, .nbms-plan-form { grid-template-columns: 1fr; }
        .nbms-plan-form label.wide { grid-column: auto; }
      }
      .nbms-critical-card {
        min-width: 0;
        overflow: hidden;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        background: #FFFFFF;
        box-shadow: 0 4px 16px rgba(0, 0, 0, .04);
        transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
      }
      .nbms-critical-card:hover {
        transform: translateY(-2px);
        border-color: #2563EB;
        box-shadow: 0 6px 20px rgba(0, 0, 0, .08);
      }
      .nbms-critical-photo {
        height: 162px;
        background: #F1F5F9;
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
        background: #F59E0B !important;
        color: #FFFFFF !important;
      }
      .nbms-critical-badge.nbms-badge-review,
      .nbms-polished-badge.nbms-badge-review {
        background: #2563EB !important;
        color: #FFFFFF !important;
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
        border-color: #CBD5E1 !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, .06) !important;
      }
      .nbms-review-condition-card {
        border-color: #CBD5E1 !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, .06) !important;
      }
      .slp-condition-badge.nbms-badge-review,
      .map-detail-pane .nbms-badge-review,
      .bridge-detail-card .nbms-badge-review {
        background: #2563EB !important;
        color: #FFFFFF !important;
      }
      .nbms-critical-body {
        padding: 16px;
        background: #FFFFFF;
      }
      .nbms-critical-body h3 {
        margin: 0 0 10px;
        font-size: 16px;
        line-height: 1.25;
        color: #0F172A;
      }
      .nbms-critical-meta {
        display: grid;
        gap: 7px;
        color: #64748B;
        font-size: 12px;
        line-height: 1.35;
      }
      .nbms-critical-comment {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #E2E8F0;
        color: #334155;
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
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        background: #F8FAFC;
        color: #D97706;
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
    document.addEventListener("error", function (e) {
      if (e.target && e.target.tagName === "IMG") {
        let src = e.target.src || "";
        // 1. Try thumbnails if images/ requested
        if (src.includes("/gallery/images/") && !e.target.dataset.thumbTried) {
          e.target.dataset.thumbTried = "true";
          e.target.src = src.replace("/gallery/images/", "/gallery/thumbnails/").replace(/\.(JPG|png|webp)$/i, ".jpg");
          return;
        }
        // 2. Toggle double vs single extension
        if (src.includes("/gallery/thumbnails/") && !e.target.dataset.extTried) {
          e.target.dataset.extTried = "true";
          if (src.endsWith(".jpg.jpg")) {
            e.target.src = src.slice(0, -4);
            return;
          } else if (src.endsWith(".jpg")) {
            e.target.src = src + ".jpg";
            return;
          }
        }
        // 3. Fallback placeholder
        e.target.style.display = "none";
        if (e.target.parentElement) {
          e.target.parentElement.classList.add("nbms-no-photo");
          if (!e.target.parentElement.querySelector(".nbms-photo-placeholder")) {
            const ph = document.createElement("span");
            ph.className = "nbms-photo-placeholder";
            ph.textContent = "Photo indexed in archive";
            ph.style.cssText = "display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;color:#64748B;background:#F1F5F9;padding:8px;text-align:center;";
            e.target.parentElement.appendChild(ph);
          }
        }
      }
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

  function workflowPanel(reference) {
    const types = reference.types || [];
    return `
      <section id="nbms-inspection-workflow" class="nbms-workflow-panel" aria-label="Bridge inspection workflow">
        <div class="nbms-workflow-head">
          <div>
            <h2>${escapeHtml(reference.title || "Bridge inspection workflow")}</h2>
            <p>${escapeHtml(reference.scopeNote || "")}</p>
          </div>
          <label>
            <span class="nbms-rescue-kicker">Inspection type</span>
            <select class="nbms-workflow-select" aria-label="Inspection type">
              ${types.map((item) => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.name)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="nbms-type-grid">
          ${types.map((item, index) => `
            <article class="nbms-type-card" data-type="${escapeAttr(item.id)}" data-active="${index === 0}">
              <span class="nbms-type-status ${item.status?.toLowerCase().includes("proposed") ? "proposed" : ""}">${escapeHtml(item.status)}</span>
              <h3>${escapeHtml(item.name)}</h3>
              <p><strong>${escapeHtml(item.timing)}</strong></p>
              <p>${escapeHtml(item.purpose)}</p>
            </article>
          `).join("")}
        </div>
        <div class="nbms-workflow-detail" aria-live="polite"></div>
        <h3 style="margin:18px 0 8px">Capture and review sequence</h3>
        <ol class="nbms-workflow-steps">
          ${(reference.captureSteps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
        <div class="nbms-reference-grid">
          <section class="nbms-reference-card">
            <h3>Damage catalogue and measurement</h3>
            <table class="nbms-reference-table">
              <thead><tr><th>Damage type</th><th>Drawing geometry</th><th>Unit</th><th>Measurements</th></tr></thead>
              <tbody>${(state.damageCatalogue || []).map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.geometry)}</td><td>${escapeHtml(item.unit)}</td><td>${escapeHtml((item.measurements || []).join(", "))}</td></tr>`).join("")}</tbody>
            </table>
          </section>
          <section class="nbms-reference-card">
            <h3>Repair and reinforcement methods</h3>
            <ul class="nbms-method-list">${(state.repairMethods || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </section>
        </div>
      </section>
    `;
  }

  function paintWorkflowDetail(panel, reference, id) {
    const item = (reference.types || []).find((entry) => entry.id === id) || reference.types?.[0];
    if (!item) return;
    $$(".nbms-type-card", panel).forEach((card) => {
      card.dataset.active = String(card.dataset.type === item.id);
    });
    const detail = $(".nbms-workflow-detail", panel);
    detail.innerHTML = `
      <div><strong>Purpose</strong><p>${escapeHtml(item.purpose)}</p></div>
      <div><strong>Field activity</strong><p>${escapeHtml(item.activities)}</p></div>
      <div><strong>Required outputs</strong><ul>${(item.outputs || []).map((output) => `<li>${escapeHtml(output)}</li>`).join("")}</ul></div>
    `;
  }

  function openWorkflow(reference, button) {
    const content = $(".page-content");
    if (!content) return;
    const existing = $("#nbms-inspection-workflow", content);
    if (existing) {
      existing.remove();
      button.setAttribute("aria-pressed", "false");
      return;
    }
    content.insertAdjacentHTML("afterbegin", workflowPanel(reference));
    const panel = $("#nbms-inspection-workflow", content);
    const select = $(".nbms-workflow-select", panel);
    paintWorkflowDetail(panel, reference, select.value);
    select.addEventListener("change", () => paintWorkflowDetail(panel, reference, select.value));
    $$(".nbms-type-card", panel).forEach((card) => card.addEventListener("click", () => {
      select.value = card.dataset.type;
      paintWorkflowDetail(panel, reference, select.value);
    }));
    button.setAttribute("aria-pressed", "true");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function downloadLocalFile(name, type, body) {
    const blob = new Blob([body], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function openCadWorkspace() {
    if ($("#nbms-cad-workspace")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <section id="nbms-cad-workspace" class="nbms-cad-overlay" role="dialog" aria-modal="true" aria-label="Inspection drawing workspace">
        <header class="nbms-cad-head">
          <div><h2>Inspection Drawing Workspace</h2><p>Local-only drawing review. Files and annotations remain in this browser until exported.</p></div>
          <button type="button" class="nbms-cad-button" data-cad-action="close">Close</button>
        </header>
        <div class="nbms-cad-tools" aria-label="Drawing tools">
          <label class="nbms-cad-button" for="nbms-cad-file">Load Drawing</label>
          <input id="nbms-cad-file" class="nbms-cad-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
          <button type="button" class="nbms-cad-button active" data-cad-tool="point">Point</button>
          <button type="button" class="nbms-cad-button" data-cad-tool="line">Line</button>
          <button type="button" class="nbms-cad-button" data-cad-tool="area">Area</button>
          <input type="text" data-cad-field="member" aria-label="Member name" placeholder="Member name">
          <select data-cad-field="damage" aria-label="Damage type">${(state.damageCatalogue || []).map((item) => `<option>${escapeHtml(item.name)}</option>`).join("")}</select>
          <select data-cad-field="severity" aria-label="Severity">
            <option>Observation</option><option>Minor</option><option>Moderate</option><option>Severe</option>
          </select>
          <select data-cad-field="repair" aria-label="Repair or reinforcement method"><option value="">No repair method selected</option>${(state.repairMethods || []).map((item) => `<option>${escapeHtml(item)}</option>`).join("")}</select>
          <button type="button" class="nbms-cad-button" data-cad-action="zoom-out">Zoom Out</button>
          <button type="button" class="nbms-cad-button" data-cad-action="zoom-in">Zoom In</button>
          <button type="button" class="nbms-cad-button" data-cad-action="undo">Undo</button>
          <button type="button" class="nbms-cad-button" data-cad-action="clear">Clear</button>
          <button type="button" class="nbms-cad-button" data-cad-action="export-json">Export Register</button>
          <button type="button" class="nbms-cad-button" data-cad-action="export-svg">Export Overlay</button>
          <span class="nbms-cad-status" aria-live="polite">Load a PNG, JPEG, WebP or SVG drawing to begin.</span>
        </div>
        <div class="nbms-cad-stage">
          <div class="nbms-cad-sheet">
            <img alt="Loaded inspection drawing">
            <div class="nbms-cad-empty"><strong>No drawing loaded</strong><span>Load a drawing or site image. No geometry is generated by the portal.</span></div>
            <svg viewBox="0 0 1200 800" role="img" aria-label="Damage annotation layer"></svg>
          </div>
        </div>
      </section>
    `);
    const workspace = $("#nbms-cad-workspace");
    const sheet = $(".nbms-cad-sheet", workspace);
    const image = $("img", sheet);
    const svg = $("svg", sheet);
    const status = $(".nbms-cad-status", workspace);
    const annotations = [];
    let tool = "point";
    let draft = [];
    let zoom = 1;
    let drawingName = "untitled-drawing";

    const currentMeta = () => ({
      member: $('[data-cad-field="member"]', workspace).value.trim() || "Unassigned member",
      damage: $('[data-cad-field="damage"]', workspace).value,
      severity: $('[data-cad-field="severity"]', workspace).value,
      repairMethod: $('[data-cad-field="repair"]', workspace).value,
    });
    const pointFromEvent = (event) => {
      const rect = svg.getBoundingClientRect();
      return [Number((((event.clientX - rect.left) / rect.width) * 1200).toFixed(2)), Number((((event.clientY - rect.top) / rect.height) * 800).toFixed(2))];
    };
    const render = () => {
      const colour = { Observation: "#2563EB", Minor: "#65A30D", Moderate: "#D97706", Severe: "#DC2626" };
      svg.innerHTML = annotations.map((item, index) => {
        const stroke = colour[item.severity] || colour.Observation;
        const title = `${index + 1}. ${item.member} - ${item.damage} - ${item.severity}`;
        if (item.geometry === "point") return `<g><circle cx="${item.points[0][0]}" cy="${item.points[0][1]}" r="10" fill="${stroke}" stroke="#FFFFFF" stroke-width="3"><title>${escapeHtml(title)}</title></circle><text x="${item.points[0][0] + 14}" y="${item.points[0][1] - 12}" fill="#0F172A" font-size="16" font-family="Arial">${index + 1}</text></g>`;
        if (item.geometry === "line") return `<polyline points="${item.points.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${stroke}" stroke-width="7" stroke-linecap="round"><title>${escapeHtml(title)}</title></polyline>`;
        return `<polygon points="${item.points.map((p) => p.join(",")).join(" ")}" fill="${stroke}33" stroke="${stroke}" stroke-width="5"><title>${escapeHtml(title)}</title></polygon>`;
      }).join("");
      status.textContent = `${annotations.length} annotation${annotations.length === 1 ? "" : "s"} | ${Math.round(zoom * 100)}% zoom`;
    };
    const commit = (geometry, points) => {
      annotations.push({ id: crypto.randomUUID ? crypto.randomUUID() : `mark-${Date.now()}`, geometry, points, ...currentMeta() });
      draft = [];
      render();
    };

    $("#nbms-cad-file", workspace).addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      drawingName = file.name.replace(/\.[^.]+$/, "") || "inspection-drawing";
      const url = URL.createObjectURL(file);
      image.onload = () => {
        $(".nbms-cad-empty", sheet).style.display = "none";
        URL.revokeObjectURL(url);
        render();
      };
      image.src = url;
    });
    $$('[data-cad-tool]', workspace).forEach((button) => button.addEventListener("click", () => {
      tool = button.dataset.cadTool;
      draft = [];
      $$('[data-cad-tool]', workspace).forEach((item) => item.classList.toggle("active", item === button));
      status.textContent = tool === "area" ? "Area tool: click each vertex, then double-click the final point." : `${button.textContent} tool selected.`;
    }));
    $('[data-cad-field="damage"]', workspace).addEventListener("change", (event) => {
      const item = (state.damageCatalogue || []).find((entry) => entry.name === event.target.value);
      const mappedTool = String(item?.geometry || "Point").toLowerCase();
      const button = $(`[data-cad-tool="${mappedTool}"]`, workspace);
      button?.click();
      status.textContent = `${item.name}: ${item.geometry} geometry, measured in ${item.unit}.`;
    });
    svg.addEventListener("click", (event) => {
      const point = pointFromEvent(event);
      if (tool === "point") commit("point", [point]);
      else if (tool === "line") {
        draft.push(point);
        if (draft.length === 2) commit("line", draft.slice());
        else status.textContent = "Line tool: select the end point.";
      } else {
        draft.push(point);
        status.textContent = `Area tool: ${draft.length} vertices selected. Double-click to finish.`;
      }
    });
    svg.addEventListener("dblclick", (event) => {
      event.preventDefault();
      if (tool !== "area") return;
      if (draft.length >= 3) commit("area", draft.slice());
      else status.textContent = "An area requires at least three vertices.";
    });
    $$('[data-cad-action]', workspace).forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.cadAction;
      if (action === "close") workspace.remove();
      if (action === "zoom-in" || action === "zoom-out") {
        zoom = Math.max(.25, Math.min(3, zoom + (action === "zoom-in" ? .25 : -.25)));
        sheet.style.transform = `scale(${zoom})`;
        sheet.style.marginBottom = `${Math.max(0, sheet.offsetHeight * (zoom - 1))}px`;
        render();
      }
      if (action === "undo") { annotations.pop(); draft = []; render(); }
      if (action === "clear") { annotations.length = 0; draft = []; render(); }
      if (action === "export-json") downloadLocalFile(`${drawingName}-annotation-register.json`, "application/json", JSON.stringify({ drawing: drawingName, coordinateSpace: [1200, 800], annotations }, null, 2));
      if (action === "export-svg") {
        const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">${svg.innerHTML}</svg>`;
        downloadLocalFile(`${drawingName}-damage-overlay.svg`, "image/svg+xml", body);
      }
    }));
    document.addEventListener("keydown", function closeOnEscape(event) {
      if (event.key === "Escape" && document.body.contains(workspace)) workspace.remove();
      if (!document.body.contains(workspace)) document.removeEventListener("keydown", closeOnEscape);
    });
  }

  async function openPlanningWorkspace() {
    if ($("#nbms-plan-workspace")) return;
    const [bridges, culverts] = await Promise.all([
      state.bridges || json("data/bridges.json"),
      state.culverts || json("data/culverts.json"),
    ]);
    state.bridges = bridges;
    state.culverts = culverts;
    const structures = [
      ...bridges.map((item) => ({ id: item.BridgeNumber, name: item.BridgeName, type: "Bridge", station: item.MaintenanceStation })),
      ...culverts.map((item) => ({ id: item.CulvertNumber, name: item.River && item.River !== "Unknown" ? item.River : "Major Culvert", type: "Major Culvert", station: item.Maintenance_Station })),
    ];
    const storageKey = "majorstructures-inspection-plans-v1";
    let plans = [];
    try { plans = JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { plans = []; }
    document.body.insertAdjacentHTML("beforeend", `
      <section id="nbms-plan-workspace" class="nbms-cad-overlay" role="dialog" aria-modal="true" aria-label="Inspection planning workspace">
        <header class="nbms-cad-head">
          <div><h2>Inspection Planning Workspace</h2><p>Browser-local plans for learning and field preparation. Approval and assignment remain in the governed BMS.</p></div>
          <div><button type="button" class="nbms-cad-button" data-plan-action="export-all">Export Plans</button> <button type="button" class="nbms-cad-button" data-plan-action="close">Close</button></div>
        </header>
        <div class="nbms-cad-tools">
          <span><strong>Workflow:</strong> Plan</span><span>Field capture</span><span>Technical review</span><span>Apply to maintenance history</span>
          <span class="nbms-cad-status" aria-live="polite">${plans.length} browser-local plan${plans.length === 1 ? "" : "s"}</span>
        </div>
        <div class="nbms-plan-body">
          <div class="nbms-plan-grid">
            <section class="nbms-plan-card">
              <h3>Create inspection plan</h3>
              <form class="nbms-plan-form">
                <label class="wide">Plan name<input name="planName" required placeholder="Inspection plan name"></label>
                <label class="wide">Structure<select name="structure" required><option value="">Select a structure</option>${structures.map((item) => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.id)} | ${escapeHtml(item.name)} | ${escapeHtml(item.type)} | ${escapeHtml(item.station || "Unassigned")}</option>`).join("")}</select></label>
                <label>Inspection type<select name="inspectionType">${(state.workflow?.types || []).map((item) => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.name)}</option>`).join("")}</select></label>
                <label>Assigned team<input name="team" placeholder="Team or inspector"></label>
                <label>Start date<input name="startDate" type="date" required></label>
                <label>End date<input name="endDate" type="date" required></label>
                <label class="wide">Scope notes<textarea name="notes" rows="3" placeholder="Members, access constraints and equipment"></textarea></label>
                <label class="wide"><button type="submit" class="nbms-cad-button active">Add Plan</button></label>
              </form>
            </section>
            <section class="nbms-plan-card">
              <h3>Plan register and progress</h3>
              <div class="nbms-plan-register"></div>
            </section>
          </div>
        </div>
      </section>
    `);
    const workspace = $("#nbms-plan-workspace");
    const status = $(".nbms-cad-status", workspace);
    const stages = ["Planned", "Field capture", "Technical review", "Applied"];
    const persist = () => localStorage.setItem(storageKey, JSON.stringify(plans));
    const paint = () => {
      const register = $(".nbms-plan-register", workspace);
      status.textContent = `${plans.length} browser-local plan${plans.length === 1 ? "" : "s"}`;
      if (!plans.length) {
        register.innerHTML = '<div class="nbms-plan-empty">No plans created in this browser.</div>';
        return;
      }
      register.innerHTML = `<table class="nbms-plan-table"><thead><tr><th>Plan</th><th>Structure</th><th>Dates</th><th>Progress</th><th>Action</th></tr></thead><tbody>${plans.map((plan, index) => `
        <tr><td><strong>${escapeHtml(plan.planName)}</strong><br>${escapeHtml(plan.inspectionTypeName)}<br>${escapeHtml(plan.team || "Team not assigned")}</td>
        <td><strong>${escapeHtml(plan.structure)}</strong><br>${escapeHtml(plan.structureName)}</td>
        <td>${escapeHtml(plan.startDate)}<br>${escapeHtml(plan.endDate)}</td>
        <td><div class="nbms-plan-progress">${stages.map((stage, stageIndex) => `<span class="${stageIndex <= plan.stage ? "done" : ""}">${escapeHtml(stage)}</span>`).join("")}</div></td>
        <td><button type="button" class="nbms-cad-button" data-advance-plan="${index}" ${plan.stage >= stages.length - 1 ? "disabled" : ""}>Advance</button></td></tr>
      `).join("")}</tbody></table>`;
      $$('[data-advance-plan]', register).forEach((button) => button.addEventListener("click", () => {
        const plan = plans[Number(button.dataset.advancePlan)];
        plan.stage = Math.min(stages.length - 1, plan.stage + 1);
        plan.updatedAt = new Date().toISOString();
        persist(); paint();
      }));
    };
    $("form", workspace).addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const structure = structures.find((item) => item.id === form.get("structure"));
      const inspectionType = state.workflow.types.find((item) => item.id === form.get("inspectionType"));
      const startDate = String(form.get("startDate") || "");
      const endDate = String(form.get("endDate") || "");
      if (endDate < startDate) { status.textContent = "End date must be on or after the start date."; return; }
      plans.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `plan-${Date.now()}`,
        planName: String(form.get("planName") || ""), structure: structure.id, structureName: structure.name,
        structureType: structure.type, station: structure.station || "Unassigned", inspectionType: inspectionType.id,
        inspectionTypeName: inspectionType.name, team: String(form.get("team") || ""), startDate, endDate,
        notes: String(form.get("notes") || ""), stage: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      persist(); event.currentTarget.reset(); paint();
    });
    $$('[data-plan-action]', workspace).forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.planAction === "close") workspace.remove();
      if (button.dataset.planAction === "export-all") downloadLocalFile("inspection-plan-register.json", "application/json", JSON.stringify({ exportedAt: new Date().toISOString(), plans }, null, 2));
    }));
    paint();
  }

  async function ensureWorkflowTools() {
    const inspectBridge = $$('button').find((button) => button.textContent.trim() === "Inspect Bridge");
    if (!inspectBridge) {
      $("#nbms-inspection-workflow")?.remove();
      return;
    }
    if (!state.workflowPromise) {
      state.workflowPromise = Promise.all([
        json("data/inspection_workflow.json"),
        json("data/damage_catalogue.json"),
        json("data/repair_method_catalogue.json"),
      ]).then(([workflow, damageCatalogue, repairMethods]) => {
        state.workflow = workflow;
        state.damageCatalogue = damageCatalogue;
        state.repairMethods = repairMethods;
        return workflow;
      });
    }
    const reference = state.workflow || await state.workflowPromise;
    const tabGroup = inspectBridge.parentElement;
    if (!tabGroup) return;
    if (!$("#nbms-workflow-button", tabGroup)) {
      const button = document.createElement("button");
      button.id = "nbms-workflow-button";
      button.className = "nbms-workflow-button";
      button.type = "button";
      button.textContent = "Inspection Workflow";
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => openWorkflow(reference, button));
      tabGroup.appendChild(button);
    }
    if (!$("#nbms-cad-button", tabGroup)) {
      const cadButton = document.createElement("button");
      cadButton.id = "nbms-cad-button";
      cadButton.className = "nbms-workflow-button";
      cadButton.type = "button";
      cadButton.textContent = "Drawing Workspace";
      cadButton.addEventListener("click", openCadWorkspace);
      tabGroup.appendChild(cadButton);
    }
    if (!$("#nbms-plan-button", tabGroup)) {
      const planButton = document.createElement("button");
      planButton.id = "nbms-plan-button";
      planButton.className = "nbms-workflow-button";
      planButton.type = "button";
      planButton.textContent = "Inspection Plans";
      planButton.addEventListener("click", () => openPlanningWorkspace().catch((error) => console.error("NBMS planning workspace failed:", error)));
      tabGroup.appendChild(planButton);
    }
  }

  async function rescueRoutes() {
    ensureWorkflowTools().catch((error) => console.error("NBMS workflow tools failed:", error));
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
