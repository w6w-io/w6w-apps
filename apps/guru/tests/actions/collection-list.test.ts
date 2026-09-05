import { assertEquals } from "@std/assert";
import collectionList from "../../actions/collection-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

type ListResult = { items: unknown[] };

Deno.test("collection-list: lists collections and strips each token", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: "co1", name: "Eng", token: "live" }, { id: "co2", name: "Sales" }] },
  ]);
  const result = await collectionList.execute({ search: "Eng" }, ctx) as ListResult;

  assertEquals(pathOf(calls[0].url), "/api/v1/collections");
  assertEquals(queryOf(calls[0].url), { search: "Eng" });
  assertEquals(result.items, [{ id: "co1", name: "Eng" }, { id: "co2", name: "Sales" }]);
});

Deno.test("collection-list: an empty response is an empty list, not a throw", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const result = await collectionList.execute({}, ctx) as ListResult;
  assertEquals(result.items, []);
});
