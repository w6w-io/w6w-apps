import type { ActionDefinition } from "@w6w/types";
import { compact, ReplyClient } from "../lib/client.ts";

/**
 * `POST /v3/sequences` — create a sequence to send from. Only `name` is
 * required; omit `scheduleId` to fall back to the account's default schedule.
 * Requires `sequences:write`.
 *
 * Not idempotent: each call creates a new sequence with a new id.
 *
 * **`settings` is deliberately not exposed here.** The OpenAPI schema marks it
 * optional at the top level, but the moment it is included at all, 7 of its
 * fields (`emailsCountPerDay`, `daysToFinishProspect`,
 * `emailSendingDelaySeconds`, `dailyThrottling`, `disableOpensTracking`,
 * `repliesHandlingType`, `enableLinksTracking`) become required together — a
 * partial settings object is a 400, not a merge with Reply's defaults. Omitting
 * `settings` entirely (as this action does) is the one call shape guaranteed
 * to be valid, and it takes Reply's own defaults.
 */
interface Input {
  name: string;
  scheduleId?: number;
}

const sequenceCreate: ActionDefinition<Input> = {
  key: "sequence-create",
  type: "perform",
  resource: "sequence",
  title: "Create Sequence",
  description: "Create a sequence to send from, using Reply's default settings. Steps are added " +
    "separately once the sequence exists.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "scheduleId",
      label: "Schedule ID",
      type: "number",
      hint: "Omit to use the account's default schedule.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Sequence ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "new | active | paused" },
  ],

  execute(input, ctx) {
    const body = compact({ name: input.name, scheduleId: input.scheduleId });
    return new ReplyClient(ctx).json("/sequences", { method: "POST", body });
  },
};

export default sequenceCreate;
