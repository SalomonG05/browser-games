process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();
const express = require('express');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const IMAGE_PROVIDER = (process.env.IMAGE_PROVIDER ?? 'openai').toLowerCase();
console.log(`[config] IMAGE_PROVIDER = ${IMAGE_PROVIDER}`);

function buildPromptOpenAI(description) {
  return (
    `Create one realistic fictional football player facepack portrait based on this description: ${description}. ` +
    `The image must match a Football Manager-style player face portrait. Use a fully transparent background. ` +
    `The player should be centered, front-facing, with realistic skin texture, natural professional football media-day lighting, ` +
    `sharp facial detail, clean cut-out edges, and a tight crop showing the head, neck, and a small part of the shoulders. ` +
    `No background, no text, no watermark, no club logo, no shirt logo, no border, no frame. ` +
    `The player must be completely fictional and must not resemble any real footballer, celebrity, or public figure.`
  );
}

function buildPromptPollinations(description) {
  return (
    `Realistic fictional football player facepack portrait. ${description}. ` +
    `Football Manager-style player face portrait. Plain white background. ` +
    `Centered, front-facing, realistic skin texture, natural professional football media-day lighting, ` +
    `sharp facial detail, tight crop showing head, neck, and a small part of the shoulders. ` +
    `No text, no watermark, no club logo, no shirt logo, no border, no frame. ` +
    `Completely fictional person, does not resemble any real footballer, celebrity, or public figure.`
  );
}

async function generateWithOpenAI(description) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.images.generate({
    model:         'gpt-image-1',
    prompt:        buildPromptOpenAI(description),
    n:             1,
    size:          '1024x1024',
    background:    'transparent',
    output_format: 'png',
    quality:       'medium',
  });
  return response.data[0].b64_json;
}

async function generateWithPollinations(description) {
  const prompt   = buildPromptPollinations(description);
  const encoded  = encodeURIComponent(prompt);
  const key      = process.env.POLLINATIONS_API_KEY;
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : '';
  const url      = `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=256&height=256&nologo=true&enhance=false${keyParam}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations returned HTTP ${response.status}: ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    const body = await response.text();
    throw new Error(`Pollinations returned unexpected content-type "${contentType}": ${body.slice(0, 200)}`);
  }
  return Buffer.from(await response.arrayBuffer()).toString('base64');
}

app.post('/api/generate', async (req, res) => {
  const { description } = req.body ?? {};
  if (!description || description.trim().length < 5) {
    return res.status(400).json({ error: 'Please enter a player description (at least 5 characters).' });
  }
  const trimmed = description.trim();
  try {
    const base64 = IMAGE_PROVIDER === 'pollinations'
      ? await generateWithPollinations(trimmed)
      : await generateWithOpenAI(trimmed);
    res.json({ image: base64 });
  } catch (err) {
    console.error(`[${IMAGE_PROVIDER}] generation error:`, err?.message ?? err);
    let msg = err?.message ?? 'Image generation failed.';
    if (IMAGE_PROVIDER === 'openai' && err?.status === 401) {
      msg = 'Invalid OpenAI API key — check your .env file.';
    }
    res.status(500).json({ error: msg });
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`FM Face Generator running at http://localhost:${PORT}`));
