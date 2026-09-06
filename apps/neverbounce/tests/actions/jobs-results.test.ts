import { assertEquals } from "@std/assert";
import jobsResults from "../../actions/jobs-results.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("jobs-results: sends job_id/page/items_per_page and returns per-row results", async () => {
  const body = {
    status: "success",
    total_results: 1,
    total_pages: 1,
    results: [{ data: { email: "a@b.com" }, verification: { result: "valid" } }],
    execution_time: 55,
  };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await jobsResults.execute({ jobId: 251319, page: 1, itemsPerPage: 10 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("job_id"), "251319");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("items_per_page"), "10");
  assertEquals(result, body);
});
