/**
 * The only module that talks HTTP. Everything else goes through the typed services
 * in this folder, which keeps base URL, credentials, error parsing and timeouts in one place.
 */
import type { ApiEnvelope, ApiErrorBody } from "@/types/api";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api/v1";
const REQUEST_TIMEOUT_MS = 30_000;

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorBody["error"]["details"];

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorBody["error"]["details"] = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get fieldErrors(): Record<string, string> {
    return this.details.fields ?? {};
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribe to 401 responses (session expired or revoked). Returns an unsubscribe function. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
}

function combineSignals(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function toApiError(response: Response): Promise<ApiError> {
  const fallback =
    response.status >= 500
      ? "Ocurrió un error en el servidor. Inténtalo nuevamente en unos minutos."
      : "No pudimos completar la solicitud.";
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body.error) {
      return new ApiError(
        response.status,
        body.error.code,
        response.status >= 500 ? fallback : body.error.message,
        body.error.details ?? {},
      );
    }
  } catch {
    // Non-JSON error body (e.g. a proxy page): fall through to the generic message.
  }
  return new ApiError(response.status, "HTTP_ERROR", fallback);
}

async function send(method: string, path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(options.query)}`, {
      method,
      headers,
      body,
      credentials: "include",
      signal: combineSignals(options.signal),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError" && options.signal?.aborted) {
      throw error; // cancelled by the caller (e.g. TanStack Query): not a user-facing error
    }
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new ApiError(
      0,
      timedOut ? "TIMEOUT" : "NETWORK_ERROR",
      timedOut
        ? "El servidor tardó demasiado en responder. Inténtalo nuevamente."
        : "No pudimos conectar con el servidor. Comprueba tu conexión e inténtalo nuevamente.",
    );
  }

  if (!response.ok) {
    const apiError = await toApiError(response);
    if (response.status === 401) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    throw apiError;
  }
  return response;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}) {
  const response = await send(method, path, options);
  if (response.status === 204) {
    return { data: undefined as T, message: "" } satisfies ApiEnvelope<T>;
  }
  return (await response.json()) as ApiEnvelope<T>;
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export const apiClient = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    request<T>("GET", path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
  delete: (path: string, query?: QueryParams) => request<void>("DELETE", path, { query }),

  /** Downloads a file response and hands it to the browser. Returns the file name. */
  async download(path: string, query: QueryParams, fallbackName: string): Promise<string> {
    const response = await send("GET", path, { query });
    const blob = await response.blob();
    const filename = filenameFromDisposition(
      response.headers.get("Content-Disposition"),
      fallbackName,
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return filename;
  },
};
