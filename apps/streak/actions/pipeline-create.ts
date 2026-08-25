import type { ActionDefinition } from "@w6w/types";
import { StreakClient } from "../lib/client.ts";
import { teamKeyParam } from "../lib/params.ts";

/**
 * `PUT /pipelines` — create a pipeline.
 *
 * One of the three endpoints in this API that take a **form-urlencoded**
 * body rather than JSON (see `lib/client.ts`) — sending JSON here is answered
 * with a `400` and an empty body, with nothing in the response explaining
 * why.
 */
interface Input {
  name: string;
  teamKey: string;
  teamWide?: boolean;
  fieldNames?: string;
  fieldTypes?: string;
  stageNames?: string;
}

const pipelineCreate: ActionDefinition<Input> = {
  key: "pipeline-create",
  type: "perform",
  resource: "pipeline",
  title: "Create Pipeline",
  description: "Create a new pipeline for a team.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    teamKeyParam,
    {
      key: "teamWide",
      label: "Team-Wide",
      type: "boolean",
      advanced: true,
      hint: "Share this pipeline with the whole team rather than keeping it private.",
    },
    {
      key: "fieldNames",
      label: "Initial Field Names",
      type: "string",
      advanced: true,
      hint:
        "Comma-separated names for the pipeline's initial custom fields, e.g. 'Deal Size,Close Date'.",
    },
    {
      key: "fieldTypes",
      label: "Initial Field Types",
      type: "string",
      advanced: true,
      dependsOn: ["fieldNames"],
      hint: "Comma-separated types matching Field Names, one of TEXT_INPUT, DATE, TAG, FORMULA, " +
        "DROPDOWN, CHECKBOX, TEAM_CONTACT — e.g. 'TEXT_INPUT,DATE'.",
    },
    {
      key: "stageNames",
      label: "Initial Stage Names",
      type: "string",
      advanced: true,
      hint: "Comma-separated names for the pipeline's initial stages, e.g. 'New,In Progress,Won'.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created pipeline" }],

  execute(input, ctx) {
    return new StreakClient(ctx).putForm("/pipelines", {
      name: input.name,
      teamKey: input.teamKey,
      teamWide: input.teamWide,
      fieldNames: input.fieldNames,
      fieldTypes: input.fieldTypes,
      stageNames: input.stageNames,
    });
  },
};

export default pipelineCreate;
