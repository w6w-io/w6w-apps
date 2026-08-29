import { assertEquals } from "@std/assert";
import jobList from "../../actions/job-list.ts";
import { mockCtx, pagedEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-list: GETs /jobs/v1/jobs, includeDeleted defaults to true per the vendor", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedEnvelope({ jobs: [{ id: "job_1" }] }) }]);
  const out = await jobList.execute({ includeDeleted: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/jobs/v1/jobs");
  assertEquals(queryOf(calls[0].url), { includeDeleted: "true" });
  assertEquals(out, { jobs: [{ id: "job_1" }], offset: 0 });
});

Deno.test("job-list: jobIds/jobNames/jobCodes are repeated-key array filters", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedEnvelope({ jobs: [] }) }]);
  await jobList.execute({ jobIds: "a,b", jobNames: "Front Desk" }, ctx);
  assertEquals(queryOf(calls[0].url).jobIds, ["a", "b"]);
  assertEquals(queryOf(calls[0].url).jobNames, "Front Desk");
});
