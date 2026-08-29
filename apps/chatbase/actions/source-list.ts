import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient, compact, toCommaList } from "../lib/client.ts";
import { agentIdParam, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/sources` — ticket sources are excluded. For link
 * sources, only individual/sitemap/crawl parent links are returned, with
 * aggregated children metadata rather than each crawled child page.
 */
interface Input {
  agentId: string;
  cursor?: string;
  limit?: number;
  type?: string[] | string;
  name?: string;
}

const sourceList: ActionDefinition<Input> = {
  key: "source-list",
  type: "read",
  resource: "source",
  title: "List Sources",
  description: "List an agent's knowledge sources. Ticket sources are excluded.",
  params: [
    agentIdParam,
    ...paginationParams(),
    {
      key: "type",
      label: "Source types",
      type: "multiselect",
      options: [
        { value: "link", label: "Link" },
        { value: "file", label: "File" },
        { value: "qna", label: "Q&A" },
        { value: "notionPage", label: "Notion page" },
        { value: "text", label: "Text" },
      ],
      hint: "Leave empty for every type.",
    },
    { key: "name", label: "Name contains", type: "string", hint: "Partial, case-insensitive." },
  ],
  output: [
    { key: "data", type: "array", label: "Sources" },
    { key: "pagination", type: "object", label: "Cursor and hasMore for the next page" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/sources`,
      {
        query: compact({
          ...paginationQuery(input),
          type: toCommaList(input.type),
          name: input.name,
        }),
      },
    );
  },
};

export default sourceList;
