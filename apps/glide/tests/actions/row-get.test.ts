import { assertEquals } from "@std/assert";
import rowGet from "../../actions/row-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("row-get: fetches by table and row id, unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ fullName: "Ada", totalAmount: 34.5 }) }]);
  const out = await rowGet.execute({ tableId: "t1", rowId: "r1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/tables/t1/rows/r1");
  assertEquals(out, { fullName: "Ada", totalAmount: 34.5 });
});

Deno.test("row-get: declares no fixed output shape — the row is the customer's own schema", () => {
  assertEquals(rowGet.output, undefined);
});
