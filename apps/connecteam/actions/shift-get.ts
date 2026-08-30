import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";
import { schedulerIdParam, shiftIdParam } from "../lib/params.ts";

/** `GET /scheduler/v2/schedulers/{schedulerId}/shifts/{shiftId}` — one shift. */
interface Input {
  schedulerId: number;
  shiftId: string;
}

const shiftGet: ActionDefinition<Input> = {
  key: "shift-get",
  type: "read",
  resource: "shift",
  title: "Get Shift",
  description: "Get one shift by id.",
  params: [schedulerIdParam, shiftIdParam],
  output: [
    { key: "id", type: "string", label: "Shift ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "startTime", type: "number", label: "Start time (Unix seconds)" },
    { key: "endTime", type: "number", label: "End time (Unix seconds)" },
    { key: "assignedUserIds", type: "array", label: "Assigned user ids" },
    { key: "isOpenShift", type: "boolean", label: "Is an open shift" },
    { key: "isPublished", type: "boolean", label: "Is published" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(
      `/scheduler/v2/schedulers/${input.schedulerId}/shifts/${input.shiftId}`,
    );
  },
};

export default shiftGet;
