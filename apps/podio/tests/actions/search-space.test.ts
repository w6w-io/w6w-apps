import { assertEquals } from "@std/assert";
import searchSpace from "../../actions/search-space.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const HITS = [{ type: "task", id: 5, rank: 0, title: "Call Acme" }];

Deno.test("search-space: POSTs the query to the space search endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: HITS }]);
  assertEquals(await searchSpace.execute({ spaceId: "7", query: "acme" }, ctx), { results: HITS });
  assertEquals(pathOf(calls[0].url), "/search/space/7/");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { query: "acme" });
});

Deno.test("search-space: body and query fields go where Podio documents them", async () => {
  const { ctx, calls } = mockCtx([{ body: HITS }]);
  await searchSpace.execute({
    spaceId: "7",
    query: "acme",
    refType: "profile",
    limit: 5,
    offset: 0,
    searchFields: ["title"],
  }, ctx);
  assertEquals(bodyOf(calls[0]), { query: "acme", limit: 5, offset: 0, ref_type: "profile" });
  assertEquals(queryOf(calls[0].url), { search_fields: "title" });
});

/** A workspace holds more kinds of thing than an app does. */
Deno.test("search-space: offers the seven result types Podio documents for this endpoint", () => {
  const refType = searchSpace.params!.find((p) => p.key === "refType")!;
  assertEquals(refType.validation?.enum, [
    "item",
    "task",
    "conversation",
    "app",
    "status",
    "file",
    "profile",
  ]);
});

/**
 * Podio searches only NON-PRIVATE tasks here, and does not report the omission.
 * The description has to carry that, because nothing in the response does.
 */
Deno.test("search-space: the description states that private tasks are excluded", () => {
  const description = searchSpace.description ?? "";
  assertEquals(description.includes("Private tasks are excluded"), true);
});

Deno.test("search-space: an empty body yields an empty result list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await searchSpace.execute({ spaceId: "7", query: "x" }, ctx), { results: [] });
});
