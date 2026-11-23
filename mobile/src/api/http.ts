/** Error de la API con su código, para que una pantalla pueda reaccionar (por ejemplo, elegir empresa). */
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public data?: any) { super(message); }
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '/api';
export const authorized = (token: string) => ({ Authorization: `Bearer ${token}` });
export const jsonBody = (token: string, body: unknown, method = 'POST'): RequestInit => ({
  method, headers: { ...authorized(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export async function requestJson(url: string, options: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch {
      throw new Error('El servidor no entregó una respuesta válida. Inténtalo nuevamente.');
    }
    if (!response.ok) throw new ApiError(result.message ?? 'No fue posible completar la solicitud.', response.status, result.code, result);
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw new Error((options.method ?? 'GET').toUpperCase() === 'GET'
      ? 'La consulta tardó demasiado. Puedes volver a intentarlo.'
      : 'La operación tardó demasiado. Revisa tus boletas antes de volver a enviar para evitar duplicados.');
    if (error instanceof TypeError || (error instanceof Error && /UnknownHostException|Unable to resolve host|Network request failed|fetch failed/i.test(error.message)))
      throw new Error('No fue posible conectar con el servidor. Comprueba tu conexión e inténtalo nuevamente.');
    throw error;
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
