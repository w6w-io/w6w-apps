import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";
import service from "../../health/service.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

/** An unsigned probe that gets Mautic's own documented error shape back has proved reachability. */
Deno.test("instance: an unsigned Mautic auth-error body is a pass, not an outage", async () => {
  const { ctx, calls } = mockCtx([
    { status: 401, body: { error: { message: "access denied", code: 401 } } },
  ], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts?limit=1");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, "context");
});

Deno.test("instance: a 200 (auth disabled entirely) is also a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { total: 0, contacts: {} } }], conn);
  assertEquals((await instance.check!({}, ctx)).state, "ok");
});

Deno.test("instance: an unreachable server is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
});

/** A 404 here means something answered but it is not Mautic's routing. */
Deno.test("instance: a 404 is diagnosed as a wrong URL or disabled API", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("REST API enabled"), report.message);
});

/** HTML (a login page, a reverse proxy) is not the documented Mautic error envelope. */
Deno.test("instance: an HTML response is degraded, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>nope</html>" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("instance: a JSON body that is not the documented shape is down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { unexpected: true } }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("instance: a connection with no URL is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("records no instance URL"), report.message);
});

/** Mautic is software, not a service — status.mautic.org covers the project's own website. */
Deno.test("service: is a declared absence, and explains why the question does not apply", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  const reason = service.unavailable!.reason;
  assert(reason.includes("self-hosted"), reason);
  assert(reason.includes("2026-08-30"), reason);
  assert(reason.includes("statuspage.io"), reason);
});
