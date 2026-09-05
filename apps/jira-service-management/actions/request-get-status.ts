import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { issueIdOrKey, pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  issueIdOrKey: string;
  limit?: number;
  start?: number;
}

const requestGetStatus: ActionDefinition<Input> = {
  key: "request-get-status",
  type: "search",
  resource: "request",
  title: "Get Request Status History",
  description: "List the status conditions a request has moved through.",
  params: [issueIdOrKey, ...pagination],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/request/${encodeURIComponent(input.issueIdOrKey)}/status`,
      { query: { start: input.start ?? 0, limit: input.limit ?? 50 } },
    );
  },
};

export default requestGetStatus;
