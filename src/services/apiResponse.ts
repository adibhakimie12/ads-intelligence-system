export const readJsonResponse = async (response: Response, fallbackContext: string) => {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    const text = await response.text().catch(() => '');
    return {
      ok: false as const,
      status: response.status,
      error: text.includes('<!DOCTYPE') || text.includes('<html')
        ? `${fallbackContext} returned HTML instead of JSON. Make sure the API server is running and the /api route is available.`
        : `${fallbackContext} returned a non-JSON response.`,
    };
  }

  try {
    return {
      ok: true as const,
      status: response.status,
      data: await response.json(),
    };
  } catch {
    return {
      ok: false as const,
      status: response.status,
      error: `${fallbackContext} returned invalid JSON.`,
    };
  }
};
