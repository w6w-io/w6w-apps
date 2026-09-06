import type { ActionDefinition } from "@w6w/types";
import { FolkClient, networkPath } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
}

interface CustomField {
  id: string;
  groupId: string;
  contactType: string;
  name: string;
  type: string;
  values?: Array<{ id: string; label: string }>;
}

/** `GET /network/{networkId}/group/{groupId}/company/custom-fields` — see person-custom-fields-list. */
const companyCustomFieldsList: ActionDefinition<Input> = {
  key: "company-custom-fields-list",
  type: "read",
  resource: "company",
  title: "List Company Custom Fields",
  description: "List the custom fields available for companies in a group.",
  params: [groupIdParam],
  output: [{ key: "customFields", type: "array", label: "Custom fields" }],

  async execute(input, ctx) {
    const customFields = await new FolkClient(ctx).request<CustomField[]>(
      networkPath(`/group/${encodeURIComponent(input.groupId)}/company/custom-fields`),
    );
    return { customFields };
  },
};

export default companyCustomFieldsList;
