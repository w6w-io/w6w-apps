import type { ActionDefinition } from "@w6w/types";
import { HunterClient } from "../lib/client.ts";

/**
 * `PUT /v2/leads_lists/{id}` — rename a leads list and/or move it into a
 * folder. Free. Answers `204 No Content`. Idempotent.
 *
 * `leadsListFolderId` is a genuine three-state field: unset here means
 * "leave the folder alone", while an explicit `null` means "remove the list
 * from its folder" — so the folder id is sent verbatim rather than dropped by
 * the usual `compact()` helper, which would otherwise make `null` and
 * "unset" indistinguishable.
 */
interface Input {
  id: number;
  name: string;
  leadsListFolderId?: number | null;
}

const leadsListUpdate: ActionDefinition<Input> = {
  key: "leads-list-update",
  type: "perform",
  resource: "leads-list",
  title: "Update Leads List",
  description: "Rename a leads list and/or move it into a folder. Free.",
  idempotent: true,
  params: [
    { key: "id", label: "Leads list ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "leadsListFolderId",
      label: "Folder ID",
      type: "number",
      hint: "Leave empty to leave the folder unchanged. Pass an explicit null to remove the list " +
        "from its current folder.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const body: Record<string, unknown> = { name: input.name };
    if ("leadsListFolderId" in input && input.leadsListFolderId !== undefined) {
      body.leads_list_folder_id = input.leadsListFolderId;
    }
    return new HunterClient(ctx).request(
      `/leads_lists/${encodeURIComponent(String(input.id))}`,
      { method: "PUT", body },
    );
  },
};

export default leadsListUpdate;
