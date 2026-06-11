let selectedText = '';
let selectedArea = 'associationsrätt';
let selectedMode = 'tentarättning';
let activeSourceData = null;

const PROGRESS_STEPS = [
  'Läser juridisk text…',
  'Identifierar rättsliga frågeställningar…',
  'Söker relevanta lagrum…',
  'Analyserar rättsfall och praxis…',
  'Bedömer argumentation och struktur…',
  'Identifierar saknade moment…',
  'Genererar bedömningsmatris…',
  'Sammanställer juridisk rapport…',
];

const GRADE_MAP = {
  VG: { name: 'Väl Godkänd', ringClass: '' },
  G:  { name: 'Godkänd',     ringClass: 'grade-g' },
  U:  { name: 'Underkänd',   ringClass: 'grade-u' },
};

const TYPE_META = {
  statute:   { label: 'Lagrum',    cls: 'badge-statute' },
  case:      { label: 'Rättsfall', cls: 'badge-case' },
  forarbete: { label: 'Förarbete', cls: 'badge-forarbete' },
  doktrin:   { label: 'Doktrin',   cls: 'badge-doktrin' },
  svarsmall: { label: 'Svarsmall', cls: 'badge-svarsmall' },
  qura:      { label: 'Qura',      cls: 'badge-qura' },
};

const STATUS_META = {
  uppfyllt:     { label: 'Uppfyllt',        cls: 'status-uppfyllt' },
  delvis:       { label: 'Delvis uppfyllt', cls: 'status-delvis' },
  bristfälligt: { label: 'Bristfälligt',    cls: 'status-bristfälligt' },
  saknas:       { label: 'Saknas',          cls: 'status-saknas' },
};

// ── Boot ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTextArea();
  initClearBtn();
  initSourceButtons();
  initAreaPills();
  initModeToggle();
  initSubmitBtn();
  initModal();
});

// ── Text area ─────────────────────────────────────────────────────────

function initTextArea() {
  document.getElementById('text-area').addEventListener('input', () => {
    selectedText = document.getElementById('text-area').value.trim();
    updateTextBadge();
    updateSubmitState();
  });
}

function applySelectedText(text) {
  selectedText = text;
  document.getElementById('text-area').value = text;
  updateTextBadge();
  updateSubmitState();
  hideSourceError();
}

function updateTextBadge() {
  const badge = document.getElementById('text-badge');
  if (selectedText.length > 10) {
    badge.textContent = `${selectedText.length} tecken`;
    badge.classList.remove('empty');
  } else {
    badge.textContent = 'Ingen text vald';
    badge.classList.add('empty');
  }
}

function initClearBtn() {
  document.getElementById('btn-clear').addEventListener('click', clearText);
}

function clearText() {
  document.getElementById('text-area').value = '';
  selectedText = '';
  updateTextBadge();
  updateSubmitState();
  document.getElementById('results-section').style.display = 'none';
  hideSourceError();

  const confirm = document.getElementById('clear-confirm');
  confirm.classList.add('visible');
  setTimeout(() => confirm.classList.remove('visible'), 2200);
}

// ── Source buttons (fetch from page) ─────────────────────────────────

function initSourceButtons() {
  document.getElementById('btn-fetch-selection').addEventListener('click', () =>
    fetchFromPage('GET_SELECTION', 'markering')
  );
  document.getElementById('btn-fetch-page').addEventListener('click', () =>
    fetchFromPage('GET_PAGE_TEXT', 'sidan')
  );
}

async function fetchFromPage(messageType, label) {
  const selBtn = document.getElementById('btn-fetch-selection');
  const pageBtn = document.getElementById('btn-fetch-page');
  selBtn.disabled = true;
  pageBtn.disabled = true;
  hideSourceError();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('no tab');
    const response = await chrome.tabs.sendMessage(tab.id, { type: messageType });
    const text = response?.text ?? '';
    if (text.length > 10) {
      applySelectedText(text);
    } else {
      showSourceError(
        label === 'markering'
          ? 'Ingen text är markerad. Markera text på sidan och försök igen.'
          : 'Ingen läsbar text hittades på sidan.'
      );
    }
  } catch {
    showSourceError('Kunde inte nå sidan. Chrome-sidor och PDF:er stöds ej — prova en vanlig webbsida.');
  } finally {
    selBtn.disabled = false;
    pageBtn.disabled = false;
  }
}

function showSourceError(msg) {
  const el = document.getElementById('source-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideSourceError() {
  document.getElementById('source-error').style.display = 'none';
}

// ── Form controls ─────────────────────────────────────────────────────

function initAreaPills() {
  document.querySelectorAll('#area-group .pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#area-group .pill').forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedArea = pill.dataset.value;
      updateSubmitState();
    });
  });
}

function initModeToggle() {
  document.querySelectorAll('#mode-group .mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#mode-group .mode-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMode = btn.dataset.value;
    });
  });
}

function updateSubmitState() {
  document.getElementById('submit-btn').disabled = !(selectedText.length > 10 && selectedArea);
}

// ── Submit ────────────────────────────────────────────────────────────

function initSubmitBtn() {
  document.getElementById('submit-btn').addEventListener('click', handleSubmit);
}

async function handleSubmit() {
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Analyserar…';

  document.getElementById('results-section').style.display = 'none';
  document.getElementById('progress-card').style.display = 'block';
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-pct').textContent = '0%';

  await simulateProgress();

  // ── Replace getDemoResponse() with a real API call in production ──
  const result = getDemoResponse(selectedArea, selectedMode);
  // ─────────────────────────────────────────────────────────────────

  document.getElementById('progress-card').style.display = 'none';
  renderResult(result);
  document.getElementById('results-section').style.display = 'block';
  document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });

  btn.textContent = 'Rätta igen';
  btn.disabled = false;
}

function simulateProgress() {
  return new Promise((resolve) => {
    let pct = 0;
    let stepIdx = 0;
    const fill = document.getElementById('progress-fill');
    const pctEl  = document.getElementById('progress-pct');
    const stepEl = document.getElementById('progress-step');

    const tick = setInterval(() => {
      pct = Math.min(pct + Math.random() * 3.5 + 0.8, 99);
      fill.style.width = pct + '%';
      pctEl.textContent = Math.floor(pct) + '%';

      const idx = Math.min(Math.floor((pct / 100) * PROGRESS_STEPS.length), PROGRESS_STEPS.length - 1);
      if (idx !== stepIdx) { stepIdx = idx; stepEl.textContent = PROGRESS_STEPS[idx]; }

      if (pct >= 99) {
        clearInterval(tick);
        fill.style.width = '100%';
        pctEl.textContent = '100%';
        stepEl.textContent = 'Klar!';
        setTimeout(resolve, 350);
      }
    }, 90);
  });
}

// ── Render result ─────────────────────────────────────────────────────

function renderResult(data) {
  renderGradeCard(data);

  const container = document.getElementById('feedback-sections');
  container.innerHTML = '';

  appendSourceListSection(container, 'Styrkor',                    '✓',  data.strengths,       true);
  appendSourceListSection(container, 'Brister',                    '△',  data.weaknesses,      true);
  appendSourceListSection(container, 'Saknade lagrum',             '§',  data.missingStatutes, false);
  appendSourceListSection(container, 'Saknade rättsfall',          '⚖', data.missingCases,    false);
  appendSourceListSection(container, 'Saknad doktrin / förarbete', '📖', data.missingDoctrine, false);
  appendMatrixSection(container, data.assessmentMatrix);
  appendTextSection(container,      'Förbättrad disposition',      '≡',  data.improvedDisposition, false);
  appendTextSection(container,      'Förslag på bättre tentasvar', '→',  data.modelAnswer,         false);
  appendSourcesUsedSection(container, data.sourcesUsed);
}

function renderGradeCard(data) {
  const ring        = document.getElementById('grade-ring');
  const gradeText   = document.getElementById('grade-text');
  const gradeName   = document.getElementById('grade-name');
  const gradeScore  = document.getElementById('grade-score-line');
  const gradeSummary = document.getElementById('grade-summary');

  ring.className = 'grade-ring';

  if (data.grade) {
    const info = GRADE_MAP[data.grade] || { name: data.grade, ringClass: '' };
    if (info.ringClass) ring.classList.add(info.ringClass);
    gradeText.textContent = data.grade;
    gradeName.textContent = info.name;
    gradeScore.textContent = data.score ? `Poäng: ${data.score} / 100` : '';
  } else {
    ring.classList.add('grade-none');
    gradeText.textContent = '⚖';
    gradeName.textContent = 'Juridisk Granskning';
    gradeScore.textContent = '';
  }

  gradeSummary.textContent = data.overallAssessment;
}

// ── Section builders ──────────────────────────────────────────────────

function makeFbCard(title, icon, startOpen) {
  const card   = document.createElement('div');
  card.className = 'fb-card';

  const header = document.createElement('div');
  header.className = 'fb-header';
  header.innerHTML = `
    <div class="fb-title-row">
      <span class="fb-icon">${icon}</span>
      <span>${title}</span>
    </div>
    <span class="fb-chevron ${startOpen ? 'open' : ''}">▾</span>
  `;

  const body  = document.createElement('div');
  body.className = `fb-body ${startOpen ? 'open' : ''}`;

  const inner = document.createElement('div');
  inner.className = 'fb-inner';

  header.addEventListener('click', () => {
    body.classList.toggle('open');
    header.querySelector('.fb-chevron').classList.toggle('open');
  });

  body.appendChild(inner);
  card.appendChild(header);
  card.appendChild(body);
  return { card, inner };
}

function appendSourceListSection(container, title, icon, items, startOpen) {
  if (!items?.length) return;
  const { card, inner } = makeFbCard(title, icon, startOpen);

  const ul = document.createElement('ul');
  ul.className = 'fb-list';

  items.forEach((item) => {
    const li     = document.createElement('li');
    const bullet = document.createElement('span');
    bullet.className = 'fb-bullet';
    bullet.textContent = '▸';

    const content = document.createElement('div');
    content.className = 'fb-item-content';

    const text = document.createElement('span');
    text.textContent = item.text;
    content.appendChild(text);

    if (item.sourceIds?.length) {
      const chips = document.createElement('div');
      chips.className = 'source-chips';
      item.sourceIds.forEach((id) => {
        const src = SOURCES[id];
        if (src) chips.appendChild(makeSourceChip(src));
      });
      content.appendChild(chips);
    }

    li.appendChild(bullet);
    li.appendChild(content);
    ul.appendChild(li);
  });

  inner.appendChild(ul);
  container.appendChild(card);
}

function appendTextSection(container, title, icon, text, startOpen) {
  if (!text) return;
  const { card, inner } = makeFbCard(title, icon, startOpen);
  const p = document.createElement('p');
  p.className = 'fb-text';
  p.textContent = text;
  inner.appendChild(p);
  container.appendChild(card);
}

function appendMatrixSection(container, matrix) {
  if (!matrix?.length) return;
  const { card, inner } = makeFbCard('Aktualiserad bedömningsmatris', '◈', false);

  const list = document.createElement('div');
  list.className = 'matrix-list';

  matrix.forEach((item) => {
    const st = STATUS_META[item.status] || STATUS_META.delvis;

    const row = document.createElement('div');
    row.className = 'matrix-item';

    const head = document.createElement('div');
    head.className = 'matrix-item-head';

    const crit = document.createElement('div');
    crit.className = 'matrix-criterion';
    crit.textContent = item.criterion;

    const badge = document.createElement('span');
    badge.className = `matrix-status ${st.cls}`;
    badge.textContent = st.label;

    head.appendChild(crit);
    head.appendChild(badge);

    const issue = document.createElement('div');
    issue.className = 'matrix-issue';
    issue.textContent = item.linkedIssue;

    row.appendChild(head);
    row.appendChild(issue);

    if (item.sourceIds?.length) {
      const chips = document.createElement('div');
      chips.className = 'matrix-sources';
      item.sourceIds.forEach((id) => {
        const src = SOURCES[id];
        if (src) chips.appendChild(makeSourceChip(src));
      });
      row.appendChild(chips);
    }

    list.appendChild(row);
  });

  inner.appendChild(list);
  container.appendChild(card);
}

function appendSourcesUsedSection(container, sourceIds) {
  if (!sourceIds?.length) return;
  const { card, inner } = makeFbCard('Källor som användes', '📚', false);

  const grid = document.createElement('div');
  grid.className = 'sources-grid';

  sourceIds.forEach((id) => {
    const src = SOURCES[id];
    if (!src) return;
    const tm = TYPE_META[src.type] || TYPE_META.statute;

    const btn = document.createElement('button');
    btn.className = 'source-card';
    btn.innerHTML = `
      <span class="source-type-badge ${tm.cls}">${tm.label}</span>
      <span class="source-card-label">${src.label}</span>
      <span class="source-card-arrow">↗</span>
    `;
    btn.addEventListener('click', () => showSourceModal(src));
    grid.appendChild(btn);
  });

  inner.appendChild(grid);
  container.appendChild(card);
}

// ── Source chips ──────────────────────────────────────────────────────

function makeSourceChip(src) {
  const btn = document.createElement('button');
  btn.className = 'source-chip';
  btn.textContent = src.label;
  btn.addEventListener('click', (e) => { e.stopPropagation(); showSourceModal(src); });
  return btn;
}

// ── Source modal ──────────────────────────────────────────────────────

function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeSourceModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeSourceModal();
  });
  document.getElementById('modal-open-btn').addEventListener('click', () => {
    if (activeSourceData?.demoUrl && activeSourceData.demoUrl !== '#demo') {
      chrome.tabs.create({ url: activeSourceData.demoUrl });
    }
    closeSourceModal();
  });
}

function showSourceModal(src) {
  activeSourceData = src;
  const tm = TYPE_META[src.type] || TYPE_META.statute;

  const typeBadge = document.getElementById('modal-type-badge');
  typeBadge.textContent = tm.label;
  typeBadge.className = `modal-type-badge ${tm.cls}`;

  document.getElementById('modal-title').textContent = src.label;
  document.getElementById('modal-excerpt').textContent = src.excerpt;

  const openBtn = document.getElementById('modal-open-btn');
  openBtn.textContent = src.demoUrl !== '#demo' ? 'Öppna källa ↗' : 'Stäng (demolänk)';

  document.getElementById('modal-overlay').classList.add('open');
}

function closeSourceModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  activeSourceData = null;
}
