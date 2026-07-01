import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-create.ts";

Deno.test("folder-create: POSTs to /files with folder mime + parent", async () => {
  const body = { id: "fld-new", name: "Reports" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { name: "Reports", parentFolderId: "fld-parent" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/drive/v3/files");
  assertEquals(url.searchParams.get("fields"), "*");
  assertEquals(url.searchParams.get("supportsAllDrives"), "true");

  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.name, "Reports");
  assertEquals(sent.mimeType, "application/vnd.google-apps.folder");
  assertEquals(sent.parents, ["fld-parent"]);
  assertEquals(result, body);
});
