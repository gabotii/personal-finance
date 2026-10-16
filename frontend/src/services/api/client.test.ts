import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient, buildQuery, onUnauthorized } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildQuery", () => {
  it("skips empty values and encodes the rest", () => {
    expect(buildQuery({ q: "café & pan", page: 2, type: undefined, empty: "", x: null })).toBe(
      "?q=caf%C3%A9+%26+pan&page=2",
    );
    expect(buildQuery({})).toBe("");
  });
});

describe("apiClient", () => {
  it("unwraps the {data, message} envelope and sends cookies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { data: { id: 1 }, message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiClient.get<{ id: number }>("/things", { page: 1 });

    expect(result).toEqual({ data: { id: 1 }, message: "ok" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/things?page=1");
    expect(init.credentials).toBe("include");
  });

  it("maps the error envelope to ApiError with field errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(422, {
          error: {
            code: "VALIDATION_ERROR",
            message: "Los datos enviados no son válidos.",
            details: { fields: { amount: "El monto debe ser mayor a 0." } },
          },
        }),
      ),
    );

    const error = await apiClient.post("/transactions", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("VALIDATION_ERROR");
    expect((error as ApiError).fieldErrors).toEqual({ amount: "El monto debe ser mayor a 0." });
  });

  it("never exposes server error details for 5xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(500, {
          error: { code: "INTERNAL_ERROR", message: "Traceback ...", details: {} },
        }),
      ),
    );
    const error = (await apiClient.get("/x").catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(500);
    expect(error.message).not.toContain("Traceback");
  });

  it("reports network failures with a friendly message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const error = (await apiClient.get("/x").catch((e: unknown) => e)) as ApiError;
    expect(error.isNetworkError).toBe(true);
    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("notifies 401 listeners", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(401, {
          error: { code: "UNAUTHORIZED", message: "Debes iniciar sesión.", details: {} },
        }),
      ),
    );
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    await apiClient.get("/auth/me").catch(() => undefined);
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("returns an empty envelope for 204 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiClient.delete("/transactions/1")).resolves.toEqual({
      data: undefined,
      message: "",
    });
  });
});
