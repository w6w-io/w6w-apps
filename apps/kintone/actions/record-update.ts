import type { ActionDefinition } from "@w6w/types";
import { compact, KintoneClient, parseJson } from "../lib/client.ts";
import { APP_ID_PARAM, RECORD_FIELDS_PARAM, REVISION_PARAM } from "../lib/params.ts";

interface Input {
  appId: string;
  recordId?: string;
  updateKeyField?: string;
  updateKeyValue?: string;
  revision?: string;
  record?: unknown;
}

interface UpdateRecordResponse {
  revision: string;
}

/**
 * `PUT /k/v1/record.json` — verified against
 * `docs/kintone/rest-api/records/update-record` 2026-09-05.
 *
 * Updates one record, addressed either by its Record ID or by a unique-key
 * field (one with "Prohibit duplicate values" turned on) — Kintone errors if
 * both or neither are given, so this action does too rather than letting
 * Kintone's error be the first the caller hears of it.
 */
const action: ActionDefinition<Input, UpdateRecordResponse> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description: "Change field values on one record, addressed by Record ID or a unique key.",
  idempotent: true,
  params: [
    APP_ID_PARAM,
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      hint: "Required unless Update Key Field is set.",
    },
    {
      key: "updateKeyField",
      label: "Update Key Field",
      type: "string",
      advanced: true,
      hint: 'Field code of a field with "Prohibit duplicate values" enabled — an alternative to ' +
        "Record ID for addressing the record. Requires Update Key Value too.",
    },
    {
      key: "updateKeyValue",
      label: "Update Key Value",
      type: "string",
      advanced: true,
      showIf: { "!=": [{ var: "updateKeyField" }, ""] },
    },
    REVISION_PARAM,
    RECORD_FIELDS_PARAM,
  ],
  output: [{ key: "revision", label: "New Revision", type: "string" }],

  async execute(input, ctx) {
    if (input.recordId && input.updateKeyField) {
      throw new Error("specify either `recordId` or `updateKeyField`, not both");
    }
    if (!input.recordId && !input.updateKeyField) {
      throw new Error("`recordId` or `updateKeyField`+`updateKeyValue` is required");
    }
    const record = parseJson(input.record, "record");
    const updateKey = input.updateKeyField
      ? { field: input.updateKeyField, value: input.updateKeyValue }
      : undefined;

    ctx.log("info", "updating Kintone record", { appId: input.appId, recordId: input.recordId });
    return await new KintoneClient(ctx).request<UpdateRecordResponse>("/record", {
      method: "PUT",
      json: compact({
        app: input.appId,
        id: input.recordId,
        updateKey,
        revision: input.revision,
        record,
      }),
    });
  },
};

export default action;
