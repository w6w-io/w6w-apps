import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, sourceIdParam } from "../lib/params.ts";

/** `GET /agents/{agentId}/sources/{sourceId}` — one source by ID. */
interface Input {
  agentId: string;
  sourceId: string;
}

const sourceGet: ActionDefinition<Input> = {
  key: "source-get",
  type: "read",
  resource: "source",
  title: "Get Source",
  description: "Fetch one knowledge source by ID.",
  params: [agentIdParam, sourceIdParam],
  output: [
    { key: "id", type: "string", label: "Source ID" },
    { key: "type", type: "string", label: "link | file | qna | notionPage | text" },
    { key: "status", type: "string", label: "untrained | trained | toBeDeleted | updated" },
    { key: "size", type: "number", label: "Size in bytes" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/sources/${encodeURIComponent(input.sourceId)}`,
    );
  },
};

export default sourceGet;
