import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexLegalEntity, encodeId } from "../lib/client.ts";
import { legalEntityIdParam } from "../lib/params.ts";

/**
 * `GET /v2/legal_entities/{id}` — one legal entity by id.
 *
 * A user record carries `legal_entity_id` and nothing else about the entity; this
 * resolves it to the display name, verification status and registered address.
 * Field names are camelCase here, as on the list endpoint.
 */
interface Input {
  id: string;
}

const legalEntityGet: ActionDefinition<Input> = {
  key: "legal-entity-get",
  type: "read",
  resource: "legal-entity",
  title: "Get Legal Entity",
  description: "Fetch one Brex legal entity by id.",
  params: [legalEntityIdParam],
  output: [
    { key: "id", type: "string", label: "Legal entity id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "billingAddress", type: "object", label: "Registered business address" },
    { key: "createdAt", type: "string", label: "Created at, in UTC" },
    {
      key: "status",
      type: "string",
      label: "Verification — UNSUBMITTED, UNVERIFIED, IN_PROGRESS, VERIFIED or REJECTED",
    },
    { key: "isDefault", type: "boolean", label: "Whether this is the account's default entity" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexLegalEntity>(`/legal_entities/${encodeId(input.id)}`);
  },
};

export default legalEntityGet;
