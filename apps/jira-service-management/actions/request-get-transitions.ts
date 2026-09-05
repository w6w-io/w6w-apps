import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { issueIdOrKey, pagedOutput, pagination } from "../lib/params.ts";

interface Input {
  issueIdOrKey: string;
  limit?: number;
  start?: number;
}

/**
 * Status is not directly writable on a request — same rule as the sibling
 * `jira` app's issue workflow — so this lists what's available from the
 * request's current state before `request-transition` executes one.
 */
const requestGetTransitions: ActionDefinition<Input> = {
  key: "request-get-transitions",
  type: "search",
  resource: "request",
  title: "Get Available Transitions",
  description: "List the transitions a customer can currently perform on a request.",
  params: [issueIdOrKey, ...pagination],
  output: pagedOutput,

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/request/${encodeURIComponent(input.issueIdOrKey)}/transition`,
      { query: { start: input.start ?? 0, limit: input.limit ?? 50 } },
    );
  },
};

export default requestGetTransitions;
