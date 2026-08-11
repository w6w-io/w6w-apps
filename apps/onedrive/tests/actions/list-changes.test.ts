import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-changes.ts";

Deno.test("list-changes: opens a round on the drive root's delta function", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/root/delta");
});

Deno.test("list-changes: `token=latest` asks for a starting point, not the state", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ token: "latest" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("token"), "latest");
});

Deno.test("list-changes: a delta link is replayed verbatim, without re-decorating it", async () => {
  const delta = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ deltaLink: delta, select: ["id"], top: 99 }, ctx);
  assertEquals(calls[0].url, delta);
});

Deno.test("list-changes: a nextLink wins over a delta link", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=next";
  const delta = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=delta";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: next, deltaLink: delta }, ctx);
  assertEquals(calls[0].url, next);
});

Deno.test("list-changes: sends the deltaExcludeParent header only when asked", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }, { body: { value: [] } }]);
  await action.execute({ excludeParents: true }, ctx);
  assertEquals(calls[0].headers["deltaexcludeparent"], "true");
  await action.execute({}, ctx);
  assertEquals(calls[1].headers["deltaexcludeparent"], undefined);
});

Deno.test("list-changes: walks the whole round by default and returns the delta link", async () => {
  // The delta link only appears on the final page, which is why `all` defaults on.
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=1";
  const delta = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b", deleted: {} }], "@odata.deltaLink": delta } },
  ]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
  assertEquals(out.deltaLink, delta);
  assertEquals(out.pages, 2);
});

Deno.test("list-changes: `all: false` fetches exactly one page", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  const out = await action.execute({ all: false }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out.pages, 1);
});

Deno.test("list-changes: reports deletions, which a modified-since poll cannot", async () => {
  const { ctx } = mockCtx([{
    body: { value: [{ id: "gone", deleted: { state: "deleted" } }] },
  }]);
  const out = await action.execute({ all: false }, ctx);
  assertEquals(Boolean(out.value[0].deleted), true);
});
