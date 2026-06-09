require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(description) {
  return (
    `Create one realistic fictional football player facepack portrait based on this description: ${description}. ` +
    `The image must match a Football Manager-style player face portrait. Use a fully transparent background. ` +
    `The player should be centered, front-facing, with realistic skin texture, natural professional football media-day lighting, ` +
    `sharp facial detail, clean cut-out edges, and a tight crop showing the head, neck, and a small part of the shoulders. ` +
    `No background, no text, no watermark, no club logo, no shirt logo, no border, no frame. ` +
    `The player must be completely fictional and must not resemble any real footballer, celebrity, or public figure.`
  );
}

app.post('/api/generate', async (req, res) => {
  const { description } = req.body ?? {};

  if (!description || description.trim().length < 5) {
    return res.status(400).json({ error: 'Please enter a player description (at least 5 characters).' });
  }

  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: buildPrompt(description.trim()),
      n: 1,
      size: '1024x1024',
      background: 'transparent',
      output_format: 'png',
      quality: 'medium',
    });

    res.json({ image: response.data[0].b64_json });
  } catch (err) {
    console.error('OpenAI error:', err?.message ?? err);
    const msg = err?.status === 401
      ? 'Invalid OpenAI API key — check your .env file.'
      : err?.message ?? 'Image generation failed.';
    res.status(500).json({ error: msg });
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`FM Face Generator running at http://localhost:${PORT}`));
