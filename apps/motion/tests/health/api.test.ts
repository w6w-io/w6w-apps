import { assert, assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import { mockCtx, UNAUTHORIZED_BODY } from "../_helpers.ts";

Deno.test("api: probes the API host unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  await api.check!({}, ctx);

  assertEquals(PROBE_URL, "https://api.usemotion.com/v1/users/me");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

/**
 * The 401 IS the pass. An unsigned request that gets a schema-correct auth error
 * has proved DNS, TLS, the edge, the router and the auth guard are all serving.
 * Judging by the status code would report Motion permanently down.
 */
Deno.test("api: an unauthenticated 401 is a pass", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  const report = await api.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.message, undefined);
});

/**
 * Motion's router answers 404 before the auth guard for a path it does not
 * know, so a 404 here means the route the credential probe depends on is gone —
 * not that the endpoint moved.
 */
Deno.test("api: a 404 is down, because the router no longer knows the route", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: { message: "Cannot GET /v1/users/me", statusCode: 404 } },
  ]);
  const report = await api.check!({}, ctx);

  assertEquals(report.state, "down");
  assert((report.message ?? "").includes("router"), report.message);
});

Deno.test("api: a throttle still proves the API is answering", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { message: "Too Many Requests" } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert((report.message ?? "").includes("429"), report.message);
});

Deno.test("api: a 5xx and a non-JSON body are both down", async () => {
  const server = mockCtx([{ status: 502, body: { message: "Bad Gateway" } }]);
  assertEquals((await api.check!({}, server.ctx)).state, "down");

  const html = mockCtx([{ status: 200, body: "<html>captive portal</html>" }]);
  const report = await api.check!({}, html.ctx);
  assertEquals(report.state, "down");
  assert((report.message ?? "").includes("non-JSON"), report.message);
});

/** An unexpected 200 to an unsigned read is not evidence of an outage either way. */
Deno.test("api: an unexpected status reports unknown, not a guess", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "u1" } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("api: is an unsigned app-scoped dependency check that widens no egress", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "app");
  assertEquals(api.credential, "none");
  // api.usemotion.com is already the app's own egress host.
  assertEquals(api.network, undefined);
  assertEquals(typeof api.check, "function");
});
