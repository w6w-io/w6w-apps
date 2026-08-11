import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v3.3/transactional/smartEmail/{smartEmailID}` — one smart email's
 * definition.
 *
 * The field to read before automating a send is
 * `Properties.Content.EmailVariables`: it lists exactly the variable names the
 * template references, which is what `smart-email-send` merges its `Data` object
 * into. Sending a key the template does not use is silently ignored; omitting
 * one it does use renders empty.
 *
 * Two documented quirks:
 *
 *  - If the content is managed in Campaign Monitor's Email Builder, `Html` is
 *    the literal string `"Content managed in Email Builder"` rather than markup.
 *  - `AddRecipientsToList` here is a **list ID string** — the list recipients get
 *    added to — whereas the same-named field on the *send* endpoint is a
 *    **boolean** deciding whether to do it. Same name, different type, one
 *    endpoint apart.
 *
 * No extension on the path and camelCase segments; see `smart-email-list`.
 */
interface Input {
  smartEmailId: string;
}

interface SmartEmail {
  SmartEmailID: string;
  Name: string;
  Status: string;
  CreatedAt: string;
  Properties?: Record<string, unknown>;
  AddRecipientsToList?: string;
}

const smartEmailGet: ActionDefinition<Input, SmartEmail> = {
  key: "smart-email-get",
  type: "read",
  resource: "transactional",
  title: "Get Smart Transactional Email",
  description:
    "Read a smart transactional email's sender details, subject, content and — most usefully — " +
    "the list of email variables its template expects.",
  params: [
    {
      key: "smartEmailId",
      label: "Smart email",
      type: "string",
      required: true,
      placeholder: "c475db61-665e-11eb-b2b7-51b1f4471faa",
      hint: "A GUID, from List Smart Transactional Emails. Unknown IDs answer code 926.",
    },
  ],
  output: [
    { key: "SmartEmailID", type: "string", label: "Smart email ID" },
    { key: "Name", type: "string", label: "Name" },
    { key: "Status", type: "string", label: "Active | Draft" },
    {
      key: "Properties",
      type: "object",
      label: "From, ReplyTo, Subject, Content (incl. EmailVariables) and preview URLs",
    },
    {
      key: "AddRecipientsToList",
      type: "string",
      label: "List ID recipients are added to (a list ID here, a boolean on send)",
    },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).transactional<SmartEmail>(
      `/smartEmail/${encodeId(input.smartEmailId)}`,
    );
  },
};

export default smartEmailGet;
