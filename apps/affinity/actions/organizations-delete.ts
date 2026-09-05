import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, type SuccessBody } from "../lib/client.ts";
import { organizationIdPathParam } from "../lib/params.ts";

/**
 * `DELETE /organizations/{organization_id}`. Also deletes the organization's
 * field values. A global organization cannot be deleted — Affinity returns
 * an error for that case.
 */
interface Input {
  organizationId: number;
}

const organizationsDelete: ActionDefinition<Input> = {
  key: "organizations-delete",
  type: "perform",
  resource: "organization",
  title: "Delete Organization",
  description: "Delete an organization and its field values. Cannot delete a global organization.",
  idempotent: true,
  params: [organizationIdPathParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx): Promise<SuccessBody> {
    return new AffinityClient(ctx).delete(`/organizations/${input.organizationId}`);
  },
};

export default organizationsDelete;
