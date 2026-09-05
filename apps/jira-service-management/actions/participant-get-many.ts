import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { issueIdOrKey, pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  issueIdOrKey: string;
  limit?: number;
  start?: number;
}

const participantGetMany: ActionDefinition<Input> = {
  key: "participant-get-many",
  type: "search",
  resource: "participant",
  title: "List Request Participants",
  description: "List the customers participating in a request.",
  params: [issueIdOrKey, ...pagination],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/request/${encodeURIComponent(input.issueIdOrKey)}/participant`,
      { query: { start: input.start ?? 0, limit: input.limit ?? 50 } },
    );
  },
};

export default participantGetMany;
