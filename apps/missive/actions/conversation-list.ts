import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

const MAILBOX_ID_KINDS = new Set(["shared_label", "team_inbox", "team_closed", "team_all"]);

interface Input {
  mailbox: string;
  mailboxId?: string;
  limit?: number;
  until?: number;
  organization?: string;
  email?: string;
  domain?: string;
  contactOrganization?: string;
}

/**
 * `GET /v1/conversations` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Conversations,
 * 2026-08-29.
 *
 * Missive requires exactly one mailbox filter — "Omitting all of them returns
 * a 'You need to paginate at least one mailbox' error" — so `mailbox` is a
 * required select rather than a set of loose booleans. Four of its values
 * (Shared Label, Team Inbox, Team Closed, Team All) additionally need an ID,
 * collected in `mailboxId`.
 *
 * Ordered newest-to-oldest activity. To paginate, pass the previous page's
 * oldest `last_activity_at` as `until`; the last page is reached when fewer
 * conversations than `limit` come back (a page CAN return more than `limit`).
 */
const action: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "read",
  resource: "conversation",
  title: "List Conversations",
  description: "List conversations in one mailbox view (Inbox, a shared label, a team inbox, " +
    "etc.), newest activity first.",
  params: [
    {
      key: "mailbox",
      label: "Mailbox",
      type: "select",
      required: true,
      options: [
        { value: "inbox", label: "Inbox" },
        { value: "all", label: "All" },
        { value: "assigned", label: "Assigned to me" },
        { value: "closed", label: "Closed" },
        { value: "snoozed", label: "Snoozed" },
        { value: "flagged", label: "Starred" },
        { value: "trashed", label: "Trash" },
        { value: "junked", label: "Spam" },
        { value: "drafts", label: "Drafts" },
        { value: "shared_label", label: "Shared Label…" },
        { value: "team_inbox", label: "Team Inbox…" },
        { value: "team_closed", label: "Team Closed…" },
        { value: "team_all", label: "Team All…" },
      ],
    },
    {
      key: "mailboxId",
      label: "Shared Label / Team ID",
      type: "string",
      default: "",
      hint: "Required when Mailbox is Shared Label, Team Inbox, Team Closed, or Team All.",
      showIf: {
        "in": [{ var: "mailbox" }, ["shared_label", "team_inbox", "team_closed", "team_all"]],
      },
    },
    { key: "limit", label: "Limit", type: "number", default: 25, hint: "Max: 50." },
    {
      key: "until",
      label: "Until (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Use the last_activity_at of the oldest conversation from the previous page.",
    },
    {
      key: "organization",
      label: "Organization ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Filter to conversations shared with this organization. No effect combined with " +
        "Shared Label or a Team mailbox.",
    },
    {
      key: "email",
      label: "Contact Email",
      type: "string",
      default: "",
      advanced: true,
      hint: "Matches From/To/Cc/Bcc/Reply-To. Mutually exclusive with Domain and Contact " +
        "Organization.",
    },
    {
      key: "domain",
      label: "Contact Domain",
      type: "string",
      default: "",
      placeholder: "example.com",
      advanced: true,
      hint: "Mutually exclusive with Contact Email and Contact Organization.",
    },
    {
      key: "contactOrganization",
      label: "Contact Organization/Group ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Mutually exclusive with Contact Email and Domain.",
    },
  ],
  output: [
    { key: "conversations", type: "array", label: "Conversations" },
  ],

  async execute(input, ctx) {
    if (!input.mailbox) throw new Error("`mailbox` is required");
    if (MAILBOX_ID_KINDS.has(input.mailbox) && !input.mailboxId) {
      throw new Error(`\`mailboxId\` is required when mailbox is "${input.mailbox}"`);
    }
    const exclusive = [input.email, input.domain, input.contactOrganization].filter(Boolean);
    if (exclusive.length > 1) {
      throw new Error("`email`, `domain`, and `contactOrganization` are mutually exclusive");
    }

    const mailboxParam = MAILBOX_ID_KINDS.has(input.mailbox)
      ? { [input.mailbox]: input.mailboxId }
      : { [input.mailbox]: true };

    const res = await new MissiveClient(ctx).json<{ conversations: unknown[] }>("/conversations", {
      query: compact({
        ...mailboxParam,
        limit: input.limit,
        until: input.until,
        organization: input.organization,
        email: input.email,
        domain: input.domain,
        contact_organization: input.contactOrganization,
      }),
    });
    return res.conversations;
  },
};

export default action;
