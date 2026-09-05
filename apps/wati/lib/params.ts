import type { Param } from "@w6w/types";

/** Every V3 list endpoint's `page_number` — required, 1-based. */
export const PAGE_NUMBER_PARAM: Param = {
  key: "pageNumber",
  label: "Page Number",
  type: "number",
  required: true,
  default: 1,
  hint: "1-based page number.",
};

/** Every V3 list endpoint's `page_size` — required, max 100. */
export const PAGE_SIZE_PARAM: Param = {
  key: "pageSize",
  label: "Page Size",
  type: "number",
  required: true,
  default: 20,
  hint: "Items per page (max 100).",
};

/** A contact target, in every form the V3 API accepts. */
export const CONTACT_TARGET_PARAM: Param = {
  key: "target",
  label: "Contact",
  type: "string",
  required: true,
  hint: "The target contact — a ContactId, a PhoneNumber (`14155552671`), or " +
    "`Channel:PhoneNumber` (`MyChannel:1415552671`, `123456789:1415552671`).",
};

/** A conversation/messaging target, in every form the V3 conversations API accepts. */
export const CONVERSATION_TARGET_PARAM: Param = {
  key: "target",
  label: "Conversation",
  type: "string",
  required: true,
  hint: "The target conversation — a ConversationId, a PhoneNumber, `Channel:PhoneNumber`, a " +
    "recipient's BSUID (`ML.2011135123094924`), or `Channel:BSUID`.",
};

/** Custom key/value pairs, in Wati's `{name, value}[]` shape. */
export const CUSTOM_PARAMS_PARAM: Param = {
  key: "customParams",
  label: "Custom Parameters",
  type: "json",
  hint: 'A JSON array of `{"name": "...", "value": "..."}` objects.',
};
