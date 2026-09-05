import { assertEquals } from "@std/assert";
import customFieldCreate from "../../actions/custom-field-create.ts";
import { created, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The whole point of this action: a 201 with no body, only a Location
 * header, and the required (undocumented-if-you-only-read-the-field-list)
 * `ws.op: "create"` body field.
 */
Deno.test("custom-field-create: sends ws.op=create and reads the id off Location", async () => {
  const { ctx, calls } = mockCtx([
    created("https://api.aweber.com/1.0/accounts/1/lists/2/custom_fields/42"),
  ]);
  const out = await customFieldCreate.execute(
    { accountId: "1", listId: "2", name: "Favorite color" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/custom_fields");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Favorite color", "ws.op": "create" });
  assertEquals(out, {
    id: 42,
    location: "https://api.aweber.com/1.0/accounts/1/lists/2/custom_fields/42",
  });
});
