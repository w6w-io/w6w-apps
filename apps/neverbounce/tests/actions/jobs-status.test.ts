import { assertEquals } from "@std/assert";
import jobsStatus from "../../actions/jobs-status.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("jobs-status: sends job_id as a query param and returns the full status", async () => {
  const body = {
    status: "success",
    id: 277461,
    filename: "Created from Array.csv",
    job_status: "complete",
    percent_complete: 100,
    total: { records: 2, valid: 0, invalid: 2 },
    execution_time: 322,
  };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await jobsStatus.execute({ jobId: 277461 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("job_id"), "277461");
  assertEquals(result, body);
});
