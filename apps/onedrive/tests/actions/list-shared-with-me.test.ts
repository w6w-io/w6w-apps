import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-shared-with-me.ts";

Deno.test("list-shared-with-me: reads the one documented /me form", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/sharedWithMe");
});

Deno.test("list-shared-with-me: takes no drive id — v1.0 documents no such form", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("driveId"), false);
});

Deno.test("list-shared-with-me: external tenants are opt-in, spelled all-lowercase", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }, { body: { value: [] } }]);
  await action.execute({ allowExternal: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("allowexternal"), "true");
  await action.execute({}, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("allowexternal"), false);
});

Deno.test("list-shared-with-me: surfaces the remoteItem facet the caller needs", async () => {
  const { ctx } = mockCtx([{
    body: {
      value: [{
        id: "shortcut1",
        name: "Shared.docx",
        remoteItem: { id: "realId", parentReference: { driveId: "otherDrive" } },
      }],
    },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(
    (out.value[0].remoteItem as { id?: string }).id,
    "realId",
  );
});

Deno.test("list-shared-with-me: follows every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/sharedWithMe?$skiptoken=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
});
