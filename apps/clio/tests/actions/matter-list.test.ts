import { assertEquals } from "@std/assert";
import matterList from "../../actions/matter-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("matter-list: calls GET /matters.json with id(asc) cursor ordering", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }, { id: 2 }]) }]);
  const out = await matterList.execute({}, ctx) as { items: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v4/matters.json");
  assertEquals(queryOf(calls[0].url).order, "id(asc)");
  assertEquals(out.items.length, 2);
});

Deno.test("matter-list: forwards filters using Clio's own snake_case query names", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await matterList.execute(
    { status: "open", clientId: 42, practiceAreaId: 7, query: "smith", limit: 25 },
    ctx,
  );
  const q = queryOf(calls[0].url);
  assertEquals(q.status, "open");
  assertEquals(q.client_id, "42");
  assertEquals(q.practice_area_id, "7");
  assertEquals(q.query, "smith");
  assertEquals(q.limit, "25");
});

Deno.test("matter-list: an empty pageToken input sends no page_token", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await matterList.execute({}, ctx);
  assertEquals("page_token" in queryOf(calls[0].url), false);
});

Deno.test("matter-list: a returned nextPageToken is a short token, not a vendor URL", async () => {
  const { ctx } = mockCtx([{
    body: listEnvelope([{ id: 1 }], { next: "https://app.clio.com/api/v4/matters?page_token=xyz" }),
  }]);
  const out = await matterList.execute({}, ctx) as { nextPageToken?: string };
  assertEquals(out.nextPageToken, "xyz");
});
