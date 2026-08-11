import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient } from "../lib/client.ts";

/**
 * `GET /api/v3.3/transactional/smartEmail` — the client's smart transactional
 * emails.
 *
 * ## `/transactional` is a different API wearing the same hostname
 *
 * Note what is missing from that path: **no `.json` extension**. The vendor:
 * "Unlike the rest of our API, all /transactional endpoints support only JSON
 * and are subject to rate limiting." The segments are camelCase (`smartEmail`,
 * not `smartemail`), the query parameter is `clientID` with a capital D — and
 * appending `.json` the way every other endpoint requires produces a 404. That
 * asymmetry is handled once, in `CampaignMonitorClient.transactional`.
 *
 * ## `clientID` is optional, and whether you need it depends on your credential
 *
 * The vendor's note, repeated on every transactional endpoint: "if you are using
 * an **account** API key or OAuth, this is required as you need to specify the
 * client. This is not necessary if you use a **client-specific** API key."
 * Nothing in a stored credential says which kind it is, so this app cannot
 * decide for you — hence an optional param with the rule spelled out at the
 * field rather than a guess in code.
 *
 * A `Status` filter of `all`, `draft` or `active`; anything else is code 932.
 */
interface Input {
  status?: string;
  clientId?: string;
}

interface SmartEmailSummary {
  ID: string;
  Name: string;
  CreatedAt: string;
  Status: string;
}

const smartEmailList: ActionDefinition<Input, SmartEmailSummary[]> = {
  key: "smart-email-list",
  type: "search",
  resource: "transactional",
  title: "List Smart Transactional Emails",
  description:
    "List the smart transactional emails defined in Campaign Monitor, optionally filtered to " +
    "drafts or active ones.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All (the API default)" },
        { value: "active", label: "Active" },
        { value: "draft", label: "Draft" },
      ],
      hint: "Anything outside these three is rejected with code 932.",
    },
    {
      key: "clientId",
      label: "Client",
      type: "string",
      placeholder: "4a397ccaaa55eb4e6aa1221e1e2d7122",
      hint:
        "REQUIRED if your connection uses an account-wide key or OAuth; leave empty if it uses a " +
        "client-specific key, which already identifies the client.",
    },
  ],
  output: [
    { key: "ID", type: "string", label: "Smart email ID" },
    { key: "Name", type: "string", label: "Name" },
    { key: "CreatedAt", type: "string", label: "Created at (ISO 8601 with offset)" },
    { key: "Status", type: "string", label: "Active | Draft" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).transactional<SmartEmailSummary[]>("/smartEmail", {
      query: { status: input.status, clientID: input.clientId },
    });
  },
};

export default smartEmailList;
