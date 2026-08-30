import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-drive.ts";

Deno.test("get-drive: no addressing means the tenant root site's default library", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/drive");
});

Deno.test("get-drive: a Drive ID bypasses site addressing", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  await action.execute({ driveId: "b!abc", siteId: "ignored" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/drives/b!abc");
});

Deno.test("get-drive: addresses a named site's default library", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ hostname: "contoso.sharepoint.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/contoso.sharepoint.com/drive");
});
