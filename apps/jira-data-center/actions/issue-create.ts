import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient } from "../lib/client.ts";
import { issueOutput } from "../lib/params.ts";

interface Input {
  projectKey: string;
  issueType: string;
  summary: string;
  description?: string;
  assigneeUsername?: string;
  priority?: string;
  labels?: string;
  parentKey?: string;
  additionalFields?: unknown;
}

const issueCreate: ActionDefinition<Input> = {
  key: "issue-create",
  type: "perform",
  resource: "issue",
  title: "Create Issue",
  description: "Create an issue in a project.",
  // Jira mints a new key per call and offers no request key, so a retry files
  // a duplicate.
  idempotent: false,
  params: [
    {
      key: "projectKey",
      label: "Project key or ID",
      type: "string",
      required: true,
      row: "where",
      placeholder: "ENG",
    },
    {
      key: "issueType",
      label: "Issue type",
      type: "string",
      required: true,
      row: "where",
      placeholder: "Task",
      hint: "The type's name (`Task`, `Bug`) or its numeric id.",
    },
    { key: "summary", label: "Summary", type: "string", required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "Plain text or Jira wiki markup — Data Center's v2 API takes a plain string, not " +
        "the ADF object Jira Cloud requires.",
    },
    {
      key: "assigneeUsername",
      label: "Assignee username",
      type: "string",
      hint: "The account's login username — Data Center identifies users by username, not an " +
        "opaque account id. `user-search` finds it.",
    },
    { key: "priority", label: "Priority", type: "string", placeholder: "High" },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      hint: "Comma-separated. Jira labels cannot contain spaces.",
    },
    {
      key: "parentKey",
      label: "Parent key",
      type: "string",
      hint: "Parent issue for a sub-task, or the epic for a story.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: 'Merged into `fields`, e.g. { "customfield_10010": "value", "duedate": "2026-08-01" }.',
    },
  ],
  output: issueOutput,

  execute(input, ctx) {
    const labels = input.labels
      ? input.labels.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return new JiraDcClient(ctx).request("/issue", {
      method: "POST",
      body: {
        fields: {
          project: { key: input.projectKey },
          issuetype: { name: input.issueType },
          summary: input.summary,
          description: input.description,
          assignee: input.assigneeUsername ? { name: input.assigneeUsername } : undefined,
          priority: input.priority ? { name: input.priority } : undefined,
          labels: labels?.length ? labels : undefined,
          parent: input.parentKey ? { key: input.parentKey } : undefined,
          ...(input.additionalFields as Record<string, unknown> ?? {}),
        },
      },
    });
  },
};

export default issueCreate;
