import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import cardUpdateField from "../../actions/card-update-field.ts";

Deno.test("card-update-field: sets a field's value and surfaces success + the card", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        updateCardField: {
          success: true,
          card: { id: "1", fields: [{ name: "Status", value: "option 1" }] },
        },
      },
    },
  }]);
  const out = await cardUpdateField.execute(
    { cardId: "1", fieldId: "status", newValue: "option 1" },
    ctx,
  ) as { success: boolean; card: unknown };
  assertEquals(out.success, true);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.includes("card_id: 1"));
  assert(q.includes('field_id: "status"'));
  assert(q.includes('new_value: "option 1"'));
});

Deno.test("card-update-field: surfaces success: false without throwing", async () => {
  const { ctx } = mockCtx([{
    body: { data: { updateCardField: { success: false, card: null } } },
  }]);
  const out = await cardUpdateField.execute(
    { cardId: "1", fieldId: "status", newValue: "bogus" },
    ctx,
  ) as { success: boolean };
  assertEquals(out.success, false);
});

Deno.test("card-update-field: type/resource/idempotency metadata", () => {
  assertEquals(cardUpdateField.type, "perform");
  assertEquals(cardUpdateField.resource, "card");
  assertEquals(cardUpdateField.idempotent, true);
});
