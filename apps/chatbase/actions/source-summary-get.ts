import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/sources/summary` — aggregated counts and sizes per
 * source type, plus `shouldRetrain` — whether the knowledge base has changes
 * not yet reflected in a trained agent.
 */
interface Input {
  agentId: string;
}

const sourceSummaryGet: ActionDefinition<Input> = {
  key: "source-summary-get",
  type: "read",
  resource: "source",
  title: "Get Sources Summary",
  description: "Aggregated counts and sizes per source type, and whether a retrain is pending.",
  params: [agentIdParam],
  output: [
    { key: "links", type: "object", label: "Link source stats" },
    { key: "files", type: "object", label: "File source stats" },
    { key: "qnas", type: "object", label: "Q&A source stats" },
    { key: "texts", type: "object", label: "Text source stats" },
    { key: "shouldRetrain", type: "boolean", label: "Whether changes are pending a retrain" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/sources/summary`,
    );
  },
};

export default sourceSummaryGet;
