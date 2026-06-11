let selectedText = '';
let selectedArea = null;
let selectedMode = 'tentarättning';

const PROGRESS_STEPS = [
  'Läser juridisk text…',
  'Identifierar rättsliga frågeställningar…',
  'Söker relevanta lagrum…',
  'Analyserar rättsfall…',
  'Bedömer argumentation och struktur…',
  'Identifierar saknade moment…',
  'Genererar feedbacksektioner…',
  'Sammanställer juridisk rapport…',
];

const GRADE_MAP = {
  VG: { name: 'Väl Godkänd', ringClass: '' },
  G:  { name: 'Godkänd',     ringClass: 'grade-g' },
  U:  { name: 'Underkänd',   ringClass: 'grade-u' },
};

const SECTION_CONFIG = [
  { key: 'styrkor',                title: 'Styrkor',                    icon: '✓', type: 'list',   bulletClass: '' },
  { key: 'saknadeMoment',          title: 'Saknade moment',             icon: '○', type: 'list',   bulletClass: '' },
  { key: 'saknadeLagrum',          title: 'Saknade lagrum',             icon: '§', type: 'list',   bulletClass: 'ref' },
  { key: 'saknadeRattsfall',       title: 'Saknade rättsfall',          icon: '⚖', type: 'list',   bulletClass: 'case' },
  { key: 'bristerITillämpning',    title: 'Brister i tillämpning',      icon: '△', type: 'text' },
  { key: 'forbattradDisposition',  title: 'Förbättrad disposition',     icon: '≡', type: 'text' },
  { key: 'förslagBattreTentasvar', title: 'Förslag på bättre tentasvar',icon: '→', type: 'text' },
  { key: 'kallgrund',              title: 'Källgrund / underlag',       icon: '📚', type: 'list',  bulletClass: 'ref' },
];

// ── Boot ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initAreaPills();
  initModeToggle();
  initSubmitBtn();
  initExpandBtn();
  initSourceButtons();
});

// ── Source buttons ────────────────────────────────────────────────────

function initSourceButtons() {
  document.getElementById('btn-fetch-selection').addEventListener('click', async () => {
    await fetchFromPage(() => window.getSelection()?.toString().trim() ?? '', 'markering');
  });

  document.getElementById('btn-fetch-page').addEventListener('click', async () => {
    await fetchFromPage(
      () => (document.body?.innerText ?? '').replace(/\s{3,}/g, '\n\n').trim().slice(0, 20000),
      'sidan'
    );
  });
}

async function fetchFromPage(pageFn, label) {
  const selBtn = document.getElementById('btn-fetch-selection');
  const pageBtn = document.getElementById('btn-fetch-page');
  selBtn.disabled = true;
  pageBtn.disabled = true;
  hideSourceError();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: pageFn });
    const text = results?.[0]?.result ?? '';

    if (text.length > 10) {
      applySelectedText(text);
    } else {
      showSourceError(
        label === 'markering'
          ? 'Ingen text är markerad på sidan. Markera text och försök igen.'
          : 'Ingen läsbar text hittades på den här sidan.'
      );
    }
  } catch {
    showSourceError('Kunde inte läsa sidan. Chrome-sidor och PDF:er stöds ej — prova en vanlig webbsida.');
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

// ── Selected text ─────────────────────────────────────────────────────

function applySelectedText(text) {
  selectedText = text;

  const box = document.getElementById('text-box');
  const badge = document.getElementById('text-badge');
  const expandBtn = document.getElementById('expand-btn');

  box.textContent = text;
  box.classList.remove('placeholder');

  badge.textContent = `${text.length} tecken`;
  badge.classList.remove('empty');

  expandBtn.style.display = text.length > 200 ? 'block' : 'none';

  updateSubmitState();
}

function initExpandBtn() {
  const btn = document.getElementById('expand-btn');
  const box = document.getElementById('text-box');

  btn.addEventListener('click', () => {
    const expanded = box.classList.toggle('expanded');
    btn.textContent = expanded ? 'Visa mindre ▴' : 'Visa mer ▾';
  });
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

// ── Submit & analysis ─────────────────────────────────────────────────

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

  // ── Swap this call with a real API request in production ──
  const response = getDemoResponse(selectedArea, selectedMode);
  // ─────────────────────────────────────────────────────────

  document.getElementById('progress-card').style.display = 'none';
  renderResults(response);

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
    const pctEl = document.getElementById('progress-pct');
    const stepEl = document.getElementById('progress-step');

    const tick = setInterval(() => {
      pct = Math.min(pct + Math.random() * 3.5 + 0.8, 99);
      fill.style.width = pct + '%';
      pctEl.textContent = Math.floor(pct) + '%';

      const newIdx = Math.min(
        Math.floor((pct / 100) * PROGRESS_STEPS.length),
        PROGRESS_STEPS.length - 1
      );
      if (newIdx !== stepIdx) {
        stepIdx = newIdx;
        stepEl.textContent = PROGRESS_STEPS[stepIdx];
      }

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

// ── Render results ────────────────────────────────────────────────────

function renderResults(data) {
  renderGradeCard(data);
  renderFeedbackSections(data);
}

function renderGradeCard(data) {
  const ring = document.getElementById('grade-ring');
  const gradeText = document.getElementById('grade-text');
  const gradeName = document.getElementById('grade-name');
  const gradeScore = document.getElementById('grade-score-line');
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

  gradeSummary.textContent = data.samladBedömning;
}

function renderFeedbackSections(data) {
  const container = document.getElementById('feedback-sections');
  container.innerHTML = '';

  SECTION_CONFIG.forEach((cfg, i) => {
    const value = data[cfg.key];
    if (!value || (Array.isArray(value) && value.length === 0)) return;

    const startOpen = i < 3;
    const card = document.createElement('div');
    card.className = 'fb-card';

    const header = document.createElement('div');
    header.className = 'fb-header';
    header.innerHTML = `
      <div class="fb-title-row">
        <span class="fb-icon">${cfg.icon}</span>
        <span>${cfg.title}</span>
      </div>
      <span class="fb-chevron ${startOpen ? 'open' : ''}">▾</span>
    `;

    const body = document.createElement('div');
    body.className = `fb-body ${startOpen ? 'open' : ''}`;

    const inner = document.createElement('div');
    inner.className = 'fb-inner';

    if (cfg.type === 'list' && Array.isArray(value)) {
      const ul = document.createElement('ul');
      ul.className = 'fb-list';
      value.forEach((item) => {
        const li = document.createElement('li');
        const bullet = document.createElement('span');
        bullet.className = `fb-bullet${cfg.bulletClass ? ' ' + cfg.bulletClass : ''}`;
        bullet.textContent = cfg.bulletClass === 'ref' ? '§' : cfg.bulletClass === 'case' ? '⚖' : '▸';
        const span = document.createElement('span');
        span.textContent = item;
        li.appendChild(bullet);
        li.appendChild(span);
        ul.appendChild(li);
      });
      inner.appendChild(ul);
    } else {
      const p = document.createElement('p');
      p.className = 'fb-text';
      p.textContent = value;
      inner.appendChild(p);
    }

    body.appendChild(inner);

    header.addEventListener('click', () => {
      const chevron = header.querySelector('.fb-chevron');
      body.classList.toggle('open');
      chevron.classList.toggle('open');
    });

    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });
}
