import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient, toList } from "../lib/client.ts";
import { schedulerIdParam } from "../lib/params.ts";

/**
 * `DELETE /scheduler/v2/schedulers/{schedulerId}/shifts` — delete up to 20
 * shifts in one call.
 *
 * Idempotent: deleting an id that no longer exists reaches the same end
 * state a retry expects.
 */
interface Input {
  schedulerId: number;
  shiftIds: string;
  notifyUsers?: boolean;
}

const shiftDelete: ActionDefinition<Input> = {
  key: "shift-delete",
  type: "perform",
  resource: "shift",
  title: "Delete Shifts",
  description: "Delete up to 20 shifts on a schedule.",
  idempotent: true,
  params: [
    schedulerIdParam,
    {
      key: "shiftIds",
      label: "Shift IDs",
      type: "string",
      required: true,
      hint: "Comma-separated, up to 20.",
    },
    {
      key: "notifyUsers",
      label: "Notify assigned users",
      type: "boolean",
      default: true,
      hint: "Only applies to published shifts.",
    },
  ],
  output: [
    { key: "shiftsIds", type: "array", label: "Deleted shift ids" },
  ],

  execute(input, ctx) {
    const shiftsIds = toList(input.shiftIds);
    if (!shiftsIds?.length) throw new Error("At least one shift id is required");
    return new ConnecteamClient(ctx).data(
      `/scheduler/v2/schedulers/${input.schedulerId}/shifts`,
      {
        method: "DELETE",
        query: { notifyUsers: input.notifyUsers },
        body: { shiftsIds },
      },
    );
  },
};

export default shiftDelete;
