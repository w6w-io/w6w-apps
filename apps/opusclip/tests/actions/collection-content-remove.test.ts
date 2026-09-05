import { assertEquals } from "@std/assert";
import collectionContentRemove from "../../actions/collection-content-remove.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-content-remove: POSTs the fixed q plus ids to the delete path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("success") }]);
  const out = await collectionContentRemove.execute(
    { collectionId: "col1", contentId: "P1.C1" },
    ctx,
  ) as { status: string };

  assertEquals(pathOf(calls[0].url), "/api/collection-contents/delete-collection-contents");
  assertEquals(JSON.parse(calls[0].body!), {
    q: "findByCollectionIdAndContentId",
    collectionId: "col1",
    contentId: "P1.C1",
  });
  assertEquals(out.status, "success");
});
