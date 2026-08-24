import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/hook-delete.ts";

Deno.test("hook-delete: DELETEs /v2/hooks/:hook_id with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const result = await action.execute({ hookId: "h1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/hooks/h1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(result, { success: true });
});

Deno.test("hook-delete: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
