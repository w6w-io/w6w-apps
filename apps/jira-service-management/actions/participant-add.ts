import type { ActionDefinition } from "@w6w/types";
import { JsmClient, unset } from "../lib/client.ts";
import { issueIdOrKey } from "../lib/params.ts";

interface Input {
  issueIdOrKey: string;
  accountIds: string;
}

const participantAdd: ActionDefinition<Input> = {
  key: "participant-add",
  type: "perform",
  resource: "participant",
  title: "Add Request Participants",
  description: "Add one or more customers as participants on a request.",
  idempotent: true,
  params: [
    issueIdOrKey,
    {
      key: "accountIds",
      label: "Account IDs",
      type: "string",
      required: true,
      hint: "Comma-separated Atlassian `accountId` values.",
    },
  ],
  output: [
    { key: "values", type: "array", label: "Participants" },
    { key: "size", type: "number", label: "Count" },
  ],

  execute(input, ctx) {
    const accountIds = unset(input.accountIds)?.split(",").map((s) => s.trim()).filter(Boolean) ??
      [];
    return new JsmClient(ctx).request(
      `/request/${encodeURIComponent(input.issueIdOrKey)}/participant`,
      { method: "POST", body: { accountIds } },
    );
  },
};

export default participantAdd;
