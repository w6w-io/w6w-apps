import { assertEquals } from "@std/assert";
import jobList from "../../actions/job-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-list: GETs /v2/jobs with filter[] and pagination query keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "j1" }], "/v2/jobs") }]);
  const out = await jobList.execute(
    { filterStatus: "finished", filterTag: "myjob-123", perPage: 10, page: 2 },
    ctx,
  ) as { data: unknown[]; meta?: { current_page?: number } };

  assertEquals(pathOf(calls[0].url), "/v2/jobs");
  assertEquals(queryOf(calls[0].url), {
    "filter[status]": "finished",
    "filter[tag]": "myjob-123",
    per_page: "10",
    page: "2",
  });
  assertEquals(out.data.length, 1);
});

Deno.test("job-list: keeps the meta/links pagination envelope, not just data", async () => {
  const { ctx } = mockCtx([{ status: 200, body: listEnvelope([], "/v2/jobs") }]);
  const out = await jobList.execute({}, ctx) as { meta?: { current_page?: number } };
  assertEquals(out.meta?.current_page, 1);
});

Deno.test("job-list: status filter excludes 'waiting' — not a valid filter[status] value", () => {
  const statusParam = jobList.params?.find((p) => p.key === "filterStatus");
  const values = (statusParam?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.includes("waiting"), false);
});
