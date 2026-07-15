export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

type Envelope<T> = {
  ok: boolean
  data?: T
  error?: string
}

/**
 * Typed fetch for fund-ledger JSON APIs: `{ ok, data }` / `{ ok, error }`.
 * Propagates AbortError; throws ApiError on non-OK or envelope failure.
 */
export async function apiGet<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  })

  let body: Envelope<T> | null = null
  try {
    body = (await res.json()) as Envelope<T>
  } catch {
    if (!res.ok) {
      throw new ApiError(`请求失败 (${res.status})`, res.status)
    }
    throw new ApiError("响应解析失败", res.status)
  }

  if (!res.ok || body.ok === false) {
    throw new ApiError(body.error ?? `请求失败 (${res.status})`, res.status)
  }

  return body.data as T
}

export async function apiPost<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  return apiGet<T>(url, { ...init, method: "POST" })
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}
