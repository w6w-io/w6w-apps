import { assertEquals } from "@std/assert";
import bulkRunList from "../../actions/bulk-run-list.ts";
import { mockCtx, pathOf, queryOf, resultEnvelope } from "../_helpers.ts";

const PAGE = { totalCount: 1, pageNumber: 1, hasMore: false, items: [{ id: "b1" }] };

Deno.test("bulk-run-list: GETs /robots/{robotId}/bulk-runs and unwraps result", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope(PAGE) }]);
  const out = await bulkRunList.execute({ robotId: "r1" }, ctx) as typeof PAGE;

  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/bulk-runs");
  assertEquals(out.items[0].id, "b1");
});

Deno.test("bulk-run-list: forwards page as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope(PAGE) }]);
  await bulkRunList.execute({ robotId: "r1", page: 3 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "3" });
});
