/**
 * Thin HTTP client for the external FitCoach AI service (Python / FastAPI).
 *
 * The app works fully without it: when `VITE_AI_API_URL` is not configured,
 * AI features fall back to the built-in server functions in
 * `src/lib/coach.functions.ts`. Wire the FastAPI service by setting
 * `VITE_AI_API_URL` and the frontend will prefer it automatically.
 */

export const AI_API_URL: string | undefined = import.meta.env["VITE_AI_API_URL"] as
  | string
  | undefined;

export const aiBackendConfigured = Boolean(AI_API_URL);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string | null;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!AI_API_URL) {
    throw new ApiError("External AI service is not configured", 501);
  }

  const response = await fetch(`${AI_API_URL.replace(/\/$/, "")}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(text || `Request failed with status ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}
