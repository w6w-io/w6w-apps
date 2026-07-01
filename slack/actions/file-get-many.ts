import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel?: string;
  user?: string;
  types?: string;
  tsFrom?: string;
  tsTo?: string;
  showFilesHidden?: boolean;
  count?: number;
  page?: number;
}

const fileGetMany: ActionDefinition<Input> = {
  key: "file-get-many",
  type: "read",
  resource: "file",
  title: "Get Many Files",
  description: "Lists uploaded files (files.list). Legacy page-number pagination.",
  params: [
    { key: "channel", label: "Channel ID", type: "string" },
    { key: "user", label: "User ID", type: "string" },
    {
      key: "types",
      label: "Types",
      type: "string",
      hint: "Comma-separated: `all,spaces,snippets,images,gdocs,zips,pdfs`.",
    },
    { key: "tsFrom", label: "TS from", type: "string" },
    { key: "tsTo", label: "TS to", type: "string" },
    { key: "showFilesHidden", label: "Show hidden", type: "boolean" },
    { key: "count", label: "Count", type: "number", default: 100 },
    { key: "page", label: "Page", type: "number" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/files.list", {
      query: {
        channel: input.channel,
        user: input.user,
        types: input.types,
        ts_from: input.tsFrom,
        ts_to: input.tsTo,
        show_files_hidden_by_limit: input.showFilesHidden,
        count: input.count ?? 100,
        page: input.page,
      },
    });
  },
};

export default fileGetMany;
