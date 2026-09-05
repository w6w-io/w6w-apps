import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

const issueGetTransitions: ActionDefinition<{ issueKey: string }> = {
  key: "issue-get-transitions",
  type: "read",
  resource: "issue",
  title: "Get Issue Transitions",
  description:
    "List the workflow transitions available from the issue's CURRENT status — the ids `issue-transition` needs.",
  params: [issueKey],
  output: [{ key: "transitions", type: "array", label: "Available transitions" }],

  execute(input, ctx) {
    return new JiraDcClient(ctx).request(
      `/issue/${encodeURIComponent(input.issueKey)}/transitions`,
    );
  },
};

export default issueGetTransitions;
