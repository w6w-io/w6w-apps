import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-items.ts";

Deno.test("search-items: calls the search function on the drive root", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ query: "quarterly report" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/root/search(q='quarterly report')",
  );
});

Deno.test("search-items: escapes an apostrophe, per OData", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ query: "Bob's plan" }, ctx);
  assert(
    decodeURIComponent(new URL(calls[0].url).pathname).includes("q='Bob''s plan'"),
    calls[0].url,
  );
});

Deno.test("search-items: searches inside another drive when one is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ driveId: "d7", query: "x" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/drives/d7/root/search(q='x')",
  );
});

Deno.test("search-items: maps $select, $orderby and $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ query: "x", select: ["id"], orderby: "name asc", top: 3 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$select"), "id");
  assertEquals(url.searchParams.get("$orderby"), "name asc");
  assertEquals(url.searchParams.get("$top"), "3");
});

Deno.test("search-items: offers no $filter — the endpoint does not document one", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("filter"), false);
});

Deno.test("search-items: replays a nextLink verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/drive/root/search(q='x')?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ query: "ignored", nextLink: link }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("search-items: follows every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/search(q='x')?$skiptoken=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ query: "x", all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
});

Deno.test("search-items: is declared a search action", () => {
  assertEquals(action.type, "search");
});
