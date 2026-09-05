import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import account from "../../health/account.ts";
import service from "../../health/service.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

/** An unsigned probe that gets Kommo's own documented problem+json error back has proved reachability. */
Deno.test("account: an unsigned Kommo 401 problem+json body is a pass, not an outage", async () => {
  const { ctx, calls } = mockCtx([
    { status: 401, body: { title: "Unauthorized", detail: "Invalid user name or password" } },
  ], conn);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/account");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(account.kind, "dependency");
  assertEquals(account.scope, "connection");
  assertEquals(account.credential, "context");
});

Deno.test("account: a 200 (a public/misconfigured account) is also a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: 1, name: "Acme" } }], conn);
  assertEquals((await account.check!({}, ctx)).state, "ok");
});

Deno.test("account: a 402 (billing lapsed) is also a pass — the account IS answering", async () => {
  const { ctx } = mockCtx([{ status: 402, body: { title: "Payment Required" } }], conn);
  assertEquals((await account.check!({}, ctx)).state, "ok");
});

Deno.test("account: an unreachable host is down", async () => {
  const { ctx } = mockCtx([], conn);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"), report.message);
});

/** A 404 here means something answered but the account address is wrong. */
Deno.test("account: a 404 is diagnosed as a wrong account address", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], conn);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("account address"), report.message);
});

Deno.test("account: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 502 }], conn);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("account: a connection with no address is unknown, not down", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("records no account address"), report.message);
});

/** status.kommo.com is real but publishes no machine-readable feed of any kind. */
Deno.test("service: is a declared absence, and explains why nothing was found to read", () => {
  assertEquals(service.check, undefined);
  assertEquals(service.severity, "informational");
  const reason = service.unavailable!.reason;
  assert(reason.includes("status.kommo.com"), reason);
  assert(reason.includes("2026-09-05"), reason);
  assert(reason.includes("403"), reason);
});
