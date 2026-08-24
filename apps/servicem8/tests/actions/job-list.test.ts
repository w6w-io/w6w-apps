import { assertEquals } from "@std/assert";
import jobList from "../../actions/job-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-list: calls GET /job.json with $filter/$sort/cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "j1" }], headers: { "x-next-cursor": "n1" } }]);
  const out = await jobList.execute({
    filter: "status eq 'Work Order'",
    sort: "due_date desc",
    cursor: "-1",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api_1.0/job.json");
  assertEquals(queryOf(calls[0].url), {
    "$filter": "status eq 'Work Order'",
    "$sort": "due_date desc",
    cursor: "-1",
  });
  assertEquals(out.items, [{ uuid: "j1" }]);
  assertEquals(out.nextCursor, "n1");
});

Deno.test("job-list: omits unset query params rather than sending them empty", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await jobList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
