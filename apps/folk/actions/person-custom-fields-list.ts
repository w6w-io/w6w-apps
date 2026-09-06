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

/**
 * `GET /network/{networkId}/group/{groupId}/person/custom-fields` — the
 * field names/ids to use as `person-create`/`person-update`'s `customFields`
 * keys, and (for `singleSelect`/`multipleSelect` fields) the exact option
 * labels those calls accept as values. Not paginated.
 */
const personCustomFieldsList: ActionDefinition<Input> = {
  key: "person-custom-fields-list",
  type: "read",
  resource: "person",
  title: "List Person Custom Fields",
  description: "List the custom fields available for people in a group.",
  params: [groupIdParam],
  output: [{ key: "customFields", type: "array", label: "Custom fields" }],

  async execute(input, ctx) {
    const customFields = await new FolkClient(ctx).request<CustomField[]>(
      networkPath(`/group/${encodeURIComponent(input.groupId)}/person/custom-fields`),
    );
    return { customFields };
  },
};

export default personCustomFieldsList;
