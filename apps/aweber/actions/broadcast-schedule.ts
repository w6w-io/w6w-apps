import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, broadcastIdParam, listIdParam } from "../lib/params.ts";

/**
 * `POST /accounts/{accountId}/lists/{listId}/broadcasts/{broadcastId}/schedule`
 * — schedule a draft broadcast to send at a given time. Answers `200` with
 * just `{"self_link": "..."}`.
 */
interface Input {
  accountId: string;
  listId: string;
  broadcastId: string;
  scheduledFor: string;
}

const broadcastSchedule: ActionDefinition<Input> = {
  key: "broadcast-schedule",
  type: "perform",
  resource: "broadcast",
  title: "Schedule Broadcast",
  description: "Schedule a draft broadcast to send at a given ISO-8601 time.",
  idempotent: true,
  params: [
    accountIdParam,
    listIdParam,
    broadcastIdParam,
    {
      key: "scheduledFor",
      label: "Scheduled for",
      type: "datetime",
      required: true,
      hint: "ISO-8601 formatted, e.g. 2017-07-18T16:53:02-04:00.",
    },
  ],
  output: [{ key: "self_link", type: "string", label: "Broadcast URL" }],

  execute(input, ctx) {
    const { accountId, listId, broadcastId } = input;
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/broadcasts/${
        encodeId(broadcastId)
      }/schedule`,
      { method: "POST", body: { scheduled_for: input.scheduledFor } },
    );
  },
};

export default broadcastSchedule;
