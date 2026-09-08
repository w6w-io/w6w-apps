import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

/** `GET /crm/v1/pipelines` — every pipeline, with its id, creator and steps. */
const action: ActionDefinition = {
  key: "pipelines-list",
  type: "search",
  resource: "pipeline",
  title: "List pipelines",
  description: "List the CRM's pipelines. Use the returned pipeline id and step ids to create " +
    "or filter deals.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Pipelines" },
  ],

  async execute(_input, ctx) {
    return await new SendPulseClient(ctx).crm("/pipelines");
  },
};

export default action;
