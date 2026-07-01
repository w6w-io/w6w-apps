import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-profiles-from-list.ts";

Deno.test("remove-profiles-from-list: DELETEs from /lists/{id}/relationships/profiles/", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  await action.execute!({ listId: "L1", profileIds: ["p1"] }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/lists/L1/relationships/profiles/",
  );
  assertEquals(calls[0].method, "DELETE");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data, [{ type: "profile", id: "p1" }]);
});
