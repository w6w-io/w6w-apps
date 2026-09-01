import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, LokaliseClient } from "../lib/client.ts";

/**
 * `POST /projects` — create a new project. Requires the *Admin* role in the
 * target team.
 *
 * Not marked idempotent: Lokalise assigns a fresh `project_id` on every call,
 * and there is no name-based dedupe — two calls with identical input create
 * two identically-named projects.
 */
interface Input {
  name: string;
  description?: string;
  teamId?: number;
  languages?: unknown;
  baseLangIso?: string;
  projectType?: string;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a new project.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "teamId",
      label: "Team ID",
      type: "number",
      hint: "Required if your token has access to more than one team.",
    },
    {
      key: "languages",
      label: "Initial languages",
      type: "json",
      hint: 'Array of {lang_iso, custom_iso?} to seed the project with, e.g. [{"lang_iso":"en"}].',
    },
    {
      key: "baseLangIso",
      label: "Base language ISO",
      type: "string",
      hint: "Must be one of the languages listed above, or the account default if omitted.",
    },
    {
      key: "projectType",
      label: "Project type",
      type: "select",
      options: [
        { value: "localization_files", label: "Web and mobile (branching, per-key management)" },
        { value: "paged_documents", label: "Documents (file-based, no per-key management)" },
        { value: "content_integration", label: "Marketing (limited key params, file-based)" },
        { value: "marketing", label: "Marketing (auto-translated)" },
        { value: "marketing_integrations", label: "Marketing with integrations (auto-translated)" },
      ],
      hint: "Changes which of this app's actions apply — Documents projects, for example, do not " +
        "support the per-key actions (key-update, key-delete). Defaults to Web and mobile.",
    },
  ],
  output: [
    { key: "project_id", type: "string", label: "New project ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json("/projects", {
      method: "POST",
      body: compact({
        name: input.name,
        description: input.description,
        team_id: input.teamId,
        languages: asOptionalJson(input.languages, "Initial languages"),
        base_lang_iso: input.baseLangIso,
        project_type: input.projectType,
      }),
    });
  },
};

export default projectCreate;
