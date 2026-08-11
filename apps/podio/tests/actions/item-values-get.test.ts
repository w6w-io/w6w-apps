import { assert, assertEquals } from "@std/assert";
import itemValuesGet from "../../actions/item-values-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const VALUES = [
  { field_id: 1, type: "text", label: "Title", values: [{ value: "Acme" }] },
  { field_id: 2, type: "money", label: "Deal", values: [{ value: "500.00", currency: "USD" }] },
];

Deno.test("item-values-get: GETs the v1 value endpoint, not the /v2 variant", async () => {
  const { ctx, calls } = mockCtx([{ body: VALUES }]);
  assertEquals(await itemValuesGet.execute({ itemId: "9" }, ctx), { values: VALUES });
  assertEquals(pathOf(calls[0].url), "/item/9/value");
  assert(
    !pathOf(calls[0].url).endsWith("/v2"),
    "used /value/v2, which carries no App Authentication badge",
  );
});

Deno.test("item-values-get: money keeps its currency sub_id", async () => {
  const { ctx } = mockCtx([{ body: VALUES }]);
  const out = await itemValuesGet.execute({ itemId: "9" }, ctx) as {
    values: Array<Record<string, unknown>>;
  };
  assertEquals(out.values[1].values, [{ value: "500.00", currency: "USD" }]);
});

Deno.test("item-values-get: an empty body yields an empty list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await itemValuesGet.execute({ itemId: "9" }, ctx), { values: [] });
});
