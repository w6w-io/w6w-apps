import { assert, assertEquals, assertThrows } from "@std/assert";
import listSources from "../../actions/list-sources.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-sources: calls GET /v3/sources", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1, name: "Referral", type: "Internal" }])]);
  const page = await listSources.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/sources");
  assertEquals(page.items.length, 1);
});

/**
 * Sources carry only the shared filters — this endpoint has no resource-specific
 * ones at all, so sending anything else would be a 422 invented by this app.
 */
Deno.test("list-sources: sends only the shared filters the endpoint documents", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listSources.execute({
    perPage: 10,
    ids: "1,2",
    fields: "id,name",
    createdAtOperator: "gte",
    createdAt: "2026-01-01T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    per_page: "10",
    ids: "1,2",
    fields: "id,name",
    created_at: "gte|2026-01-01T00:00:00Z",
  });
});

Deno.test("list-sources: a cursor rejects the page size it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(() => listSources.execute({ cursor: "N", perPage: 10 }, ctx), Error);
  assert(err.message.includes("per_page"), err.message);
});
