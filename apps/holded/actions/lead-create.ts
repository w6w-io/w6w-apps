import type { ActionDefinition } from "@w6w/types";
import { compact, HoldedClient } from "../lib/client.ts";

/**
 * `POST /leads` — create a new lead (opportunity) in a funnel.
 *
 * None of the request fields is marked `required` in Holded's own spec, but a
 * lead with no `funnelId` has nowhere to appear in the CRM UI, so it is
 * treated as effectively required here. `contactId` links to an existing
 * Holded contact; `contactName` is a free-text label used when there is no
 * linked contact (or alongside one, as a display override).
 *
 * Not idempotent: Holded issues a fresh id on every call and documents no
 * idempotency key, so a retry creates a second lead.
 */
interface Input {
  funnelId: string;
  contactId?: string;
  contactName?: string;
  name?: string;
  value?: number;
  potential?: number;
  dueDate?: number;
  stageId?: string;
}

const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a new lead in a funnel.",
  idempotent: false,
  params: [
    {
      key: "funnelId",
      label: "Funnel ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Funnels result.",
    },
    { key: "contactId", label: "Contact ID", type: "string", hint: "An existing Holded contact." },
    { key: "contactName", label: "Contact name", type: "string" },
    { key: "name", label: "Lead name", type: "string" },
    { key: "value", label: "Monetary value", type: "number" },
    { key: "potential", label: "Win potential", type: "number" },
    { key: "dueDate", label: "Due date", type: "number", hint: "Unix timestamp." },
    {
      key: "stageId",
      label: "Stage",
      type: "string",
      hint: "Stage id or exact stage name from the funnel. If a name matches more than one " +
        "stage, Holded picks the oldest one created. Defaults to the funnel's first stage.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "New lead ID" },
  ],

  execute(input, ctx) {
    const body = compact({
      funnelId: input.funnelId,
      contactId: input.contactId,
      contactName: input.contactName,
      name: input.name,
      value: input.value,
      potential: input.potential,
      dueDate: input.dueDate,
      stageId: input.stageId,
    });
    return new HoldedClient(ctx).write("/leads", "POST", body);
  },
};

export default leadCreate;
