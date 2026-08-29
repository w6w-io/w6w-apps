import { assertEquals } from "@std/assert";
import statusChangeList from "../../actions/status-change-list.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("status-change-list: posts filters to /v2/status_changes/list", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], hasNextPage: false, cursor: null } }]);
  await statusChangeList.execute({ boardID: "b1", limit: 25 }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v2/status_changes/list");
  assertEquals(bodyOf(calls[0]), { boardID: "b1", limit: 25 });
});
