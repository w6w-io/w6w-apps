import { assertEquals } from "@std/assert";
import fieldValuesCreate from "../../actions/field-values-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("field-values-create: POSTs field_id/entity_id/value", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 20406836, value: "Architecture" } }]);
  await fieldValuesCreate.execute({ fieldId: 1284, entityId: 38706, value: "Architecture" }, ctx);
  assertEquals(pathOf(calls[0].url), "/field-values");
  assertEquals(JSON.parse(calls[0].body!), {
    field_id: 1284,
    entity_id: 38706,
    value: "Architecture",
  });
});

Deno.test("field-values-create: accepts a numeric value for a Ranked Dropdown field", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, value: 2863451 } }]);
  await fieldValuesCreate.execute({ fieldId: 1234, entityId: 5, value: 2863451 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).value, 2863451);
});

Deno.test("field-values-create: accepts a JSON-string value and parses it", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await fieldValuesCreate.execute(
    { fieldId: 1, entityId: 5, value: '{"city":"San Francisco"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).value, { city: "San Francisco" });
});
