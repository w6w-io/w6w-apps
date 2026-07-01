import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-share.ts";

Deno.test("folder-share: POSTs a permission on /files/{folderId}/permissions", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "perm-1" } }]);
  await action.execute!(
    {
      folderId: "fld-1",
      type: "domain",
      role: "commenter",
      domain: "example.com",
      allowFileDiscovery: true,
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/drive/v3/files/fld-1/permissions");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.type, "domain");
  assertEquals(sent.role, "commenter");
  assertEquals(sent.domain, "example.com");
  assertEquals(sent.allowFileDiscovery, true);
});
