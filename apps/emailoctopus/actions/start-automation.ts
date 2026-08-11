import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  automationId: string;
  contactId: string;
}

/**
 * `POST /automations/{automation_id}/queue` — 204, no body.
 *
 * Two preconditions the API will not tell you about until it 4xxs:
 *
 * 1. **The automation must have the "Started via API" trigger type.** An
 *    automation triggered by a form signup cannot be started this way.
 * 2. **A contact can only trigger an automation once**, unless "Allow contacts
 *    to repeat" is enabled in that automation's settings.
 *
 * `idempotent: false` because of (2): whether a retry is a no-op (409) or
 * enqueues a *second* run depends on a per-automation setting this app cannot
 * read, so the safe declaration is the pessimistic one. The v2 API exposes no
 * automation list/get endpoint, so the id has to come from the EmailOctopus UI.
 */
const startAutomation: ActionDefinition<Input> = {
  key: "start-automation",
  type: "perform",
  resource: "automation",
  title: "Start Automation for Contact",
  description:
    'Queue a contact into an automation. The automation must use the "Started via API" trigger; a contact can only be queued once unless "Allow contacts to repeat" is enabled. Returns 204 with no body.',
  idempotent: false,
  params: [
    {
      key: "automationId",
      label: "Automation ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
      hint:
        "From the automation's URL in the EmailOctopus dashboard — the v2 API has no endpoint that lists automations.",
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "The contact's UUID, as returned by the contact endpoints.",
    },
  ],
  output: [{ key: "queued", type: "boolean", label: "Always true when the call succeeded" }],

  async execute(input, ctx) {
    ctx.log("info", "queueing contact into automation", { automationId: input.automationId });
    await new EmailOctopusClient(ctx).request(
      `/automations/${seg(input.automationId)}/queue`,
      { method: "POST", body: { contact_id: input.contactId } },
    );
    return { queued: true };
  },
};

export default startAutomation;
