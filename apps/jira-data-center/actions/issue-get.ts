import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient, unset } from "../lib/client.ts";
import { issueKey, issueOutput } from "../lib/params.ts";

interface Input {
  issueKey: string;
  fields?: string;
  expand?: string;
}

const issueGet: ActionDefinition<Input> = {
  key: "issue-get",
  type: "read",
  resource: "issue",
  title: "Get Issue",
  description: "Read a single issue by key or id.",
  params: [
    issueKey,
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated. Defaults to every field when left empty.",
    },
    { key: "expand", label: "Expand", type: "string", advanced: true },
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new JiraDcClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}`, {
      query: {
        fields: unset(input.fields),
        expand: unset(input.expand),
      },
    });
  },
};

export default issueGet;
