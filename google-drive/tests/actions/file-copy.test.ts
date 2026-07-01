import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-copy.ts";

Deno.test("file-copy: POSTs /files/{id}/copy with body + all-drives flags", async () => {
  const body = { id: "new-1", name: "Copy of Report" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { fileId: "file-1", name: "Renamed", parentFolderId: "fld-1", description: "note" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/drive/v3/files/file-1/copy");
  assertEquals(url.searchParams.get("supportsAllDrives"), "true");
  assertEquals(url.searchParams.get("includeItemsFromAllDrives"), "true");

  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.name, "Renamed");
  assertEquals(sent.description, "note");
  assertEquals(sent.parents, ["fld-1"]);
  assertEquals(result, body);
});
