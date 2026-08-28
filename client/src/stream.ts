// SSE-over-fetch reader for the streaming story endpoints.

export interface StoryResult {
  gameId?: string;
  story: string;
  choices: string[];
  progress: number;
}

export async function streamStory(
  path: string,
  body: Record<string, unknown>,
  onToken: (text: string) => void,
): Promise<StoryResult> {
  const base = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('token');
  const response = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    let message = 'Story stream failed';
    try {
      message = (await response.json()).error || message;
    } catch { /* not json */ }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: StoryResult | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';
    for (const frame of frames) {
      const line = frame.split('\n').find(l => l.startsWith('data: '));
      if (!line) continue;
      try {
        const evt = JSON.parse(line.slice(6));
        if (evt.type === 'token') onToken(evt.text);
        else if (evt.type === 'done') result = evt;
      } catch { /* malformed frame */ }
    }
  }

  if (!result) throw new Error('Story stream ended unexpectedly');
  return result;
}
