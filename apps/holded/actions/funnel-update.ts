import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `PUT /funnels/{funnelId}` — rename a funnel or replace its stages/labels.
 *
 * "Only the params included in the operation will update" the resource — the
 * same partial-update contract every Holded `PUT` in this app documents —
 * which is also why this is idempotent: sending the same body twice leaves the
 * funnel in the same state both times.
 *
 * `stages` and `labels` are structured arrays (`{stageId?, key?, name?, desc?}`
 * and `{labelId?, labelName?, labelColor?}` respectively) rather than flat
 * fields, so both are taken as raw JSON — the shape Holded documents, passed
 * through rather than reinvented as a dozen indexed params.
 */
interface Input {
  funnelId: string;
  name?: string;
  stages?: string;
  labels?: string;
}

interface FunnelStage {
  stageId?: string;
  key?: string;
  name?: string;
  desc?: string;
}

interface FunnelLabel {
  labelId?: string;
  labelName?: string;
  labelColor?: string;
}

const funnelUpdate: ActionDefinition<Input> = {
  key: "funnel-update",
  type: "perform",
  resource: "funnel",
  title: "Update Funnel",
  description: "Update a funnel's name, stages or labels. Unset fields are left unchanged.",
  idempotent: true,
  params: [
    {
      key: "funnelId",
      label: "Funnel ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Funnels result.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "stages",
      label: "Stages",
      type: "json",
      hint: "JSON array of {stageId?, key?, name?, desc?} — replaces the funnel's pipeline. " +
        'Example: [{"name":"Lead In","desc":""}]',
    },
    {
      key: "labels",
      label: "Labels",
      type: "json",
      hint: "JSON array of {labelId?, labelName?, labelColor?}. Example: " +
        '[{"labelName":"Marketing","labelColor":"#33ffff"}]',
    },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Funnel ID" },
  ],

  execute(input, ctx) {
    const body = compact({
      name: input.name,
      stages: asOptionalJson<FunnelStage[]>(input.stages, "Stages"),
      labels: asOptionalJson<FunnelLabel[]>(input.labels, "Labels"),
    });
    return new HoldedClient(ctx).write(`/funnels/${encodeId(input.funnelId)}`, "PUT", body);
  },
};

export default funnelUpdate;
