import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";

/**
 * `PATCH /c/{company_id}/placements/{id}/change_stage` — "Change stage in
 * placement": move a candidate to a different pipeline stage.
 *
 * The vendor's own recorded request example sends an empty JSON body (`{}`)
 * even though `stage_id` is documented as required, which is a gap in the
 * auto-generated doc (see `lib/client.ts`) rather than evidence that this
 * endpoint takes no input — every other create/update resource on this same
 * host accepts a flat or nested JSON body, and this app follows that same
 * convention (a flat body, since `change_stage` is an action on a placement
 * rather than a full resource replace).
 *
 * `disqualifyReasonId` is documented with an evident type/prose mismatch
 * ("boolean (optional) … Set the disqualify reason") — it is exposed here as
 * the number the description actually describes.
 */
interface Input {
  id: number;
  stageId: number;
  position?: number;
  proceed?: boolean;
  disqualifyReasonId?: number;
  runActions?: boolean;
}

const placementChangeStage: ActionDefinition<Input> = {
  key: "placement-change-stage",
  type: "perform",
  resource: "placement",
  title: "Change Placement Stage",
  description: "Move a candidate's placement to a different pipeline stage.",
  // `runActions: true` can trigger the offer's automated actions (an email,
  // a webhook, …) and `position` can reorder other placements in the target
  // stage — a retried call is not guaranteed to be a no-op the way a plain
  // field update would be.
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Placement ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "stageId",
      label: "Target stage ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "position",
      label: "Position",
      type: "number",
      validation: { integer: true },
      hint: "Destination slot within the stage. Omit to drop at the top.",
    },
    { key: "proceed", label: "Place at top of stage", type: "boolean" },
    {
      key: "disqualifyReasonId",
      label: "Disqualify reason ID",
      type: "number",
      validation: { integer: true },
      hint: "Set when moving into a disqualifying stage.",
    },
    {
      key: "runActions",
      label: "Run automated actions",
      type: "boolean",
      hint: "Trigger this offer's automated actions (emails, webhooks, …) for the move.",
    },
  ],
  output: [
    { key: "placement", type: "object", label: "The placement after the move" },
    {
      key: "references",
      type: "array",
      label: "Related offer/stage/candidate the response references",
    },
  ],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request(`/placements/${input.id}/change_stage`, {
      method: "PATCH",
      body: {
        stage_id: input.stageId,
        position: input.position,
        proceed: input.proceed,
        disqualify_reason_id: input.disqualifyReasonId,
        run_actions: input.runActions,
      },
    });
  },
};

export default placementChangeStage;
