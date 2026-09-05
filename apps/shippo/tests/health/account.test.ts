import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import account from "../../health/account.ts";

Deno.test("account: probes carrier_accounts, not an endpoint requiring an existing object", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { results: [] } }],
    { display: { mode: "live" } },
  );
  await account.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.goshippo.com/carrier_accounts?results=1");
});

/**
 * The failure this exists for: a test token succeeds at everything and buys
 * nothing, which no credential check alone can see.
 */
Deno.test("account: a test-mode connection reads degraded, not ok", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { results: [] } }],
    { display: { mode: "test" } },
  );
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(/TEST token/.test(report.message!), report.message);
});

Deno.test("account: a live-mode connection reads ok", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { results: [] } }],
    { display: { mode: "live" } },
  );
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("account: an unrecorded mode reads unknown rather than guessed", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [] } }]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

/** Credential failures are the derived auth check's job, not this one's. */
Deno.test("account: a rejected token defers to the derived auth check", async () => {
  const { ctx } = mockCtx(
    [{ status: 401, body: { detail: "Token does not exist" } }],
    { display: { mode: "live" } },
  );
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("account: an unreachable API reads down", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("network unreachable")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof account.check>>[1];
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("account: is a per-connection dependency check requiring a signed credential", () => {
  assertEquals(account.kind, "dependency");
  assertEquals(account.scope, "connection");
  assertEquals(account.credential, "signed");
});
