import type { ActionDefinition } from "@w6w/types";
import { CursorClient, encodeId } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  name?: string;
  directoryGroupId?: string | null;
}

/**
 * `PATCH /teams/groups/:id` — rename a group, or attach/detach it from
 * directory (SCIM) sync.
 *
 * The doc states **only one field can be updated per request** — update both
 * `name` and `directoryGroupId` and it makes two separate calls, not one
 * combined PATCH, because the vendor documents them as mutually exclusive
 * per request. Set `directoryGroupId` to `null` to detach from directory
 * sync. Rate limited to 20 requests/minute per team.
 */
const groupUpdate: ActionDefinition<Input> = {
  key: "group-update",
  type: "perform",
  resource: "group",
  title: "Update Billing Group",
  description:
    "Update a billing group's name OR its directory group attachment — only one field may be " +
    "set per call; providing both makes two requests.",
  idempotent: true,
  params: [
    groupIdParam,
    { key: "name", label: "New name", type: "string", hint: "New name for the group." },
    {
      key: "directoryGroupId",
      label: "Directory group ID",
      type: "string",
      hint: "Directory group ID to sync with, or leave empty / null to detach from directory " +
        "sync.",
    },
  ],
  output: [
    { key: "group", type: "object", label: "The updated billing group" },
  ],

  execute(input, ctx) {
    const hasName = input.name !== undefined && input.name !== "";
    const hasDirectory = input.directoryGroupId !== undefined;
    if (hasName && hasDirectory) {
      throw new Error(
        "only one of name / directoryGroupId may be set per request — make two calls",
      );
    }
    if (!hasName && !hasDirectory) throw new Error("provide either name or directoryGroupId");

    const client = new CursorClient(ctx);
    const path = `/teams/groups/${encodeId(input.groupId)}`;
    return hasName
      ? client.patch(path, { name: input.name })
      : client.patch(path, { directoryGroupId: input.directoryGroupId });
  },
};

export default groupUpdate;
