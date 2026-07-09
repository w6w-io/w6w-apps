import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  fileId: string;
  /** `user`, `group`, `domain`, or `anyone`. */
  type: "user" | "group" | "domain" | "anyone";
  /** `reader`, `commenter`, `writer`, `fileOrganizer`, `organizer`, or `owner`. */
  role: "reader" | "commenter" | "writer" | "fileOrganizer" | "organizer" | "owner";
  emailAddress?: string;
  domain?: string;
  allowFileDiscovery?: boolean;
  sendNotificationEmail?: boolean;
  emailMessage?: string;
  transferOwnership?: boolean;
  moveToNewOwnersRoot?: boolean;
}

/**
 * Grant a permission on a file. Google Drive's `files.permissions` endpoint
 * accepts a single `Permission` resource per request.
 */
const shareFile: ActionDefinition<Input> = {
  key: "file-share",
  type: "perform",
  resource: "file",
  title: "Share File",
  description: "Create a permission (share) on a file.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
    {
      key: "type",
      label: "Grantee type",
      type: "select",
      required: true,
      options: [
        { value: "user", label: "User" },
        { value: "group", label: "Group" },
        { value: "domain", label: "Domain" },
        { value: "anyone", label: "Anyone" },
      ],
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { value: "reader", label: "Reader" },
        { value: "commenter", label: "Commenter" },
        { value: "writer", label: "Writer" },
        { value: "fileOrganizer", label: "File Organizer" },
        { value: "organizer", label: "Organizer" },
        { value: "owner", label: "Owner" },
      ],
    },
    { key: "emailAddress", label: "Email address", type: "string" },
    { key: "domain", label: "Domain", type: "string" },
    { key: "allowFileDiscovery", label: "Allow file discovery", type: "boolean" },
    { key: "sendNotificationEmail", label: "Send notification email", type: "boolean" },
    { key: "emailMessage", label: "Email message", type: "text" },
    { key: "transferOwnership", label: "Transfer ownership", type: "boolean" },
    { key: "moveToNewOwnersRoot", label: "Move to new owner's root", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const body: Record<string, unknown> = { type: input.type, role: input.role };
    if (input.emailAddress) body.emailAddress = input.emailAddress;
    if (input.domain) body.domain = input.domain;
    if (input.allowFileDiscovery !== undefined) {
      body.allowFileDiscovery = input.allowFileDiscovery;
    }
    return client.request(`/files/${input.fileId}/permissions`, {
      method: "POST",
      body,
      query: {
        supportsAllDrives: true,
        sendNotificationEmail: input.sendNotificationEmail,
        emailMessage: input.emailMessage,
        transferOwnership: input.transferOwnership,
        moveToNewOwnersRoot: input.moveToNewOwnersRoot,
      },
    });
  },
};

export default shareFile;
