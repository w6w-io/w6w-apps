import { assert, assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx, UNAUTHENTICATED } from "../_helpers.ts";

Deno.test("api: probes tidycal.com/api/me unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: UNAUTHENTICATED }]);
  await api.check!({} as never, ctx);

  assertEquals(PROBE_URL, "https://tidycal.com/api/me");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].method, "GET");
  // Unsigned: `credential: "none"` means `sign` never runs, and nothing here
  // builds a header of its own.
  assertEquals(calls[0].headers["authorization"], undefined);
});

/**
 * The 401 IS the pass. DNS resolved, TLS terminated, Cloudflare passed the
 * request through, Laravel routed it and the auth middleware ran. Judging by the
 * HTTP status would report TidyCal down forever.
 */
Deno.test("api: a 401 Unauthenticated is ok, with no noise in the message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHENTICATED }]);
  const out = await api.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.message, undefined);
});

/** A 401 with an unfamiliar message still passes, but says what it saw. */
Deno.test("api: an unexpected 401 message is surfaced", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Token expired." } }]);
  const out = await api.check!({} as never, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.message, "Token expired.");
});

/**
 * The interesting failure. `tidycal.com` serves the site and the API from one
 * origin, and a path the API router does not know falls through to the vanity
 * URL route — so a 404 here means the API is no longer mounted at `/api`, not
 * that an endpoint moved.
 */
Deno.test("api: the vanity-route 404 is a down, and says why", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { message: "No query results for model [App\\Models\\User] api" },
  }]);
  const out = await api.check!({} as never, ctx);
  assertEquals(out.state, "down");
  assert((out.message ?? "").includes("no longer mounted at /api"), out.message);
  assert((out.message ?? "").includes("No query results"), out.message);
});

Deno.test("api: a 5xx is a down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { message: "Service Unavailable" } }]);
  assertEquals((await api.check!({} as never, ctx)).state, "down");
});

/** An edge error page or captive portal is not the API answering. */
Deno.test("api: an HTML body is a down whatever the status", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>are you a robot</html>" }]);
  const out = await api.check!({} as never, ctx);
  assertEquals(out.state, "down");
  assert((out.message ?? "").includes("non-JSON"), out.message);
});

/**
 * An unsigned read that succeeds is not evidence of an outage, and this check
 * will not invent one — but it is not the expected answer either, so `unknown`.
 */
Deno.test("api: an unexpected JSON status is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { name: "John Doe" } }]);
  const out = await api.check!({} as never, ctx);
  assertEquals(out.state, "unknown");
  assert((out.message ?? "").includes("200"), out.message);
});

// --- the two declared absences ---------------------------------------------

/**
 * An `unavailable` entry always reports `unknown`, and `unknown` outranks `ok`,
 * so at any other severity these would pin the app's verdict at `unknown`
 * forever.
 */
Deno.test("service/quota: both absences are informational and carry a reason", () => {
  for (const check of [service, quota]) {
    assertEquals(check.severity, "informational", check.key);
    assertEquals(typeof check.check, "undefined", `${check.key}: an absence must not probe`);
    assert((check.unavailable?.reason ?? "").length > 80, `${check.key}: reason is not a reason`);
  }
});

/**
 * The Statuspage trap, kept named. `tidycal.statuspage.io` answers HTTP 200 with
 * 127,719 bytes of unclaimed-subdomain HTML to *every* path including
 * `/api/v2/summary.json`; a check that trusted that 200 would report TidyCal
 * healthy through a real outage. The reason has to keep saying so, and no code
 * anywhere may fetch it.
 */
Deno.test("service: the reason names the unclaimed-host trap by its evidence", () => {
  const reason = service.unavailable!.reason!;
  assert(reason.includes("statuspage.io"), reason);
  assert(reason.includes("127,719"), reason);
  assert(reason.includes("NXDOMAIN"), reason);
});

Deno.test("quota: the reason states what was measured, not just that nothing exists", () => {
  const reason = quota.unavailable!.reason!;
  assert(/X-RateLimit-Remaining/i.test(reason), reason);
  assert(/429/.test(reason), reason);
});

/**
 * No health check may fetch a status host. `service` and `quota` have no hook at
 * all, and `api` must reach only the app's own origin — the one already in
 * `w6w.network.allow`.
 */
Deno.test("health: no check reaches a host outside the app's own origin", async () => {
  for (const name of ["api", "service", "quota"]) {
    const src = await Deno.readTextFile(new URL(`../../health/${name}.ts`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const m of code.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      assertEquals(m[1], "tidycal.com", `health/${name}.ts calls ${m[1]}`);
    }
  }
});
