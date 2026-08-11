import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-drives.ts";

Deno.test("list-drives: reads the signed-in user's drives collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drives");
  assertEquals(calls[0].method, "GET");
});

Deno.test("list-drives: maps $select, $orderby and $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ select: ["id", "driveType"], orderby: "name asc", top: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$select"), "id,driveType");
  assertEquals(url.searchParams.get("$orderby"), "name asc");
  assertEquals(url.searchParams.get("$top"), "5");
});

Deno.test("list-drives: returns the drives and the cursor", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drives?$skiptoken=x";
  const { ctx } = mockCtx([{
    body: {
      value: [{ id: "d1", driveType: "business" }, { id: "d2", driveType: "documentLibrary" }],
      "@odata.nextLink": next,
    },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(out.value.map((d) => d.driveType), ["business", "documentLibrary"]);
  assertEquals(out.nextLink, next);
});

Deno.test("list-drives: replays a nextLink verbatim instead of rebuilding the query", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/drives?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: link, top: 999 }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-drives: follows every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drives?$skiptoken=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
  assertEquals(out.pages, 2);
});
