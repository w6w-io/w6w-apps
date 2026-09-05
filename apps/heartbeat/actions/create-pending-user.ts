import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";

/**
 * `PUT /v0/pendingUser` — seat a member before they ever log in.
 *
 * Heartbeat documents that a pending user does not exist as a real member
 * until their first login; calling this again for the same pending email
 * *updates* the pending record rather than erroring, but calling it for a
 * user who already fully exists returns an error. That mixed behaviour is why
 * this is marked non-idempotent — a retry after a first attempt actually
 * landed could hit the "already a real user" error path instead of a clean
 * no-op.
 */
interface Input {
  email: string;
  name: string;
  roleID: string;
  groupIDs?: string[] | string;
  bio?: string;
}

const createPendingUser: ActionDefinition<Input> = {
  key: "create-pending-user",
  type: "perform",
  resource: "user",
  title: "Create Pending User",
  description:
    "Seat a member before they ever log in. On their first login they become a real member with " +
    "these attributes. Calling this again for the same still-pending email updates it instead of " +
    "erroring; calling it for an email that is already a real member returns an error.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "name", label: "Full name", type: "string", required: true },
    { key: "roleID", label: "Role ID", type: "string", required: true },
    { key: "groupIDs", label: "Group IDs", type: "multiselect" },
    { key: "bio", label: "Bio", type: "text" },
  ],
  output: [{
    key: "success",
    type: "boolean",
    label: "Whether the pending user was created/updated",
  }],

  execute(input, ctx) {
    const groupIDs = Array.isArray(input.groupIDs)
      ? input.groupIDs
      : input.groupIDs
      ? input.groupIDs.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return new HeartbeatClient(ctx).json("/pendingUser", {
      method: "PUT",
      body: compact({
        email: input.email,
        name: input.name,
        roleID: input.roleID,
        groupIDs,
        bio: input.bio,
      }),
    });
  },
};

export default createPendingUser;
