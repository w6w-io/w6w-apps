import type { ActionDefinition } from "@w6w/types";
import { csv, TeamworkClient, unset } from "../lib/client.ts";

interface Input {
  projectId: number;
  title: string;
  description?: string;
  deadline: string;
  responsiblePartyIds?: string;
  private?: boolean;
}

/** `YYYY-MM-DD` (this app's form date) -> Teamwork's `YYYYMMDD` wire format. */
function compactDate(v: string): string {
  return v.replaceAll("-", "");
}

const milestoneCreate: ActionDefinition<Input> = {
  key: "milestone-create",
  type: "perform",
  resource: "milestone",
  title: "Create Milestone",
  description: "Create a milestone in a project. Uses Teamwork's V1 endpoint " +
    "(`POST /projects/{id}/milestones.json`).",
  // Teamwork mints a new milestone id per call and has no create-or-update
  // endpoint to converge a retry on.
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "deadline",
      label: "Due date",
      type: "date",
      required: true,
      hint: "Format: YYYY-MM-DD.",
    },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "responsiblePartyIds",
      label: "Responsible user IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    { key: "private", label: "Private", type: "boolean", advanced: true },
  ],
  output: [{ key: "STATUS", type: "string", label: "Status" }],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request(`/projects/${input.projectId}/milestones.json`, {
      method: "POST",
      body: {
        milestone: {
          title: input.title,
          deadline: compactDate(input.deadline),
          description: unset(input.description),
          "responsible-party-ids": csv(input.responsiblePartyIds)?.join(","),
          private: input.private,
        },
      },
    });
  },
};

export default milestoneCreate;
