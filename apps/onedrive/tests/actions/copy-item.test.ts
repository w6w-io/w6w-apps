import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/copy-item.ts";

const MONITOR = "https://contoso.sharepoint.com/_api/v2.0/monitor/4A3407B5";

Deno.test("copy-item: POSTs to the item's copy action", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined, headers: {} }]);
  await action.execute({ itemId: "01ABC" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC/copy");
  assertEquals(calls[0].method, "POST");
});

Deno.test("copy-item: returns the 202 monitor URL without ever calling it", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: undefined,
    headers: { location: MONITOR },
  }]);
  const out = await action.execute({ itemId: "01ABC" }, ctx);
  assertEquals(out, { status: 202, monitorUrl: MONITOR });
  // The monitor lives on a per-tenant SharePoint host that this App does not
  // declare in network.allow, so it is handed back rather than followed.
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).hostname, "graph.microsoft.com");
});

Deno.test("copy-item: parentReference carries both driveId and id when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined, headers: {} }]);
  await action.execute(
    { itemId: "i", targetDriveId: "b!drive", targetFolderId: "DCD0", name: "copy.txt" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    parentReference: { driveId: "b!drive", id: "DCD0" },
    name: "copy.txt",
  });
});

Deno.test("copy-item: omits parentReference entirely when no destination is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined, headers: {} }]);
  await action.execute({ itemId: "i" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("copy-item: conflictBehavior is a query parameter here, per its reference", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined, headers: {} }]);
  await action.execute({ itemId: "i", conflictBehavior: "rename" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("@microsoft.graph.conflictBehavior"),
    "rename",
  );
  // And not in the body — unlike create-folder, whose reference puts it there.
  assertEquals("@microsoft.graph.conflictBehavior" in JSON.parse(calls[0].body!), false);
});

Deno.test("copy-item: the boolean options are sent only when turned on", async () => {
  const { ctx, calls } = mockCtx([
    { status: 202, body: undefined, headers: {} },
    { status: 202, body: undefined, headers: {} },
  ]);
  await action.execute({ itemId: "i", childrenOnly: true, includeAllVersionHistory: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { childrenOnly: true, includeAllVersionHistory: true });
  await action.execute({ itemId: "i", childrenOnly: false }, ctx);
  assertEquals(JSON.parse(calls[1].body!), {});
});

Deno.test("copy-item: is not idempotent — every run enqueues another copy", () => {
  assertEquals(action.idempotent, false);
});
