import type { ActionDefinition } from "@w6w/types";
import {
  ApifyClient,
  encodeId,
  flag,
  isJsonContentType,
  isTextualContentType,
} from "../lib/client.ts";
import { storeIdParam } from "../lib/params.ts";

/**
 * `GET /v2/key-value-stores/{storeId}/records/{recordKey}` — read one record.
 *
 * ## The response is the value, not an envelope
 *
 * No `{"data": …}`. The body is whatever was stored, served under the content
 * type it was stored with. This is the second of the vendor's three documented
 * envelope exceptions, and the reason this action reports `contentType`
 * alongside the value rather than assuming JSON.
 *
 * The most common record by far is an Actor run's `OUTPUT`, in the store named
 * by the run's `defaultKeyValueStoreId`.
 *
 * ## Binary records are reported, not returned
 *
 * A record can be a PNG, a PDF or a zip. Those bytes do not survive being
 * decoded as a JS string — the substitution is lossy and irreversible — so a
 * non-textual record comes back with `value: null` and a note naming its content
 * type, instead of a corrupted string that looks like data.
 *
 * ## Apify may rewrite HTML records
 *
 * The vendor's own note: "for security reasons, Apify API can perform small
 * modifications to HTML documents before they are served via this endpoint. To
 * fetch the raw HTML content without any modifications, use the `attachment`
 * query parameter." That is why `attachment` is exposed — it is the only way to
 * get a stored HTML page back byte-for-byte.
 */
interface Input {
  storeId: string;
  recordKey: string;
  attachment?: boolean;
}

const recordGet: ActionDefinition<Input> = {
  key: "record-get",
  type: "read",
  resource: "key-value-store",
  title: "Get Store Record",
  description: "Read one record from a key-value store, with the content type it was stored under.",
  params: [
    storeIdParam,
    {
      key: "recordKey",
      label: "Record key",
      type: "string",
      required: true,
      placeholder: "OUTPUT",
      hint: "An Actor run's result record is conventionally called OUTPUT.",
    },
    {
      key: "attachment",
      label: "Fetch unmodified",
      type: "boolean",
      hint: "Apify makes small security-motivated edits to stored HTML documents before serving " +
        "them. Turn this on to get the bytes back exactly as written.",
    },
  ],
  output: [
    { key: "key", type: "string", label: "Record key" },
    { key: "contentType", type: "string", label: "Content type it was stored under" },
    { key: "value", type: "object", label: "Parsed JSON, raw text, or null for a binary record" },
    { key: "isJson", type: "boolean", label: "Whether the value was parsed as JSON" },
    { key: "note", type: "string", label: "Set only when the record could not be returned" },
  ],

  async execute(input, ctx) {
    const res = await new ApifyClient(ctx).raw(
      `/key-value-stores/${encodeId(input.storeId)}/records/${encodeId(input.recordKey)}`,
      { accept: "*/*", query: { attachment: flag(input.attachment) } },
    );

    const base = { key: input.recordKey, contentType: res.contentType };

    if (!isTextualContentType(res.contentType)) {
      return {
        ...base,
        value: null,
        isJson: false,
        note: `Record is ${res.contentType || "of an unknown content type"}, which is not text. ` +
          "Its bytes would not survive being returned as a string, so it is not included.",
      };
    }

    if (isJsonContentType(res.contentType)) {
      try {
        return { ...base, value: JSON.parse(res.text), isJson: true };
      } catch {
        // Served as JSON but is not — return the text rather than failing the
        // step, and say what happened.
        return {
          ...base,
          value: res.text,
          isJson: false,
          note: "Served as JSON but did not parse; returned as text.",
        };
      }
    }

    return { ...base, value: res.text, isJson: false };
  },
};

export default recordGet;
