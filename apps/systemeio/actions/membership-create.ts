import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  communityId: number;
  contactId: number;
}

/**
 * `POST /api/community/communities/{communityId}/memberships` — answers
 * `202 Accepted`, not `201 Created`: membership creation is processed
 * asynchronously on systeme.io's side, and the OpenAPI document declares no
 * response body schema for it (`"schema": {}`). This action therefore reports
 * only the HTTP status, and a caller that needs the resulting Membership id
 * should follow up with List Memberships filtered by `contact`.
 */
const membershipCreate: ActionDefinition<Input> = {
  key: "membership-create",
  type: "perform",
  resource: "membership",
  title: "Add Contact to Community",
  description:
    "Create a Membership resource, adding a Contact to a Community. Processed asynchronously — " +
    "the API answers 202 Accepted with no resource body.",
  idempotent: false,
  params: [
    {
      key: "communityId",
      label: "Community ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new SystemeClient(ctx).status(
      `/api/community/communities/${input.communityId}/memberships`,
      { method: "POST", body: { contactId: input.contactId } },
    );
    return { status };
  },
};

export default membershipCreate;
