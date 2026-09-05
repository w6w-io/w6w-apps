import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, MercuryClient } from "../lib/client.ts";

/**
 * `POST /recipients` — "Add a new recipient". `operationId: createRecipient`
 * (unnamed in the summary; path is `POST /recipients`).
 *
 * Required: `name`, `emails` (array). Exactly one payment-rail info block is
 * how Mercury learns HOW to pay this recipient — `electronicRoutingInfo`
 * (ACH), `domesticWireRoutingInfo` (wire), or `checkInfo` (physical check) —
 * each with its own nested required fields (routing/account number, or a
 * mailing address for a check) that the OpenAPI document declares as
 * separate schemas, not a single discriminated shape. Rather than building
 * one narrow form per payment rail — and silently going stale the day
 * Mercury adds a fourth — each is exposed as free-form JSON here, the same
 * choice `wise`'s `recipient-create` makes for its own per-corridor
 * `details` object in this pack. `address` exists too but is documented
 * `"Deprecated. Use checkInfo instead."`, so it is not exposed.
 */
interface Input {
  name: string;
  emails: string[];
  nickname?: string;
  contactEmail?: string;
  electronicRoutingInfo?: string;
  domesticWireRoutingInfo?: string;
  checkInfo?: string;
}

const recipientCreate: ActionDefinition<Input> = {
  key: "recipient-create",
  type: "perform",
  resource: "recipient",
  title: "Add Recipient",
  description: "Add a new recipient, with exactly one payment rail: ACH, domestic wire, or check.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "emails",
      label: "Emails",
      type: "array",
      required: true,
      item: { type: "string" },
      hint: "At least one email address for the recipient.",
    },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "contactEmail", label: "Contact email", type: "string" },
    {
      key: "electronicRoutingInfo",
      label: "ACH routing info (JSON)",
      type: "json",
      advanced: true,
      hint:
        'For ACH: {"accountNumber","routingNumber","electronicAccountType":"businessChecking|businessSavings|personalChecking|personalSavings","address":{"address1","city","region","postalCode","country"}}.',
    },
    {
      key: "domesticWireRoutingInfo",
      label: "Domestic wire routing info (JSON)",
      type: "json",
      advanced: true,
      hint:
        'For a wire: {"accountNumber","routingNumber","address":{"address1","city","region","postalCode","country"}}.',
    },
    {
      key: "checkInfo",
      label: "Check mailing info (JSON)",
      type: "json",
      advanced: true,
      hint:
        'For a physical check: {"address":{"address1","city","region","postalCode","country"}}.',
    },
  ],
  output: [{ key: "recipient", type: "object", label: "Created recipient" }],

  async execute(input, ctx) {
    const recipient = await new MercuryClient(ctx).json("/recipients", {
      method: "POST",
      body: {
        name: input.name,
        emails: input.emails,
        nickname: input.nickname,
        contactEmail: input.contactEmail,
        electronicRoutingInfo: asOptionalJson(input.electronicRoutingInfo, "ACH routing info"),
        domesticWireRoutingInfo: asOptionalJson(
          input.domesticWireRoutingInfo,
          "Domestic wire routing info",
        ),
        checkInfo: asOptionalJson(input.checkInfo, "Check mailing info"),
      },
    });
    return { recipient };
  },
};

export default recipientCreate;
