import { assertEquals } from "@std/assert";
import organizationJobPostingsList from "../../actions/organization-job-postings-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("organization-job-postings-list: GETs /organizations/{id}/job_postings", async () => {
  const { ctx, calls } = mockCtx([{ body: { organization_job_postings: [{ id: "j1" }] } }]);
  const out = await organizationJobPostingsList.execute(
    { organization_id: "o1", per_page: 10 },
    ctx,
  ) as { organization_job_postings: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/organizations/o1/job_postings");
  assertEquals(queryOf(calls[0].url).per_page, "10");
  assertEquals(out.organization_job_postings.length, 1);
});

Deno.test("organization-job-postings-list: a slash in the id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { organization_job_postings: [] } }]);
  await organizationJobPostingsList.execute({ organization_id: "a/../b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/organizations/a%2F..%2Fb/job_postings");
});
