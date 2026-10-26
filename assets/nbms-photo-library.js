(() => {
  const BASE = "/majorstructures/";
  const STATE = {
    loaded: false,
    loading: null,
    records: [],
    groups: [],
    audit: null,
    query: "",
    year: "All",
    availability: "Available",
    selectedId: null,
    selectedIndex: 0,
  };
  const REPAIR = {
    loading: null,
    loaded: false,
    audit: null,
    recordsByName: new Map(),
    recordsByStructure: new Map(),
  };
  const UI = {
    activeSignature: "",
    resizeSignature: "",
    mountTimer: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

  const cleanPath = (path) => String(path || "").replace(/^\/+/, "");
  const fileNameFromPath = (path) => {
    const clean = String(path || "").split(/[?#]/)[0].split("/").pop() || "";
    try {
      return decodeURIComponent(clean);
    } catch {
      return clean;
    }
  };
  const keyName = (name) => fileNameFromPath(name).toLowerCase();
  const thumbName = (name) => fileNameFromPath(name).replace(/\.[^/.]+$/, ".jpg");
  const hasLocalPhoto = (record) => !!record
    && (record.thumbnail_available === true || record.full_available === true || record.web_available === true);
  const structureIdFromText = (value) => {
    const match = String(value || "").toUpperCase().match(/\b[BCM]\d{3,4}\b/);
    return match ? match[0] : "";
  };
  const structureIdForImage = (img, source) => {
    const direct = [
      img?.dataset?.structureId,
      img?.getAttribute?.("data-structure-id"),
      img?.getAttribute?.("alt"),
      img?.getAttribute?.("title"),
      source,
    ].map(structureIdFromText).find(Boolean);
    if (direct) return direct;
    const context = img?.closest?.("button, article, li, tr, .slp-item, .photo-card, .evidence-card, .nbms-photo-card, .structure-list-panel");
    return structureIdFromText(context?.textContent || "");
  };
  const firstRecordForStructure = (id) => {
    const records = REPAIR.recordsByStructure.get(String(id || "").toUpperCase()) || [];
    return records.find(hasLocalPhoto) || null;
  };
  const photoUrl = (photo) => {
    if (photo.fullAvailable && photo.path) return `${BASE}${cleanPath(photo.path)}`;
    return thumbUrl(photo);
  };
  const thumbUrl = (photo) => {
    const name = photo.filename || photo.file_name || "";
    if (photo.thumbnailPath) return `${BASE}${cleanPath(photo.thumbnailPath)}`;
    if (photo.thumbnail_path) return `${BASE}${cleanPath(photo.thumbnail_path)}`;
    if (photo.fullAvailable && photo.path) return `${BASE}${cleanPath(photo.path)}`;
    return `${BASE}gallery/thumbnails/${thumbName(name)}`;
  };
  const normalizedUrl = (url) => {
    try {
      return new URL(url, window.location.origin).href;
    } catch {
      return String(url || "");
    }
  };
  const addCandidate = (list, url) => {
    if (!url) return;
    const normalized = normalizedUrl(url);
    if (!list.some((item) => normalizedUrl(item) === normalized)) list.push(url);
  };
  const recordForImageName = (name) => {
    const baseName = fileNameFromPath(name);
    return REPAIR.recordsByName.get(keyName(baseName))
      || REPAIR.recordsByName.get(keyName(thumbName(baseName)))
      || null;
  };
  const fallbackCandidatesForImage = (img, source) => {
    const candidates = [];
    const name = fileNameFromPath(source || img?.getAttribute?.("src") || "");
    const structureId = structureIdForImage(img, source);
    let record = recordForImageName(name) || firstRecordForStructure(structureId);
    if (record && !hasLocalPhoto(record)) record = firstRecordForStructure(structureId);
    const isStageImage = !!img?.closest?.(".evidence-stage-image, .nbms-photo-stage, figure");
    if (record) {
      if (isStageImage && record.full_available === true && record.path) addCandidate(candidates, `${BASE}${cleanPath(record.path)}`);
      if (record.thumbnail_available === true && record.thumbnail_path) addCandidate(candidates, `${BASE}${cleanPath(record.thumbnail_path)}`);
      if (record.web_available === true && record.path) addCandidate(candidates, `${BASE}${cleanPath(record.path)}`);
      if (record.thumbnail_available === true) addCandidate(candidates, `${BASE}gallery/thumbnails/${thumbName(record.filename || record.file_name || name)}`);
    }
    if (structureId && !REPAIR.loaded) {
      addCandidate(candidates, `${BASE}gallery/thumbnails/${structureId}_${structureId}_08_01.jpg`);
      addCandidate(candidates, `${BASE}gallery/thumbnails/${structureId}_${structureId}_09_1.jpg`);
    }
    if (name) {
      addCandidate(candidates, `${BASE}gallery/thumbnails/${thumbName(name)}`);
      addCandidate(candidates, `${BASE}gallery/images/${name}`);
    }
    return candidates.filter((candidate) => normalizedUrl(candidate) !== normalizedUrl(source));
  };
  function showImagePlaceholder(img, label = "Photo pending") {
    const placeholder = document.createElement("div");
    placeholder.className = "nbms-missing-photo";
    placeholder.textContent = label;
    img.replaceWith(placeholder);
  }
  function advanceImageFallback(img) {
    const source = img.getAttribute("src") || "";
    const candidates = img.__nbmsFallbackCandidates || [];
    while (candidates.length) {
      const next = candidates.shift();
      if (next && normalizedUrl(next) !== normalizedUrl(source)) {
        img.dataset.nbmsRepairedSrc = next;
        img.setAttribute("src", next);
        return;
      }
    }
    if (!REPAIR.loaded) {
      loadRepairIndex().then(() => {
        if (!img.isConnected) return;
        installImageFallback(img);
        if (img.complete && img.naturalWidth === 0) advanceImageFallback(img);
      });
      return;
    }
    const structureId = structureIdForImage(img, source);
    showImagePlaceholder(img, structureId ? `${structureId} source missing` : "Source missing");
  }
  function installImageFallback(img, extraCandidates = []) {
    if (!img) return;
    const source = img.getAttribute("src") || "";
    const candidates = [];
    extraCandidates.forEach((url) => addCandidate(candidates, url));
    fallbackCandidatesForImage(img, source).forEach((url) => addCandidate(candidates, url));
    img.__nbmsFallbackCandidates = candidates;
    if (!img.dataset.nbmsRepairListener) {
      img.dataset.nbmsRepairListener = "1";
      img.addEventListener("error", () => advanceImageFallback(img));
    }
    if (img.complete && img.naturalWidth === 0) advanceImageFallback(img);
  }
  function enhanceGalleryImages(root = document) {
    const selector = [
      'img[src*="/gallery/"]',
      'img[src*="gallery/"]',
      'img[src*="/public/gallery/images/"]',
      'img[src*="raw.githubusercontent.com/priscananjehe1996/majorstructures"]',
    ].join(",");
    root.querySelectorAll?.(selector).forEach((img) => {
      const source = img.getAttribute("src") || "";
      const isThumb = source.includes("/gallery/thumbnails/") || source.includes("gallery/thumbnails/");
      const normalizedThumb = `${BASE}gallery/thumbnails/${thumbName(source)}`;
      if (isThumb && source && normalizedUrl(source) !== normalizedUrl(normalizedThumb)) {
        img.dataset.nbmsOriginalSrc = source;
        img.setAttribute("src", normalizedThumb);
      }
      installImageFallback(img);
    });
  }
  const photoYear = (photo) => {
    if (photo.capture_year) return String(photo.capture_year);
    const match = String(photo.filename || "").match(/(?:^|[_-])(\d{2})(?:[_-])/);
    if (!match) return "Undated";
    const year = Number(match[1]);
    return year >= 5 && year <= 30 ? String(2000 + year) : "Undated";
  };

  async function loadData() {
    if (STATE.loaded) return;
    if (STATE.loading) return STATE.loading;
    STATE.loading = Promise.all([
      fetch(`${BASE}gallery/index.json`).then((res) => res.json()),
      fetch(`${BASE}gallery/audit.json`).then((res) => res.json()).catch(() => null),
      fetch(`${BASE}data/bridges.json`).then((res) => res.json()).catch(() => []),
    ]).then(([records, audit, bridges]) => {
      const bridgeNames = new Map();
      (Array.isArray(bridges) ? bridges : []).forEach((bridge) => {
        const id = bridge.BridgeNumber || bridge.bridge_no || bridge.new_bridge_no || bridge.original_bridge_no;
        const name = bridge.BridgeName || bridge.bridge_nam || bridge.river || bridge.link_name;
        if (id && name) bridgeNames.set(String(id).toUpperCase(), name);
      });

      STATE.records = (Array.isArray(records) ? records : []).map((record) => {
        const filename = record.filename || record.file_name || "";
        return {
          ...record,
          filename,
          year: photoYear(record),
          webAvailable: record.web_available !== false,
          fullAvailable: record.full_available === true,
          thumbnailPath: record.thumbnail_path || "",
          structureKey: String(record.structure_id || "Unassigned").toUpperCase(),
        };
      });
      STATE.audit = audit;
      STATE.groups = groupRecords(STATE.records, bridgeNames);
      STATE.selectedId = STATE.groups[0]?.id || null;
      STATE.loaded = true;
    }).finally(() => {
      STATE.loading = null;
    });
    return STATE.loading;
  }

  function groupRecords(records, bridgeNames) {
    const map = new Map();
    records.forEach((photo) => {
      const id = photo.structureKey;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: bridgeNames.get(id) || "",
          photos: [],
          years: new Set(),
          available: 0,
        });
      }
      const group = map.get(id);
      group.photos.push(photo);
      group.years.add(photo.year);
      if (photo.webAvailable) group.available += 1;
    });

    return [...map.values()].map((group) => {
      group.photos.sort((a, b) => {
        const y = Number(b.year) - Number(a.year);
        if (Number.isFinite(y) && y !== 0) return y;
        return (Number(a.sequence) || 9999) - (Number(b.sequence) || 9999)
          || String(a.filename).localeCompare(String(b.filename));
      });
      group.cover = group.photos.find((photo) => photo.webAvailable) || group.photos[0];
      group.searchText = `${group.id} ${group.name} ${group.photos.map((photo) => `${photo.filename} ${photo.source_relative_path || ""}`).join(" ")}`.toLowerCase();
      return group;
    }).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }

  const filteredGroups = () => {
    const query = STATE.query.trim().toLowerCase();
    return STATE.groups.filter((group) => {
      if (query && !group.searchText.includes(query)) return false;
      if (STATE.year !== "All" && !group.years.has(STATE.year)) return false;
      if (STATE.availability === "Available" && group.available === 0) return false;
      if (STATE.availability === "Missing" && group.available > 0) return false;
      return true;
    });
  };

  const selectedGroup = () => {
    const filtered = filteredGroups();
    return filtered.find((group) => group.id === STATE.selectedId) || filtered[0] || null;
  };

  const selectedPhoto = (group) => {
    if (!group) return null;
    const byYear = STATE.year === "All" ? group.photos : group.photos.filter((photo) => photo.year === STATE.year);
    const availableFirst = byYear.sort((a, b) => Number(b.webAvailable) - Number(a.webAvailable));
    return availableFirst[Math.min(STATE.selectedIndex, Math.max(0, availableFirst.length - 1))] || group.photos[0] || null;
  };

  function statsMarkup(groups) {
    const audit = STATE.audit || {};
    const available = audit.web_images_generated ?? STATE.records.filter((photo) => photo.webAvailable).length;
    const thumbs = audit.thumbnails_generated ?? STATE.records.filter((photo) => photo.webAvailable).length;
    const missing = audit.web_missing_sources ?? STATE.records.filter((photo) => !photo.webAvailable).length;
    return [
      ["Photos", STATE.records.length.toLocaleString()],
      ["Structures", STATE.groups.length.toLocaleString()],
      ["Web images", Number(available).toLocaleString()],
      ["Thumbnails", Number(thumbs).toLocaleString()],
      ["Missing sources", Number(missing).toLocaleString()],
    ].map(([label, value]) => `<div class="nbms-photo-stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  }

  function render(container) {
    if (!STATE.loaded) {
      container.innerHTML = `
        <section class="nbms-photo-library" data-nbms-photo-library>
          <div class="nbms-photo-empty">Loading indexed bridge evidence...</div>
        </section>`;
      loadData().then(() => render(container)).catch((error) => {
        container.innerHTML = `<section class="nbms-photo-library"><div class="nbms-photo-empty">Photo library failed to load: ${esc(error.message)}</div></section>`;
      });
      return;
    }

    const years = [...new Set(STATE.records.map((photo) => photo.year))].sort((a, b) => {
      if (a === "Undated") return 1;
      if (b === "Undated") return -1;
      return Number(b) - Number(a);
    });
    const groups = filteredGroups();
    const group = selectedGroup();
    const photo = selectedPhoto(group);
    const visible = groups.slice(0, 120);
    const activeId = group?.id;
    const photoCount = group?.photos.length || 0;
    const yearOptions = ["All", ...years].map((year) => `<option value="${esc(year)}" ${STATE.year === year ? "selected" : ""}>${esc(year)}</option>`).join("");

    container.innerHTML = `
      <section class="nbms-photo-library" data-nbms-photo-library>
        <div class="nbms-photo-head">
          <div>
            <div class="nbms-photo-kicker">Bridge photo evidence</div>
            <h2 class="nbms-photo-title">Indexed inspection gallery</h2>
            <p class="nbms-photo-copy">
              Search the national bridge photo archive by structure ID, filename, source folder, or bridge name.
              Optimized web images and thumbnails are generated from the MoWT bridge photo repository.
            </p>
          </div>
          <div class="nbms-photo-stats">${statsMarkup(groups)}</div>
        </div>

        <div class="nbms-photo-controls">
          <input data-photo-search type="search" value="${esc(STATE.query)}" placeholder="Search B001, Nile, filename, source folder..." />
          <select data-photo-year>${yearOptions}</select>
          <select data-photo-availability>
            <option value="Available" ${STATE.availability === "Available" ? "selected" : ""}>Available images</option>
            <option value="All" ${STATE.availability === "All" ? "selected" : ""}>All indexed records</option>
            <option value="Missing" ${STATE.availability === "Missing" ? "selected" : ""}>Missing source records</option>
          </select>
        </div>
        <div class="nbms-photo-health">
          <strong>${(STATE.audit?.web_available_records ?? STATE.records.filter((item) => item.webAvailable).length).toLocaleString()}</strong>
          <span>records have web-ready evidence</span>
          <strong>${(STATE.audit?.web_missing_sources ?? STATE.records.filter((item) => !item.webAvailable).length).toLocaleString()}</strong>
          <span>source records are still missing from the local archive</span>
        </div>

        ${photo ? `
          <div class="nbms-photo-stage">
            <figure>
              ${photo.webAvailable ? `<img src="${esc(photoUrl(photo))}" alt="${esc(group.id)} ${esc(photo.filename)}" loading="eager" />` : `<div class="nbms-photo-missing-panel"><strong>${esc(group.id)}</strong><span>Source image is not available in the local archive.</span></div>`}
            </figure>
            <div class="nbms-photo-detail">
              <span class="nbms-photo-kicker">${esc(group.id)}</span>
              <h3>${esc(group.name || "Bridge photo record")}</h3>
              <dl>
                <dt>Filename</dt><dd>${esc(photo.filename || "-")}</dd>
                <dt>Year</dt><dd>${esc(photo.year || "Undated")}</dd>
                <dt>Sequence</dt><dd>${esc(photo.sequence || "-")}</dd>
                <dt>Photos</dt><dd>${photoCount.toLocaleString()} indexed for this structure</dd>
                <dt>Source</dt><dd>${esc(photo.source_relative_path || photo.original_path || "-")}</dd>
                <dt>Status</dt><dd>${photo.fullAvailable ? "Full web image ready" : photo.webAvailable ? "Thumbnail evidence ready" : "Source missing from local archive"}</dd>
              </dl>
              ${photo.webAvailable ? `<a class="nbms-photo-open" href="${esc(photoUrl(photo))}" target="_blank" rel="noreferrer">Open full image</a>` : ""}
            </div>
          </div>` : `<div class="nbms-photo-empty">No photo records match the current filters.</div>`}

        <div class="nbms-photo-grid" aria-label="Bridge photo structures">
          ${visible.map((item) => {
            const cover = item.cover;
            return `
              <button class="nbms-photo-card ${item.id === activeId ? "active" : ""}" data-photo-id="${esc(item.id)}">
                <div class="nbms-photo-cover">
                  ${cover?.webAvailable ? `<img src="${esc(thumbUrl(cover))}" alt="" loading="lazy" />` : `<div class="nbms-missing-photo">Source missing</div>`}
                  <span class="nbms-photo-pill">${item.available}/${item.photos.length}</span>
                </div>
                <div class="nbms-photo-meta">
                  <strong>${esc(item.id)}</strong>
                  <span>${esc(item.name || "Unnamed structure")}</span>
                  <span>${[...item.years].sort((a, b) => Number(b) - Number(a)).slice(0, 4).join(", ")}</span>
                </div>
              </button>`;
          }).join("")}
        </div>
        ${groups.length > visible.length ? `<div class="nbms-photo-empty">Showing ${visible.length} of ${groups.length} structures. Refine search to narrow the archive.</div>` : ""}
      </section>`;

    wire(container);
  }

  function wire(container) {
    const search = $("[data-photo-search]", container);
    const year = $("[data-photo-year]", container);
    const availability = $("[data-photo-availability]", container);
    search?.addEventListener("input", (event) => {
      STATE.query = event.target.value;
      STATE.selectedIndex = 0;
      render(container);
      $("[data-photo-search]", container)?.focus();
    });
    year?.addEventListener("change", (event) => {
      STATE.year = event.target.value;
      STATE.selectedIndex = 0;
      render(container);
    });
    availability?.addEventListener("change", (event) => {
      STATE.availability = event.target.value;
      STATE.selectedIndex = 0;
      render(container);
    });
    container.querySelectorAll("[data-photo-id]").forEach((button) => {
      button.addEventListener("click", () => {
        STATE.selectedId = button.getAttribute("data-photo-id");
        STATE.selectedIndex = 0;
        render(container);
      });
    });
    container.querySelectorAll("img").forEach((img) => {
      installImageFallback(img);
    });
  }

  async function loadRepairIndex() {
    if (REPAIR.loaded) return;
    if (REPAIR.loading) return REPAIR.loading;
    REPAIR.loading = Promise.all([
      fetch(`${BASE}gallery/index.json`).then((res) => res.json()),
      fetch(`${BASE}gallery/audit.json`).then((res) => res.json()).catch(() => null),
    ])
      .then(([records, audit]) => {
        REPAIR.audit = audit;
        (Array.isArray(records) ? records : []).forEach((record) => {
          const structureKey = String(record.structure_id || "").toUpperCase();
          const names = [
            record.filename,
            record.file_name,
            record.path,
            record.thumbnail_path,
            thumbName(record.filename || record.file_name || ""),
          ].filter(Boolean);
          names.forEach((name) => REPAIR.recordsByName.set(keyName(name), record));
          if (structureKey) {
            if (!REPAIR.recordsByStructure.has(structureKey)) REPAIR.recordsByStructure.set(structureKey, []);
            REPAIR.recordsByStructure.get(structureKey).push(record);
          }
        });
        REPAIR.recordsByStructure.forEach((recordsForStructure) => {
          recordsForStructure.sort((a, b) => Number(b.web_available !== false) - Number(a.web_available !== false)
            || Number(b.full_available === true) - Number(a.full_available === true)
            || String(a.filename || a.file_name || "").localeCompare(String(b.filename || b.file_name || "")));
        });
        REPAIR.loaded = true;
      })
      .catch(() => {
        REPAIR.loaded = true;
      })
      .finally(() => {
        REPAIR.loading = null;
      });
    return REPAIR.loading;
  }

  function localUrlForImage(img, originalSrc) {
    return fallbackCandidatesForImage(img, originalSrc)[0] || "";
  }

  function repairEvidenceImages(root = document) {
    const scopes = [
      ...root.querySelectorAll(".photo-library.evidence-library, .evidence-library, [data-nbms-photo-library]"),
    ];
    if (!scopes.length && root.matches?.(".photo-library.evidence-library, .evidence-library, [data-nbms-photo-library]")) {
      scopes.push(root);
    }
    if (!scopes.length) return;

    scopes.forEach((scope) => {
      scope.classList.add("nbms-neon-photo-ready");
      scope.querySelectorAll("img").forEach((img) => {
        const current = img.getAttribute("src") || "";
        const isBrokenRemote = current.includes("raw.githubusercontent.com/priscananjehe1996/majorstructures")
          || current.includes("/public/gallery/images/");
        const isLocalThumb = current.includes("/majorstructures/gallery/thumbnails/");
        const shouldNormalizeThumb = isLocalThumb && fileNameFromPath(current) !== thumbName(current);
        const shouldUpgradeStage = isLocalThumb && !!img.closest(".evidence-stage-image, .nbms-photo-stage, figure");
        if (isBrokenRemote || shouldUpgradeStage || shouldNormalizeThumb) {
          const next = localUrlForImage(img, current);
          if (next && current !== next) {
            img.setAttribute("src", next);
            img.dataset.nbmsRepairedSrc = next;
          }
        }
        installImageFallback(img);
      });
    });
    enhanceGalleryImages(root);
  }

  function enhanceNativePhotoSection() {
    document.documentElement.classList.add("nbms-neon-ready");
    repairEvidenceImages();
    enhanceNativePhotoSummary();
    loadRepairIndex().then(() => {
      repairEvidenceImages();
      enhanceNativePhotoSummary();
    });
  }

  function slug(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function labelFor(el) {
    if (!el) return "";
    return (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
  }

  function markCurrentView() {
    const main = document.querySelector(".horiz-nav-link.active, .main-section-links .active, nav .active");
    const sub = document.querySelector(".context-subnav button.active, .context-subnav .active");
    const view = [labelFor(main), labelFor(sub)].filter(Boolean).map(slug).join(" ");
    if (view) {
      document.documentElement.dataset.nbmsView = view;
    }
  }

  function markResponsiveClusters() {
    document.querySelectorAll(".page-content.modern-scroll div, .page-content.modern-scroll section, .page-content.modern-scroll article").forEach((node) => {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      if ((style.display === "flex" || style.display === "grid") && node.children.length > 1 && rect.width > 220) {
        node.classList.add("nbms-responsive-cluster");
      }
    });
    document.querySelectorAll(".page-loader, .loading-screen, .loading-state").forEach((node) => {
      node.classList.add("nbms-loader-enhanced");
    });
  }

  function enhanceResponsiveTables(root = document) {
    root.querySelectorAll?.(".priority-table").forEach((table) => {
      table.classList.add("nbms-card-table");
      const labels = [...table.querySelectorAll(".priority-table-head > *")]
        .map((cell) => labelFor(cell))
        .filter(Boolean);
      table.querySelectorAll(".priority-table-row").forEach((row) => {
        row.classList.add("nbms-card-row");
        [...row.children].forEach((cell, index) => {
          if (!cell.dataset.label) cell.dataset.label = labels[index] || `Field ${index + 1}`;
        });
      });
    });

    const tableSelector = [
      ".photo-table-wrap table",
      ".source-table-wrap table",
      ".data-table-wrap table",
      ".table-responsive table",
      "table.photo-table",
      "table.source-table",
      "table.data-table",
    ].join(",");
    root.querySelectorAll?.(tableSelector).forEach((table) => {
      table.classList.add("nbms-table-cardified");
      table.closest(".photo-table-wrap, .source-table-wrap, .data-table-wrap, .table-responsive")?.classList.add("nbms-table-cardified-wrap");
      const headers = [...table.querySelectorAll("thead th, thead td")]
        .map((cell) => labelFor(cell))
        .filter(Boolean);
      table.querySelectorAll("tbody tr, tr").forEach((row) => {
        const cells = [...row.children].filter((cell) => /^(TD|TH)$/.test(cell.tagName));
        cells.forEach((cell, index) => {
          if (!cell.dataset.label) cell.dataset.label = headers[index] || `Column ${index + 1}`;
        });
      });
    });
  }

  function enhanceNativePhotoSummary(root = document) {
    const library = root.querySelector?.(".photo-library.evidence-library") || document.querySelector(".photo-library.evidence-library");
    if (!library) return;
    const audit = REPAIR.audit;
    const kpiGrid = library.querySelector(".photo-kpi-grid");
    if (!audit && !kpiGrid) return;
    const publishable = Number(audit?.publishable_images ?? audit?.web_available_records ?? 0);
    const webReady = Number(audit?.web_available_records ?? audit?.thumbnails_generated ?? 0);
    const fullReady = Number(audit?.full_available_records ?? 0);
    const missing = Number(audit?.web_missing_sources ?? 0);
    const sourceImages = Number(audit?.source_repository_images ?? 0);
    const localImages = Number(audit?.local_gallery_images ?? 0);
    const values = [
      ["Web-ready evidence", webReady],
      ["Full-size photos", fullReady],
      ["Missing source records", missing],
      ["Repository images", sourceImages || localImages],
    ];
    const markup = `
      <section class="nbms-native-photo-health" aria-label="Bridge photo archive health">
        <div>
          <strong>${publishable ? publishable.toLocaleString() : "7,794"}</strong>
          <span>publishable indexed photo records</span>
        </div>
        ${values.map(([label, value]) => `
          <div>
            <strong>${Number(value || 0).toLocaleString()}</strong>
            <span>${esc(label)}</span>
          </div>`).join("")}
      </section>`;
    let panel = library.querySelector(".nbms-native-photo-health");
    if (panel) {
      panel.outerHTML = markup;
      return;
    }
    if (kpiGrid) {
      kpiGrid.insertAdjacentHTML("afterend", markup);
    } else {
      library.insertAdjacentHTML("afterbegin", markup);
    }
  }

  function centerMapToolbars(root = document) {
    root.querySelectorAll?.(".network-map").forEach((map) => {
      const mapRect = map.getBoundingClientRect();
      if (!mapRect.width || !mapRect.height) return;
      const mapShell = map.closest(".modern-fullscreen-map") || map.closest(".page-content") || map;
      const rightPane = [...mapShell.querySelectorAll(".map-list-pane, .structure-list-panel")]
        .map((pane) => ({ pane, rect: pane.getBoundingClientRect(), style: window.getComputedStyle(pane) }))
        .filter(({ rect, style }) => style.display !== "none" && style.visibility !== "hidden" && rect.width > 120 && rect.height > 120)
        .filter(({ rect }) => rect.left > mapRect.left && rect.left < mapRect.right)
        .sort((a, b) => a.rect.left - b.rect.left)[0];
      const rightInset = rightPane ? Math.max(0, mapRect.right - rightPane.rect.left) : 0;
      const nextInset = `${Math.round(rightInset)}px`;
      if (map.style.getPropertyValue("--nbms-map-right-panel-width") !== nextInset) {
        map.style.setProperty("--nbms-map-right-panel-width", nextInset);
      }

      map.querySelectorAll(".nbms-map-toolbar").forEach((node) => {
        const directButtons = [...node.children].filter((child) => child.matches?.("button[title]"));
        if (directButtons.length < 3) node.classList.remove("nbms-map-toolbar");
      });
      const defaultButton = map.querySelector('button[title="Default Extent"]');
      const toolbar = defaultButton?.parentElement;
      const directToolbarButtons = toolbar ? [...toolbar.children].filter((child) => child.matches?.("button[title]")) : [];
      const hasMapButtons = toolbar
        && directToolbarButtons.some((button) => button.getAttribute("title") === "Zoom In")
        && directToolbarButtons.some((button) => button.getAttribute("title") === "Zoom Out")
        && directToolbarButtons.some((button) => button.getAttribute("title") === "Measure Distance");
      if (!hasMapButtons) return;
      toolbar.classList.add("nbms-map-toolbar");
      const centeredLeft = "calc((100% - var(--nbms-map-right-panel-width, 0px)) / 2)";
      if (toolbar.style.left !== centeredLeft) toolbar.style.left = centeredLeft;
      if (toolbar.style.right !== "auto") toolbar.style.right = "auto";
      if (toolbar.style.transform !== "translateX(-50%)") toolbar.style.transform = "translateX(-50%)";
    });
  }

  function keepActiveNavigationVisible() {
    const active = [
      document.querySelector(".horiz-nav-link.active, .horiz-nav-links .active, .main-section-links .active"),
      document.querySelector(".context-subnav button.active, .context-subnav-tab.active, .context-subnav-scroll .active"),
    ].filter(Boolean);
    const signature = active.map((node) => `${node.textContent}:${node.offsetLeft}`).join("|");
    if (!signature || signature === UI.activeSignature) return;
    UI.activeSignature = signature;
    active.forEach((node) => {
      let parent = node.parentElement;
      let centered = false;
      while (parent && parent !== document.body) {
        if (parent.scrollWidth > parent.clientWidth + 8) {
          const parentRect = parent.getBoundingClientRect();
          const nodeRect = node.getBoundingClientRect();
          const delta = nodeRect.left - parentRect.left - ((parent.clientWidth - nodeRect.width) / 2);
          parent.scrollLeft = Math.max(0, parent.scrollLeft + delta);
          centered = true;
        }
        parent = parent.parentElement;
      }
      if (centered) return;
      try {
        node.scrollIntoView({ block: "nearest", inline: "center" });
      } catch (error) {
        node.scrollIntoView();
      }
    });
  }

  function refreshResponsiveLibraries() {
    const signature = `${window.innerWidth}x${window.innerHeight}:${document.documentElement.dataset.nbmsView || ""}`;
    if (signature === UI.resizeSignature) return;
    UI.resizeSignature = signature;
    [80, 480].forEach((delay) => {
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), delay);
    });
  }

  function enhancePlatformUi() {
    document.documentElement.classList.add("nbms-neon-ready", "nbms-ui-polished");
    markCurrentView();
    markResponsiveClusters();
    enhanceResponsiveTables();
    centerMapToolbars();
    keepActiveNavigationVisible();
    refreshResponsiveLibraries();
  }

  function mount() {
    enhancePlatformUi();
    enhanceGalleryImages();
    enhanceNativePhotoSection();
  }

  function scheduleMount() {
    if (UI.mountTimer) return;
    UI.mountTimer = window.setTimeout(() => {
      UI.mountTimer = null;
      mount();
    }, 80);
  }

  const observer = new MutationObserver(scheduleMount);
  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style", "aria-current"] });
  window.addEventListener("load", mount);
  setInterval(mount, 1500);
})();
