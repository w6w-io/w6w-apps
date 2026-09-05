import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/move-folder-item.ts";

Deno.test("move-folder-item: POSTs to_folder_id and item_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ toFolderId: "F2", itemId: "DAabc" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/folders/move");
  assertEquals(JSON.parse(calls[0].body!), { to_folder_id: "F2", item_id: "DAabc" });
  assertEquals(result, { moved: true });
});
