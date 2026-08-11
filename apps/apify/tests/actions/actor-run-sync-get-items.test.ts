import { assertEquals } from "@std/assert";
import actorRunSyncGetItems from "../../actions/actor-run-sync-get-items.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The response is a **bare JSON array** with no `{"data": …}` envelope — one of
 * the vendor's three documented exceptions. If this action ever went through the
 * envelope-unwrapping path it would return the array only by accident.
 */
Deno.test("actor-run-sync-get-items: reads a bare array response, not an envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: [{ url: "a" }, { url: "b" }] }]);
  const out = await actorRunSyncGetItems.execute(
    { actorId: "a1", input: { q: "x" }, limit: 100 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/actors/a1/run-sync-get-dataset-items");
  assertEquals(out.items, [{ url: "a" }, { url: "b" }]);
});

Deno.test("actor-run-sync-get-items: an envelope-shaped body is NOT unwrapped", async () => {
  // Proves the action is not silently tolerant of the wrong shape: if the
  // vendor ever wrapped this response, the change would be visible here rather
  // than producing an empty result somewhere downstream.
  const { ctx } = mockCtx([{ status: 201, body: { data: [{ url: "a" }] } }]);
  const out = await actorRunSyncGetItems.execute({ actorId: "a1" }, ctx) as { items: unknown };
  assertEquals(out.items, { data: [{ url: "a" }] });
});

Deno.test("actor-run-sync-get-items: item-shaping params reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: [] }]);
  await actorRunSyncGetItems.execute(
    { actorId: "a1", limit: 5, clean: true, fields: "url,title", skipEmpty: false, build: "beta" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    limit: "5",
    clean: "1",
    fields: "url,title",
    build: "beta",
  });
});

Deno.test("actor-run-sync-get-items: is declared non-idempotent", () => {
  assertEquals(actorRunSyncGetItems.idempotent, false);
});
