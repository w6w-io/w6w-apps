import { assertEquals } from "@std/assert";
import actorList from "../../actions/actor-list.ts";
import { API_ROOT, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("actor-list: calls GET /v2/actors and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "a1" }]) }]);
  const out = await actorList.execute({ limit: 100 }, ctx) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/actors");
  assertEquals(queryOf(calls[0].url), { limit: "100" });
  assertEquals(out.items, [{ id: "a1" }]);
});

Deno.test("actor-list: booleans are sent as 1 when set and omitted when not", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await actorList.execute({ my: true, desc: false, sortBy: "stats.lastRunStartedAt" }, ctx);

  assertEquals(queryOf(calls[0].url), { my: "1", sortBy: "stats.lastRunStartedAt" });
});

Deno.test("actor-list: prefills a limit well below Apify's 1000 default", () => {
  const limit = actorList.params?.find((p) => p.key === "limit");
  assertEquals(limit?.default, 100);
});

Deno.test("actor-list: the URL is built against api.apify.com", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await actorList.execute({}, ctx);
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/actors`), true, calls[0].url);
});
