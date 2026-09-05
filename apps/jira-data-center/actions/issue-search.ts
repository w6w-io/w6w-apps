import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  jql: string;
  fields?: string;
  expand?: string;
  maxResults?: number;
  startAt?: number;
}

const issueSearch: ActionDefinition<Input> = {
  key: "issue-search",
  type: "search",
  resource: "issue",
  title: "Search Issues (JQL)",
  description: "Run a JQL query and return the matching issues.",
  params: [
    {
      key: "jql",
      label: "JQL",
      type: "text",
      required: true,
      config: { multiline: true },
      placeholder: "project = ENG AND status != Done ORDER BY created DESC",
      hint: "Jira Query Language. An empty query would match every issue, so it is required.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated. Narrowing this makes large result sets much cheaper.",
    },
    { key: "expand", label: "Expand", type: "string", advanced: true },
    ...pagination,
  ],
  output: [
    { key: "issues", type: "array", label: "Issues" },
    { key: "total", type: "number", label: "Total matches" },
    { key: "startAt", type: "number", label: "Offset of this page" },
  ],

  execute(input, ctx) {
    // POST rather than GET: JQL routinely exceeds what a query string can
    // carry, and Data Center's v2 `/search` supports both, same as Cloud.
    return new JiraDcClient(ctx).request("/search", {
      method: "POST",
      body: {
        jql: input.jql,
        fields: input.fields
          ? input.fields.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        expand: unset(input.expand)?.split(",").map((s) => s.trim()),
        maxResults: input.maxResults ?? 50,
        startAt: input.startAt ?? 0,
      },
    });
  },
};

export default issueSearch;
