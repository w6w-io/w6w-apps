import type { ActionDefinition } from "@w6w/types";
import { compact, JiraDcClient } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

interface Input {
  issueKey: string;
  summary?: string;
  description?: string;
  priority?: string;
  labels?: string;
  additionalFields?: unknown;
}

const issueUpdate: ActionDefinition<Input> = {
  key: "issue-update",
  type: "perform",
  resource: "issue",
  title: "Update Issue",
  description: "Update fields on an existing issue. Blank fields are left untouched.",
  // A PUT of the same fields to the same issue leaves it in the same state.
  idempotent: true,
  params: [
    issueKey,
    { key: "summary", label: "Summary", type: "string" },
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "Plain text or Jira wiki markup.",
    },
    { key: "priority", label: "Priority", type: "string", placeholder: "High" },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      hint: "Comma-separated. Replaces the issue's labels entirely.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: 'Merged into `fields`, e.g. { "customfield_10010": "value" }.',
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    const labels = input.labels
      ? input.labels.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return new JiraDcClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}`, {
      method: "PUT",
      body: {
        fields: compact({
          summary: input.summary,
          description: input.description,
          priority: input.priority ? { name: input.priority } : undefined,
          labels,
          ...(input.additionalFields as Record<string, unknown> ?? {}),
        }),
      },
    });
  },
};

export default issueUpdate;
