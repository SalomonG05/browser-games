require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3003;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

app.use(express.json());
app.use(express.static(__dirname));

// ─── Persistence ──────────────────────────────────────────────────────────────

function readData() {
  if (!fs.existsSync(DATA_FILE)) return { courses: [], materials: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ─── File upload ──────────────────────────────────────────────────────────────

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const ALLOWED_EXT = new Set(['.pdf', '.docx', '.txt']);

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Otillåten filtyp: ${file.originalname}. Tillåtna: PDF, DOCX, TXT`));
    }
  },
});

async function extractText(filePath, mimetype) {
  if (mimetype === 'application/pdf') {
    const pdfParse = require('pdf-parse');
    const buf = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    return data.text || '';
  }
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

// ─── Courses ──────────────────────────────────────────────────────────────────

app.get('/api/courses', (req, res) => {
  res.json(readData().courses);
});

app.post('/api/courses', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Namn krävs' });
  const db = readData();
  const course = { id: `c_${Date.now()}`, name: name.trim(), createdAt: new Date().toISOString() };
  db.courses.push(course);
  writeData(db);
  res.status(201).json(course);
});

app.patch('/api/courses/:id', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Namn krävs' });
  const db = readData();
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Kurs hittades inte' });
  course.name = name.trim();
  writeData(db);
  res.json(course);
});

app.delete('/api/courses/:id', (req, res) => {
  const db = readData();
  const idx = db.courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Kurs hittades inte' });
  db.courses.splice(idx, 1);
  // Remove materials and their files
  const toDelete = db.materials.filter(m => m.courseId === req.params.id);
  toDelete.forEach(m => {
    const fp = path.join(UPLOADS_DIR, m.storedFilename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  });
  db.materials = db.materials.filter(m => m.courseId !== req.params.id);
  writeData(db);
  res.json({ ok: true });
});

// ─── Materials ────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  'study', 'grading_rubric', 'model_answer', 'teacher_comment',
  'exam_question', 'student_answer', 'legal_source',
]);

app.get('/api/courses/:courseId/materials', (req, res) => {
  const db = readData();
  res.json(db.materials.filter(m => m.courseId === req.params.courseId));
});

app.post('/api/courses/:courseId/materials', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Filen är för stor (max 10 MB)' });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'Ingen fil' });
    const { category, name } = req.body;
    if (!VALID_CATEGORIES.has(category)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Ogiltig kategori: ${category}` });
    }
    const db = readData();
    if (!db.courses.find(c => c.id === req.params.courseId)) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Kurs hittades inte' });
    }
    let extractedText = '';
    try {
      extractedText = await extractText(req.file.path, req.file.mimetype);
    } catch (e) {
      extractedText = '';
    }
    const material = {
      id: `m_${Date.now()}`,
      courseId: req.params.courseId,
      name: (name || req.file.originalname).trim(),
      category,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      mimeType: req.file.mimetype,
      text: extractedText,
      active: true,
      uploadedAt: new Date().toISOString(),
    };
    db.materials.push(material);
    writeData(db);
    res.status(201).json({ ...material, extractedText });
  });
});

app.get('/api/materials/:id/text', (req, res) => {
  const db = readData();
  const m = db.materials.find(m => m.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Material hittades inte' });
  res.json({ id: m.id, name: m.name, text: m.text });
});

app.patch('/api/materials/:id', (req, res) => {
  const db = readData();
  const m = db.materials.find(m => m.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Material hittades inte' });
  if (req.body.name !== undefined) m.name = req.body.name.trim();
  if (req.body.active !== undefined) m.active = Boolean(req.body.active);
  if (req.body.text !== undefined) m.text = req.body.text;
  writeData(db);
  res.json(m);
});

app.delete('/api/materials/:id', (req, res) => {
  const db = readData();
  const idx = db.materials.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Material hittades inte' });
  const [m] = db.materials.splice(idx, 1);
  const fp = path.join(UPLOADS_DIR, m.storedFilename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  writeData(db);
  res.json({ ok: true });
});

// ─── Grading ──────────────────────────────────────────────────────────────────

const PRIMARY_CATEGORIES = new Set(['grading_rubric', 'model_answer', 'teacher_comment']);
const SUPPORT_CATEGORIES = new Set(['study', 'legal_source']);

const GRADING_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: ['integer', 'null'] },
    score_label: { type: 'string' },
    level_assessment: { type: 'string' },
    strengths: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['text', 'sources'],
      },
    },
    missing_elements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['text', 'sources'],
      },
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['text', 'sources'],
      },
    },
    missing_lagrum: { type: 'array', items: { type: 'string' } },
    missing_rattsfall: { type: 'array', items: { type: 'string' } },
    improved_disposition: { type: 'string' },
    model_answer: { type: 'string' },
    next_step: { type: 'string' },
  },
  required: [
    'score', 'score_label', 'level_assessment',
    'strengths', 'missing_elements', 'errors',
    'missing_lagrum', 'missing_rattsfall',
    'improved_disposition', 'model_answer', 'next_step',
  ],
  additionalProperties: false,
};

function sdkSupportsOutputConfig() {
  try {
    const pkgFile = path.join(path.dirname(require.resolve('@anthropic-ai/sdk')), 'package.json');
    const ver = JSON.parse(fs.readFileSync(pkgFile)).version;
    const [major, minor] = ver.split('.').map(Number);
    return major > 0 || (major === 0 && minor >= 39);
  } catch {
    return false;
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const USE_OUTPUT_CONFIG = sdkSupportsOutputConfig();

async function callClaude(system, user) {
  const params = {
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  };
  if (USE_OUTPUT_CONFIG) {
    params.output_config = { format: { type: 'json_schema', schema: GRADING_SCHEMA } };
  }
  const response = await anthropic.messages.create(params);
  const text = response.content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    // strip possible markdown fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('Claude returnerade inte giltig JSON');
  }
}

function buildSystemPrompt(primaryMaterials, supportMaterials, hasRubric) {
  const primaryBlock = primaryMaterials.map(m =>
    `### ${m.name} (${m.category})\n${m.text}`
  ).join('\n\n');

  const supportBlock = supportMaterials.length
    ? supportMaterials.map(m => `### ${m.name} (${m.category})\n${m.text}`).join('\n\n')
    : '(Inga sekundärmaterial valda)';

  return `Du är ett juridiskt rättningsstöd för svenska juridikstudenter.

VIKTIGA REGLER:
1. Du får INTE hitta på lagrum, rättsfall eller juridiska fel som inte framgår av de uppladdade materialen nedan.
2. Om du saknar rättskällor för ett påstående — markera det som saknat, men påhitta aldrig egna.
3. Qura.ai används senare för extern rättskälleverifiering. Du behöver inte verifiera källorna själv.
4. ${hasRubric
    ? 'En poängmall är vald. Du SKA ge ett exakt poängtal (score) baserat på poängmallen.'
    : 'Ingen poängmall är vald. Du får INTE ge ett exakt poängtal. Sätt score till null och ge en försiktig nivåbedömning i level_assessment (t.ex. "Troligtvis godkänd – men ingen poängmall är vald, bedömningen är approximativ").'
  }
5. I varje "sources"-array: ange exakt vilket material (vid namn) som stöder bedömningen. Lämna tomt array om inget material explicit stöder påståendet.

PRIMÄR BEDÖMNINGSGRUND (väger tyngst):
${primaryBlock || '(Inga primärmaterial valda)'}

SEKUNDÄR GRUND / STÖDMATERIAL:
${supportBlock}

Svara ENBART med ett JSON-objekt som exakt matchar detta schema:
${JSON.stringify(GRADING_SCHEMA, null, 2)}

Inga kommentarer, ingen text utanför JSON.`;
}

function buildUserMessage(examText, studentText) {
  return `TENTAFRÅGA:
${examText}

STUDENTSVAR:
${studentText}

Rätta studentsvaret mot ovanstående material och returnera bedömningen som JSON.`;
}

function truncateToLimit(texts, limit) {
  const result = [];
  let total = 0;
  for (const t of texts) {
    if (total + t.text.length > limit) {
      const remaining = limit - total;
      if (remaining > 200) result.push({ ...t, text: t.text.slice(0, remaining) + '\n[TRUNKERAD]' });
      break;
    }
    result.push(t);
    total += t.text.length;
  }
  return result;
}

async function enrichWithQura(ctx) {
  // TODO: anropa Qura.ai API för rättskälleverifiering
  return ctx;
}

app.post('/api/grade', async (req, res) => {
  const { examQuestionId, studentAnswerId, selectedMaterialIds } = req.body;
  if (!examQuestionId || !studentAnswerId) {
    return res.status(400).json({ error: 'examQuestionId och studentAnswerId krävs' });
  }

  const db = readData();
  const examMat = db.materials.find(m => m.id === examQuestionId);
  const studentMat = db.materials.find(m => m.id === studentAnswerId);
  if (!examMat) return res.status(400).json({ error: 'Tentafråga hittades inte' });
  if (!studentMat) return res.status(400).json({ error: 'Studentsvar hittades inte' });

  const selected = (selectedMaterialIds || [])
    .map(id => db.materials.find(m => m.id === id))
    .filter(Boolean);

  let primaryMats = selected.filter(m => PRIMARY_CATEGORIES.has(m.category));
  let supportMats = selected.filter(m => SUPPORT_CATEGORIES.has(m.category));
  const hasRubric = primaryMats.some(m => m.category === 'grading_rubric');

  const CHAR_LIMIT = 80000;
  const fixedLen = examMat.text.length + studentMat.text.length;
  let remaining = CHAR_LIMIT - fixedLen;

  supportMats = truncateToLimit(supportMats, Math.floor(remaining * 0.4));
  remaining -= supportMats.reduce((s, m) => s + m.text.length, 0);
  primaryMats = truncateToLimit(primaryMats, remaining);

  const ctx = await enrichWithQura({ primaryMats, supportMats, examMat, studentMat });

  const system = buildSystemPrompt(ctx.primaryMats, ctx.supportMats, hasRubric);
  const user = buildUserMessage(ctx.examMat.text, ctx.studentMat.text);

  let result;
  try {
    result = await callClaude(system, user);
  } catch (e) {
    return res.status(500).json({ error: `Claude-fel: ${e.message}` });
  }

  const materialsUsed = [
    ...ctx.primaryMats.map(m => ({ materialId: m.id, name: m.name, category: m.category, role: 'PRIMARY' })),
    ...ctx.supportMats.map(m => ({ materialId: m.id, name: m.name, category: m.category, role: 'SUPPORT' })),
  ];

  res.json({ result, materialsUsed, quraAnnotations: null });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Juridisk tentaträning → http://localhost:${PORT}`);
  console.log(`SDK output_config: ${USE_OUTPUT_CONFIG ? 'aktiverat' : 'fallback (JSON via prompt)'}`);
});
