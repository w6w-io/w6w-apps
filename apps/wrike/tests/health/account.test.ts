import { assertEquals } from "@std/assert";
import account from "../../health/account.ts";
import { envelope, mockWrikeCtx } from "../_helpers.ts";

Deno.test("health/account: ok when subscription.suspended is false", async () => {
  const { ctx } = mockWrikeCtx([
    {
      status: 200,
      body: envelope([{ id: "A1", name: "Acme", subscription: { suspended: false } }]),
    },
  ]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("health/account: down when subscription.suspended is true, names the account", async () => {
  const { ctx } = mockWrikeCtx([
    {
      status: 200,
      body: envelope([{ id: "A1", name: "Acme", subscription: { suspended: true } }]),
    },
  ]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message?.includes("Acme"), true);
});

Deno.test("health/account: unknown when the field is absent — never guessed as down", async () => {
  const { ctx } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "A1" }]) }]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("health/account: unknown when the connection carries no host", async () => {
  const { ctx } = mockWrikeCtx([]);
  (ctx as unknown as { connection: unknown }).connection = { display: {} };
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("health/account: is unsigned-safe metadata — credential posture is signed, kind is credential", () => {
  assertEquals(account.kind, "credential");
  assertEquals(account.credential, "signed");
  assertEquals(account.scope, "connection");
});
