/**
 * BMS learning hub. Public content is limited to verified workflow taxonomy.
 * Real inspection records, staff names, rates, drawings and condition
 * judgements remain in governed systems and are never embedded here.
 */
(function () {
  const BASE = "/majorstructures/";
  const state = { activeTab: "workflow", workflow: null, damages: [], methods: [], loaded: false, search: "" };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);

  async function loadBmsData() {
    if (state.loaded) return;
    const [workflow, damages, methods] = await Promise.all([
      fetch(BASE + "data/inspection_workflow.json").then((response) => response.json()),
      fetch(BASE + "data/damage_catalogue.json").then((response) => response.json()),
      fetch(BASE + "data/repair_method_catalogue.json").then((response) => response.json()),
    ]);
    state.workflow = workflow;
    state.damages = damages;
    state.methods = methods;
    state.loaded = true;
  }

  function injectNavTab() {
    const navLinks = $(".horiz-nav-links");
    if (!navLinks || $("#nav-bms-hub")) return;
    const button = document.createElement("button");
    button.id = "nav-bms-hub";
    button.className = "horiz-nav-link";
    button.type = "button";
    button.textContent = "BMS Standards";
    button.addEventListener("click", showBmsHub);
    navLinks.appendChild(button);
  }

  function normalAppShell() {
    return $(".bms-shell") || $(".modern-theme-root") || $("#root > div");
  }

  function showBmsHub() {
    $$(".horiz-nav-link").forEach((element) => element.classList.remove("active"));
    $("#nav-bms-hub")?.classList.add("active");
    let container = $("#bms-hub-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "bms-hub-container";
      container.className = "bms-hub-root";
      ($("#root") || document.body).appendChild(container);
    }
    const appShell = normalAppShell();
    if (appShell && appShell !== container) appShell.style.display = "none";
    container.style.display = "block";
    container.innerHTML = '<div class="bms-empty">Loading verified BMS reference data...</div>';
    loadBmsData().then(renderBmsHub).catch(() => {
      container.innerHTML = '<div class="bms-empty">The BMS reference data could not be loaded.</div>';
    });
  }

  function hideBmsHub() {
    const container = $("#bms-hub-container");
    if (container) container.style.display = "none";
    const appShell = normalAppShell();
    if (appShell && appShell !== container) appShell.style.display = "";
    $("#nav-bms-hub")?.classList.remove("active");
  }

  function renderBmsHub() {
    const root = $("#bms-hub-container");
    if (!root || !state.workflow) return;
    root.innerHTML = `
      <div class="bms-hub-layout">
        <header class="bms-hub-header">
          <div class="bms-hub-header-left">
            <button class="bms-hub-back-btn" id="bms-hub-close" type="button" title="Return to portal"><span aria-hidden="true">←</span><span>Back to Portal</span></button>
            <div class="bms-hub-title-block"><span class="bms-hub-kicker">Bridge Management System Learning Workspace</span><h1>Inspection Standards and Field Tools</h1></div>
          </div>
          <div class="bms-hub-header-right"><span class="bms-hub-badge">Verified Taxonomy</span><span class="bms-hub-badge bms-hub-badge-blue">Local-Only Workspaces</span></div>
        </header>
        <nav class="bms-hub-tabs" aria-label="BMS reference sections">
          ${tabButton("workflow", "Inspection Workflow")}
          ${tabButton("damages", `${state.damages.length} Damage Types`)}
          ${tabButton("methods", `${state.methods.length} Repair Methods`)}
          ${tabButton("tools", "Planning and CAD")}
        </nav>
        <main class="bms-hub-main">${renderTabContent()}</main>
      </div>`;
    $("#bms-hub-close").addEventListener("click", hideBmsHub);
    $$(".bms-hub-tab", root).forEach((button) => button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      state.search = "";
      renderBmsHub();
    }));
    $("#bms-safe-search")?.addEventListener("input", (event) => {
      state.search = event.target.value;
      renderBmsHub();
      const input = $("#bms-safe-search");
      input?.focus();
      input?.setSelectionRange(state.search.length, state.search.length);
    });
    $$('[data-open-tool]', root).forEach((button) => button.addEventListener("click", () => openPortalTool(button.dataset.openTool)));
  }

  function tabButton(id, label) {
    return `<button class="bms-hub-tab ${state.activeTab === id ? "active" : ""}" type="button" data-tab="${id}">${escapeHtml(label)}</button>`;
  }

  function renderTabContent() {
    if (state.activeTab === "damages") return renderDamageTypes();
    if (state.activeTab === "methods") return renderRepairMethods();
    if (state.activeTab === "tools") return renderTools();
    return renderWorkflow();
  }

  function renderWorkflow() {
    return `<section class="bms-checklists-section">
      <div class="bms-section-intro"><h2>${escapeHtml(state.workflow.title)}</h2><p>${escapeHtml(state.workflow.scopeNote)}</p></div>
      <div class="bms-tier-grid">${state.workflow.types.map((type, index) => `
        <article class="bms-tier-card"><span class="bms-tier-num">Type ${index + 1}</span><h3>${escapeHtml(type.name)}</h3><div class="bms-tier-freq">${escapeHtml(type.timing)}</div><p><strong>Purpose:</strong> ${escapeHtml(type.purpose)}</p><p>${escapeHtml(type.activities)}</p><div class="bms-tier-footer"><small>${escapeHtml(type.status)}</small></div></article>`).join("")}</div>
      <div class="bms-form-card" style="margin-top:20px"><div class="bms-form-header"><h3>Governed Capture Sequence</h3></div><ol>${state.workflow.captureSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></div>
    </section>`;
  }

  function renderDamageTypes() {
    const query = state.search.trim().toLowerCase();
    const damages = state.damages.filter((damage) => !query || [damage.name, damage.geometry, damage.unit, ...(damage.measurements || [])].join(" ").toLowerCase().includes(query));
    return `<section class="bms-damages-section">
      <div class="bms-section-intro"><h2>Damage Capture Catalogue</h2><p>Verified damage names, drawing geometry and measurement units used by the inspection workspace. Condition and repair decisions require engineering review.</p></div>
      ${searchBox("Search damage types, geometry or units")}
      <div class="bms-damages-grid">${damages.map((damage, index) => `
        <article class="bms-damage-card"><div class="bms-damage-header"><div class="bms-damage-id-circle">${index + 1}</div><div><h3>${escapeHtml(damage.name)}</h3><span class="bms-hatch-code">${escapeHtml(damage.geometry)} geometry · ${escapeHtml(damage.unit)}</span></div></div><div class="bms-damage-meta"><div><strong>Measurements:</strong> ${escapeHtml((damage.measurements || []).join(", "))}</div></div></article>`).join("")}</div>
    </section>`;
  }

  function renderRepairMethods() {
    const query = state.search.trim().toLowerCase();
    const methods = state.methods.filter((method) => !query || method.toLowerCase().includes(query));
    return `<section class="bms-methods-section">
      <div class="bms-section-intro"><h2>Repair and Reinforcement Method Library</h2><p>The method names are available for consistent classification. Selection, design, quantities and rates are intentionally not prescribed by this learning portal.</p></div>
      ${searchBox("Search repair methods")}
      <div class="bms-methods-grid">${methods.map((method, index) => `
        <article class="bms-method-card"><div class="bms-method-top"><span class="bms-method-code">Method ${String(index + 1).padStart(2, "0")}</span><span class="bms-category-badge badge-blue">Reference</span></div><h3 class="bms-method-title">${escapeHtml(method)}</h3><p class="bms-method-desc">Use only after the affected member, damage measurements and engineering decision have been reviewed.</p></article>`).join("")}</div>
    </section>`;
  }

  function searchBox(placeholder) {
    return `<div class="bms-toolbar"><div class="bms-search-box"><input id="bms-safe-search" type="search" value="${escapeHtml(state.search)}" placeholder="${escapeHtml(placeholder)}"></div></div>`;
  }

  function renderTools() {
    return `<section class="bms-plans-section">
      <div class="bms-section-intro"><h2>Inspection Planning and CAD Capabilities</h2><p>These browser-local tools use approved portal structure records. Nothing is uploaded or published automatically.</p></div>
      <div class="bms-methods-grid">
        <article class="bms-method-card"><h3 class="bms-method-title">Inspection Planning Workspace</h3><p class="bms-method-desc">Create a plan, assign an inspection type and team, set dates, track progress and export the local plan register.</p><button class="bms-detail-btn" type="button" data-open-tool="plan">Open Planning Workspace</button></article>
        <article class="bms-method-card"><h3 class="bms-method-title">Inspection Drawing Workspace</h3><p class="bms-method-desc">Load a local PNG, JPEG, WebP or SVG drawing, annotate points, lines and areas, classify damage and repair method, then export JSON or SVG.</p><button class="bms-detail-btn" type="button" data-open-tool="cad">Open Drawing Workspace</button></article>
        <article class="bms-method-card"><h3 class="bms-method-title">Inspection Workflow Reference</h3><p class="bms-method-desc">Review inspection types, capture steps, damage quantities, condition grades and maintenance history views.</p><button class="bms-detail-btn" type="button" data-open-tool="workflow">Open Workflow Reference</button></article>
      </div>
      <div class="bms-info-banner" style="margin-top:20px"><strong>Privacy:</strong> Local drawings, annotations and plan records remain in this browser unless you export them. The static portal does not provide an official system of record.</div>
    </section>`;
  }

  function openPortalTool(tool) {
    hideBmsHub();
    const dataCapture = $$("button").find((button) => button.textContent.trim() === "Data Capture");
    dataCapture?.click();
    const id = tool === "cad" ? "#nbms-cad-button" : tool === "plan" ? "#nbms-plan-button" : "#nbms-workflow-button";
    let attempts = 0;
    const timer = setInterval(() => {
      const target = $(id);
      attempts += 1;
      if (target || attempts > 20) {
        clearInterval(timer);
        target?.click();
      }
    }, 150);
  }

  setInterval(injectNavTab, 1000);
})();
