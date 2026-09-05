import type { ActionDefinition } from "@w6w/types";
import { csv, JsmClient } from "../lib/client.ts";
import { issueIdOrKey } from "../lib/params.ts";

interface Input {
  issueIdOrKey: string;
  expand?: string;
}

const requestGet: ActionDefinition<Input> = {
  key: "request-get",
  type: "read",
  resource: "request",
  title: "Get Customer Request",
  description: "Look up one customer request by id or key.",
  params: [
    issueIdOrKey,
    {
      key: "expand",
      label: "Expand",
      type: "string",
      advanced: true,
      placeholder: "participant,sla,status,comment",
      hint: "Comma-separated. Adds detail the base response omits.",
    },
  ],
  output: [
    { key: "issueId", type: "string", label: "Request ID (peer issue ID)" },
    { key: "issueKey", type: "string", label: "Request key (peer issue key)" },
    { key: "requestFieldValues", type: "array", label: "Field values" },
    { key: "currentStatus", type: "object", label: "Current status" },
    { key: "reporter", type: "object", label: "Reporter" },
  ],

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/request/${encodeURIComponent(input.issueIdOrKey)}`,
      { query: { expand: csv(input.expand) } },
    );
  },
};

export default requestGet;
