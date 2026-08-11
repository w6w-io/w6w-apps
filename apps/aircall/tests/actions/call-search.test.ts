import { assert, assertEquals } from "@std/assert";
import callSearch from "../../actions/call-search.ts";
import { listBody, mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("call-search: calls GET /v1/calls/search with its own filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("calls", [{ id: 812 }]) }]);
  await callSearch.execute({
    direction: "inbound",
    userId: "456",
    phoneNumber: "+18001231234",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/calls/search");
  const q = queryOf(calls[0].url);
  assertEquals(q.direction, "inbound");
  assertEquals(q.user_id, "456");
  assertEquals(q.phone_number, "+18001231234");
});

/**
 * Aircall's array query params are REPEATED keys (`tags[]=1&tags[]=2`), not one
 * comma-joined value. Comma-joining silently matches nothing, which reads as
 * "no calls have these tags" rather than as an error.
 */
Deno.test("call-search: tags reach the wire as repeated tags[] keys", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("calls", []) }]);
  await callSearch.execute({ tags: ["545", "678"] }, ctx);

  assertEquals(queryAll(calls[0].url, "tags[]"), ["545", "678"]);
  const q = queryOf(calls[0].url);
  assert(!("tags" in q), `a bare comma-joined tags key leaked: ${JSON.stringify(q)}`);
});

Deno.test("call-search: a comma string of tag IDs is accepted and split", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("calls", []) }]);
  await callSearch.execute({ tags: "545, 678" }, ctx);
  assertEquals(queryAll(calls[0].url, "tags[]"), ["545", "678"]);
});

Deno.test("call-search: non-numeric tag entries are dropped rather than sent", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("calls", []) }]);
  await callSearch.execute({ tags: ["545", "not-an-id"] }, ctx);
  assertEquals(queryAll(calls[0].url, "tags[]"), ["545"]);
});

Deno.test("call-search: an empty tag list sends no tags key at all", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("calls", []) }]);
  await callSearch.execute({ tags: [] }, ctx);
  assertEquals(queryAll(calls[0].url, "tags[]"), []);
});
