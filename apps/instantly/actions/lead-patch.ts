import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, InstantlyClient } from "../lib/client.ts";
import { leadIdParam, type LeadProfileInput, leadProfileParams } from "../lib/params.ts";

/** `PATCH /api/v2/leads/{id}` — update a lead's profile fields. At least one field is required. */
interface Input extends LeadProfileInput {
  id: string;
}

const leadPatch: ActionDefinition<Input> = {
  key: "lead-patch",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update a lead's profile fields. Set at least one.",
  idempotent: true,
  params: [leadIdParam, ...leadProfileParams()],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    const { id, custom_variables, ...rest } = input;
    return new InstantlyClient(ctx).json(`/leads/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: {
        ...rest,
        ...(custom_variables !== undefined
          ? { custom_variables: asOptionalJson(custom_variables, "Custom variables") }
          : {}),
      },
    });
  },
};

export default leadPatch;
