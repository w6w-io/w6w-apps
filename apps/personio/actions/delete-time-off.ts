import type { ActionDefinition } from "@w6w/types";
import { requestJson } from "../lib/client.ts";

/** `DELETE /company/time-offs/{id}` — deletes a day-unit absence period. */
interface Input {
  id: number;
}

interface DeleteResponse {
  data?: { message?: string };
}

const deleteTimeOff: ActionDefinition<Input, unknown> = {
  key: "delete-time-off",
  type: "perform",
  resource: "absence",
  title: "Delete Time-Off",
  description: "Delete a day-unit absence period by its id.",
  idempotent: true,
  params: [
    { key: "id", label: "Time-off ID", type: "number", required: true },
  ],
  output: [
    { key: "message", type: "string", label: "Message" },
  ],

  async execute(input, ctx) {
    const res = await requestJson<DeleteResponse>(
      ctx,
      `/company/time-offs/${encodeURIComponent(String(input.id))}`,
      { method: "DELETE" },
    );
    return { message: res.data?.message };
  },
};

export default deleteTimeOff;
