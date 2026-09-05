import { assertEquals } from "@std/assert";
import fieldValuesUpdate from "../../actions/field-values-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("field-values-update: PUTs {value} to /field-values/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 20406836, value: "Healthcare" } }]);
  await fieldValuesUpdate.execute({ fieldValueId: 20406836, value: "Healthcare" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/field-values/20406836");
  assertEquals(JSON.parse(calls[0].body!), { value: "Healthcare" });
});
