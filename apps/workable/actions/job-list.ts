import type { ActionDefinition } from "@w6w/types";
import { compact, WorkableClient } from "../lib/client.ts";
import { pagination, stateOptions } from "../lib/params.ts";

interface Input {
  state?: string;
  createdAfter?: string;
  updatedAfter?: string;
  includeFields?: string;
  limit?: number;
  sinceId?: string;
  maxId?: string;
  pageUrl?: string;
}

const jobList: ActionDefinition<Input> = {
  key: "job-list",
  type: "read",
  resource: "job",
  title: "List Jobs",
  description: "List the account's jobs, oldest first. Required scope: `r_jobs`.",
  params: [
    { key: "state", label: "State", type: "select", options: stateOptions },
    {
      key: "createdAfter",
      label: "Created after",
      type: "string",
      advanced: true,
      hint: "ISO 8601 or Unix time.",
    },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "string",
      advanced: true,
      hint: "ISO 8601 or Unix time.",
    },
    {
      key: "includeFields",
      label: "Include fields",
      type: "string",
      advanced: true,
      hint: "Comma-separated: description, full_description, requirements, benefits.",
    },
    ...pagination,
  ],
  output: [
    { key: "jobs", type: "array", label: "Jobs" },
    { key: "nextUrl", type: "string", label: "Next page URL" },
  ],

  async execute(input, ctx) {
    const client = new WorkableClient(ctx);
    const page = input.pageUrl
      ? await client.list(input.pageUrl, "jobs")
      : await client.list("/jobs", "jobs", {
        query: compact({
          state: input.state,
          created_after: input.createdAfter,
          updated_after: input.updatedAfter,
          include_fields: input.includeFields,
          limit: input.limit,
          since_id: input.sinceId,
          max_id: input.maxId,
        }),
      });
    return { jobs: page.items, nextUrl: page.nextUrl };
  },
};

export default jobList;
