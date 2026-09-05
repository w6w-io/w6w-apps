import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { envelope, pathOf } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

/** Build a ctx whose fetch answers with specific rate-limit headers. */
function ctxWithHeaders(headers: Record<string, string>, status = 200) {
  const calls: Array<{ url: string }> = [];
  const ctx: HookContext = {
    fetch: ((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push({ url });
      return Promise.resolve(
        new Response(JSON.stringify(envelope([])), {
          status,
          headers: { "content-type": "application/json", ...headers },
        }),
      );
    }) as unknown as typeof fetch,
    log: () => {},
  };
  return { ctx, calls };
}

Deno.test("quota: probes the cheap bounded campaigns read", async () => {
  const { ctx, calls } = ctxWithHeaders({
    "x-ratelimit-limit": "200",
    "x-ratelimit-remaining": "199",
  });
  await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/campaigns");
  assertEquals(new URL(calls[0].url).searchParams.get("per_page"), "1");
});

/** The finding this check exists to report: the header, not the documented 500/min. */
Deno.test("quota: reports the measured 200 limit as the quota ceiling", async () => {
  const { ctx } = ctxWithHeaders({ "x-ratelimit-limit": "200", "x-ratelimit-remaining": "150" });
  const report = await quota.check!({}, ctx);

  assertEquals(report.quota?.[0].limit, 200);
  assertEquals(report.quota?.[0].remaining, 150);
  assertEquals(report.state, "ok");
});

Deno.test("quota: low remaining headroom is degraded, never worse than informational severity", async () => {
  const { ctx } = ctxWithHeaders({ "x-ratelimit-limit": "200", "x-ratelimit-remaining": "5" });
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: zero remaining reports down", async () => {
  const { ctx } = ctxWithHeaders({ "x-ratelimit-limit": "200", "x-ratelimit-remaining": "0" });
  assertEquals((await quota.check!({}, ctx)).state, "down");
});

/** No `x-ratelimit-remaining` header (never observed live, but handled) reports unknown. */
Deno.test("quota: a response with no rate-limit header reports unknown", async () => {
  const { ctx } = ctxWithHeaders({});
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no x-ratelimit-remaining/.test(report.message ?? ""), report.message);
});

Deno.test("quota: reads the headers even off a 401 — the counter is per-credential/IP regardless", async () => {
  const { ctx } = ctxWithHeaders(
    { "x-ratelimit-limit": "200", "x-ratelimit-remaining": "199" },
    401,
  );
  const report = await quota.check!({}, ctx);
  assertEquals(report.quota?.[0].remaining, 199);
});
