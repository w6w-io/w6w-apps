import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient } from "../lib/client.ts";

interface Input {
  fromObjectType: string;
  fromObjectId: string;
  toObjectType: string;
  toObjectId: string;
}

const deleteAssociation: ActionDefinition<Input> = {
  key: "delete-association",
  type: "perform",
  resource: "association",
  title: "Delete Association",
  description: "Remove the link between two CRM records.",
  params: [
    { key: "fromObjectType", label: "From object type", type: "string", required: true },
    { key: "fromObjectId", label: "From ID", type: "string", required: true },
    { key: "toObjectType", label: "To object type", type: "string", required: true },
    { key: "toObjectId", label: "To ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    await client.request<void>(
      `/crm/v4/objects/${input.fromObjectType}/${encodeURIComponent(input.fromObjectId)}/associations/${input.toObjectType}/${encodeURIComponent(input.toObjectId)}`,
      { method: "DELETE" },
    );
    return {
      fromObjectId: input.fromObjectId,
      toObjectId: input.toObjectId,
      deleted: true,
    };
  },
};

export default deleteAssociation;
