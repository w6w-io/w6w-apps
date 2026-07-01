import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  folderId: string;
  type: "user" | "group" | "domain" | "anyone";
  role: "reader" | "commenter" | "writer" | "fileOrganizer" | "organizer" | "owner";
  emailAddress?: string;
  domain?: string;
  allowFileDiscovery?: boolean;
  sendNotificationEmail?: boolean;
  emailMessage?: string;
}

/**
 * Share a folder. Same underlying endpoint as file-share (both live at
 * `/files/{id}/permissions`), but exposed separately so the editor can group
 * it with the folder resource.
 */
const shareFolder: ActionDefinition<Input> = {
  key: "folder-share",
  type: "perform",
  resource: "folder",
  title: "Share Folder",
  description: "Create a permission (share) on a folder.",
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
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
    { key: "emailMessage", label: "Email message", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const body: Record<string, unknown> = { type: input.type, role: input.role };
    if (input.emailAddress) body.emailAddress = input.emailAddress;
    if (input.domain) body.domain = input.domain;
    if (input.allowFileDiscovery !== undefined) {
      body.allowFileDiscovery = input.allowFileDiscovery;
    }
    return client.request(`/files/${input.folderId}/permissions`, {
      method: "POST",
      body,
      query: {
        supportsAllDrives: true,
        sendNotificationEmail: input.sendNotificationEmail,
        emailMessage: input.emailMessage,
      },
    });
  },
};

export default shareFolder;
