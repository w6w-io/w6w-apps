import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/party-search.ts";

Deno.test("party-search: GETs /parties/search?q=...", async () => {
  const { ctx, calls } = mockCtx([{ body: { parties: [{ id: 1 }] } }]);
  const out = await action.execute({ q: "Spacey" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/parties/search");
  assertEquals(url.searchParams.get("q"), "Spacey");
  assertEquals(out, { parties: [{ id: 1 }], nextPage: undefined });
});

Deno.test("party-search: supports paging and embed alongside q", async () => {
  const { ctx, calls } = mockCtx([{ body: { parties: [] } }]);
  await action.execute({ q: "Acme", page: 2, perPage: 10, embed: ["tags"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("perPage"), "10");
  assertEquals(url.searchParams.get("embed"), "tags");
});
