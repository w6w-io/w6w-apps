import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { listIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/lists/{listid}/customfields.json` — a list's custom fields.
 * **List-level.**
 *
 * Run this before any subscriber write: it is the only way to learn what keys
 * that list accepts.
 *
 * ## `FieldName` and `Key` are different strings, and the difference bites
 *
 * The vendor returns both: `{"FieldName": "subscription date", "Key":
 * "[subscriptiondate]"}`. The `Key` is **bracketed and space-stripped**. Which
 * one a subscriber write wants is genuinely inconsistent in the vendor's own
 * examples — the add/update request bodies use unbracketed names
 * (`{"Key": "website"}`) while the read responses come back bracketed
 * (`{"Key": "[website]"}`) — so this action returns both fields verbatim rather
 * than normalising, and the subscriber actions pass whatever the caller supplies
 * through unchanged.
 *
 * `DataType` is one of `Text`, `Number`, `Date`, `MultiSelectOne` or
 * `MultiSelectMany`. `MultiSelectMany` is the one with special write semantics —
 * see `subscriber-update`.
 */
interface Input {
  listId: string;
}

interface CustomField {
  FieldName: string;
  Key: string;
  DataType: string;
  FieldOptions: string[];
  VisibleInPreferenceCenter: boolean;
}

const listCustomFieldsGet: ActionDefinition<Input, CustomField[]> = {
  key: "list-custom-fields-get",
  type: "search",
  resource: "list",
  title: "Get List Custom Fields",
  description:
    "List a list's custom fields with their data type, select options and preference-centre " +
    "visibility. Returns both the display FieldName and the bracketed Key.",
  params: [listIdParam],
  output: [
    { key: "FieldName", type: "string", label: "Display name, e.g. subscription date" },
    { key: "Key", type: "string", label: "Bracketed key, e.g. [subscriptiondate]" },
    {
      key: "DataType",
      type: "string",
      label: "Text | Number | Date | MultiSelectOne | MultiSelectMany",
    },
    { key: "FieldOptions", type: "array", label: "Options for the select types" },
    {
      key: "VisibleInPreferenceCenter",
      type: "boolean",
      label: "Shown in the subscriber preference centre",
    },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<CustomField[]>(
      `/lists/${encodeId(input.listId)}/customfields`,
    );
  },
};

export default listCustomFieldsGet;
