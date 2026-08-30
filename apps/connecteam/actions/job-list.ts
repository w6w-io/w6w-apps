import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient, toIdList, toList } from "../lib/client.ts";
import { paginationParams, sortOrderOptions } from "../lib/params.ts";

/**
 * `GET /jobs/v1/jobs` — jobs and sub-jobs, used to tag shifts and time
 * activities. A parent job id also returns its nested sub-jobs.
 */
interface Input {
  instanceIds?: string;
  jobIds?: string;
  jobNames?: string;
  jobCodes?: string;
  includeDeleted?: boolean;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

const jobList: ActionDefinition<Input> = {
  key: "job-list",
  type: "search",
  resource: "job",
  title: "List Jobs",
  description: "List jobs and sub-jobs.",
  params: [
    {
      key: "instanceIds",
      label: "Instance IDs",
      type: "string",
      hint: "Comma-separated schedule or time clock ids to filter by.",
    },
    {
      key: "jobIds",
      label: "Job IDs",
      type: "string",
      hint: "Comma-separated. A parent job id also returns its sub-jobs.",
    },
    { key: "jobNames", label: "Job names", type: "string", hint: "Comma-separated." },
    { key: "jobCodes", label: "Job codes", type: "string", hint: "Comma-separated." },
    {
      key: "includeDeleted",
      label: "Include deleted",
      type: "boolean",
      default: true,
      hint: "Connecteam's own default is true.",
    },
    {
      key: "sort",
      label: "Sort key",
      type: "select",
      options: [{ value: "title", label: "Title" }],
    },
    { key: "order", label: "Sort order", type: "select", options: sortOrderOptions },
    ...paginationParams(500),
  ],
  output: [
    { key: "jobs", type: "array", label: "Jobs" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "total", type: "number", label: "Total matching jobs (when computed)" },
  ],

  async execute(input, ctx) {
    const { data, paging } = await new ConnecteamClient(ctx).page<{ jobs: unknown[] }>(
      "/jobs/v1/jobs",
      {
        query: {
          instanceIds: toIdList(input.instanceIds),
          jobIds: toList(input.jobIds),
          jobNames: toList(input.jobNames),
          jobCodes: toList(input.jobCodes),
          includeDeleted: input.includeDeleted,
          sort: input.sort,
          order: input.order,
          limit: input.limit,
          offset: input.offset,
        },
      },
    );
    return { jobs: data.jobs ?? [], ...paging };
  },
};

export default jobList;
