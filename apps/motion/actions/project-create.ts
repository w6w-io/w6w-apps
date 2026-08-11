import type { ActionDefinition } from "@w6w/types";
import { MotionClient, omitUndefined, optionalJson, toStringList, V1 } from "../lib/client.ts";
import { labelsParam, priorityOptions, workspaceIdParam } from "../lib/params.ts";

/**
 * `POST /v1/projects` — create a project.
 *
 * ## Templates: `projectDefinitionId` and `stages` travel together
 *
 * Motion can create a project from a **project definition** (its word for a
 * template). The reference is unusually specific about the two ways that goes
 * wrong, quoting the errors verbatim, so both are surfaced in the hints:
 *
 *  - `stages` is *required* when `projectDefinitionId` is supplied, and the
 *    stages must match the definition's own **order and number**. Supplying the
 *    wrong count is a 400: "The number of stages in the project does not match
 *    the number of stages in the definition."
 *  - a stage's `variableInstances[].variableName` must be a name the stage
 *    defines, and a wrong one is a 400 that helpfully lists the valid names.
 *
 * `stages` is a free-form `json` param because its element schema
 * (`{stageDefinitionId, dueDate, variableInstances?}`) is only meaningful
 * against a specific definition, and Motion publishes no endpoint for listing
 * definitions — so this app cannot populate a picker for it.
 *
 * ## `description` is HTML here, Markdown on a task
 *
 * The project reference says "HTML input accepted" for `description`, while the
 * task reference says "Github Flavored Markdown". Both are stated plainly by the
 * vendor, in the same API, for the same-named field.
 *
 * Not idempotent: Motion documents no idempotency key, so a retry creates a
 * second project.
 */
interface Input {
  name: string;
  workspaceId: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  labels?: string[];
  projectDefinitionId?: string;
  stages?: unknown;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project in a workspace, optionally from a project definition (template).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    workspaceIdParam(true),
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "HTML is accepted here. Note this differs from a task description, which Motion " +
        "parses as GitHub Flavored Markdown.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: priorityOptions,
      hint: "Defaults to MEDIUM.",
    },
    {
      key: "dueDate",
      label: "Due date",
      type: "datetime",
      hint: "ISO 8601, e.g. 2024-03-12T10:52:55.714-06:00.",
    },
    labelsParam,
    {
      key: "projectDefinitionId",
      label: "Project definition ID",
      type: "string",
      hint: "Optional template id. Supplying it makes Stages REQUIRED. Motion publishes no " +
        "endpoint for listing definitions, so this id comes from the Motion UI.",
    },
    {
      key: "stages",
      label: "Stages",
      type: "json",
      placeholder: '[{"stageDefinitionId": "...", "dueDate": "2026-09-01", "variableInstances": ' +
        '[{"variableName": "Tech Lead", "value": "usr_123abc"}]}]',
      hint: "Required when a project definition is set, and must match the definition's stages " +
        'in ORDER and NUMBER — a mismatched count is rejected with 400 "The number of stages ' +
        'in the project does not match the number of stages in the definition". Each entry is ' +
        "{stageDefinitionId, dueDate, variableInstances?}.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "status.name", type: "string", label: "Status" },
    { key: "createdTime", type: "string", label: "Created" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating Motion project", { workspaceId: input.workspaceId });
    return new MotionClient(ctx).json(`${V1}/projects`, {
      method: "POST",
      body: omitUndefined({
        name: input.name,
        workspaceId: input.workspaceId,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
        labels: toStringList(input.labels),
        projectDefinitionId: input.projectDefinitionId,
        stages: optionalJson(input.stages, "Stages"),
      }),
    });
  },
};

export default projectCreate;
