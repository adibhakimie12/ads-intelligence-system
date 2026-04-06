const GEMINI_TEST_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

const readErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === 'string') {
      return payload.error.message;
    }

    if (typeof payload?.message === 'string') {
      return payload.message;
    }
  } catch {
    // Ignore JSON parsing failures and fall back to a generic message.
  }

  return `Google AI request failed with status ${response.status}.`;
};

const extractText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .join(' ')
    .trim();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
  if (!apiKey) {
    return res.status(400).json({ error: 'Google AI API key is required.' });
  }

  try {
    const response = await fetch(GEMINI_TEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Reply with exactly: connected',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      return res.status(response.status).json({ error: message });
    }

    const payload = await response.json();
    const responsePreview = extractText(payload);

    return res.status(200).json({
      ok: true,
      message: 'Google AI API key is valid.',
      model: 'gemini-3-flash-preview',
      responsePreview,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to reach Google AI right now.',
    });
  }
}
