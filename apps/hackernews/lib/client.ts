import type { HookContext } from "@w6w/types";

/**
 * Hacker News API v0 (Firebase-backed), per the official spec at
 * https://github.com/HackerNews/API (README fetched and verified 2026-09-05) and
 * confirmed live against `hacker-news.firebaseio.com`.
 *
 * ## Genuinely no-auth
 *
 * The README states plainly: "There is currently no rate limit." There is no API
 * key, no OAuth flow, and no account of any kind — every documented endpoint,
 * including item/user reads and the story-id lists, is unauthenticated by
 * design. This app declares no Auth method at all (see `index.ts`), the same
 * "omit for a no-auth app" shape this pack already uses for PostBin.
 *
 * ## One host, `.json` suffix
 *
 * Every path lives under `/v0/` and ends in `.json`. The README's `?print=pretty`
 * query param is documented only as a human-readability aid for browsing the
 * API in a browser — never required for a machine client — so this client omits
 * it.
 *
 * ## `GET` only
 *
 * A `HEAD` request 405s on every path (verified live 2026-09-05), so every
 * probe in this app, including the health check, uses `GET`.
 *
 * ## A missing id is `200 null`, not a 404
 *
 * Fetching an item or user id that does not exist answers HTTP 200 with the
 * literal JSON body `null` — verified live against a deliberately bogus item id
 * and username. There is no error envelope of any kind. So a 200 response here
 * is not by itself proof the id exists; callers that need to distinguish
 * "not found" from "empty object" should check for `null`.
 */
export const API_BASE = "https://hacker-news.firebaseio.com/v0";

export type ItemType = "job" | "story" | "comment" | "poll" | "pollopt";

/**
 * A story, comment, job post, poll, or poll option. `id` is the only field the
 * vendor documents as always present; everything else varies by `type` (e.g. a
 * comment has no `title`, a job has no `descendants`).
 */
export interface Item {
  id: number;
  deleted?: boolean;
  type?: ItemType;
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

/**
 * A user profile. Only users with public activity (comments or story
 * submissions) are reachable through the API, per the README.
 */
export interface User {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

/** The body of `GET /v0/updates.json` — recently changed items and profiles. */
export interface Updates {
  items: number[];
  profiles: string[];
}

/**
 * Thin wrapper over `ctx.fetch`. Every response here is a bare JSON value — an
 * object, an array of ids, or a plain number — there is no `{"data": …}`
 * envelope anywhere in this API.
 */
export async function hnRequest<T>(ctx: HookContext, path: string): Promise<T> {
  const res = await ctx.fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Hacker News API returned ${res.status} for GET ${path}`);
  }
  const text = await res.text();
  return (text.length > 0 ? JSON.parse(text) : null) as T;
}

/**
 * Shared body for the six story-id list endpoints (`topstories`, `newstories`,
 * `beststories`, `askstories`, `showstories`, `jobstories`) — each is a bare
 * array of item ids at its own fixed path, with no query params or paging of
 * any kind. The README documents a fixed cap per list (500 for top/new/best,
 * 200 for ask/show/job) rather than a caller-controlled `limit`.
 */
export async function listStoryIds(ctx: HookContext, path: string): Promise<number[]> {
  const ids = await hnRequest<number[] | null>(ctx, path);
  return ids ?? [];
}
