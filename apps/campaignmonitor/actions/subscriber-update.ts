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
 * `PUT /api/v3.3/subscribers/{listid}.json?email={email}` — update an existing
 * subscriber. **List-level.**
 *
 * ## The email in the query string is the OLD address
 *
 * The vendor states it twice, and it is the single most common way this call
 * goes wrong: `?email=` identifies *who to update*; `EmailAddress` in the body
 * is *what to change it to*. Pass the new address in both and you get code 203,
 * "Subscriber Not In List" — or, if the new address happens to exist, you
 * silently edit the wrong person.
 *
 * Unlike `subscriber-add`, this never creates: "if the subscriber does not
 * exist, a new one will not be added."
 *
 * ## Multi-Valued Select Many custom fields replace, they do not merge
 *
 * For every other field type a missing value is left unchanged. For
 * MultiSelectMany the vendor is explicit: "all options that are selected for
 * that customer need to be passed through each time an update is made. If you do
 * not pass through all the options that you wish to have selected … all
 * historically selected options will be replaced with what's included in your
 * most recent call." Send several array entries with the same `Key` to select
 * several options.
 *
 * To clear a value, send `{"Key": …, "Value": "", "Clear": true}`; for a
 * MultiSelectMany, a `Value` naming one option removes just that option and an
 * empty `Value` removes them all.
 *
 * `idempotent: true` — an update is a set, not an increment; applying it twice
 * lands the same state. Any registered Update webhooks fire on each call,
 * including for inactive subscribers.
 */
interface Input {
  listId: string;
  email: string;
  newEmail?: string;
  name?: string;
  mobileNumber?: string;
  customFields?: unknown;
  consentToTrack: string;
  consentToSendSms?: string;
  resubscribe?: boolean;
  restartSubscriptionBasedAutoresponders?: boolean;
}

const subscriberUpdate: ActionDefinition<Input, { EmailAddress: string }> = {
  key: "subscriber-update",
  type: "perform",
  resource: "subscriber",
  title: "Update Subscriber",
  description:
    "Update an existing subscriber's name, address, mobile number and custom fields. Never " +
    "creates: an unknown address fails with code 203.",
  idempotent: true,
  params: [
    listIdParam,
    {
      ...emailParam,
      label: "Current email address",
      hint: "The address the subscriber has NOW. This is how they are found, not what they become.",
    },
    {
      key: "newEmail",
      label: "New email address",
      type: "string",
      hint: "Leave empty to keep the current address. Set it only when you mean to change the " +
        "address; it fails with code 201 if the new address is already on the list.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "mobileNumber",
      label: "Mobile number",
      type: "string",
      placeholder: "+5012398752",
      hint:
        "E.164 with the + and country code. Empty string clears a stored number; omitting the " +
        "field leaves it unchanged.",
    },
    {
      ...customFieldsParam,
      hint:
        "Array of {Key, Value} objects. Missing fields are left unchanged EXCEPT Multi-Valued " +
        "Select Many, which is replaced wholesale by whatever you send — pass every option you " +
        'want selected, every time. Add "Clear": true to erase a value.',
    },
    consentToTrackParam,
    {
      key: "consentToSendSms",
      label: "Consent to send SMS",
      type: "select",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
        { value: "Unchanged", label: "Unchanged — leaves the existing preference alone" },
      ],
    },
    {
      key: "resubscribe",
      label: "Resubscribe",
      type: "boolean",
      hint: "Off by default. Inactive subscribers are not reactivated unless this is on.",
    },
    {
      key: "restartSubscriptionBasedAutoresponders",
      label: "Restart automated sequences on resubscribe",
      type: "boolean",
    },
  ],
  output: [{ key: "EmailAddress", type: "string", label: "Address the subscriber now has" }],

  async execute(input, ctx) {
    const customFields = asOptionalJson<Array<Record<string, unknown>>>(
      input.customFields,
      "Custom fields",
    );
    await new CampaignMonitorClient(ctx).json(
      `/subscribers/${encodeId(input.listId)}`,
      {
        method: "PUT",
        // The query carries the OLD address; the body carries the new one.
        query: { email: input.email },
        body: {
          EmailAddress: input.newEmail && input.newEmail !== "" ? input.newEmail : input.email,
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
    // A bare 200 with no body, so the address is echoed from the input.
    return { EmailAddress: input.newEmail && input.newEmail !== "" ? input.newEmail : input.email };
  },
};

export default subscriberUpdate;
