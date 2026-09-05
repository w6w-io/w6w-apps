import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";

/**
 * `PUT /v0/users` — create a member directly (skips the invitation flow).
 *
 * Heartbeat's OpenAPI document declares a `200` response for this endpoint
 * with no schema at all — unlike `createThread`/`createComment`/
 * `createInvitation`, which document the created object. Whatever body (if
 * any) actually comes back is passed through unshaped rather than mapped to
 * named fields this app cannot confirm.
 */
interface Input {
  email: string;
  name: string;
  roleID: string;
  groupIDs?: string[] | string;
  bio?: string;
  status?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  createIntroductionThread?: boolean;
}

const createUser: ActionDefinition<Input> = {
  key: "create-user",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a new member in the community directly (no invitation email is required).",
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "Must be unique to the community.",
    },
    { key: "name", label: "Full name", type: "string", required: true },
    { key: "roleID", label: "Role ID", type: "string", required: true },
    {
      key: "groupIDs",
      label: "Group IDs",
      type: "multiselect",
      hint: "Groups the new member should belong to.",
    },
    { key: "bio", label: "Bio", type: "text" },
    { key: "status", label: "Status", type: "string" },
    { key: "linkedin", label: "LinkedIn URL", type: "string" },
    { key: "twitter", label: "Twitter/X URL", type: "string" },
    { key: "instagram", label: "Instagram URL", type: "string" },
    {
      key: "createIntroductionThread",
      label: "Post an introduction thread",
      type: "boolean",
      hint:
        "Only takes effect if Bio is also set. Posts to the channel your community designates " +
        "for introductions.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const groupIDs = Array.isArray(input.groupIDs)
      ? input.groupIDs
      : input.groupIDs
      ? input.groupIDs.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return new HeartbeatClient(ctx).json("/users", {
      method: "PUT",
      body: compact({
        email: input.email,
        name: input.name,
        roleID: input.roleID,
        groupIDs,
        bio: input.bio,
        status: input.status,
        linkedin: input.linkedin,
        twitter: input.twitter,
        instagram: input.instagram,
        createIntroductionThread: input.createIntroductionThread,
      }),
    });
  },
};

export default createUser;
