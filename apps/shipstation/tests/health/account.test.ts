import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/account.ts";

Deno.test("account: ok with a name list when carriers are connected and funded", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        carriers: [
          { carrier_id: "se-1", friendly_name: "UPS", requires_funded_amount: false },
          {
            carrier_id: "se-2",
            friendly_name: "Stamps.com",
            requires_funded_amount: true,
            balance: 12.5,
          },
        ],
      },
    },
  ]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(result.message?.includes("UPS"), result.message);
});

Deno.test("account: degraded when no carrier is connected", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { carriers: [] } }]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

Deno.test("account: degraded when a funded carrier has a zero balance", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        carriers: [
          {
            carrier_id: "se-2",
            friendly_name: "Stamps.com",
            requires_funded_amount: true,
            balance: 0,
          },
        ],
      },
    },
  ]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(result.message?.includes("zero balance"), result.message);
});

Deno.test("account: 401 is unknown, not down — the derived auth check owns that", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: [] } }]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("account: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "down");
});
