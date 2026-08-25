import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/carrier-list.ts";

Deno.test("carrier-list: GETs /v2/carriers", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { carriers: [{ carrier_id: "se-1", friendly_name: "UPS" }] } },
  ]);
  const result = await action.execute!({}, ctx) as { carriers: unknown[] };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/carriers");
  assertEquals(result.carriers.length, 1);
});

Deno.test("carrier-list: an empty account returns an empty array, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { carriers: [] } }]);
  const result = await action.execute!({}, ctx) as { carriers: unknown[] };
  assertEquals(result.carriers, []);
});
