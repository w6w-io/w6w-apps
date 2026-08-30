import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient, unset } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  companyId?: number;
  projectOwnerId?: number;
  startDate?: string;
  endDate?: string;
  private?: boolean;
}

/** `YYYY-MM-DD` (this app's form date) -> Teamwork's `YYYYMMDD` wire format. */
function compactDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  return v.replaceAll("-", "");
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a new project. Uses Teamwork's V1 project endpoint — confirmed against " +
    "apidocs.teamwork.com's `POST /projects.json` reference.",
  // Teamwork mints a new project id per call and has no create-or-update
  // endpoint to converge a retry on.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    { key: "companyId", label: "Company ID", type: "number", row: "owner" },
    { key: "projectOwnerId", label: "Owner user ID", type: "number", row: "owner" },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      row: "dates",
      hint: "Format: YYYY-MM-DD.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "date",
      row: "dates",
      hint: "Format: YYYY-MM-DD.",
    },
    { key: "private", label: "Private", type: "boolean", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "STATUS", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request("/projects.json", {
      method: "POST",
      body: {
        project: {
          name: input.name,
          description: unset(input.description),
          companyId: input.companyId,
          projectOwnerId: input.projectOwnerId,
          "start-date": compactDate(input.startDate),
          "end-date": compactDate(input.endDate),
          private: input.private,
        },
      },
    });
  },
};

export default projectCreate;
