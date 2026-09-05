import type { HookContext } from "@w6w/types";

/**
 * Teamleader Focus API — an HTTP RPC surface, not REST.
 *
 * Verified against `developer.focus.teamleader.eu/docs/general-principles` and
 * `/docs/authentication` on 2026-09-01. Every call, regardless of whether it
 * reads or writes, is `POST https://api.focus.teamleader.eu/<resource>.<action>`
 * with a JSON body (`{}` when the method takes no arguments) — there is no
 * `GET`, and the vendor states the RPC choice explicitly: "we chose this
 * action based approach over the more popular REST, because it enables us to
 * have domain related actions on resources such as `invoices.book`,
 * `timetracking.start` and `timetracking.stop`."
 *
 * Responses are always `{"data": …}` on success (a single object or an array,
 * with `meta.page` alongside a paged array) and `{"errors": [{"title": …}]}`
 * on failure. A create returns `201` with `{"data": {"type", "id"}}`; an
 * update or action-style endpoint (`contacts.tag`, `deals.win`, …) returns
 * `204` with no body.
 */
export const API_URL = "https://api.focus.teamleader.eu";

/** Thrown when Teamleader answers with a non-2xx status. */
export class TeamleaderError extends Error {
  constructor(
    public readonly status: number,
    public readonly method: string,
    public readonly titles: string[],
  ) {
    super(
      titles.length > 0
        ? `Teamleader ${method} failed (${status}): ${titles.join("; ")}`
        : `Teamleader ${method} failed (${status})`,
    );
    this.name = "TeamleaderError";
  }
}

interface ErrorBody {
  errors?: Array<{ title?: string }>;
}

/**
 * Call one RPC method (`"contacts.list"`, `"deals.create"`, …). `body` is
 * sent verbatim as JSON; omit it for methods that take no arguments
 * (`users.me`).
 *
 * A `204 No Content` response (updates and action-style endpoints) resolves
 * to `undefined`. Every other 2xx resolves to the parsed `data` payload.
 */
export async function call<T = unknown>(
  ctx: HookContext,
  method: string,
  body?: unknown,
): Promise<T> {
  const res = await ctx.fetch(`${API_URL}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null) as ErrorBody | null;
    const titles = (errBody?.errors ?? [])
      .map((e) => e.title)
      .filter((t): t is string => typeof t === "string" && t.length > 0);
    throw new TeamleaderError(res.status, method, titles);
  }

  if (res.status === 204) return undefined as T;

  const body_ = await res.json().catch(() => null) as { data?: T; meta?: unknown } | null;
  return (body_?.data ?? undefined) as T;
}

/**
 * Same as {@link call}, but also returns the response's `meta` block — the
 * `.list` endpoints carry pagination (`meta.page`, `meta.matches`) there.
 */
export async function callWithMeta<T = unknown, M = unknown>(
  ctx: HookContext,
  method: string,
  body?: unknown,
): Promise<{ data: T; meta?: M }> {
  const res = await ctx.fetch(`${API_URL}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null) as ErrorBody | null;
    const titles = (errBody?.errors ?? [])
      .map((e) => e.title)
      .filter((t): t is string => typeof t === "string" && t.length > 0);
    throw new TeamleaderError(res.status, method, titles);
  }

  const parsed = await res.json().catch(() => ({})) as { data?: T; meta?: M };
  return { data: (parsed.data ?? undefined) as T, meta: parsed.meta };
}

/**
 * Strip `undefined`/`""` values from a filter/body object so optional Action
 * params can be spread in unconditionally. Does not recurse — Teamleader's
 * nested objects (`filter.email`, `lead.customer`, …) are built explicitly by
 * each action, which keeps the required sub-fields visible at the call site.
 */
export function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === "") continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
