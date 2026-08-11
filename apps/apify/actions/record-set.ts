import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, asJson, encodeId, isJsonContentType } from "../lib/client.ts";
import { storeIdParam } from "../lib/params.ts";

/**
 * `PUT /v2/key-value-stores/{storeId}/records/{recordKey}` — write one record.
 *
 * A full overwrite of the key, so this **is** idempotent: writing the same value
 * twice leaves the store in the same state, which is exactly what the runtime
 * needs to know before it retries.
 *
 * ## The content type is part of the record
 *
 * Whatever `Content-Type` this request carries is stored with the value and is
 * what Get Store Record will serve it back under. Writing a JSON string under
 * `text/plain` means every reader gets a string, not an object — the record does
 * not remember that it was "really" JSON.
 *
 * Only textual content types are writable here: an Action's input is a workflow
 * value, and there is no way to express raw bytes as one. Binary records
 * (screenshots, PDFs) are what an Actor writes from inside its own run.
 *
 * The endpoint answers `201`, and returns nothing worth passing on, so this
 * action reports what it wrote.
 */
interface Input {
  storeId: string;
  recordKey: string;
  value: unknown;
  contentType?: string;
}

const recordSet: ActionDefinition<Input> = {
  key: "record-set",
  type: "perform",
  resource: "key-value-store",
  title: "Set Store Record",
  description: "Write one record to a key-value store, overwriting any existing value.",
  idempotent: true,
  params: [
    storeIdParam,
    {
      key: "recordKey",
      label: "Record key",
      type: "string",
      required: true,
      hint:
        "Records are ordered by key in UTF-8 binary order. Writing an existing key replaces it.",
    },
    {
      key: "value",
      label: "Value",
      type: "json",
      required: true,
      hint:
        "Stored verbatim. Under a JSON content type this is serialized as JSON; under any other " +
        "textual type it is stored as the string you provide.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      default: "application/json",
      hint:
        "Stored with the record and used when it is read back. Only textual types are writable " +
        "from a workflow.",
    },
  ],
  output: [
    { key: "storeId", type: "string", label: "Store written to" },
    { key: "key", type: "string", label: "Record key" },
    { key: "contentType", type: "string", label: "Content type stored with the record" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const contentType = (input.contentType ?? "application/json").trim() || "application/json";
    const text = isJsonContentType(contentType)
      ? JSON.stringify(asJson<unknown>(input.value, "Value"))
      : typeof input.value === "string"
      ? input.value
      : JSON.stringify(input.value);

    const status = await new ApifyClient(ctx).status(
      `/key-value-stores/${encodeId(input.storeId)}/records/${encodeId(input.recordKey)}`,
      { method: "PUT", rawBody: { contentType, text } },
    );
    ctx.log("info", "stored record", { storeId: input.storeId, key: input.recordKey });
    return { storeId: input.storeId, key: input.recordKey, contentType, status };
  },
};

export default recordSet;
