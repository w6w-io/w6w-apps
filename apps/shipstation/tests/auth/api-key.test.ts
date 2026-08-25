import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: sign sets the api-key header, no scheme prefix", () => {
  const request = { headers: {} as Record<string, string>, method: "GET", url: "https://x" };
  const signed = auth.sign!({ request, credential: { apiKey: "sk_live_123" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["api-key"], "sk_live_123");
});

Deno.test("api-key: test() calls GET /v2/carriers unsigned with the raw key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { carriers: [] } }]);
  await auth.test({ credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/carriers");
  assertEquals(calls[0].headers["api-key"], "sk_live_123");
});

Deno.test("api-key: test() reports ok with a carrier-count message", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { carriers: [{ carrier_id: "se-1", friendly_name: "UPS" }] } },
  ]);
  const result = await auth.test({ credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(result.ok, true);
  assert(result.message?.includes("UPS"), result.message);
});

Deno.test("api-key: test() warns (but does not fail) when no carrier is connected", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { carriers: [] } }]);
  const result = await auth.test({ credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(result.ok, true);
  assert(result.message?.includes("no carrier accounts"), result.message);
});

/** ShipStation reports a missing and a wrong key with the exact same body. */
Deno.test("api-key: test() fails on 401 without claiming which kind of failure it is", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      errors: [{
        error_code: "unauthorized",
        error_type: "security",
        error_source: "shipengine",
        message: "Access denied.",
      }],
    },
  }]);
  const result = await auth.test({ credential: { apiKey: "wrong" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("V2"), result.message);
});

Deno.test("api-key: test() fails cleanly when the credential is missing", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect records the carrier count, never the key", async () => {
  const { ctx, logs } = mockCtx([
    { status: 200, body: { carriers: [{ carrier_id: "se-1" }, { carrier_id: "se-2" }] } },
  ]);
  const result = await auth.afterConnect!({ credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(result, { carrierCount: 2, carrierCountSuffix: "s" });
  assert(!JSON.stringify(logs).includes("sk_live_123"));
});
