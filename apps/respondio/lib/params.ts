/**
 * Shared `Option[]` lists for respond.io action params.
 *
 * Every enum below is copied verbatim from the vendor's own
 * `respond-io/mcp-server` (`src/constants.ts`) and `respond-io/typescript-sdk`
 * (`src/types/*.ts`) source — both official respond.io repositories — rather
 * than guessed from prose docs. See `lib/client.ts` for the provenance note.
 */
import type { Option, Param } from "@w6w/types";

/** `SendMessageRequest.message.type` — the six message shapes the send endpoint accepts. */
export const messageTypeOptions: Option[] = [
  { value: "text", label: "Text" },
  { value: "attachment", label: "Attachment" },
  { value: "whatsapp_template", label: "WhatsApp template" },
  { value: "email", label: "Email" },
  { value: "quick_reply", label: "Quick reply" },
  { value: "custom_payload", label: "Custom payload" },
];

/** `AttachmentMessage.attachment.type`. */
export const attachmentTypeOptions: Option[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "file", label: "File" },
];

/**
 * `TextMessage.messageTag` — Facebook Messenger's tagged-message categories,
 * which allow a message outside Meta's normal 24-hour customer-service window.
 */
export const messageTagOptions: Option[] = [
  { value: "ACCOUNT_UPDATE", label: "Account update" },
  { value: "POST_PURCHASE_UPDATE", label: "Post-purchase update" },
  { value: "CONFIRMED_EVENT_UPDATE", label: "Confirmed event update" },
];

/** `Contact.status` / `ConversationStatusRequest.status`. */
export const conversationStatusOptions: Option[] = [
  { value: "open", label: "Open" },
  { value: "close", label: "Close" },
];

/** `ContactFilter.filter[...].category`. */
export const filterCategoryOptions: Option[] = [
  { value: "contactField", label: "Contact field" },
  { value: "contactTag", label: "Contact tag" },
  { value: "lifecycle", label: "Lifecycle" },
];

/** `ContactFilter.filter[...].operator`. */
export const filterOperatorOptions: Option[] = [
  { value: "isEqualTo", label: "Is equal to" },
  { value: "isNotEqualTo", label: "Is not equal to" },
  { value: "isTimestampAfter", label: "Is timestamp after" },
  { value: "isTimestampBefore", label: "Is timestamp before" },
  { value: "isTimestampBetween", label: "Is timestamp between" },
  { value: "exists", label: "Exists" },
  { value: "doesNotExist", label: "Does not exist" },
  { value: "isGreaterThan", label: "Is greater than" },
  { value: "isLessThan", label: "Is less than" },
  { value: "isBetween", label: "Is between" },
  { value: "hasAnyOf", label: "Has any of" },
  { value: "hasAllOf", label: "Has all of" },
  { value: "hasNoneOf", label: "Has none of" },
];

/** `CreateCustomFieldRequest.dataType`. */
export const customFieldDataTypeOptions: Option[] = [
  { value: "text", label: "Text" },
  { value: "list", label: "List" },
  { value: "checkbox", label: "Checkbox" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "url", label: "URL" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
];

/**
 * `ContactChannel.source` / `SpaceChannel.source` — every channel type
 * respond.io connects, per the SDK's `ChannelSource` union.
 */
export const channelSourceOptions: Option[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "line", label: "LINE" },
  { value: "telegram", label: "Telegram" },
  { value: "viber", label: "Viber" },
  { value: "twitter", label: "Twitter / X" },
  { value: "wechat", label: "WeChat" },
  { value: "custom_channel", label: "Custom channel" },
  { value: "gmail", label: "Gmail" },
  { value: "other_email", label: "Other email" },
  { value: "twilio", label: "Twilio (SMS)" },
  { value: "message_bird", label: "MessageBird (SMS)" },
  { value: "nexmo", label: "Vonage/Nexmo (SMS)" },
  { value: "360dialog_whatsapp", label: "WhatsApp (360dialog)" },
  { value: "twilio_whatsapp", label: "WhatsApp (Twilio)" },
  { value: "message_bird_whatsapp", label: "WhatsApp (MessageBird)" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "nexmo_whatsapp", label: "WhatsApp (Vonage/Nexmo)" },
  { value: "whatsapp_cloud", label: "WhatsApp Cloud API" },
];

/**
 * `PaginationParams` — `limit` (1-100, default 10) and an opaque `cursorId`,
 * shared by every list/search action. Kept as a factory rather than a
 * constant so each action's own `Param[]` array literal stays readable.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { min: 1, max: 100, integer: true },
      hint: "1-100. Defaults to 10.",
      advanced: true,
    },
    {
      key: "cursorId",
      label: "Cursor ID",
      type: "number",
      advanced: true,
      hint: "From a previous page's pagination.next/previous, to page forward or back.",
    },
  ];
}

/**
 * `ContactFields` — the fields shared by create/update/create-or-update/merge.
 * `firstName` is the SDK's one required field on a bare create; every other
 * caller treats it (and everything else here) as optional.
 */
export function contactFieldParams(requireFirstName: boolean): Param[] {
  return [
    { key: "firstName", label: "First name", type: "string", required: requireFirstName },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      hint: 'E.164 format, e.g. "+60123456789".',
    },
    { key: "email", label: "Email", type: "string" },
    { key: "language", label: "Language", type: "string", hint: 'ISO 639-1, e.g. "en".' },
    {
      key: "countryCode",
      label: "Country code",
      type: "string",
      hint: 'ISO 3166-1 alpha-2, e.g. "US".',
      advanced: true,
    },
    {
      key: "profilePic",
      label: "Profile picture URL",
      type: "string",
      advanced: true,
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "array",
      advanced: true,
      item: {
        type: "object",
        fields: [
          { key: "name", label: "Field name", type: "string", required: true },
          { key: "value", label: "Value", type: "string" },
        ],
      },
      hint: "Values for this workspace's custom fields, by name — see Space: List Custom Fields.",
    },
  ];
}

/** A raw `{name, value}[]` param value -> the wire's `custom_fields`. */
export function toCustomFields(
  value: Array<{ name: string; value?: string }> | undefined,
): Array<{ name: string; value: string | number | boolean | null }> | undefined {
  if (!value?.length) return undefined;
  return value.map((f) => ({ name: f.name, value: f.value ?? null }));
}
