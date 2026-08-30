import type { ActionDefinition } from "@w6w/types";
import { ADDRESS_FIELDS, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
}

const QUERY = `
  query GetBusiness($id: ID!) {
    business(id: $id) {
      id
      name
      isPersonal
      organizationalType
      currency { code symbol name }
      timezone
      address { ${ADDRESS_FIELDS} }
      phone
      mobile
      tollFree
      fax
      website
      isArchived
      createdAt
      modifiedAt
    }
  }
`;

const businessGet: ActionDefinition<Input> = {
  key: "business-get",
  type: "read",
  resource: "business",
  title: "Get Business",
  description: "Retrieve a single Wave business by id.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
  ],
  output: [{ key: "business", type: "object", label: "The business" }],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<{ business: unknown }>(QUERY, {
      id: input.businessId,
    });
    return data.business;
  },
};

export default businessGet;
