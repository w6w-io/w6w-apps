import type { ActionDefinition } from "@w6w/types";
import { buildListQuery, HarvestClient, type HarvestPage, idList } from "../lib/client.ts";
import { type BaseListInput, baseListQuery } from "../lib/list.ts";
import {
  createdAtParams,
  fieldsParam,
  idsParam,
  listOutput,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/job_posts` — the public (or internal) advertisements for a job.
 *
 * A job can carry several posts: one external, one internal, one per board. The
 * post is what a candidate reads; the job is what the recruiting team works. The
 * two are separate resources and confusing them is the usual reason a "list open
 * roles" feed shows the wrong text.
 *
 * `active`, `live` and `internal` are three independent booleans, not one state:
 * a post can be active but not live (published to no board), and `internal`
 * selects the internal-mobility variant rather than the public one.
 */
interface Input extends BaseListInput {
  jobIds?: string;
  jobBoardIds?: string;
  active?: boolean;
  live?: boolean;
  internal?: boolean;
  featured?: boolean;
}

const listJobPosts: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-job-posts",
  type: "search",
  resource: "job",
  title: "List Job Posts",
  description: "List job posts, optionally scoped to jobs or boards and filtered by visibility.",
  params: [
    { key: "jobIds", label: "Job ids", type: "string", hint: "Comma-separated." },
    {
      key: "jobBoardIds",
      label: "Job board ids",
      type: "string",
      hint: "Comma-separated. Board ids come from the List Job Boards action.",
    },
    {
      key: "active",
      label: "Active only",
      type: "boolean",
      hint: "Whether the post itself is switched on. Independent of whether it is live on a " +
        "board.",
    },
    { key: "live", label: "Live only", type: "boolean", hint: "Currently published to a board." },
    {
      key: "internal",
      label: "Internal only",
      type: "boolean",
      hint: "On returns internal-mobility posts, off returns external ones. Omit for both.",
    },
    { key: "featured", label: "Featured only", type: "boolean" },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Job posts"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/job_posts", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        job_ids: idList(input.jobIds, "jobIds"),
        job_board_ids: idList(input.jobBoardIds, "jobBoardIds"),
        active: input.active,
        live: input.live,
        internal: input.internal,
        featured: input.featured,
      }),
    });
  },
};

export default listJobPosts;
