import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /organizations/{organization_id}/job_postings` — an organization's active job postings. */
interface Input {
  organization_id: string;
  page?: number;
  per_page?: number;
}

const organizationJobPostingsList: ActionDefinition<Input> = {
  key: "organization-job-postings-list",
  type: "search",
  resource: "organization",
  title: "List Organization Job Postings",
  description: "List an organization's active job postings — a signal for hiring/growth.",
  params: [
    {
      key: "organization_id",
      label: "Organization",
      type: "string",
      required: true,
      hint: "From `organization-search`, `organization-enrich`, or `organization-get`.",
    },
    ...paginationParams(25),
  ],
  output: [{ key: "organization_job_postings", type: "array", label: "Job postings" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).get<{ organization_job_postings?: unknown[] }>(
      `/organizations/${encodeId(input.organization_id)}/job_postings`,
      compact({ page: input.page, per_page: input.per_page }),
    );
    return { organization_job_postings: body.organization_job_postings ?? [] };
  },
};

export default organizationJobPostingsList;
