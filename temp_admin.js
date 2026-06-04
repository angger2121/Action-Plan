

// ── STATE VARIABLES ──
let FORM_CONFIG = {};
let PARTICIPANTS = [];
let formId = "form_bayan";




let activeTab = "tracker";
let activeStatus = "ALL";
let activeDept = "ALL";
let searchTerm = "";

let collapsedSections = {}; // track expanded/collapsed state of section configurators

let PARTICIPANTS_STAGE1 = [];

function loadAndMergeParticipants() {
  const cachedS1 = localStorage.getItem(`mdi_participants_${formId}`);
  PARTICIPANTS_STAGE1 = cachedS1 ? JSON.parse(cachedS1) : [];

  const merged = [];
  let index = 1;

  PARTICIPANTS_STAGE1.forEach(p1 => {
    merged.push({
      no: index++,
      name: p1.name,
      dept: p1.dept,
      grade: p1.grade,
      status: p1.status || "none",
      submitDate: p1.submitDate || "",
      answers: p1.answers || {},
      s2Status: p1.s2Status || "",
      s2Update: p1.s2Update || "",
      s2Challenge: p1.s2Challenge || "",
            clientCompany: p1.clientCompany || null,
      picNoStage1: p1.no
    });
  });

  PARTICIPANTS = merged;
}


function getActualStatus(p) {
  if (p.status === "done" || (p.s2Status && p.s2Status.toLowerCase().includes("selesai")) || (p.s2Status && p.s2Status.toLowerCase().includes("completed"))) return "done";
  return "prog";
}
function getActualStatus(p) {
  if (p.status === "done" || (p.s2Status && p.s2Status.toLowerCase().includes("selesai")) || (p.s2Status && p.s2Status.toLowerCase().includes("completed"))) return "done";
  return "prog";
}

function getActionPlans(p) {
  if (!p.answers) return [];
  const plans = [];
  if (typeof FORM_CONFIG !== 'undefined' && FORM_CONFIG && FORM_CONFIG.fields) {
    FORM_CONFIG.fields.forEach(f => {
      if (f.id.startsWith("q_custom_")) {
        const lbl = f.label.toLowerCase();
        if (lbl.includes("rencana tindakan") || lbl.includes("action plan") || lbl.includes("commitment action")) {
          const ans = p.answers[f.id];
          if (ans && String(ans).trim() !== "" && ans !== "—") {
            let splitted = String(ans).split(/\n|;|,|\.|\-\s+|\d+\)/).map(s => s.trim().replace(/^[\-\)]\s*/, '')).filter(s => s.length > 2 && !/^\d+$/.test(s) && s.toLowerCase() !== "null");
            plans.push(...splitted);
          }
        }
      }
    });
  }
  return plans;
}



// ── INITIALIZE APPLICATION ──
function init() {
  const cachedForms = localStorage.getItem("mdi_forms");
  let forms = [];
  if (cachedForms) {
    try {
      forms = JSON.parse(cachedForms);
      let updated = false;
      forms.forEach(form => {
        if (form.fields) {
          form.fields.forEach(field => {
            if (field.id === "q_dept" && field.type === "select") {
              field.type = "text";
              field.options = [];
              updated = true;
            }
          });
        }
      });
      if (updated) {
        localStorage.setItem("mdi_forms", JSON.stringify(forms));
      }
    } catch (e) {
      console.error("Migration error:", e);
      forms = JSON.parse(cachedForms) || [];
    }
  } else {
    alert("Warning: Forms database not found in local storage. Please open Dashboard Gateway first.");
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  formId = urlParams.get('formId') || 'form_bayan';

  let currentForm = forms.find(f => f.id === formId);
  if (!currentForm && forms.length > 0) {
    currentForm = forms[0];
    formId = currentForm.id;
  }
  
  if (!currentForm) {
    currentForm = {
      id: formId,
      title: "Unknown Form",
      desc: "Tidak ada data formulir yang ditemukan.",
      fields: [],
      sections: []
    };
  }

  FORM_CONFIG = currentForm;

  if (!FORM_CONFIG.sections) {
    FORM_CONFIG.sections = ["Bagian 1 – Identitas", "Bagian 2 – Action Plan Commitments", "Bagian 3 – Progress & Challenges"];
  }

  // Load participants
  loadAndMergeParticipants();
  

  // Set top title and header inputs
  document.getElementById("head-form-title").textContent = FORM_CONFIG.title;
  document.getElementById("admin-brand-title").innerHTML = `${FORM_CONFIG.title} <span>Action Plan Admin</span>`;
  document.getElementById("cfg-title").value = FORM_CONFIG.title;
  document.getElementById("cfg-desc").value = FORM_CONFIG.desc;
  document.getElementById("cfg-training-date").value = FORM_CONFIG.trainingDate || "";

  rebuildDeptFilters();
  renderAll();
  
}

window.addEventListener('storage', (e) => {
  if (e.key === 'mdi_forms') {
    const list = JSON.parse(e.newValue);
    const item = list.find(f => f.id === formId);
    if (item) {
      FORM_CONFIG = item;
      document.getElementById("cfg-desc").value = FORM_CONFIG.desc;
      document.getElementById("head-form-title").textContent = FORM_CONFIG.title;
      document.getElementById("admin-brand-title").innerHTML = `${FORM_CONFIG.title} <span>Action Plan Admin</span>`;
      if (activeTab === "backend") {
        renderConfiguratorUI();
      }
    }
  }
});

// ── RENDER CORE ──
function renderAll() {
  rebuildDeptFilters();
  if (activeTab === "tracker") {
    renderTrackerTable();
  } else if (activeTab === "backend") {
    renderConfiguratorUI();
  } else if (activeTab === "spreadsheet") {
    renderSpreadsheet();
  } else if (activeTab === "spreadsheet2") {
    renderSpreadsheet2();
  }
  updateMiniKPIs();
}

// ── PORTAL NAVIGATION ──
function switchTab(tabId) {
  activeTab = tabId;
  document.getElementById("menu-tracker").classList.remove("active");
  document.getElementById("menu-backend").classList.remove("active");
  document.getElementById("menu-spreadsheet").classList.remove("active");
  document.getElementById("menu-spreadsheet2").classList.remove("active");
  const mc = document.getElementById("menu-clients"); if(mc) mc.classList.remove("active");
  
  document.getElementById("section-tracker").style.display = "none";
  document.getElementById("section-backend").style.display = "none";
  document.getElementById("section-spreadsheet").style.display = "none";
  document.getElementById("section-spreadsheet2").style.display = "none";
  const sc = document.getElementById("section-clients"); if(sc) sc.style.display = "none";

  if (tabId === "tracker") {
    document.getElementById("menu-tracker").classList.add("active");
    document.getElementById("section-tracker").style.display = "block";
    document.getElementById("page-head-title").innerHTML = `Dashboard Admin <em style="font-style:normal; color:var(--mdi-orange); font-weight:600; font-size:13.5px; background:var(--mdi-orange-soft); padding:2px 8px; border-radius:4px; margin-left:8px;">${FORM_CONFIG.title}</em>`;
    renderTrackerTable();
  } else if (tabId === "backend") {
    document.getElementById("menu-backend").classList.add("active");
    document.getElementById("section-backend").style.display = "block";
    document.getElementById("page-head-title").innerHTML = `Form Backend Settings <em style="font-style:normal; color:var(--mdi-orange); font-weight:600; font-size:13.5px; background:var(--mdi-orange-soft); padding:2px 8px; border-radius:4px; margin-left:8px;">${FORM_CONFIG.title}</em>`;
    renderConfiguratorUI();
  } else if (tabId === "spreadsheet") {
    document.getElementById("menu-spreadsheet").classList.add("active");
    document.getElementById("section-spreadsheet").style.display = "block";
    document.getElementById("page-head-title").innerHTML = `Rekap Spreadsheet Awal <em style="font-style:normal; color:var(--mdi-orange); font-weight:600; font-size:13.5px; background:var(--mdi-orange-soft); padding:2px 8px; border-radius:4px; margin-left:8px;">${FORM_CONFIG.title}</em>`;
    renderSpreadsheet();
  } else if (tabId === "spreadsheet2") {
    document.getElementById("menu-spreadsheet2").classList.add("active");
    document.getElementById("section-spreadsheet2").style.display = "block";
    document.getElementById("page-head-title").innerHTML = `Rekap Penyelesaian <em style="font-style:normal; color:var(--mdi-orange); font-weight:600; font-size:13.5px; background:var(--mdi-orange-soft); padding:2px 8px; border-radius:4px; margin-left:8px;">${FORM_CONFIG.title}</em>`;
    renderSpreadsheet2();
  }
}



// ── DASHBOARD ADMIN: TRACKER LOGIC ──
function updateMiniKPIs() {
  const total = PARTICIPANTS.length;
  const done = PARTICIPANTS.filter(p => getActualStatus(p) === "done").length;
  const prog = PARTICIPANTS.filter(p => getActualStatus(p) === "prog").length;

  let totalAP = 0;
  PARTICIPANTS.forEach(p => {
    totalAP += getActionPlans(p).length;
  });

  document.getElementById("kpi-total").textContent = total;
  document.getElementById("kpi-ap").textContent = totalAP;
  document.getElementById("kpi-done").textContent = done;
  document.getElementById("kpi-prog").textContent = prog;
}

function rebuildDeptFilters() {
  const depts = [...new Set(PARTICIPANTS.map(p => p.dept))].sort();
  const select = document.getElementById("deptSelect");
  const currentVal = select.value;
  select.innerHTML = '<option value="ALL">All Departments</option>';
  depts.forEach(d => {
    if (!d) return;
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    if (d === currentVal) opt.selected = true;
    select.appendChild(opt);
  });
}

function filterStatus(s) {
  activeStatus = s;
  document.querySelectorAll("#f-ALL, #f-done, #f-prog, #f-none, #f-overdue, #f-late").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById("f-" + s);
  if (btn) btn.classList.add("active");
  renderTrackerTable();
}

function filterDept(d) {
  activeDept = d;
  renderTrackerTable();
}

function doSearch(v) {
  searchTerm = v.toLowerCase();
  renderTrackerTable();
}

function getFilteredData() {
  return PARTICIPANTS.filter(p => {
    const actStatus = getActualStatus(p);
    const sOk = activeStatus === "ALL" || actStatus === activeStatus;
    const dOk = activeDept === "ALL" || p.dept === activeDept;
    const qOk = searchTerm === "" ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.dept.toLowerCase().includes(searchTerm) ||
      (p.grade && p.grade.toLowerCase().includes(searchTerm));
    return sOk && dOk && qOk;
  });
}

function formatDisplayDate(val) {
  if (!val) return "";
  const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return val;
}

function renderTrackerTable() {
  const data = getFilteredData();
  const body = document.getElementById("trackerTableBody");
  const empty = document.getElementById("emptyState");
  const thead = document.querySelector(".table-card table thead");

  // Unified header rendering
  thead.innerHTML = `
    <tr>
      <th style="width:40px; text-align:center;"><input type="checkbox" id="selectAllCb" onclick="toggleSelectAll(this)"></th>
      <th style="width:44px">#</th>
      <th style="width:160px">PARTICIPANT</th>
      <th style="width:120px">DEPARTMENT</th>
      <th style="width:250px">ACTION PLAN (COMMITMENT)</th>
      <th style="width:140px; text-align:center;">30-DAY STATUS</th>
      <th style="width:200px">UPDATE & NOTES</th>
      <th style="width:200px">CHALLENGE</th>
      <th style="width:180px; text-align:center;">ACTIONS</th>
      <th style="width:36px"></th>
    </tr>
  `;

  if (data.length === 0) {
    body.innerHTML = "";
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    body.innerHTML = data.map(p => {
      // Action Plans Extraction
      const plans = getActionPlans(p);
      const firstPlan = plans.length > 0 ? plans[0] : "No action plan recorded";
      const moreText = plans.length > 1 ? `<div style="font-size:11px; color:var(--mdi-muted); margin-top:4px;">+${plans.length - 1} more actions</div>` : "";

      // Dynamic rendering of unified dropdown status select
      const displayStatus = getActualStatus(p);
      
      let statusSelectHtml = `
        <td style="text-align:center;">
          <select onchange="updateParticipantStatus(${p.no}, this.value)" onclick="event.stopPropagation();" class="status-select select-${displayStatus}">
            <option value="prog" ${displayStatus === 'prog' ? 'selected' : ''}>In Progress</option>
            <option value="done" ${displayStatus === 'done' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
      `;

      const s2Update = p.s2Update || "—";
      const s2Challenge = p.s2Challenge || `<span style="color:var(--mdi-danger); font-size:12px;">⚠️ None reported</span>`;

      return `
      <tr onclick="toggleRow(${p.no})" id="row-${p.no}">
        <td style="text-align:center;" onclick="event.stopPropagation();"><input type="checkbox" class="row-cb" value="${p.no}" onclick="checkSelected()"></td>
        <td class="td-num">${p.no}</td>
        <td><div class="td-name">${p.name}</div></td>
        <td><span class="dept-tag">${p.dept}</span></td>
        <td>
          <div style="font-size:13px; color:var(--mdi-ink); line-height:1.4;">${firstPlan}</div>
          ${moreText}
        </td>
        ${statusSelectHtml}
        <td><div style="font-size:12.5px; color:var(--mdi-muted); line-height:1.4;">${s2Update}</div></td>
        <td><div style="font-size:12.5px; color:var(--mdi-muted); line-height:1.4;">${s2Challenge}</div></td>
        <td>
          <div style="display:flex; gap:6px; justify-content:center;" onclick="event.stopPropagation();">
            <button class="btn" style="padding: 4px 8px; font-size:11px;" onclick="openEditPICModal(${p.no})">✏️ Edit</button>
            <button class="btn" style="padding: 4px 8px; font-size:11px; background:var(--mdi-orange); border-color:var(--mdi-orange); color:#fff;" onclick="copyParticipantLink(${p.no})">🔗 Salin Link</button>
            <button class="btn btn-danger" style="padding: 4px 8px; font-size:11px;" onclick="deletePIC(${p.no})">🗑️ Delete</button>
          </div>
        </td>
        <td><button class="expand-btn" id="btn-${p.no}" onclick="event.stopPropagation();toggleRow(${p.no})">›</button></td>
      </tr>
      <tr class="detail-row" id="detail-${p.no}">
        <td colspan="10" class="detail-cell" style="background:#f8f9fa; border-left: 3px solid #d95d39;">
          <div class="detail-inner" style="padding:0;">
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; padding: 16px 8px;">
              <div>
                <div style="font-size:10px; font-weight:800; color:var(--mdi-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">ALL ${plans.length} ACTION PLANS</div>
                <ol style="margin:0; padding-left:16px; font-size:13px; color:var(--mdi-ink); line-height:1.6; font-weight:600; color:#d95d39;">
                  ${plans.map(pl => `<li style="margin-bottom:8px;"><span style="color:var(--mdi-ink); font-weight:400;">${pl}</span></li>`).join("")}
                </ol>
              </div>
              <div>
                <div style="font-size:10px; font-weight:800; color:var(--mdi-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">30-DAY UPDATE</div>
                <div style="font-size:13px; color:var(--mdi-ink); line-height:1.5;">${p.s2Update || "No update reported."}</div>
              </div>
              <div>
                <div style="font-size:10px; font-weight:800; color:var(--mdi-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">CHALLENGE / BARRIER</div>
                <div style="font-size:13px; color:var(--mdi-ink); line-height:1.5;">${p.s2Challenge || "No challenges reported."}</div>
              </div>
            </div>
          </div>
        </td>
      </tr>
      `;
    }).join("");
  }
  document.getElementById("tracker-count").textContent = `Showing ${data.length} of ${PARTICIPANTS.length}`;
  checkSelected(); // Reset bulk action UI
}

function toggleSelectAll(el) {
  document.querySelectorAll('.row-cb').forEach(cb => cb.checked = el.checked);
  checkSelected();
}

function checkSelected() {
  const cbs = document.querySelectorAll('.row-cb:checked');
  const btn = document.getElementById('btn-delete-selected');
  if (btn) {
    btn.style.display = cbs.length > 0 ? 'inline-block' : 'none';
    btn.textContent = `🗑️ Hapus Terpilih (${cbs.length})`;
  }
}

function deleteSelectedPIC() {
  const checked = document.querySelectorAll('.row-cb:checked');
  if (checked.length === 0) return;
  if (confirm(`Apakah Anda yakin ingin menghapus ${checked.length} data terpilih secara permanen?`)) {
    const idsToDelete = Array.from(checked).map(cb => parseInt(cb.value));
    PARTICIPANTS_STAGE1 = PARTICIPANTS_STAGE1.filter(p => !idsToDelete.includes(p.no));
    saveState();
    loadAndMergeParticipants();
    renderAll();
    showToast(`${checked.length} data berhasil dihapus.`);
  }
}

function toggleRow(no) {
  const detail = document.getElementById("detail-"+no);
  const btn    = document.getElementById("btn-"+no);
  const row    = document.getElementById("row-"+no);
  const isOpen = detail.classList.contains("open");

  document.querySelectorAll("#trackerTableBody .detail-row").forEach(r => r.classList.remove("open"));
  document.querySelectorAll("#trackerTableBody .expand-btn").forEach(b => b.classList.remove("open"));
  document.querySelectorAll("#trackerTableBody tr:not(.detail-row)").forEach(r => r.classList.remove("expanded"));

  if(!isOpen) {
    detail.classList.add("open");
    btn.classList.add("open");
    row.classList.add("expanded");
  }
}

// ── CRUD ACTIONS ──
function updateParticipantStatus(no, newStatus) {
  const p = PARTICIPANTS.find(item => item.no === no);
  if (!p) return;

  // Always save to Stage 1
  let p1 = PARTICIPANTS_STAGE1.find(item => item.name.trim().toLowerCase() === p.name.trim().toLowerCase());
  if (!p1) {
    const newNo = PARTICIPANTS_STAGE1.length > 0 ? Math.max(...PARTICIPANTS_STAGE1.map(x => x.no)) + 1 : 1;
    p1 = { no: newNo, name: p.name, dept: p.dept, grade: p.grade, status: newStatus, answers: {} };
    PARTICIPANTS_STAGE1.push(p1);
  } else {
    p1.status = newStatus;
  }
  localStorage.setItem(`mdi_participants_${formId}`, JSON.stringify(PARTICIPANTS_STAGE1));

  showToast(`Status ${p.name} berhasil diperbarui!`);
  loadAndMergeParticipants();
  renderAll();
}

function deletePIC(no) {
  const p = PARTICIPANTS.find(item => item.no === no);
  if (p && confirm(`Apakah Anda yakin ingin menghapus peserta "${p.name}" secara permanen?`)) {
    PARTICIPANTS_STAGE1 = PARTICIPANTS_STAGE1.filter(item => item.name.trim().toLowerCase() !== p.name.trim().toLowerCase());
    PARTICIPANTS_STAGE1.forEach((x, idx) => x.no = idx + 1);
    localStorage.setItem(`mdi_participants_${formId}`, JSON.stringify(PARTICIPANTS_STAGE1));

    loadAndMergeParticipants();
    rebuildDeptFilters();
    renderAll();
    showToast(`Peserta "${p.name}" berhasil dihapus.`);
  }
}

function saveState() {
  localStorage.setItem(`mdi_participants_${formId}`, JSON.stringify(PARTICIPANTS_STAGE1));
}


// ── FORM BACKEND CONFIGURATOR LOGIC ──
function renderConfiguratorUI() {
  const container = document.getElementById("sections-builder-list");
  container.innerHTML = "";

  const config = FORM_CONFIG;

  // Render collapsible sections
  config.sections.forEach((secName, secIdx) => {
    const isCollapsed = collapsedSections[secIdx] || false;
    const arrowIcon = isCollapsed ? "►" : "▼";
    const bodyClass = isCollapsed ? "section-builder-body collapsed" : "section-builder-body";

    const sectionFields = config.fields.filter(f => f.section === secName);

    let questionsHtml = "";
    if (sectionFields.length === 0) {
      questionsHtml = `<div style="text-align:center; padding: 20px; color:var(--mdi-muted); font-style:italic;">Belum ada pertanyaan di bagian ini. Silakan klik Tambah Pertanyaan.</div>`;
    } else {
      sectionFields.forEach(f => {
        const globalIdx = config.fields.findIndex(field => field.id === f.id);
        const isCore = ["q_nama", "q_grade", "q_dept"].includes(f.id);

        questionsHtml += `
          <div class="q-row" id="q-row-${globalIdx}">
            <div class="q-row-header">
              <div class="q-title">
                <span>📍</span> Question in <em>${secName}</em>
                ${f.required ? '<span style="color:#d93025; font-size:9.5px; font-weight:800; background:#fee2e2; padding:2px 6px; border-radius:4px; margin-left:8px;">REQUIRED</span>' : ''}
              </div>
              <div class="q-actions">
                <button class="btn" style="padding:2px 6px; font-size:11px;" onclick="moveQuestion(${globalIdx}, -1)" ${globalIdx === 0 ? 'disabled' : ''}>▲ Up</button>
                <button class="btn" style="padding:2px 6px; font-size:11px;" onclick="moveQuestion(${globalIdx}, 1)" ${globalIdx === config.fields.length - 1 ? 'disabled' : ''}>▼ Down</button>
                ${isCore ? `<span style="font-size:9px; font-weight:700; color:var(--mdi-muted); padding-left:10px;">CORE FIELD</span>` : `<button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteQuestion(${globalIdx})">🗑️ Remove</button>`}
              </div>
            </div>
            
            <div class="q-grid">
              <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:9px;">Pertanyaan (Label)</label>
                <input type="text" id="q-lbl-${globalIdx}" value="${f.label}" oninput="syncLiveFormPreview()">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:9px;">Jenis Jawaban</label>
                <select id="q-type-${globalIdx}" onchange="toggleOptionsArea(${globalIdx}); syncLiveFormPreview();">
                  <option value="text" ${f.type === 'text' ? 'selected' : ''}>Jawaban Singkat (Text)</option>
                  <option value="textarea" ${f.type === 'textarea' ? 'selected' : ''}>Jawaban Panjang (Paragraph)</option>
                  <option value="radio" ${f.type === 'radio' ? 'selected' : ''}>Pilihan Ganda (Radio)</option>
                  <option value="select" ${f.type === 'select' ? 'selected' : ''}>Dropdown (Pilih)</option>
                  <option value="date" ${f.type === 'date' ? 'selected' : ''}>Pilih Tanggal (Date)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0; display:flex; align-items:center; gap:8px; padding-top:20px; padding-left:14px;">
                <input type="checkbox" id="q-req-${globalIdx}" ${f.required ? 'checked' : ''} onchange="syncLiveFormPreview()">
                <label for="q-req-${globalIdx}" style="margin-bottom:0; cursor:pointer; font-size:11px;">Wajib Diisi</label>
              </div>
            </div>
            
            <div class="options-wrap" id="options-wrap-${globalIdx}" style="display: ${['radio', 'select'].includes(f.type) ? 'block' : 'none'};">
              <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:9px; color:var(--mdi-orange);">Pilihan Opsi (Pisahkan dengan koma, misal: Pilihan A, Pilihan B)</label>
                <input type="text" id="q-opts-${globalIdx}" value="${f.options ? f.options.join(', ') : ''}" oninput="syncLiveFormPreview()" placeholder="e.g. Opsi 1, Opsi 2">
              </div>
            </div>
          </div>
        `;
      });
    }

    const sectionBlock = document.createElement("div");
    sectionBlock.className = "section-builder-block";
    sectionBlock.innerHTML = `
      <div class="section-builder-header" onclick="toggleSectionCollapse(${secIdx})">
        <div class="section-header-left">
          <span class="section-collapse-icon" id="sec-arrow-${secIdx}">${arrowIcon}</span>
          <input type="text" class="section-title-input" value="${secName}" id="sec-name-${secIdx}" onclick="event.stopPropagation();" onchange="renameSection(${secIdx}, this.value)" title="Klik untuk ubah nama bagian">
          <span style="font-size:10px; font-weight:600; color:var(--mdi-muted);">(${sectionFields.length} Pertanyaan)</span>
        </div>
        <div onclick="event.stopPropagation();" style="display:flex; gap:8px;">
          <button class="btn btn-primary" style="font-size:11px; padding:3px 10px;" onclick="addNewQuestionToSection('${secName}')">➕ Add Question</button>
          ${secIdx > 0 ? `<button class="btn btn-danger" style="font-size:11px; padding:3px 10px;" onclick="deleteSection(${secIdx})">🗑️ Delete Section</button>` : ''}
        </div>
      </div>
      <div class="${bodyClass}" id="sec-body-${secIdx}">
        ${questionsHtml}
      </div>
    `;
    container.appendChild(sectionBlock);
  });

  config.fields.forEach((f, idx) => {
    toggleOptionsArea(idx);
  });

  syncLiveFormPreview();
}

function toggleSectionCollapse(secIdx) {
  collapsedSections[secIdx] = !collapsedSections[secIdx];
  const body = document.getElementById(`sec-body-${secIdx}`);
  const arrow = document.getElementById(`sec-arrow-${secIdx}`);
  if (collapsedSections[secIdx]) {
    body.classList.add("collapsed");
    arrow.textContent = "►";
  } else {
    body.classList.remove("collapsed");
    arrow.textContent = "▼";
  }
}

function toggleOptionsArea(idx) {
  const typeEl = document.getElementById(`q-type-${idx}`);
  if (!typeEl) return;
  const type = typeEl.value;
  const wrap = document.getElementById(`options-wrap-${idx}`);
  if (wrap) {
    if (['radio', 'select'].includes(type)) {
      wrap.style.display = "block";
    } else {
      wrap.style.display = "none";
    }
  }
}

function syncDOMToState(config) {
  if (activeTab !== "backend") return;

  const targetConfig = config || FORM_CONFIG;
  const titleEl = document.getElementById("cfg-title");
  const descEl = document.getElementById("cfg-desc");
  const tDateEl = document.getElementById("cfg-training-date");
  if (titleEl) targetConfig.title = titleEl.value.trim();
  if (descEl) targetConfig.desc = descEl.value.trim();
  if (tDateEl) targetConfig.trainingDate = tDateEl.value.trim();

  targetConfig.fields.forEach((f, idx) => {
    const lblEl = document.getElementById(`q-lbl-${idx}`);
    const typeEl = document.getElementById(`q-type-${idx}`);
    const reqEl = document.getElementById(`q-req-${idx}`);
    const optsEl = document.getElementById(`q-opts-${idx}`);

    if (lblEl) f.label = lblEl.value.trim();
    if (typeEl) f.type = typeEl.value;
    if (reqEl) f.required = reqEl.checked;
    
    if (['radio', 'select'].includes(f.type) && optsEl) {
      const rawOpts = optsEl.value;
      f.options = rawOpts.split(',').map(o => o.trim()).filter(o => o !== "");
    } else {
      if (typeEl && !['radio', 'select'].includes(f.type)) {
        f.options = [];
      }
    }
  });
}

function renameSection(secIdx, newName) {
  const config = FORM_CONFIG;
  const oldName = config.sections[secIdx];
  if (!newName.trim()) {
    alert("Nama bagian tidak boleh kosong!");
    renderConfiguratorUI();
    return;
  }
  
  syncDOMToState();
  config.sections[secIdx] = newName.trim();
  
  // Re-map all fields in this section to the new name
  config.fields.forEach(f => {
    if (f.section === oldName) {
      f.section = newName.trim();
    }
  });

  renderConfiguratorUI();
}

function addNewSection() {
  const config = FORM_CONFIG;
  const sectionName = prompt("Masukkan nama bagian baru:");
  if (sectionName && sectionName.trim() !== "") {
    if (config.sections.includes(sectionName.trim())) {
      alert("Nama bagian tersebut sudah terdaftar!");
      return;
    }
    syncDOMToState();
    config.sections.push(sectionName.trim());
    
    // Auto add a first custom field in it so it doesn't render empty
    const newQ = {
      id: "q_custom_" + Date.now(),
      label: "Pertanyaan Baru",
      type: "text",
      required: false,
      section: sectionName.trim(),
      options: ["Opsi A", "Opsi B"]
    };
    config.fields.push(newQ);
    
    renderConfiguratorUI();
  }
}

function deleteSection(secIdx) {
  const config = FORM_CONFIG;
  const secName = config.sections[secIdx];
  if (confirm(`Apakah Anda yakin ingin menghapus bagian "${secName}"? Semua pertanyaan di dalamnya akan ikut dihapus.`)) {
    syncDOMToState();
    config.sections.splice(secIdx, 1);
    config.fields = config.fields.filter(f => f.section !== secName);
    
    renderConfiguratorUI();
  }
}

function addNewQuestionToSection(secName) {
  const config = FORM_CONFIG;
  syncDOMToState();
  const newQ = {
    id: "q_custom_" + Date.now(),
    label: "Pertanyaan Baru",
    type: "text",
    required: false,
    section: secName,
    options: ["Opsi A", "Opsi B"]
  };
  config.fields.push(newQ);
  renderConfiguratorUI();
  
  // Expand section body if it was collapsed
  const secIdx = config.sections.indexOf(secName);
  if (secIdx !== -1 && collapsedSections[secIdx]) {
    collapsedSections[secIdx] = false;
    const body = document.getElementById(`sec-body-${secIdx}`);
    const arrow = document.getElementById(`sec-arrow-${secIdx}`);
    if (body) body.classList.remove("collapsed");
    if (arrow) arrow.textContent = "▼";
  }
}

function deleteQuestion(idx) {
  const config = FORM_CONFIG;
  syncDOMToState();
  config.fields.splice(idx, 1);
  renderConfiguratorUI();
}

function moveQuestion(idx, direction) {
  const config = FORM_CONFIG;
  const target = idx + direction;
  if (target >= 0 && target < config.fields.length) {
    syncDOMToState();
    const temp = config.fields[idx];
    config.fields[idx] = config.fields[target];
    config.fields[target] = temp;
    
    renderConfiguratorUI();
  }
}

function syncLiveFormPreview() {
  const previewHub = document.getElementById("gf-preview-hub");
  previewHub.innerHTML = "";

  const config = FORM_CONFIG;
  const title = document.getElementById("cfg-title").value.trim() || "Untitled Google Form";
  const desc = document.getElementById("cfg-desc").value.trim() || "Form description...";
  const trainingDate = document.getElementById("cfg-training-date") ? document.getElementById("cfg-training-date").value.trim() : (config.trainingDate || "");

  // Render header card
  let dateHtml = trainingDate ? `<div style="font-size: 13px; color: var(--mdi-navy); margin-top: 8px; font-weight: 600;">📅 Tanggal Pelatihan: ${trainingDate}</div>` : '';
  
  previewHub.innerHTML += `
    <div class="gforms-card header-card">
      <div class="gforms-card-title">${title}</div>
      <div class="gforms-card-desc">${desc}</div>
      ${dateHtml}
      <div style="color:#d93025; font-size:11px; margin-top:14px;">* Menunjukkan pertanyaan yang wajib diisi</div>
    </div>
  `;

  // Render section by section with titles
  config.sections.forEach(secName => {
    const fields = config.fields.map((f, idx) => {
      return { ...f, globalIndex: idx };
    }).filter(f => f.section === secName);

    if (fields.length > 0) {
      // Add section card header
      previewHub.innerHTML += `
        <div class="gforms-card section-card">
          ${secName}
        </div>
      `;

      fields.forEach(f => {
        const titleInput = document.getElementById(`q-lbl-${f.globalIndex}`);
        const typeInput = document.getElementById(`q-type-${f.globalIndex}`);
        const reqInput = document.getElementById(`q-req-${f.globalIndex}`);
        const optsInput = document.getElementById(`q-opts-${f.globalIndex}`);

        const customLabel = titleInput ? titleInput.value : f.label;
        const isRequired = reqInput ? reqInput.checked : f.required;
        const qType = typeInput ? typeInput.value : f.type;
        const rawOpts = optsInput ? optsInput.value : (f.options ? f.options.join(', ') : '');
        const options = rawOpts.split(',').map(o => o.trim()).filter(o => o !== "");

        let previewContent = "";
        if (qType === "text") {
          previewContent = `<div class="gf-input-mock">Jawaban singkat Anda</div>`;
        } else if (qType === "textarea") {
          previewContent = `<div class="gf-input-mock" style="width:90%; height:40px; border-bottom-style:dashed;">Jawaban panjang Anda</div>`;
        } else if (qType === "radio") {
          previewContent = options.map(o => `
            <div class="gf-choice-mock">
              <div class="gf-radio"></div>
              <span>${o}</span>
            </div>
          `).join("");
        } else if (qType === "select") {
          previewContent = `
            <div style="border: 1px solid var(--mdi-border); border-radius:4px; padding:8px 12px; width: 180px; background:var(--mdi-light); font-size:12px; color:var(--mdi-muted); display:flex; justify-content:space-between;">
              <span>Pilih</span>
              <span>▼</span>
            </div>
          `;
        } else if (qType === "date") {
          previewContent = `
            <div style="border: 1px solid var(--mdi-border); border-radius:4px; padding:8px 12px; width: 180px; background:var(--mdi-light); font-size:12px; color:var(--mdi-muted); display:flex; justify-content:space-between;">
              <span>Pilih Tanggal</span>
              <span>📅</span>
            </div>
          `;
        }

        previewHub.innerHTML += `
          <div class="gforms-card">
            <div class="gf-label">${customLabel} ${isRequired ? '<span class="gf-req">*</span>' : ''}</div>
            <div>${previewContent}</div>
          </div>
        `;
      });
    }
  });
}

function resetFormSchema() {
  const config = FORM_CONFIG;
  if (confirm("Apakah Anda yakin ingin mengembalikan struktur formulir ke struktur bawaan?")) {
    const INITIAL_FORM_CONFIG = {
      title: config.title,
      desc: config.desc,
      status: config.status,
      owner: config.owner,
      createdAt: config.createdAt,
      group: config.group,
      sections: ["Bagian 1 – Identitas", "Bagian 2 – Action Plan Commitments", "Bagian 3 – Progress & Challenges"],
      fields: [
        {id: "q_nama", label: "Nama", type: "text", required: true, section: "Bagian 1 – Identitas", options: []},
        {id: "q_grade", label: "Grade", type: "text", required: true, section: "Bagian 1 – Identitas", options: []},
        {id: "q_dept", label: "Departemen", type: "text", required: true, section: "Bagian 1 – Identitas", options: []},
        {id: "q_action1", label: "Commitment Action 1", type: "textarea", required: true, section: "Bagian 2 – Action Plan Commitments", options: []},
        {id: "q_action2", label: "Commitment Action 2", type: "textarea", required: true, section: "Bagian 2 – Action Plan Commitments", options: []},
        {id: "q_action3", label: "Commitment Action 3", type: "textarea", required: true, section: "Bagian 2 – Action Plan Commitments", options: []},
        {id: "q_notes", label: "30-Day Progress Update & Notes", type: "textarea", required: false, section: "Bagian 3 – Progress & Challenges", options: []},
        {id: "q_challenge", label: "Challenges / Roadblocks Encountered", type: "textarea", required: false, section: "Bagian 3 – Progress & Challenges", options: []}
      ]
    };
    
    FORM_CONFIG = INITIAL_FORM_CONFIG;
    
    const cachedForms = JSON.parse(localStorage.getItem("mdi_forms") || "[]");
    const idx = cachedForms.findIndex(f => f.id === formId);
    if (idx !== -1) {
      cachedForms[idx] = INITIAL_FORM_CONFIG;
      localStorage.setItem("mdi_forms", JSON.stringify(cachedForms));
    }
    
    document.getElementById("cfg-title").value = INITIAL_FORM_CONFIG.title;
    document.getElementById("cfg-desc").value = INITIAL_FORM_CONFIG.desc;
    document.getElementById("cfg-training-date").value = INITIAL_FORM_CONFIG.trainingDate || "";
    renderConfiguratorUI();
    alert("Struktur formulir di-reset!");
  }
}

function saveFormSchema() {
  const newTitle = document.getElementById("cfg-title").value.trim();
  const newDesc = document.getElementById("cfg-desc").value.trim();
  const newTDate = document.getElementById("cfg-training-date").value.trim();

  if (!newTitle) {
    alert("Judul form tidak boleh kosong.");
    return;
  }

  const cachedForms = JSON.parse(localStorage.getItem("mdi_forms") || "[]");
  const idx = cachedForms.findIndex(f => f.id === formId);
  
  if (idx !== -1) {
    const targetConfig = cachedForms[idx];
    targetConfig.title = newTitle;
    targetConfig.desc = newDesc;
    targetConfig.trainingDate = newTDate;

    syncDOMToState(targetConfig);

    localStorage.setItem("mdi_forms", JSON.stringify(cachedForms));
    
    FORM_CONFIG = targetConfig;
    
    document.getElementById("head-form-title").textContent = FORM_CONFIG.title;
    document.getElementById("admin-brand-title").innerHTML = `${FORM_CONFIG.title} <span>Action Plan Admin</span>`;
    alert("Form Backend settings successfully saved!");
    renderAll();
  }
}

// ── ADD / EDIT PIC MODAL LOGIC ──
function openAddPICModal() {
  document.getElementById("pic-modal-title").textContent = "Add Participant (PIC)";
  renderPICModalFormFields(null);
  document.getElementById("pic-modal").classList.add("active");
}

function openEditPICModal(no) {
  const p = PARTICIPANTS.find(item => item.no === no);
  if (!p) return;

  document.getElementById("pic-modal-title").textContent = "Edit Participant Profile";
  renderPICModalFormFields(p);
  document.getElementById("pic-modal").classList.add("active");
}

function renderPICModalFormFields(pic) {
  const area = document.getElementById("pic-modal-form-area");
  area.innerHTML = "";

  const hiddenInput = document.createElement("input");
  hiddenInput.type = "hidden";
  hiddenInput.id = "pm-no";
  hiddenInput.value = pic ? pic.no : "";
  area.appendChild(hiddenInput);

  const activeStatusVal = pic ? getActualStatus(pic) : 'none';

  // 1. Profil Utama
  const profileCard = document.createElement("div");
  profileCard.className = "card";
  profileCard.style.cssText = "border-top: 4px solid var(--mdi-navy); margin-bottom: 20px; padding: 16px;";
  profileCard.innerHTML = `
    <div style="font-weight: 800; font-size: 12px; color: var(--mdi-navy); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">👤 Profil Utama Peserta</div>
    <div class="form-group">
      <label>Nama Lengkap <span style="color:#d93025;">*</span></label>
      <input type="text" id="pm-profile-name" value="${pic ? pic.name : ''}">
    </div>
    <div class="form-group">
      <label>Departemen <span style="color:#d93025;">*</span></label>
      <input type="text" id="pm-profile-dept" value="${pic ? pic.dept : ''}">
    </div>
    <div class="form-group">
      <label>Grade / Jabatan <span style="color:#d93025;">*</span></label>
      <input type="text" id="pm-profile-grade" value="${pic ? (pic.grade || '') : ''}">
    </div>
    <div class="form-group">
      <label>Status</label>
      <select id="pm-profile-status">
        <option value="prog" ${activeStatusVal === 'prog' ? 'selected' : ''}>In Progress</option>
        <option value="done" ${activeStatusVal === 'done' ? 'selected' : ''}>Completed</option>
      </select>
    </div>
  `;
  area.appendChild(profileCard);

  // Helper function to render a single field input HTML
  const getFieldInputHtml = (f, val, prefix) => {
    if (f.type === "text") {
      return `<input type="text" id="${prefix}-val-${f.id}" value="${val}">`;
    } else if (f.type === "textarea") {
      return `<textarea id="${prefix}-val-${f.id}" rows="3">${val}</textarea>`;
    } else if (f.type === "radio") {
      return f.options.map(o => `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
          <input type="radio" name="${prefix}-radio-${f.id}" id="${prefix}-radio-${f.id}-${o}" value="${o}" ${val === o ? 'checked' : ''}>
          <label for="${prefix}-radio-${f.id}-${o}" style="margin-bottom:0; font-size:12.5px; text-transform:none; color:var(--mdi-ink); cursor:pointer;">${o}</label>
        </div>
      `).join("");
    } else if (f.type === "select") {
      const optionsHtml = f.options.map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`).join("");
      return `
        <select id="${prefix}-val-${f.id}">
          <option value="">-- Pilih --</option>
          ${optionsHtml}
        </select>
      `;
    } else if (f.type === "date") {
      return `<input type="date" id="${prefix}-val-${f.id}" value="${val}">`;
    }
    return "";
  };

  // 2. Tahap 1 Card
  const t1Card = document.createElement("div");
  t1Card.className = "card";
  t1Card.style.cssText = "border-top: 4px solid var(--mdi-orange); margin-bottom: 20px; padding: 16px;";
  
  const s1SubmitDate = pic ? (pic.submitDate || '') : '';
  
  let t1FieldsHtml = "";
  FORM_CONFIG.fields.forEach(f => {
    if (["q_nama", "q_dept", "q_grade"].includes(f.id)) return; // skip profile questions
    const val = pic && pic.answers ? (pic.answers[f.id] || "") : "";
    t1FieldsHtml += `
      <div class="form-group">
        <label>${f.label} ${f.required ? '<span style="color:#d93025;">*</span>' : ''}</label>
        ${getFieldInputHtml(f, val, "pm-s1")}
      </div>
    `;
  });

  t1Card.innerHTML = `
    <div style="font-weight: 800; font-size: 12px; color: var(--mdi-orange); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">🍊 Tahap 1: Komitmen Awal</div>
    <div class="form-group">
      <label>Tanggal Submit Tahap 1</label>
      <input type="date" id="pm-s1-submitDate" value="${s1SubmitDate}">
    </div>
    <div style="border-top:1px solid var(--mdi-border); margin-top:12px; padding-top:12px;">
      ${t1FieldsHtml}
    </div>
  `;
  area.appendChild(t1Card);

}

function closePICModal() {
  document.getElementById("pic-modal").classList.remove("active");
}

function savePICData() {
  const no = document.getElementById("pm-no").value;
  
  // Profile values
  const nameVal = document.getElementById("pm-profile-name").value.trim();
  const deptVal = document.getElementById("pm-profile-dept").value.trim();
  const gradeVal = document.getElementById("pm-profile-grade").value.trim();
  const unifiedStatus = document.getElementById("pm-profile-status").value;
  
  if (!nameVal || !deptVal || !gradeVal) {
    alert("Nama, Departemen, dan Grade wajib diisi!");
    return;
  }
  
  // 1. Compile Stage 1 Answers and Status
  const s1Status = unifiedStatus;
  const s1SubmitDate = document.getElementById("pm-s1-submitDate") ? document.getElementById("pm-s1-submitDate").value : "";
  const s1Answers = {};
  
  FORM_CONFIG.fields.forEach(f => {
    let val = "";
    if (f.id === "q_nama") val = nameVal;
    else if (f.id === "q_dept") val = deptVal;
    else if (f.id === "q_grade") val = gradeVal;
    else {
      if (f.type === "radio") {
        const checked = document.querySelector(`input[name="pm-s1-radio-${f.id}"]:checked`);
        val = checked ? checked.value : "";
      } else {
        const el = document.getElementById(`pm-s1-val-${f.id}`);
        val = el ? el.value.trim() : "";
      }
    }
    s1Answers[f.id] = val;
  });
  
  // Update PARTICIPANTS_STAGE1
  if (no === "") {
    // Adding new participant to Stage 1
    const s1No = PARTICIPANTS_STAGE1.length > 0 ? Math.max(...PARTICIPANTS_STAGE1.map(p => p.no)) + 1 : 1;
    const newP1 = {
      no: s1No,
      name: nameVal,
      dept: deptVal,
      grade: gradeVal,
      status: s1Status,
      submitDate: s1SubmitDate || (s1Status === "done" ? new Date().toISOString().split('T')[0] : ""),
      answers: s1Answers
    };
    PARTICIPANTS_STAGE1.push(newP1);
  } else {
    // Editing existing participant
    const mergedP = PARTICIPANTS.find(item => item.no === parseInt(no));
    if (mergedP) {
      // Find and update inside Stage 1
      let p1 = PARTICIPANTS_STAGE1.find(item => item.name.trim().toLowerCase() === mergedP.name.trim().toLowerCase());
      if (!p1) {
        const s1No = PARTICIPANTS_STAGE1.length > 0 ? Math.max(...PARTICIPANTS_STAGE1.map(p => p.no)) + 1 : 1;
        p1 = { no: s1No, name: nameVal, dept: deptVal, grade: gradeVal, answers: {} };
        PARTICIPANTS_STAGE1.push(p1);
      }
      p1.name = nameVal;
      p1.dept = deptVal;
      p1.grade = gradeVal;
      p1.status = s1Status;
      p1.submitDate = s1SubmitDate || (s1Status === "done" ? (p1.submitDate || new Date().toISOString().split('T')[0]) : "");
      p1.answers = s1Answers;
    }
  }
  
  // Persist stage 1
  saveState();
  
  // Reload
  loadAndMergeParticipants();
  closePICModal();
  rebuildDeptFilters();
  renderAll();
  showToast(`Peserta "${nameVal}" berhasil disimpan!`);
}

// ── SHARE PORTAL LOGIC ──
function openShareModal() {
  const baseFormUrl = window.location.href.split('MDI_ActionPlan_Admin.html')[0] + 'MDI_ActionPlan_Form.html';
  const generalUrl = `${baseFormUrl}?formId=${formId}`;
  
  document.getElementById("share-general-url").value = generalUrl;
  
  const listContainer = document.getElementById("share-participants-list");
  if (listContainer) {
    listContainer.innerHTML = "";
    PARTICIPANTS.forEach(p => {
      const pUrl = `${baseFormUrl}?formId=${formId}&pic=${p.no}`;
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.padding = "8px 12px";
      row.style.background = "var(--mdi-soft)";
      row.style.border = "1px solid var(--mdi-border)";
      row.style.borderRadius = "6px";
      row.style.fontSize = "12.5px";
      row.style.gap = "10px";
      row.style.marginBottom = "4px";
      
      row.innerHTML = `
        <div style="font-weight: 600; color: var(--mdi-navy); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 120px;" title="${p.name}">${p.name}</div>
        <div style="font-family: monospace; font-size: 11px; color: var(--mdi-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-grow: 1; text-align: left; cursor: pointer;" onclick="window.open('${pUrl}', '_blank')" title="Klik untuk membuka">${pUrl}</div>
        <button class="btn" style="padding: 4px 10px; font-size: 11px; background: var(--mdi-orange); border-color: var(--mdi-orange); color: #fff; white-space: nowrap; border-radius: 4px; cursor: pointer;" onclick="copySpecificLink('${pUrl}', '${p.name.replace(/'/g, "\\'")}')">📋 Salin</button>
      `;
      listContainer.appendChild(row);
    });
  }
  
  document.getElementById("share-modal").classList.add("active");
}

function closeShareModal() {
  document.getElementById("share-modal").classList.remove("active");
}

function copyGeneralLink() {
  const inputEl = document.getElementById("share-general-url");
  if (inputEl) {
    inputEl.select();
    navigator.clipboard.writeText(inputEl.value).then(() => {
      showToast("Tautan umum formulir berhasil disalin ke clipboard!");
    }).catch(err => {
      // Fallback
      document.execCommand('copy');
      showToast("Tautan umum formulir berhasil disalin!");
    });
  }
}

function copySpecificLink(url, name) {
  navigator.clipboard.writeText(url).then(() => {
    showToast(`Tautan untuk ${name} berhasil disalin!`);
  }).catch(err => {
    // Fallback
    const tempInput = document.createElement("input");
    tempInput.value = url;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    showToast(`Tautan untuk ${name} berhasil disalin!`);
  });
}

function copyParticipantLink(no) {
  const p = PARTICIPANTS.find(item => item.no === no);
  if (!p) return;
  const baseFormUrl = window.location.href.split('MDI_ActionPlan_Admin.html')[0] + 'MDI_ActionPlan_Form.html';
  const pUrl = `${baseFormUrl}?formId=${formId}&pic=${p.no}`;
  
  copySpecificLink(pUrl, p.name);
}

function showToast(msg) {
  let toast = document.getElementById("mdi-toast-container");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "mdi-toast-container";
    toast.className = "mdi-toast";
    toast.innerHTML = `<span class="mdi-toast-icon">✓</span> <span id="mdi-toast-message"></span>`;
    document.body.appendChild(toast);
  }
  
  document.getElementById("mdi-toast-message").textContent = msg;
  toast.classList.add("show");
  
  // Clear previous timeouts if any
  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }
  
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ── SPREADSHEET VIEW & REKAP LOGIC ──
function renderSpreadsheet() {
  const data = PARTICIPANTS;
  
  let fields1 = FORM_CONFIG.fields;
  
  let totalCols = 5 + fields1.length;
  
  document.getElementById("sheet-col-count").textContent = totalCols;
  document.getElementById("sheet-row-count").textContent = data.length;
  document.getElementById("spreadsheet-doc-name").textContent = `${FORM_CONFIG.title.replace(/\s+/g, "_").toUpperCase()}_REKAP.xlsx`;
  
  // Excel indicator row (A, B, C...)
  let colIndicatorHtml = `<tr style="background: #f1f3f4; border-bottom: 1px solid #c0c0c0;"><th style="width:40px; background: #e8eaed; border-right: 1px solid #c0c0c0; text-align: center; font-size: 10px; color: #5f6368; padding: 4px;"></th>`;
  for (let i = 0; i < totalCols; i++) {
    colIndicatorHtml += `<th style="border-right: 1px solid #c0c0c0; text-align: center; font-size: 10px; color: #5f6368; font-weight: bold; padding: 4px;">${getExcelColumnLabel(i)}</th>`;
  }
  colIndicatorHtml += `</tr>`;
  
  // Main header row
  let mainHeaderHtml = `<tr style="background: #f8f9fa; border-bottom: 2px solid #c0c0c0;"><th style="background: #f1f3f4; border-right: 1px solid #c0c0c0; text-align: center; font-weight: bold; color: #5f6368; width: 40px; padding: 6px;"></th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 50px;">No</th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 150px;">Nama Lengkap</th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 100px;">Departemen</th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 100px;">Grade</th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 120px; background: #fff8f3;">Status</th>`;
  
  fields1.forEach(f => {
    mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 200px;">${f.label}</th>`;
  });
  mainHeaderHtml += `</tr>`;
  
  document.getElementById("sheetTableHeader").innerHTML = colIndicatorHtml + mainHeaderHtml;
  
  // Body
  const bodyHtml = [];
  data.forEach((p, rIndex) => {
    let rowHtml = `<tr style="border-bottom: 1px solid #e0e0e0; height: 32px;"><td style="background: #f1f3f4; border-right: 1px solid #c0c0c0; text-align: center; font-weight: bold; color: #5f6368; font-size: 10px; width: 40px; cursor: default;">${rIndex + 1}</td>`;
    
    const actStatus = getActualStatus(p);
    const statusText = actStatus === 'done' ? 'Selesai' : (actStatus === 'prog' ? 'In Progress' : (actStatus === 'overdue' ? 'Tidak Selesai' : (actStatus === 'late' ? 'Telat' : 'Belum Mulai')));
    
    let cellsData = [
      { val: p.no, field: 'no', isAnswer: false, editable: false },
      { val: p.name, field: 'name', isAnswer: false, editable: false },
      { val: p.dept, field: 'dept', isAnswer: false, editable: false },
      { val: p.grade || '—', field: 'grade', isAnswer: false, editable: false },
      { val: statusText, field: 'status', isAnswer: false, editable: false }
    ];
    
    fields1.forEach(f => {
      cellsData.push({ val: p.answers ? (p.answers[f.id] || '') : '', field: f.id, isAnswer: true, editable: true });
    });
    
    cellsData.forEach((cellDef, cIndex) => {
      const colLabel = getExcelColumnLabel(cIndex);
      const cellId = `${colLabel}${rIndex + 1}`;
      const escapedVal = String(cellDef.val).replace(/"/g, '&quot;').replace(/`/g, '\\`');
      
      const editableAttr = cellDef.editable ? `contenteditable="true" onblur="updateSpreadsheetCellData(${p.no}, '${cellDef.field}', ${cellDef.isAnswer}, this)"` : '';
      const bgStyle = cellDef.editable ? 'background: #fff; cursor: text;' : 'background: #f8f9fa; cursor: cell;';
      
      rowHtml += `
        <td id="cell-${cellId}" 
            ${editableAttr}
            onclick="selectSheetCell('${cellId}', this.innerText)" 
            style="border-right: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; padding: 6px 10px; color: var(--mdi-navy); white-space: pre-wrap; word-wrap: break-word; min-width: 150px; ${bgStyle}" 
            title="${escapedVal}">${escapedVal}</td>
      `;
    });
    
    rowHtml += `</tr>`;
    bodyHtml.push(rowHtml);
  });
  
  document.getElementById("sheetTableBody").innerHTML = bodyHtml.join("");
  
  if (data.length > 0) {
    selectSheetCell('A1', data[0].no);
  }
}

let activeSheet2CellId = null;
function updateSpreadsheetCellData(participantNo, field, isAnswer, element) {
  const p = PARTICIPANTS.find(item => item.no === participantNo);
  let p1 = PARTICIPANTS_STAGE1.find(item => item.name.trim().toLowerCase() === p.name.trim().toLowerCase());
  
  if (!p || !p1) return;
  
  const newValue = element.innerText;
  
  if (isAnswer) {
    if (!p.answers) p.answers = {};
    p.answers[field] = newValue;
    if (!p1.answers) p1.answers = {};
    p1.answers[field] = newValue;
  } else {
    p[field] = newValue;
    p1[field] = newValue;
  }
  
  // Update formula bar if cell is active
  if (typeof activeSheetCellId !== 'undefined' && activeSheetCellId && element.id === `cell-${activeSheetCellId}`) {
    const fb = document.getElementById("spreadsheet-formula-val");
    if(fb) fb.value = newValue;
  }
  if (typeof activeSheet2CellId !== 'undefined' && activeSheet2CellId && element.id === `cell-${activeSheet2CellId}`) {
    const fb2 = document.getElementById("spreadsheet2-formula-val");
    if(fb2) fb2.value = newValue;
  }
  
  saveState();
  updateMiniKPIs();
  showToast("Perubahan tersimpan!");
}

function selectSheet2Cell(cellId, val) {
  if (activeSheet2CellId) {
    const prevCell = document.getElementById(`cell-${activeSheet2CellId}`);
    if (prevCell) {
      prevCell.style.outline = "";
      prevCell.style.background = prevCell.hasAttribute("contenteditable") ? "#fff" : "#f8f9fa";
    }
  }
  
  activeSheet2CellId = cellId;
  const currCell = document.getElementById(`cell-${cellId}`);
  if (currCell) {
    currCell.style.outline = "2px solid #107c41";
    currCell.style.outlineOffset = "-2px";
    currCell.style.background = "#e2f0d9";
  }
  
  document.getElementById("spreadsheet2-formula-val").value = val;
}

function renderSpreadsheet2() {
  const data = PARTICIPANTS;
  
  let totalCols = 6; // No, Nama, Dept, 30-Day Status, Update & Notes, Challenge
  
  document.getElementById("sheet2-col-count").textContent = totalCols;
  document.getElementById("sheet2-row-count").textContent = data.length;
  document.getElementById("spreadsheet2-doc-name").textContent = `${FORM_CONFIG.title.replace(/\s+/g, "_").toUpperCase()}_PENYELESAIAN.xlsx`;
  
  // Excel indicator row
  let colIndicatorHtml = `<tr style="background: #f1f3f4; border-bottom: 1px solid #c0c0c0;"><th style="width:40px; background: #e8eaed; border-right: 1px solid #c0c0c0; text-align: center; font-size: 10px; color: #5f6368; padding: 4px;"></th>`;
  for (let i = 0; i < totalCols; i++) {
    colIndicatorHtml += `<th style="border-right: 1px solid #c0c0c0; text-align: center; font-size: 10px; color: #5f6368; font-weight: bold; padding: 4px;">${getExcelColumnLabel(i)}</th>`;
  }
  colIndicatorHtml += `</tr>`;
  
  // Main header row
  let mainHeaderHtml = `<tr style="background: #f8f9fa; border-bottom: 2px solid #c0c0c0;"><th style="background: #f1f3f4; border-right: 1px solid #c0c0c0; text-align: center; font-weight: bold; color: #5f6368; width: 40px; padding: 6px;"></th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 50px;">No</th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 150px;">Nama Lengkap</th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 100px;">Departemen</th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 150px; background: #e2f0d9;">30-Day Status</th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 250px; background: #e2f0d9;">Update & Notes</th>`;
  mainHeaderHtml += `<th style="border-right: 1px solid #c0c0c0; padding: 8px 12px; font-weight: bold; color: var(--mdi-navy); min-width: 250px; background: #e2f0d9;">Challenge</th>`;
  mainHeaderHtml += `</tr>`;
  
  document.getElementById("sheet2TableHeader").innerHTML = colIndicatorHtml + mainHeaderHtml;
  
  // Body
  const bodyHtml = [];
  data.forEach((p, rIndex) => {
    let rowHtml = `<tr style="border-bottom: 1px solid #e0e0e0; height: 32px;"><td style="background: #f1f3f4; border-right: 1px solid #c0c0c0; text-align: center; font-weight: bold; color: #5f6368; font-size: 10px; width: 40px; cursor: default;">${rIndex + 1}</td>`;
    
    let cellsData = [
      { val: p.no, field: 'no', isAnswer: false, editable: false },
      { val: p.name, field: 'name', isAnswer: false, editable: false },
      { val: p.dept, field: 'dept', isAnswer: false, editable: false },
      { val: p.s2Status || '', field: 's2Status', isAnswer: false, editable: true },
      { val: p.s2Update || '', field: 's2Update', isAnswer: false, editable: true },
      { val: p.s2Challenge || '', field: 's2Challenge', isAnswer: false, editable: true }
    ];
    
    cellsData.forEach((cellDef, cIndex) => {
      const colLabel = getExcelColumnLabel(cIndex);
      const cellId = `S2_${colLabel}${rIndex + 1}`;
      const escapedVal = String(cellDef.val).replace(/"/g, '&quot;').replace(/`/g, '\\`');
      
      const editableAttr = cellDef.editable ? `contenteditable="true" onblur="updateSpreadsheetCellData(${p.no}, '${cellDef.field}', false, this)"` : '';
      const bgStyle = cellDef.editable ? 'background: #fff; cursor: text;' : 'background: #f8f9fa; cursor: cell;';
      
      rowHtml += `
        <td id="cell-${cellId}" 
            ${editableAttr}
            onclick="selectSheet2Cell('${cellId}', this.innerText)" 
            style="border-right: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; padding: 6px 10px; color: var(--mdi-navy); white-space: pre-wrap; word-wrap: break-word; min-width: 150px; ${bgStyle}" 
            title="${escapedVal}">${escapedVal}</td>
      `;
    });
    
    rowHtml += `</tr>`;
    bodyHtml.push(rowHtml);
  });
  
  document.getElementById("sheet2TableBody").innerHTML = bodyHtml.join("");
  
  if (data.length > 0) {
    selectSheet2Cell('S2_A1', data[0].no);
  }
}


      document.getElementById("cfg-desc").value = FORM_CONFIG.desc;
