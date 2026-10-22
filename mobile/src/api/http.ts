export async function requestJson(url: string, options: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch {
      throw new Error('El servidor no entregó una respuesta válida. Inténtalo nuevamente.');
    }
    if (!response.ok) {
      throw new Error(result.message ?? 'No fue posible completar la solicitud.');
    }
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('La operación tardó demasiado. Revisa tus boletas antes de volver a enviar para evitar duplicados.');
    if (error instanceof TypeError) throw new Error('No fue posible conectar con el servidor. Comprueba tu conexión.');
    throw error;
  } finally { clearTimeout(timer); }
}
