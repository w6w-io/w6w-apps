import { assertEquals } from "@std/assert";
import collectionContentAdd from "../../actions/collection-content-add.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-content-add: POSTs collectionId + contentId", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: envelope({ collectionId: "col1", contentId: "P1.C1" }) },
  ]);
  const out = await collectionContentAdd.execute(
    { collectionId: "col1", contentId: "P1.C1" },
    ctx,
  ) as { contentId: string };

  assertEquals(pathOf(calls[0].url), "/api/collection-contents");
  assertEquals(JSON.parse(calls[0].body!), { collectionId: "col1", contentId: "P1.C1" });
  assertEquals(out.contentId, "P1.C1");
});
