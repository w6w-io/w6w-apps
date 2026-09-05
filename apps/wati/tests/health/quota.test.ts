import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("quota: ok with real credit remaining", async () => {
  const { ctx } = mockCtx(
    [{
      status: 200,
      body: { credit: 100, welcome_credit: 5, remaining_free_conversations_count: 10 },
    }],
    conn,
  );
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.find((q) => q.id === "credit")?.remaining, 100);
});

Deno.test("quota: down when every channel is exhausted and auto-recharge is off", async () => {
  const { ctx } = mockCtx(
    [{
      status: 200,
      body: {
        credit: 0,
        welcome_credit: 0,
        remaining_free_conversations_count: 0,
        auto_charge_enabled: false,
      },
    }],
    conn,
  );
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message?.includes("auto-recharge"), out.message);
});

Deno.test("quota: ok when balances are zero but auto-recharge is on", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { credit: 0, welcome_credit: 0, auto_charge_enabled: true } }],
    conn,
  );
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("quota: ok when balances are zero but free conversations remain", async () => {
  const { ctx } = mockCtx(
    [{
      status: 200,
      body: { credit: 0, welcome_credit: 0, remaining_free_conversations_count: 3 },
    }],
    conn,
  );
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("quota: unknown when the request fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { code: 5000, message: "boom" } }], conn);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: is declared informational so it never worsens a roll-up verdict", () => {
  assertEquals(quota.severity, "informational");
});
