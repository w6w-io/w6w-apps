import { assertEquals } from "@std/assert";
import foldersList from "../../actions/folders-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folders-list: returns the account's folders", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ type: "folder", folder_id: 1, title: "Reading" }]),
  }]);
  const result = await foldersList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/folders/list");
  assertEquals(result, { folders: [{ type: "folder", folder_id: 1, title: "Reading" }] });
});
