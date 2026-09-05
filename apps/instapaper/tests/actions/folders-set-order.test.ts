import { assertEquals, assertRejects } from "@std/assert";
import foldersSetOrder from "../../actions/folders-set-order.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folders-set-order: builds the documented folder_id:position,... string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ type: "folder", folder_id: 100 }]) }]);
  await foldersSetOrder.execute(
    {
      order: [{ folderId: 100, position: 1 }, { folderId: 200, position: 2 }, {
        folderId: 300,
        position: 3,
      }],
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/1/folders/set_order");
  assertEquals(bodyOf(calls[0]), { order: "100:1,200:2,300:3" });
});

Deno.test("folders-set-order: returns the vendor's re-ordered folder list", async () => {
  const { ctx } = mockCtx([{ body: envelope([{ type: "folder", folder_id: 100 }]) }]);
  const result = await foldersSetOrder.execute({ order: [{ folderId: 100, position: 1 }] }, ctx);
  assertEquals(result, { folders: [{ type: "folder", folder_id: 100 }] });
});

Deno.test("folders-set-order: rejects an empty order before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await foldersSetOrder.execute({ order: [] }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
