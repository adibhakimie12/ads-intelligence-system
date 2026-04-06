const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';

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

  return `OpenAI request failed with status ${response.status}.`;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
  if (!apiKey) {
    return res.status(400).json({ error: 'OpenAI API key is required.' });
  }

  try {
    const response = await fetch(OPENAI_MODELS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      return res.status(response.status).json({ error: message });
    }

    const payload = await response.json();
    const modelIds = Array.isArray(payload?.data)
      ? payload.data
          .map((model) => model?.id)
          .filter((modelId) => typeof modelId === 'string')
          .slice(0, 5)
      : [];

    return res.status(200).json({
      ok: true,
      message: 'OpenAI API key is valid.',
      availableModelCount: Array.isArray(payload?.data) ? payload.data.length : 0,
      sampleModels: modelIds,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to reach OpenAI right now.',
    });
  }
}
