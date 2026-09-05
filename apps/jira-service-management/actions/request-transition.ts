import type { ActionDefinition } from "@w6w/types";
import { JsmClient, unset } from "../lib/client.ts";
import { issueIdOrKey } from "../lib/params.ts";

interface Input {
  issueIdOrKey: string;
  transitionId: string;
  comment?: string;
}

const requestTransition: ActionDefinition<Input> = {
  key: "request-transition",
  type: "perform",
  resource: "request",
  title: "Transition Request",
  description: "Move a request through its workflow. Use `request-get-transitions` to find the id.",
  // Re-running a transition that already happened is rejected rather than
  // applied twice.
  idempotent: true,
  params: [
    issueIdOrKey,
    {
      key: "transitionId",
      label: "Transition ID",
      type: "string",
      required: true,
      hint: "From `request-get-transitions`. Ids are workflow-specific, not global.",
    },
    {
      key: "comment",
      label: "Comment",
      type: "text",
      config: { multiline: true },
      hint: "Added as a public comment explaining the transition.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    await new JsmClient(ctx).request(
      `/request/${encodeURIComponent(input.issueIdOrKey)}/transition`,
      {
        method: "POST",
        body: {
          id: input.transitionId,
          additionalComment: unset(input.comment) ? { body: input.comment } : undefined,
        },
      },
    );
    return { status: 204 };
  },
};

export default requestTransition;
