import { assertEquals } from "@std/assert";
import { APP_ID, mockConnectedCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/list-records.ts";

Deno.test("list-records: GETs /v0/apps/{appId}/collections/{id} with query params", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { records: [{ id: 1 }] } }]);
  const result = await action.execute!(
    { collectionId: "c1", offset: 10, limit: 5, filterKey: "Status", filterValue: "open" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), `/v0/apps/${APP_ID}/collections/c1`);
  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url), {
    offset: "10",
    limit: "5",
    filterKey: "Status",
    filterValue: "open",
  });
  assertEquals(result, { records: [{ id: 1 }] });
});

Deno.test("list-records: omits unset query params entirely", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { records: [] } }]);
  await action.execute!({ collectionId: "c1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
