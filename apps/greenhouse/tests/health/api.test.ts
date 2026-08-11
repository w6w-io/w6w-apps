import { assert, assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("api: probes a documented v3 path with no credential attached", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: errorBody("Unauthorized", ["Token could not be decoded."]),
  }]);
  await api.check!({}, ctx);

  assertEquals(calls[0].url, PROBE_URL);
  assert(PROBE_URL.startsWith("https://harvest.greenhouse.io/v3/candidates"), PROBE_URL);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(api.credential, "none");
});

/**
 * The unsigned probe's expected answer. It proves DNS, TLS, CloudFront, the
 * router and the v3 auth layer are all working — which is the whole question.
 */
Deno.test("api: a schema-correct 401 is a PASS", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Unauthorized", ["Token could not be decoded."]),
  }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("Unauthorized"), report.message);
});

/**
 * A 401 from a corporate proxy or a CDN error page is not a 401 from Harvest, so
 * the body is checked as well as the status.
 */
Deno.test("api: a 401 without a Greenhouse body is unknown, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>Access denied</html>" }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("not Harvest itself"), report.message);
});

/**
 * The failure this check exists for, and the one a status page cannot report.
 * v3 routes before it authenticates, so an unauthenticated 404 on a documented
 * path means the endpoint is gone.
 */
Deno.test("api: a 404 on a documented path is DOWN — the endpoint was removed", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Resource not found") }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("no longer exists"), report.message);
  assert(report.message?.includes("changelog"), report.message);
});

Deno.test("api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

/**
 * If an unauthenticated read ever succeeded, this probe would stop proving that
 * a credential is required — which is exactly the trap that makes a passing
 * health check meaningless.
 */
Deno.test("api: an unauthenticated 200 is unknown, because the probe has stopped proving anything", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 1 }] }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("no longer distinguish"), report.message);
});

Deno.test("api: a transport failure is down rather than an unhandled throw", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns failure")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof api.check>>[1];
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("dns failure"), report.message);
});

Deno.test("api: an unexpected 4xx is unknown", async () => {
  const { ctx } = mockCtx([{ status: 418, body: errorBody("I'm a teapot") }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});
