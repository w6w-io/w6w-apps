import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, requireItemPath } from "../lib/client.ts";
import { driveIdParam, itemParams, listOutput } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  recipients: string[];
  roles?: string[];
  sendInvitation?: boolean;
  requireSignIn?: boolean;
  message?: string;
  expirationDateTime?: string;
  retainInheritedPermissions?: boolean;
}

interface Permission {
  id?: string;
  roles?: string[];
  [k: string]: unknown;
}

/**
 * `POST /me/drive/items/{item-id}/invite`
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-invite
 *
 * Grants named people access to an item, optionally emailing them about it.
 * Three details that decide how this behaves:
 *
 *  - **`sendInvitation` controls the email, not the grant.** "If true, a sharing
 *    link is sent to the recipient. Otherwise, a permission is granted directly
 *    without sending a notification." Turning it off is how you wire this into a
 *    workflow that sends its own message.
 *  - **Partial success is a real outcome.** Inviting several people can succeed
 *    for some and fail for others, and Graph answers **`207 Multi-Status`** with
 *    a per-recipient `error` object. `207` is a 2xx, so it is *not* thrown: the
 *    returned permissions are handed back for the caller to inspect.
 *  - **`message` is capped at 2,000 characters** and is plain text.
 *
 * `recipients` are email addresses, sent as `[{ "email": "…" }]` driveRecipient
 * objects. `expirationDateTime` is documented as applying to sharingLink
 * permissions on business drives, and to premium personal accounts.
 *
 * Least privileged delegated permission: `Files.ReadWrite`.
 */
const sendSharingInvite: ActionDefinition<Input, unknown> = {
  key: "send-sharing-invite",
  type: "perform",
  resource: "permission",
  title: "Send Sharing Invite",
  description:
    "Grant named people access to a file or folder, with or without emailing them an invitation.",
  // With `sendInvitation` on, every run sends another email. Graph exposes no
  // dedupe key, so this cannot be claimed safe to retry.
  idempotent: false,
  params: [
    driveIdParam,
    ...itemParams(),
    {
      key: "recipients",
      label: "Recipients",
      type: "string",
      repeat: true,
      required: true,
      placeholder: "someone@example.com",
      hint: "Email addresses. Sent as `driveRecipient` objects.",
    },
    {
      key: "roles",
      label: "Roles",
      type: "multiselect",
      default: ["read"],
      options: [
        { value: "read", label: "Read" },
        { value: "write", label: "Write" },
      ],
      hint: "The access granted to every recipient in this call.",
    },
    {
      key: "sendInvitation",
      label: "Email an invitation",
      type: "boolean",
      default: true,
      hint:
        "On, Graph emails each recipient a link. Off, the permission is granted silently — use that when the workflow sends its own notification.",
    },
    {
      key: "requireSignIn",
      label: "Require sign-in",
      type: "boolean",
      default: true,
      hint: "Recipients must sign in to open the item.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      advanced: true,
      validation: { maxLength: 2000 },
      hint: "Plain text included in the invitation. Maximum 2,000 characters.",
    },
    {
      key: "expirationDateTime",
      label: "Access expires at",
      type: "datetime",
      advanced: true,
      hint:
        "ISO 8601. On OneDrive for Business and SharePoint this applies to sharingLink permissions; on personal accounts it needs a premium plan.",
    },
    {
      key: "retainInheritedPermissions",
      label: "Retain inherited permissions",
      type: "boolean",
      default: true,
      advanced: true,
      hint:
        "Graph's default is `true`. Setting it `false` removes every existing permission the first time this item is shared.",
    },
  ],
  output: listOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    const recipients = (input.recipients ?? [])
      .map((r) => (r ?? "").trim())
      .filter(Boolean)
      .map((email) => ({ email }));
    if (!recipients.length) throw new Error("At least one recipient email is required.");

    // 207 Multi-Status is a success as far as `res.ok` is concerned, so a
    // partial failure comes back as data rather than as a thrown error.
    const body = await client.request<{ value?: Permission[] }>(
      requireItemPath(input, "/invite"),
      {
        method: "POST",
        body: compact({
          recipients,
          roles: input.roles?.length ? input.roles : ["read"],
          sendInvitation: input.sendInvitation !== false,
          requireSignIn: input.requireSignIn !== false,
          message: input.message || undefined,
          expirationDateTime: input.expirationDateTime || undefined,
          retainInheritedPermissions: input.retainInheritedPermissions === false
            ? false
            : undefined,
        }),
      },
    );
    return { value: body?.value ?? [], pages: 1 };
  },
};

export default sendSharingInvite;
