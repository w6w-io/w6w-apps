import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";
import service from "../../health/service.ts";

const conn = { display: { baseUrl: "https://erpnext.example.com" } };

/** Frappe's own fixed refusal for an unwhitelisted-for-guest method is a pass, not an outage. */
Deno.test("instance: an unsigned 403 'login to access' body is a pass", async () => {
  const serverMessages = JSON.stringify([
    JSON.stringify({ message: "You are not permitted to access this resource. Login to access" }),
  ]);
  const { ctx, calls } = mockCtx([
    { status: 403, body: { _server_messages: serverMessages } },
  ], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(
    calls[0].url,
    "https://erpnext.example.com/api/method/frappe.auth.get_logged_user",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(instance.kind, "dependency");
  assertEquals(instance.scope, "connection");
  assertEquals(instance.credential, "context");
});

Deno.test("instance: a 200 (guest access allowed) is also a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { message: "Guest" } }], conn);
  assertEquals((await instance.check!({}, ctx)).state, "ok");
});

Deno.test("instance: an unreachable site is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
});

/** A 404 here means something answered but it is not Frappe's routing. */
Deno.test("instance: a 404 is diagnosed as a wrong site URL", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("site URL"), report.message);
});

/** A 403 that does not carry Frappe's own fixed wording is not confirmation of anything. */
Deno.test("instance: a 403 with an unrecognised body is degraded, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "blocked by WAF" } }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("instance: a 500 is degraded", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>nope</html>" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("instance: a connection with no URL is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("records no site URL"), report.message);
});

/** ERPNext is software, not a service — every plausible status surface was checked and rejected. */
Deno.test("service: is a declared absence, and explains why the question does not apply", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  const reason = service.unavailable!.reason;
  assert(reason.includes("self-hosted"), reason);
  assert(reason.includes("2026-09-05"), reason);
  assert(reason.includes("statuspage.io"), reason);
});
