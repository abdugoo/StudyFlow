export type User = { id: number; username: string; full_name: string; role: 'student' | 'teacher'; created_at: string };
export type Course = { id: number; title: string; description: string; created_at: string; teacher: { id: number; full_name: string } };
export type Student = { id: number; username: string; full_name: string };
export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('studyflow-token');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof URLSearchParams)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try { response = await fetch(`/api${path}`, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(15000) }); }
  catch (error) { if (init.signal?.aborted) throw error; throw new ApiError(0, 'Не удалось подключиться к серверу. Проверьте, запущен ли backend.'); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('session-expired'));
    const detail = Array.isArray(body.detail) ? body.detail.map((item: {msg: string}) => item.msg).join('. ') : body.detail;
    throw new ApiError(response.status, detail || `Ошибка сервера (${response.status}). Попробуйте ещё раз.`);
  }
  return response.status === 204 ? undefined as T : response.json();
}
