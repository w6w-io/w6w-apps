import type { ActionDefinition } from "@w6w/types";
import { KintoneClient } from "../lib/client.ts";
import { APP_ID_PARAM, RECORD_ID_PARAM } from "../lib/params.ts";

interface Input {
  appId: string;
  recordId: string;
}

interface GetRecordResponse {
  record: Record<string, unknown>;
}

/**
 * `GET /k/v1/record.json` — verified against
 * `docs/kintone/rest-api/records/get-record` 2026-09-05.
 *
 * Retrieves one record by App ID + Record ID. Each field in the response is
 * `{"FieldCode": {"type": "...", "value": ...}}`.
 */
const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "record-get",
  type: "read",
  resource: "record",
  title: "Get Record",
  description: "Retrieve one record from a Kintone App by its Record ID.",
  params: [APP_ID_PARAM, RECORD_ID_PARAM],
  // The response's field set is whatever the App's own schema declares, so this
  // lists only the two built-in fields present on every Kintone record.
  output: [
    { key: "$id", label: "Record ID", type: "object" },
    { key: "$revision", label: "Revision", type: "object" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "getting Kintone record", { appId: input.appId, recordId: input.recordId });
    const body = await new KintoneClient(ctx).request<GetRecordResponse>("/record", {
      query: { app: input.appId, id: input.recordId },
    });
    return body.record;
  },
};

export default action;
