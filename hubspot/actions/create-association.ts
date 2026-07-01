import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient } from "../lib/client.ts";

interface Input {
  fromObjectType: string;
  fromObjectId: string;
  toObjectType: string;
  toObjectId: string;
  associationType?: string;
}

/**
 * Link two CRM records. Uses the v4 associations API:
 * `PUT /crm/v4/objects/{fromObjectType}/{fromId}/associations/default/{toObjectType}/{toId}`
 * The `default` label uses HubSpot's built-in association type for the pair
 * (contact↔company, deal↔contact, etc.). Pass `associationType` to swap in a
 * custom label ID.
 */
const createAssociation: ActionDefinition<Input> = {
  key: "create-association",
  type: "perform",
  resource: "association",
  title: "Create Association",
  description: "Link two CRM records (contact↔company, deal↔ticket, etc.) via the v4 associations API.",
  idempotent: true,
  params: [
    {
      key: "fromObjectType",
      label: "From object type",
      type: "select",
      required: true,
      options: [
        { value: "contacts", label: "Contact" },
        { value: "companies", label: "Company" },
        { value: "deals", label: "Deal" },
        { value: "tickets", label: "Ticket" },
      ],
    },
    { key: "fromObjectId", label: "From ID", type: "string", required: true },
    {
      key: "toObjectType",
      label: "To object type",
      type: "select",
      required: true,
      options: [
        { value: "contacts", label: "Contact" },
        { value: "companies", label: "Company" },
        { value: "deals", label: "Deal" },
        { value: "tickets", label: "Ticket" },
      ],
    },
    { key: "toObjectId", label: "To ID", type: "string", required: true },
    {
      key: "associationType",
      label: "Association label",
      type: "string",
      default: "default",
      hint: "`default` uses HubSpot's built-in association for the pair. Otherwise pass a custom label ID.",
    },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    const label = input.associationType ?? "default";
    return client.request(
      `/crm/v4/objects/${input.fromObjectType}/${encodeURIComponent(input.fromObjectId)}/associations/${label}/${input.toObjectType}/${encodeURIComponent(input.toObjectId)}`,
      { method: "PUT" },
    );
  },
};

export default createAssociation;
