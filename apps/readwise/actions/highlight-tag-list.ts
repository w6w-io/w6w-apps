import type { ActionDefinition } from "@w6w/types";
import { ReadwiseClient, type ReadwisePage } from "../lib/client.ts";
import { highlightIdParam, pageParams } from "../lib/params.ts";

/** `GET /api/v2/highlights/<id>/tags` — a highlight's tags, paginated. */
interface Input {
  highlightId: string;
  page_size?: number;
  page?: number;
}

interface Tag {
  id: number;
  name: string;
}

const highlightTagList: ActionDefinition<Input> = {
  key: "highlight-tag-list",
  type: "search",
  resource: "highlight-tag",
  title: "List Highlight Tags",
  description: "List the tags on a specific highlight.",
  params: [highlightIdParam, ...pageParams()],
  output: [
    { key: "results", type: "array", label: "Tags" },
    { key: "count", type: "number", label: "Total tags" },
  ],

  execute(input, ctx) {
    return new ReadwiseClient(ctx).json<ReadwisePage<Tag>>(
      `/highlights/${encodeURIComponent(input.highlightId)}/tags`,
      { query: { page_size: input.page_size, page: input.page } },
    );
  },
};

export default highlightTagList;
