import { assertEquals } from "@std/assert";
import boxFieldValueGet from "../../actions/box-field-value-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("box-field-value-get: calls GET /boxes/{boxKey}/fields/{fieldKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "1003", value: 1347451200000 } }]);
  const out = await boxFieldValueGet.execute({ boxKey: "b1", fieldKey: "1003" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/boxes/b1/fields/1003");
  assertEquals(out, { key: "1003", value: 1347451200000 });
});
