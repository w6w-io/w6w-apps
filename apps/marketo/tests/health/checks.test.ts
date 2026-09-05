import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("instance: an unsigned Marketo 601/602 auth-error envelope is a pass, not an outage", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: false, errors: [{ code: "601", message: "Unauthorized" }] } },
  ], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://123-abc-456.mktorest.com/rest/v1/leads/describe.json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, "context");
});

Deno.test("instance: success:true (auth disabled entirely) is also a pass", async () => {
  const { ctx } = mockCtx([{ body: { success: true, result: [] } }], conn);
  assertEquals((await instance.check!({}, ctx)).state, "ok");
});

Deno.test("instance: an unreachable pod is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
});

/** A 610 "resource not found" means something answered but not at this path. */
Deno.test("instance: a 610 error code is diagnosed as a wrong REST base URL", async () => {
  const { ctx } = mockCtx([
    {
      body: { success: false, errors: [{ code: "610", message: "Requested resource not found" }] },
    },
  ], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("REST base URL"), report.message);
});

/** HTML (a login page, a reverse proxy) is not Marketo's documented envelope. */
Deno.test("instance: a non-JSON response is degraded, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>nope</html>" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("instance: a connection with no REST base URL is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("records no REST base URL"), report.message);
});

/** No reachable, trustworthy vendor status feed exists for a per-pod SaaS like Marketo. */
Deno.test("service: is a declared absence, and explains why", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  const reason = service.unavailable!.reason;
  assert(reason.includes("statuspage.io"), reason);
  assert(reason.includes("2026-09-05"), reason);
});

/** Marketo's usage endpoint reports a count, never the ceiling itself. */
Deno.test("quota: is a declared absence, and explains why", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  const reason = quota.unavailable!.reason;
  assert(reason.includes("50,000"), reason);
  assert(reason.includes("usage.json"), reason);
});
