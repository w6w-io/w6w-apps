import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery, projectIdParam } from "../lib/params.ts";

/**
 * `GET /projects/{project_id}/files` — the project's uploaded source files.
 *
 * A `file_id` of `-1` and a filename of `__unassigned__` is a real, documented
 * row — not a bug — meaning keys with no filename attribution.
 */
interface Input {
  projectId: string;
  filterFilename?: string;
  limit?: number;
  page?: number;
}

const fileList: ActionDefinition<Input> = {
  key: "file-list",
  type: "search",
  resource: "file",
  title: "List Files",
  description: "List the project's files and how many keys each holds.",
  params: [
    projectIdParam,
    { key: "filterFilename", label: "Filter by filename", type: "string" },
    ...paginationParams(100).filter((p) => p.key !== "cursor"),
  ],
  output: [
    { key: "items", type: "array", label: "Files" },
    { key: "totalCount", type: "number", label: "Total files" },
  ],

  async execute(input, ctx) {
    const { items, totalCount } = await new LokaliseClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/files`,
      "files",
      { query: { filter_filename: input.filterFilename, ...paginationQuery(input) } },
    );
    return { items, totalCount };
  },
};

export default fileList;
