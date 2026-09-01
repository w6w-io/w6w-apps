import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";
import service from "../../health/service.ts";

const conn = { display: { baseUrl: "https://10ax.online.tableau.com" } };

Deno.test("instance: probes GET /serverinfo unsigned, pinned to the SERVER_INFO_API_VERSION", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { serverInfo: { productVersion: { "#text": "2026.1.0" }, restApiVersion: "3.21" } },
  }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://10ax.online.tableau.com/api/2.4/serverinfo");
  assertEquals(calls[0].headers["x-tableau-auth"], undefined);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("2026.1.0"), report.message);
  assert(report.message!.includes("3.21"), report.message);
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, "context");
});

Deno.test("instance: also reads a plain-string restApiVersion (no attributes to carry)", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { serverInfo: { restApiVersion: "3.21" } } }],
    conn,
  );
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("3.21"));
});

Deno.test("instance: an unreachable server is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
});

Deno.test("instance: a 404 is diagnosed as a wrong server URL", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("is the server URL right?"), report.message);
});

Deno.test("instance: another status is down, and an odd shape is degraded", async () => {
  const bad = mockCtx([{ status: 502, body: "" }], conn);
  assertEquals((await instance.check!({}, bad.ctx)).state, "down");

  const odd = mockCtx([{ status: 200, body: { nope: true } }], conn);
  assertEquals((await instance.check!({}, odd.ctx)).state, "degraded");
});

Deno.test("instance: a connection with no server URL is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("records no server URL"), report.message);
});

Deno.test("service: is a declared absence for both deployment shapes", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  const reason = service.unavailable!.reason;
  assert(reason.includes("self-hosted"));
  assert(reason.includes("status.tableau.com"));
  assert(reason.includes("2026-09-01"));
});
