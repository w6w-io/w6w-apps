import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import {
  asOptionalJson,
  consentToTrackParam,
  customFieldsParam,
  emailParam,
  listIdParam,
} from "../lib/params.ts";

/**
 * `POST /api/v3.3/subscribers/{listid}.json` — add (or update) one subscriber.
 * **List-level.**
 *
 * ## It is an upsert, and it is queued
 *
 * The vendor: "If the subscriber (email address) already exists, their name,
 * mobile number, and any custom field values are updated with whatever is passed
 * in. The subscriber data is then **passed into a processing queue**." So a
 * `201` here means accepted, not visible — a `subscriber-get` immediately after
 * may not find them yet. For an immediate, synchronous write use
 * `subscriber-import`, which the vendor describes as "instantaneous" and whose
 * "call will only return back once all subscribers have been added".
 *
 * That upsert semantics is why `idempotent: true`: a retry after a dropped
 * connection lands the same end state, and the follow-up/confirmation email goes
 * to "**new subscribers only**", so a retry cannot double-mail anyone.
 *
 * ## `Resubscribe` is the dangerous switch
 *
 * Off, an address that previously unsubscribed, bounced, or landed on the
 * suppression list is *refused* — codes 204, 205, 206, 207, 208, each naming
 * which. On, it is silently re-added to the active list. The vendor's own words:
 * "this method should be used with caution and only where suitable." It defaults
 * off here, matching the API.
 *
 * `RestartSubscriptionBasedAutoresponders` only affects resubscribes, and only
 * decides whether automated sequences start over; remaining emails are sent
 * either way.
 *
 * ## Date custom fields
 *
 * Values must fall between 1900/01/01 and 2076/06/06 or they are **silently
 * ignored** — no error. Use `yyyy/mm/dd`; `dd/mm/yyyy` and `mm/dd/yyyy` are
 * ambiguous and the vendor says so.
 *
 * The response is the added address as a **bare JSON string**, which is wrapped
 * into an object here.
 */
interface Input {
  listId: string;
  email: string;
  name?: string;
  mobileNumber?: string;
  customFields?: unknown;
  consentToTrack: string;
  consentToSendSms?: string;
  resubscribe?: boolean;
  restartSubscriptionBasedAutoresponders?: boolean;
}

const subscriberAdd: ActionDefinition<Input, { EmailAddress: string }> = {
  key: "subscriber-add",
  type: "perform",
  resource: "subscriber",
  title: "Add Subscriber",
  description:
    "Add a subscriber to a list, updating them if the address already exists. The write is " +
    "queued, not immediate — use Import Subscribers when the result must be readable straight " +
    "away.",
  idempotent: true,
  params: [
    listIdParam,
    emailParam,
    { key: "name", label: "Name", type: "string" },
    {
      key: "mobileNumber",
      label: "Mobile number",
      type: "string",
      placeholder: "+5012398752",
      hint:
        "E.164, including the + and country code (error 220 otherwise). Send an empty string to " +
        "clear a stored number; omit the field to leave it unchanged.",
    },
    customFieldsParam,
    consentToTrackParam,
    {
      key: "consentToSendSms",
      label: "Consent to send SMS",
      type: "select",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
        { value: "Unchanged", label: "Unchanged — same as omitting it" },
      ],
      hint: "Only recorded when a mobile number is also supplied.",
    },
    {
      key: "resubscribe",
      label: "Resubscribe",
      type: "boolean",
      hint:
        "Off by default, matching the API. Off, a previously unsubscribed, bounced or suppressed " +
        "address is refused with code 204/205/206/207/208. On, it is re-added to the active " +
        "list — use with caution.",
    },
    {
      key: "restartSubscriptionBasedAutoresponders",
      label: "Restart automated sequences on resubscribe",
      type: "boolean",
      hint: "Only affects resubscribing subscribers. Off (the default), they receive remaining " +
        "emails but sequences do not start over.",
    },
  ],
  output: [{ key: "EmailAddress", type: "string", label: "Address that was added" }],

  async execute(input, ctx) {
    const customFields = asOptionalJson<Array<Record<string, unknown>>>(
      input.customFields,
      "Custom fields",
    );
    // The endpoint answers a bare JSON string with the address.
    const email = await new CampaignMonitorClient(ctx).json<string>(
      `/subscribers/${encodeId(input.listId)}`,
      {
        method: "POST",
        body: {
          EmailAddress: input.email,
          Name: input.name,
          MobileNumber: input.mobileNumber,
          CustomFields: customFields,
          ConsentToTrack: input.consentToTrack,
          ConsentToSendSms: input.consentToSendSms,
          Resubscribe: input.resubscribe ?? false,
          RestartSubscriptionBasedAutoresponders: input.restartSubscriptionBasedAutoresponders ??
            false,
        },
      },
    );
    return { EmailAddress: email ?? input.email };
  },
};

export default subscriberAdd;
