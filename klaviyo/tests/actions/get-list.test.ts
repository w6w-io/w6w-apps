import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-list.ts";

Deno.test("get-list: GETs /lists/{id}/ and forwards additional-fields", async () => {
  const body = { data: { type: "list", id: "L1" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { listId: "L1", additionalFields: "profile_count" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/lists/L1/");
  assertEquals(url.searchParams.get("additional-fields[list]"), "profile_count");
  assertEquals(result, body);
});
