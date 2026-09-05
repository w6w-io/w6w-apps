import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

interface Input {
  issueKey: string;
  transitionId: string;
  comment?: string;
  resolution?: string;
}

/**
 * Status is not a writable field in Jira — it changes only by executing a
 * workflow transition, and which transitions exist depends on the issue's
 * current status. `issue-get-transitions` lists the ones available right now.
 */
const issueTransition: ActionDefinition<Input> = {
  key: "issue-transition",
  type: "perform",
  resource: "issue",
  title: "Transition Issue",
  description:
    "Move an issue through its workflow. Status is not directly writable — use `issue-get-transitions` to find the id.",
  // Re-running a transition that already happened is rejected rather than
  // applied twice.
  idempotent: true,
  params: [
    issueKey,
    {
      key: "transitionId",
      label: "Transition ID",
      type: "string",
      required: true,
      hint: "From `issue-get-transitions`. Ids are workflow-specific, not global.",
    },
    {
      key: "comment",
      label: "Comment",
      type: "text",
      config: { multiline: true },
      hint: "Added as part of the transition. Plain text or Jira wiki markup.",
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "string",
      placeholder: "Done",
      hint: "Required by some workflows when closing an issue.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new JiraDcClient(ctx).request(
      `/issue/${encodeURIComponent(input.issueKey)}/transitions`,
      {
        method: "POST",
        body: {
          transition: { id: input.transitionId },
          fields: input.resolution ? { resolution: { name: input.resolution } } : undefined,
          update: input.comment ? { comment: [{ add: { body: input.comment } }] } : undefined,
        },
      },
    );
  },
};

export default issueTransition;
