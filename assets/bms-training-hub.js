/**
 * BMS Operations & Standards Hub
 * Reverse-engineered from National Bridge Management System Operations & Standards
 * Features:
 *  - 4 Expressway Viaducts & As-Built Ledger (Busega, Nalukolongo, Kajjansi IC, Nambigirwa)
 *  - 18 Standard Repair & Reinforcement Methods
 *  - 20 Standard Damage Classification Types
 *  - 5-Tier Inspection Framework with Interactive Routine & Emergency Checklists
 *  - BMS Inspection Plans Registry & Execution Status
 */

(function () {
  const BASE = "/majorstructures/";
  const state = {
    activeTab: "expressway", // expressway, methods, damages, checklists, plans
    ledger: [],
    methods: [],
    damages: [],
    checklists: null,
    plans: [],
    loaded: false,
    selectedStructure: null,
    selectedMethod: null,
    selectedDamage: null,
    categoryFilter: "all",
    searchQuery: "",
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  async function loadBmsData() {
    if (state.loaded) return;
    try {
      const [ledger, methods, damages, checklists, plans] = await Promise.all([
        fetch(BASE + "data/bms_expressway_ledger.json").then(r => r.json()),
        fetch(BASE + "data/bms_repair_methods.json").then(r => r.json()),
        fetch(BASE + "data/bms_damage_types.json").then(r => r.json()),
        fetch(BASE + "data/bms_checklists.json").then(r => r.json()),
        fetch(BASE + "data/bms_inspection_plans.json").then(r => r.json()),
      ]);
      state.ledger = ledger || [];
      state.methods = methods || [];
      state.damages = damages || [];
      state.checklists = checklists || {};
      state.plans = plans || [];
      state.selectedStructure = state.ledger[0] || null;
      state.loaded = true;
    } catch (err) {
      console.warn("BMS Training Hub data load notice:", err);
    }
  }

  function injectNavTab() {
    // Look for top navigation bar
    const navLinks = $(".horiz-nav-links");
    if (!navLinks) return;

    if ($("#nav-bms-hub")) return;

    const btn = document.createElement("button");
    btn.id = "nav-bms-hub";
    btn.className = "horiz-nav-link";
    btn.setAttribute("type", "button");
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;">
        <path d="M2 20h20M5 20V8l7-5 7 5v12M9 20v-6h6v6"/>
      </svg>
      BMS Standards & Ledger
    `;

    btn.addEventListener("click", () => {
      showBmsHub();
    });

    navLinks.appendChild(btn);

    // Also add a quick action button in Overview if present
    const quickActions = $(".quick-actions-panel .actions-grid");
    if (quickActions && !$("#qa-bms-hub")) {
      const qaBtn = document.createElement("button");
      qaBtn.id = "qa-bms-hub";
      qaBtn.className = "action-btn";
      qaBtn.setAttribute("type", "button");
      qaBtn.innerHTML = `
        <div class="action-icon" style="background:rgba(0,113,227,0.1); color:#0071E3;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 20h20M5 20V8l7-5 7 5v12M9 20v-6h6v6"/>
          </svg>
        </div>
        <div class="action-meta">
          <strong>BMS Standards & Ledger</strong>
          <small>As-Built Ledger, 18 Methods, 20 Damage Types</small>
        </div>
      `;
      qaBtn.addEventListener("click", () => {
        showBmsHub();
      });
      quickActions.appendChild(qaBtn);
    }
  }

  function showBmsHub() {
    // Set active class on nav
    $$(".horiz-nav-link").forEach(el => el.classList.remove("active"));
    const navBtn = $("#nav-bms-hub");
    if (navBtn) navBtn.classList.add("active");

    let container = $("#bms-hub-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "bms-hub-container";
      container.className = "bms-hub-root";
      
      const appRoot = $("#root") || document.body;
      appRoot.appendChild(container);
    }

    // Hide normal screens
    const appShell = $(".bms-shell") || $(".modern-theme-root") || $("#root > div");
    if (appShell && appShell !== container) {
      appShell.style.display = "none";
    }
    container.style.display = "block";

    loadBmsData().then(() => {
      renderBmsHub();
    });
  }

  function hideBmsHub() {
    const container = $("#bms-hub-container");
    if (container) container.style.display = "none";

    const appShell = $(".bms-shell") || $(".modern-theme-root") || $("#root > div");
    if (appShell && appShell !== container) {
      appShell.style.display = "";
    }

    const navBtn = $("#nav-bms-hub");
    if (navBtn) navBtn.classList.remove("active");

    // activate first tab
    const firstTab = $(".horiz-nav-link");
    if (firstTab && firstTab !== navBtn) firstTab.classList.add("active");
  }

  function renderBmsHub() {
    const root = $("#bms-hub-container");
    if (!root) return;

    root.innerHTML = `
      <div class="bms-hub-layout">
        <!-- Apple Frosted Header -->
        <header class="bms-hub-header">
          <div class="bms-hub-header-left">
            <button class="bms-hub-back-btn" id="bms-hub-close" title="Return to Main Portal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span>Back to Portal</span>
            </button>
            <div class="bms-hub-title-block">
              <span class="bms-hub-kicker">EXPRESSWAY BRIDGE MANAGEMENT SYSTEM · STANDARDS REPOSITORY</span>
              <h1>BMS Operations, Standards & As-Built Ledger</h1>
            </div>
          </div>
          <div class="bms-hub-header-right">
            <span class="bms-hub-badge">BIM Integrated</span>
            <span class="bms-hub-badge bms-hub-badge-blue">National Standards Framework</span>
          </div>
        </header>

        <!-- Apple Style Segmented Pill Controls -->
        <nav class="bms-hub-tabs">
          <button class="bms-hub-tab ${state.activeTab === 'expressway' ? 'active' : ''}" data-tab="expressway">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19h16M4 5h16M7 19V5M17 19V5"/></svg>
            Expressway Structures & Ledger
          </button>
          <button class="bms-hub-tab ${state.activeTab === 'methods' ? 'active' : ''}" data-tab="methods">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            18 Repair & Reinforcement Methods
          </button>
          <button class="bms-hub-tab ${state.activeTab === 'damages' ? 'active' : ''}" data-tab="damages">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
            20 Damage Classification Types
          </button>
          <button class="bms-hub-tab ${state.activeTab === 'checklists' ? 'active' : ''}" data-tab="checklists">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            5-Tier Inspection Framework & Checklists
          </button>
          <button class="bms-hub-tab ${state.activeTab === 'plans' ? 'active' : ''}" data-tab="plans">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Inspection Plans Registry
          </button>
        </nav>

        <!-- Main Content Area -->
        <main class="bms-hub-main">
          ${renderTabContent()}
        </main>
      </div>
    `;

    // Wire events
    $("#bms-hub-close").addEventListener("click", hideBmsHub);

    $$(".bms-hub-tab").forEach(tab => {
      tab.addEventListener("click", (e) => {
        state.activeTab = tab.getAttribute("data-tab");
        renderBmsHub();
      });
    });

    wireTabSpecificEvents();
  }

  function renderTabContent() {
    switch (state.activeTab) {
      case "expressway":
        return renderExpresswayLedger();
      case "methods":
        return renderRepairMethods();
      case "damages":
        return renderDamageTypes();
      case "checklists":
        return renderChecklists();
      case "plans":
        return renderInspectionPlans();
      default:
        return `<div class="bms-empty">Select a view</div>`;
    }
  }

  /* --------------------------------------------------------------------------
     1. Expressway Structures & As-Built Ledger
     -------------------------------------------------------------------------- */
  function renderExpresswayLedger() {
    const s = state.selectedStructure || state.ledger[0];
    if (!s) return `<div class="bms-empty">Loading ledger...</div>`;

    return `
      <div class="bms-ledger-grid">
        <!-- Sidebar: Structure Selection -->
        <aside class="bms-ledger-sidebar">
          <div class="bms-sidebar-header">
            <h3>Expressway Viaducts & Bridges</h3>
            <span class="bms-counter">${state.ledger.length} Structures</span>
          </div>
          <div class="bms-structure-list">
            ${state.ledger.map(item => `
              <div class="bms-structure-card ${item.id === s.id ? 'active' : ''}" data-structure-id="${item.id}">
                <div class="bms-structure-top">
                  <strong>${item.name}</strong>
                  <span class="bms-pill-badge">${item.chainage}</span>
                </div>
                <div class="bms-structure-meta">
                  <span>${item.length_m} m</span>
                  <span>•</span>
                  <span>${item.spans} Spans</span>
                  <span>•</span>
                  <span>${item.piers} Piers</span>
                </div>
                <div class="bms-structure-type">${item.bridge_type}</div>
              </div>
            `).join("")}
          </div>
        </aside>

        <!-- Detail Workspace -->
        <section class="bms-ledger-content">
          <div class="bms-ledger-card">
            <!-- Header -->
            <div class="bms-card-header">
              <div>
                <span class="bms-kicker">${s.corridor} · ${s.chainage}</span>
                <h2>${s.name}</h2>
              </div>
              <div class="bms-header-badges">
                <span class="bms-tag-green">Condition: ${s.condition_rating} (${s.condition_index}/10)</span>
                <span class="bms-tag-blue">${s.loading_class}</span>
              </div>
            </div>

            <!-- As-Built Specification Grid -->
            <div class="bms-specs-grid">
              <div class="bms-spec-box">
                <small>Total Length</small>
                <strong>${s.length_m} m</strong>
              </div>
              <div class="bms-spec-box">
                <small>Deck Width</small>
                <strong>${s.width_m} m</strong>
              </div>
              <div class="bms-spec-box">
                <small>Spans / Piers</small>
                <strong>${s.spans} Spans / ${s.piers} Piers</strong>
              </div>
              <div class="bms-spec-box">
                <small>Skew Angle</small>
                <strong>${s.skew_angle_deg}°</strong>
              </div>
              <div class="bms-spec-box">
                <small>Girders / Spacing</small>
                <strong>${s.girders_per_carriageway} / ${s.girder_spacing_m} m</strong>
              </div>
              <div class="bms-spec-box">
                <small>Girder Height</small>
                <strong>${s.girder_height_m}</strong>
              </div>
            </div>

            <!-- Foundation & Typology -->
            <div class="bms-info-banner">
              <div><strong>Structural Typology:</strong> ${s.bridge_type}</div>
              <div><strong>Foundation System:</strong> ${s.foundation_type}</div>
            </div>

            <!-- Visual Ledger: Plan Drawing and Panorama -->
            <div class="bms-visual-grid">
              <div class="bms-visual-card">
                <div class="bms-visual-title">
                  <span>General Arrangement (GA) Engineering Plan Drawing</span>
                  <a href="${BASE + s.plan_drawing}" target="_blank" class="bms-link-btn">Full Resolution</a>
                </div>
                <div class="bms-image-frame">
                  <img src="${BASE + s.plan_drawing}" alt="${s.name} Plan Drawing" />
                </div>
              </div>
              <div class="bms-visual-card">
                <div class="bms-visual-title">
                  <span>As-Built Panoramic Site Survey View</span>
                  <a href="${BASE + s.panoramic_photo}" target="_blank" class="bms-link-btn">Full Resolution</a>
                </div>
                <div class="bms-image-frame">
                  <img src="${BASE + s.panoramic_photo}" alt="${s.name} Panoramic" />
                </div>
              </div>
            </div>

            <!-- Member Hierarchy (BIM Tree) -->
            <div class="bms-hierarchy-section">
              <h3>BMS Member Structural Hierarchy</h3>
              <div class="bms-hierarchy-grid">
                <div class="bms-hierarchy-col">
                  <h4>Superstructure</h4>
                  <ul>
                    ${s.member_hierarchy.superstructure.map(m => `<li>${m}</li>`).join("")}
                  </ul>
                </div>
                <div class="bms-hierarchy-col">
                  <h4>Substructure</h4>
                  <ul>
                    ${s.member_hierarchy.substructure.map(m => `<li>${m}</li>`).join("")}
                  </ul>
                </div>
                <div class="bms-hierarchy-col">
                  <h4>Accessories & Drainage</h4>
                  <ul>
                    ${s.member_hierarchy.accessories.map(m => `<li>${m}</li>`).join("")}
                  </ul>
                </div>
              </div>
            </div>

            <!-- Footer Meta -->
            <div class="bms-card-footer">
              <span>Last Inspection: <strong>${s.last_inspection} (${s.last_inspection_type})</strong></span>
              <span>Lead Inspector: <strong>${s.inspector}</strong></span>
              <span>As-Built Document Ref: <strong>${s.as_built_ref}</strong></span>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     2. 18 Standard Repair & Reinforcement Methods
     -------------------------------------------------------------------------- */
  function renderRepairMethods() {
    let filtered = state.methods;
    if (state.categoryFilter === "repair") {
      filtered = filtered.filter(m => m.category === "Repair");
    } else if (state.categoryFilter === "reinforcement") {
      filtered = filtered.filter(m => m.category === "Reinforcement");
    }

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.code.toLowerCase().includes(q) ||
        m.overview.toLowerCase().includes(q) ||
        m.target_damages.some(d => d.toLowerCase().includes(q))
      );
    }

    return `
      <div class="bms-methods-section">
        <!-- Toolbar -->
        <div class="bms-toolbar">
          <div class="bms-filter-pills">
            <button class="bms-pill ${state.categoryFilter === 'all' ? 'active' : ''}" data-filter="all">All Methods (${state.methods.length})</button>
            <button class="bms-pill ${state.categoryFilter === 'repair' ? 'active' : ''}" data-filter="repair">Repair Methods (11)</button>
            <button class="bms-pill ${state.categoryFilter === 'reinforcement' ? 'active' : ''}" data-filter="reinforcement">Reinforcement Methods (7)</button>
          </div>
          <div class="bms-search-box">
            <input type="text" id="bms-method-search" placeholder="Search methods, damage, or members..." value="${state.searchQuery}" />
          </div>
        </div>

        <!-- Grid of 18 Methods -->
        <div class="bms-methods-grid">
          ${filtered.map(m => `
            <article class="bms-method-card" data-method-id="${m.id}">
              <div class="bms-method-top">
                <span class="bms-method-code">${m.code}</span>
                <span class="bms-category-badge ${m.category === 'Reinforcement' ? 'badge-purple' : 'badge-blue'}">${m.category}</span>
              </div>
              <h3 class="bms-method-title">${m.name}</h3>
              
              <div class="bms-method-diagram">
                <img src="${BASE + m.diagram}" alt="${m.name}" loading="lazy" />
              </div>

              <p class="bms-method-desc">${m.overview}</p>

              <div class="bms-method-tags">
                <small>Target Damages:</small>
                <div class="bms-tag-list">
                  ${m.target_damages.map(d => `<span class="bms-mini-tag">${d}</span>`).join("")}
                </div>
              </div>

              <div class="bms-method-footer">
                <div>
                  <small>Standard Unit Rate:</small>
                  <strong>${Number(m.unit_rate_ugx).toLocaleString()} UGX / ${m.unit}</strong>
                </div>
                <button class="bms-detail-btn" data-method-btn="${m.id}">View Spec</button>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     3. 20 Standard Damage Classification Types
     -------------------------------------------------------------------------- */
  function renderDamageTypes() {
    return `
      <div class="bms-damages-section">
        <div class="bms-section-intro">
          <h2>Standardized BMS Defect & Damage Catalog</h2>
          <p>The 20 official damage types captured via the BMS Mobile Client (MC) with automated hatching, measurement units, and structural member associations.</p>
        </div>

        <div class="bms-damages-grid">
          ${state.damages.map(d => `
            <div class="bms-damage-card">
              <div class="bms-damage-header">
                <div class="bms-damage-id-circle">${d.id}</div>
                <div>
                  <h3>${d.name}</h3>
                  <span class="bms-hatch-code">CAD Hatch: <code>${d.hatch}</code> · Unit: <strong>${d.unit}</strong></span>
                </div>
              </div>

              <div class="bms-damage-photo-frame">
                <img src="${BASE + d.photo}" alt="${d.name}" loading="lazy" />
              </div>

              <p class="bms-damage-desc">${d.description}</p>

              <div class="bms-damage-meta">
                <div><strong>Measurement:</strong> ${d.shape_type} (${d.use_crack_width ? 'Crack Width, ' : ''}${d.use_length ? 'Length, ' : ''}${d.use_width ? 'Width' : 'Area'})</div>
                <div><strong>Recommended Repair:</strong> <span class="bms-highlight-text">${d.primary_repair}</span></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     4. 5-Tier Inspection Framework & Checklists
     -------------------------------------------------------------------------- */
  function renderChecklists() {
    const c = state.checklists || {};
    const types = c.inspection_types || [];
    const routine = c.sample_routine_checklist || {};
    const emergency = c.sample_emergency_checklist || {};

    return `
      <div class="bms-checklists-section">
        <!-- 5-Tier Hierarchy Overview -->
        <div class="bms-tier-overview">
          <h3>The 5 Bridge Inspection Tiers</h3>
          <div class="bms-tier-grid">
            ${types.map((t, idx) => `
              <div class="bms-tier-card">
                <span class="bms-tier-num">Tier ${idx + 1}</span>
                <h4>${t.name}</h4>
                <div class="bms-tier-freq">${t.frequency}</div>
                <p><strong>Purpose:</strong> ${t.purpose}</p>
                <div class="bms-tier-footer">
                  <small>Deliverable: ${t.deliverable}</small>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Interactive Checklists -->
        <div class="bms-checklists-split">
          <!-- Routine Inspection Form -->
          <div class="bms-form-card">
            <div class="bms-form-header">
              <span class="bms-tag-blue">Annual Checkup</span>
              <h3>Routine Inspection Checklist</h3>
              <p><strong>Structure:</strong> ${routine.bridge_name} · Direction: ${routine.direction} · Location: ${routine.location}</p>
              <small>Date: ${routine.inspection_date} · Lead Inspector: ${routine.inspector}</small>
            </div>

            <div class="bms-checklist-table-wrap">
              <table class="bms-table">
                <thead>
                  <tr>
                    <th>Component Member</th>
                    <th>Inspection Finding</th>
                    <th>Observed Defect Photo</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${(routine.items || []).map(item => `
                    <tr>
                      <td><strong>${item.member}</strong></td>
                      <td>
                        <span class="bms-result-badge ${item.result === 'No defect' ? 'badge-ok' : 'badge-alert'}">
                          ${item.result}
                        </span>
                      </td>
                      <td>
                        ${item.photo ? `
                          <a href="${BASE + item.photo}" target="_blank" class="bms-thumb-link">
                            <img src="${BASE + item.photo}" alt="${item.member}" class="bms-mini-thumb" />
                            <span>View Defect</span>
                          </a>
                        ` : `<span class="bms-muted-text">None</span>`}
                      </td>
                      <td>${item.action}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <div class="bms-notes-box">
              <strong>Inspector's Notes & Recommendations:</strong>
              <p>${routine.notes}</p>
              <p><em>${routine.inspector_opinion}</em></p>
            </div>
          </div>

          <!-- Emergency Inspection Form -->
          <div class="bms-form-card">
            <div class="bms-form-header">
              <span class="bms-tag-red">Accident Response</span>
              <h3>Emergency Inspection Checklist</h3>
              <p><strong>Structure:</strong> ${emergency.bridge_name} · Location: ${emergency.location}</p>
              <small>Date: ${emergency.inspection_date} · Inspector: ${emergency.inspector}</small>
            </div>

            <div class="bms-incident-banner">
              <strong>Incident Event:</strong> ${emergency.incident_overview}
            </div>

            <div class="bms-checklist-table-wrap">
              <table class="bms-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Problem?</th>
                    <th>Inspection Result</th>
                    <th>Photo</th>
                  </tr>
                </thead>
                <tbody>
                  ${(emergency.items || []).map(item => `
                    <tr>
                      <td><strong>${item.member}</strong></td>
                      <td><span class="bms-result-badge ${item.problem === 'Yes' ? 'badge-red' : 'badge-ok'}">${item.problem}</span></td>
                      <td>${item.result}</td>
                      <td>
                        ${item.photo ? `
                          <a href="${BASE + item.photo}" target="_blank" class="bms-thumb-link">
                            <img src="${BASE + item.photo}" alt="${item.member}" class="bms-mini-thumb" />
                          </a>
                        ` : `-`}
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>

            <div class="bms-action-box">
              <h4>Action Plan & Restrictions</h4>
              <div><strong>Usage Restrictions Required?</strong> Yes</div>
              <p class="bms-highlight-red">${emergency.action_plan?.restriction_details}</p>
              <div><strong>Urgency:</strong> <span class="bms-tag-red">${emergency.action_plan?.urgency}</span></div>
              <div><strong>Selected Repair Methods:</strong> ${(emergency.action_plan?.selected_repair_methods || []).join(", ")}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
     5. BMS Inspection Plans Registry
     -------------------------------------------------------------------------- */
  function renderInspectionPlans() {
    return `
      <div class="bms-plans-section">
        <div class="bms-section-intro">
          <h2>BMS Inspection Plans Registry & Execution Status</h2>
          <p>Official inspection schedules and active execution logs across the national bridge and major culvert network.</p>
        </div>

        <div class="bms-plans-table-card">
          <table class="bms-table">
            <thead>
              <tr>
                <th>Plan Code</th>
                <th>Bridge Name</th>
                <th>Inspection Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Inspector</th>
                <th>Scope of Inspection</th>
              </tr>
            </thead>
            <tbody>
              ${state.plans.map(p => `
                <tr>
                  <td><code>${p.plan_code}</code></td>
                  <td><strong>${p.bridge_name}</strong></td>
                  <td><span class="bms-tag-blue">${p.plan_type}</span></td>
                  <td>${p.start_date}</td>
                  <td>${p.end_date}</td>
                  <td>
                    <span class="bms-status-pill ${p.status === 'Completed' ? 'status-done' : 'status-progress'}">
                      ${p.status}
                    </span>
                  </td>
                  <td>${p.inspector}</td>
                  <td class="bms-scope-cell">${p.scope}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function wireTabSpecificEvents() {
    // Structure click in Ledger
    $$(".bms-structure-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-structure-id");
        state.selectedStructure = state.ledger.find(s => s.id === id) || state.ledger[0];
        renderBmsHub();
      });
    });

    // Category filter pills in Methods
    $$(".bms-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        state.categoryFilter = pill.getAttribute("data-filter");
        renderBmsHub();
      });
    });

    // Search box in Methods
    const searchInput = $("#bms-method-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        const grid = $(".bms-methods-grid");
        if (grid) {
          // Re-render methods section
          const methodsSection = $(".bms-methods-section");
          if (methodsSection) {
            methodsSection.outerHTML = renderRepairMethods();
            wireTabSpecificEvents();
          }
        }
      });
    }

    // View Spec Button in Methods
    $$("[data-method-btn]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-method-btn");
        const method = state.methods.find(m => m.id === id);
        if (method) showMethodModal(method);
      });
    });
  }

  function showMethodModal(m) {
    let modal = $("#bms-method-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "bms-method-modal";
      modal.className = "bms-modal-backdrop";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bms-modal-card">
        <div class="bms-modal-header">
          <div>
            <span class="bms-kicker">${m.code} · ${m.category}</span>
            <h2>${m.name}</h2>
          </div>
          <button class="bms-modal-close" id="bms-modal-close">&times;</button>
        </div>

        <div class="bms-modal-body">
          <div class="bms-modal-diagram">
            <img src="${BASE + m.diagram}" alt="${m.name}" />
          </div>

          <div class="bms-modal-content">
            <h4>Engineering Overview & Procedure</h4>
            <p>${m.overview}</p>

            <h4>Underlying Working Principle</h4>
            <p>${m.principle}</p>

            <div class="bms-modal-meta-grid">
              <div>
                <small>Standard Unit Rate</small>
                <strong>${Number(m.unit_rate_ugx).toLocaleString()} UGX / ${m.unit}</strong>
              </div>
              <div>
                <small>Measurement Unit</small>
                <strong>${m.unit}</strong>
              </div>
            </div>

            <h4>Applicable Structural Elements</h4>
            <div class="bms-tag-list">
              ${m.applicable_members.map(el => `<span class="bms-pill-badge">${el}</span>`).join("")}
            </div>

            <h4>Target Damage Classifications</h4>
            <div class="bms-tag-list">
              ${m.target_damages.map(d => `<span class="bms-mini-tag">${d}</span>`).join("")}
            </div>
          </div>
        </div>

        <div class="bms-modal-footer">
          <button class="bms-btn-primary" id="bms-modal-ok">Close Specification</button>
        </div>
      </div>
    `;

    modal.style.display = "flex";

    $("#bms-modal-close").addEventListener("click", () => { modal.style.display = "none"; });
    $("#bms-modal-ok").addEventListener("click", () => { modal.style.display = "none"; });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  // Periodic polling to ensure tab injection after React renders
  setInterval(injectNavTab, 1000);

})();
