import { assertEquals } from "@std/assert";
import foldersDelete from "../../actions/folders-delete.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folders-delete: posts folder_id and returns it on the documented empty-array success", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  const result = await foldersDelete.execute({ folderId: 3 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/folders/delete");
  assertEquals(bodyOf(calls[0]), { folder_id: "3" });
  assertEquals(result, { folder_id: 3 });
});
