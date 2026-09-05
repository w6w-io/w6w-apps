import { assertEquals } from "@std/assert";
import customFieldUpdate from "../../actions/custom-field-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The whole point of this action: AWeber answers the non-standard status
 * `209`, not `200`, and `res.ok` (used internally by AweberClient) is `true`
 * for any 2xx status — so this must transparently succeed.
 */
Deno.test("custom-field-update: succeeds on the non-standard 209 status and returns the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 209, body: { id: "3", name: "Favourite colour" } }]);
  const out = await customFieldUpdate.execute(
    { accountId: "1", listId: "2", customFieldId: "3", name: "Favourite colour" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/custom_fields/3");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(out.name, "Favourite colour");
});

Deno.test("custom-field-update: only sends the fields that were given", async () => {
  const { ctx, calls } = mockCtx([{ status: 209, body: { id: "3" } }]);
  await customFieldUpdate.execute(
    { accountId: "1", listId: "2", customFieldId: "3", isSubscriberUpdateable: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { is_subscriber_updateable: true });
});
