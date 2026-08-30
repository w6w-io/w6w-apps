import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient, toIdList } from "../lib/client.ts";

/**
 * `DELETE /users/v1/users` — archive (or permanently delete) employees.
 *
 * `deletionType: "delete"` permanently removes up to 25 users per request and
 * cannot be undone; `"archive"` (the default and this action's default) can
 * be reversed with `user-update`'s `isArchived: false`.
 *
 * Idempotent: archiving an already-archived user, or permanently deleting a
 * user id that no longer exists, leaves the same end state a retry expects.
 */
interface Input {
  userIds: string;
  deletionType?: string;
}

const userArchive: ActionDefinition<Input> = {
  key: "user-archive",
  type: "perform",
  resource: "user",
  title: "Archive / Delete Users",
  description: "Archive employees, or permanently delete them (irreversible).",
  idempotent: true,
  params: [
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      hint: "Comma-separated numeric ids.",
    },
    {
      key: "deletionType",
      label: "Deletion type",
      type: "select",
      default: "archive",
      options: [
        { value: "archive", label: "Archive (reversible, default)" },
        { value: "delete", label: "Permanently delete (irreversible, max 25 per request)" },
      ],
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    const userIds = toIdList(input.userIds);
    if (!userIds?.length) throw new Error("At least one user id is required");
    return new ConnecteamClient(ctx).data("/users/v1/users", {
      method: "DELETE",
      query: { deletionType: input.deletionType },
      body: userIds,
    });
  },
};

export default userArchive;
