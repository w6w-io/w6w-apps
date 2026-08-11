import { assert, assertEquals } from "@std/assert";
import api, { EXPECTED_UNAUTHENTICATED_CODE, PROBE_URL } from "../../health/api.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

/**
 * The central claim: an unsigned probe answered with Campaign Monitor's own
 * error envelope is a PASS. It proves the API parsed the request, ran its
 * authenticator and produced its documented body — which is all this check
 * asserts. Whether any credential is good is the derived auth checks' job, and
 * conflating the two is how a vendor outage gets misreported to every tenant as
 * "your key expired".
 */
Deno.test("health/api: the measured unauthenticated 401 is a pass", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: errorBody(100, "Invalid API Key") }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.message, undefined);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(EXPECTED_UNAUTHENTICATED_CODE, 100);
});

/** No credential goes near this request — that is what makes the 401 meaningful. */
Deno.test("health/api: the probe is unsigned and declares no extra egress", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: errorBody(100, "Invalid API Key") }]);
  await api.check!({}, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(api.credential, "none");
  assertEquals(api.network, undefined);
  // The probe host is the app's own API host, already in w6w.network.allow.
  assertEquals(new URL(PROBE_URL).hostname, "api.createsend.com");
});

Deno.test("health/api: a 200 is also a pass, but says the answer was unexpected", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { Code: 0, SystemDate: "2026-08-11 06:18:33" } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("expected code 100"), report.message);
});

Deno.test("health/api: a transport failure is down", async () => {
  const { ctx } = mockCtx([{ throws: "dns error: no such host" }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
  assert(report.message!.includes("dns error"), report.message);
});

Deno.test("health/api: a 5xx carrying the vendor's own envelope is down, not ok", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: errorBody(500, "Sorry, we've run into a problem."),
  }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("500"), report.message);
});

/** Markup from the API host means a CDN or maintenance page answered, not the API. */
Deno.test("health/api: an HTML body is down even on a 200", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html><body>We'll be back soon</body></html>",
    headers: { "content-type": "text/html" },
  }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("markup rather than JSON"), report.message);
});

/**
 * A body this probe cannot interpret is `unknown`, never `down`: not
 * understanding an answer is not evidence the vendor is broken.
 */
Deno.test("health/api: an unreadable JSON body is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { something: "else" } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no readable Code"), report.message);
});

Deno.test("health/api: an empty body is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("health/api: is a probing dependency check at app scope", () => {
  assertEquals(api.key, "api");
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "app");
  assertEquals(typeof api.check, "function");
  assertEquals(api.unavailable, undefined);
});
