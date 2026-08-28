import fetch from 'node-fetch';
import { PASSAGES, CHOICE_PAIRS, pick } from './multiplayer/content.js';

// Streams a story paragraph to an SSE response, token by token.
// Uses OpenRouter when a key is configured, otherwise replays a local
// passage word by word so the experience is identical without a key.

const sse = (res, obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
const delay = (ms) => new Promise(r => setTimeout(r, ms));

function storyPrompt(choice, genre) {
  const style = 'Write one vivid paragraph of 40 to 60 words. Plain prose only - letters, spaces, commas, periods and apostrophes. No quotes, no markdown, no line breaks.';
  return choice
    ? `The player chose: ${choice}. Continue the ${genre} story. ${style}`
    : `Start a ${genre} adventure story in the middle of the action. ${style}`;
}

// Keep streamed text friendly to the typing engine
function sanitize(text) {
  return text.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '').trim();
}

async function streamFromOpenRouter(res, prompt, isClosed) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 200,
        stream: true,
      }),
    });
    if (!response.ok || !response.body) return null;

    let full = '';
    let buffer = '';
    for await (const chunk of response.body) {
      if (isClosed()) return null;
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const data = line.replace(/^data: /, '').trim();
        if (!data || data === '[DONE]' || data.startsWith(':')) continue;
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            const clean = token.replace(/[^\x20-\x7E]/g, '').replace(/\n/g, ' ');
            if (clean) {
              full += clean;
              sse(res, { type: 'token', text: clean });
            }
          }
        } catch { /* partial JSON line, wait for more */ }
      }
    }
    return sanitize(full) || null;
  } catch (err) {
    console.error('OpenRouter stream error:', err.message);
    return null;
  }
}

async function streamLocal(res, text, isClosed) {
  for (const word of text.split(' ')) {
    if (isClosed()) return;
    sse(res, { type: 'token', text: word + ' ' });
    await delay(45);
  }
}

async function generateChoices(paragraph, genre) {
  const key = process.env.OPENROUTER_API_KEY;
  if (key) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: [{
            role: 'user',
            content: `Based on this ${genre} story paragraph:\n"${paragraph}"\nWrite exactly 2 choices for what the player does next, each 5 to 10 simple words, one per line, no numbering.`,
          }],
          temperature: 0.7,
          max_tokens: 80,
        }),
      });
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || '';
      const options = raw.split('\n').map(l => sanitize(l)).filter(Boolean).slice(0, 2);
      if (options.length === 2) return options;
    } catch (err) {
      console.error('Choices error:', err.message);
    }
  }
  return pick(CHOICE_PAIRS);
}

// Streams the paragraph and returns { story, choices } for the caller to persist.
export async function streamStory(res, { choice, genre = 'fantasy' }) {
  let closed = false;
  res.on('close', () => { closed = true; });
  const isClosed = () => closed;

  let story = await streamFromOpenRouter(res, storyPrompt(choice, genre), isClosed);
  if (!story) {
    const list = PASSAGES[genre] || PASSAGES.fantasy;
    story = pick(list);
    await streamLocal(res, story, isClosed);
  }
  const choices = await generateChoices(story, genre);
  return { story, choices, closed };
}

export { sse };
