import type { ActionDefinition } from "@w6w/types";
import { type Product, PRODUCT_OPTIONS, WebinarJamClient } from "../lib/client.ts";

/**
 * `POST /{product}/register` — register a person for a webinar. Verified
 * against WebinarJam (article 15370151) and EverWebinar (15370156): identical
 * required/optional fields and response shape both times.
 *
 * `webinarId` and `schedule` must come from a prior `webinar-get` call — the
 * docs are explicit that the schedule ID is API-generated and does not match
 * the one shown in the dashboard's Schedules tab. For a "Series of
 * presentations" webinar, register the person **once**, against the first
 * schedule only: "The API will auto-register that person to all the following
 * schedules within the series."
 *
 * `timezoneId` only matters for Texas, USA registrants (`2` = Mountain Time,
 * `3` = Central Time) — the docs don't explain why Texas specifically, only
 * that it is required there.
 *
 * ## Custom registration fields
 *
 * A webinar's own custom registration questions are not fixed fields — per
 * "Pass custom field values in the registration API" (article 15370148), each
 * one is addressed by its configured LABEL as an arbitrary form field name
 * (a Dropdown's value is one or more OPTION IDs, e.g. `["id_1","id_2"]`; a
 * Text field's value is the raw text). Those labels are per-webinar and
 * unknowable ahead of time, so `customFields` is a passthrough `json` param
 * (object of label -> string | string[]) merged directly into the form body,
 * rather than this action inventing a fixed field for something the vendor
 * itself keys by user-configured label.
 */
interface RegisterResult {
  webinar_id?: number;
  webinar_hash?: string;
  user_id?: number;
  first_name?: string;
  last_name?: string;
  phone_country_code?: string;
  phone?: string;
  email?: string;
  password?: string | null;
  schedule?: number | string;
  date?: string;
  timezone?: string;
  live_room_url?: string;
  replay_room_url?: string;
  thank_you_url?: string;
}

interface Response {
  status?: string;
  user?: RegisterResult;
}

interface Input {
  product: Product;
  webinarId: number;
  schedule: number;
  firstName: string;
  lastName?: string;
  email: string;
  country?: string;
  state?: string;
  timezoneId?: number;
  ipAddress?: string;
  phoneCountryCode?: string;
  phone?: string;
  twilioConsent?: boolean;
  customFields?: Record<string, string | string[]>;
}

const registrantCreate: ActionDefinition<Input> = {
  key: "registrant-create",
  type: "perform",
  resource: "registrant",
  title: "Register Attendee",
  description: "Register a person for a specific webinar schedule.",
  // Registering the same person twice is not documented as safe — there is no
  // idempotency key on this endpoint, and the vendor's own docs treat a
  // repeat registration to a series as the mechanism that auto-enrolls every
  // later session, so retrying blind is not obviously a no-op.
  idempotent: false,
  params: [
    {
      key: "product",
      label: "Product",
      type: "select",
      required: true,
      default: "webinarjam",
      options: PRODUCT_OPTIONS,
    },
    {
      key: "webinarId",
      label: "Webinar ID",
      type: "number",
      required: true,
      hint: "From a prior Get Webinar call.",
    },
    {
      key: "schedule",
      label: "Schedule ID",
      type: "number",
      required: true,
      hint:
        "The API-generated schedule ID from Get Webinar — NOT the id shown in the dashboard's " +
        "Schedules tab. For a series, register once against the first schedule only.",
    },
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "country", label: "Country", type: "string", advanced: true },
    { key: "state", label: "State / province", type: "string", advanced: true },
    {
      key: "timezoneId",
      label: "Timezone ID",
      type: "number",
      advanced: true,
      hint: "Required only for registrants in Texas, USA: 2 = Mountain Time, 3 = Central Time.",
    },
    { key: "ipAddress", label: "IP address", type: "string", advanced: true },
    {
      key: "phoneCountryCode",
      label: "Phone country code",
      type: "string",
      advanced: true,
      placeholder: "+1",
    },
    { key: "phone", label: "Phone (digits only)", type: "string", advanced: true },
    {
      key: "twilioConsent",
      label: "Consented to SMS (Twilio)",
      type: "boolean",
      advanced: true,
      hint: "Required if the webinar has the phone number field enabled.",
    },
    {
      key: "customFields",
      label: "Custom registration fields",
      type: "json",
      advanced: true,
      hint: "Object keyed by the field's configured LABEL (from Get Webinar), e.g. " +
        '{"company": "Acme"} for a text field or {"whereDidYouHearAboutUs": ["id_1"]} for a ' +
        "Dropdown's selected option id(s). See this app's README.",
    },
  ],
  output: [
    { key: "user", type: "object", label: "Registered attendee" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarJamClient(ctx).request<Response>(input.product, "/register", {
      webinar_id: input.webinarId,
      schedule: input.schedule,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      country: input.country,
      state: input.state,
      timezone_id: input.timezoneId,
      ip_address: input.ipAddress,
      phone_country_code: input.phoneCountryCode,
      phone: input.phone,
      twilio_consent: input.twilioConsent,
      ...(input.customFields ?? {}),
    });
    return { user: body.user ?? null };
  },
};

export default registrantCreate;
