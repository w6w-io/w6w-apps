import type { ActionDefinition } from "@w6w/types";
import { compact, KintoneClient, parseJson } from "../lib/client.ts";
import { APP_ID_PARAM, RECORD_FIELDS_PARAM } from "../lib/params.ts";

interface Input {
  appId: string;
  record?: unknown;
}

interface AddRecordResponse {
  id: string;
  revision: string;
}

/**
 * `POST /k/v1/record.json` — verified against
 * `docs/kintone/rest-api/records/add-record` 2026-09-05.
 *
 * Adds one record. Fields left out of `record` get their App-configured
 * default. Kintone ignores field codes it does not recognise rather than
 * erroring, and refuses values for Lookup targets, Status, Categories,
 * Calculated fields and auto-calculated Text fields (documented Limitations).
 *
 * **Not idempotent** — Kintone assigns no client-supplied idempotency key on
 * this endpoint; retrying a failed call can create a duplicate record.
 */
const action: ActionDefinition<Input, AddRecordResponse> = {
  key: "record-add",
  type: "perform",
  resource: "record",
  title: "Add Record",
  description: "Create one record in a Kintone App from an object of field values.",
  idempotent: false,
  params: [APP_ID_PARAM, RECORD_FIELDS_PARAM],
  output: [
    { key: "id", label: "Record ID", type: "string" },
    { key: "revision", label: "Revision", type: "string" },
  ],

  async execute(input, ctx) {
    const record = parseJson(input.record, "record");
    ctx.log("info", "adding Kintone record", { appId: input.appId });
    return await new KintoneClient(ctx).request<AddRecordResponse>("/record", {
      method: "POST",
      json: compact({ app: input.appId, record }),
    });
  },
};

export default action;
