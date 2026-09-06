import { assertEquals } from "@std/assert";
import jobsSearch from "../../actions/jobs-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("jobs-search: sends only the provided filters as query params", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { status: "success", total_results: 0, total_pages: 0, results: [], execution_time: 1 },
    },
  ]);

  await jobsSearch.execute({ jobStatus: "complete", page: 2 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4.2/jobs/search");
  assertEquals(url.searchParams.get("job_status"), "complete");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.has("job_id"), false);
  assertEquals(url.searchParams.has("filename"), false);
});

Deno.test("jobs-search: returns the results envelope", async () => {
  const body = {
    status: "success",
    total_results: 1,
    total_pages: 1,
    results: [{ id: 277461, status: "complete" }],
    execution_time: 388,
  };
  const { ctx } = mockCtx([{ body }]);

  const result = await jobsSearch.execute({}, ctx);
  assertEquals(result, body);
});
