import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson } from "../lib/filters.ts";
import { WufooClient } from "../lib/client.ts";

/**
 * `POST /forms/{identifier}/entries.json` — submit an entry.
 *
 * Three things about this endpoint are unlike everything else in the API, and
 * each is a way to get it wrong:
 *
 * **1. The request is form-encoded, not JSON.** The vendor's own curl posts
 * `-d "Field1=Wufoo" -d "Field2=Test"`. A JSON body is rejected. The client's
 * `form` option exists for this one call.
 *
 * **2. Fields are keyed by ID, not by label.** `Field105`, not "Email address".
 * List Form Fields is where those ids come from, and it also says which are
 * `IsRequired`.
 *
 * **3. A rejected submission is HTTP 200.** Wufoo answers a validation failure
 * with `{"Success": 0, "ErrorText": "…", "FieldErrors": [{"ID": "Field105",
 * "ErrorText": "This field is required."}]}` — a 200 with `Success: 0`. Anything
 * that only checks the status code will record a failed submission as a success,
 * which is the single most damaging way to misuse this API. This action reads
 * `Success` and throws with the per-field errors when it is not 1.
 *
 * Submissions are separately rate limited to **50 per user per 5-minute sliding
 * window**, and exceeding it returns `{"Text": "Slow Down", "HTTPCode": 429}`.
 *
 * Not idempotent: Wufoo has no idempotency key and a retry creates a second
 * entry.
 */
interface Input {
  identifier: string;
  fields: unknown;
}

interface SubmitResult {
  Success?: number | string;
  EntryId?: string;
  EntryLink?: string;
  ErrorText?: string;
  RedirectUrl?: string;
  FieldErrors?: Array<{ ID?: string; ErrorText?: string }>;
}

const entryCreate: ActionDefinition<Input> = {
  key: "entry-create",
  type: "perform",
  resource: "entry",
  title: "Create Entry",
  description:
    "Submit an entry to a form. Fields are keyed by id (`Field105`), not by label — Wufoo " +
    "reports a validation failure as HTTP 200, which this action turns into a real error.",
  idempotent: false,
  params: [
    {
      key: "identifier",
      label: "Form hash or title",
      type: "string",
      required: true,
      placeholder: "s1afea8b1vk0jf7",
    },
    {
      key: "fields",
      label: "Field values",
      type: "json",
      required: true,
      hint:
        'An object keyed by field ID — `{"Field1": "Ada", "Field105": "ada@example.com"}`. Run ' +
        "List Form Fields to get the ids and see which are required. Labels do not work.",
    },
  ],
  output: [
    { key: "Success", type: "number", label: "`1` on success — this action throws on `0`" },
    { key: "EntryId", type: "string", label: "The new entry's id" },
    { key: "EntryLink", type: "string", label: "URL of an Entries request filtered to this entry" },
  ],

  async execute(input, ctx) {
    const fields = asOptionalJson<Record<string, unknown>>(input.fields, "Field values");
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw new Error(
        'Field values must be an object keyed by field id, e.g. {"Field1": "Ada"}.',
      );
    }

    const form: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue;
      form[key] = String(value);
    }
    if (Object.keys(form).length === 0) throw new Error("Field values is empty");

    const result = await new WufooClient(ctx).request<SubmitResult>(
      `/forms/${encodeURIComponent(input.identifier)}/entries.json`,
      { method: "POST", form },
    );

    // The 200-that-means-failure. `Success` arrives as a number in the vendor's
    // examples, but every other scalar in this API is a string, so both are
    // treated the same rather than trusting one shape.
    if (result && String(result.Success) !== "1") {
      const fieldErrors = (result.FieldErrors ?? [])
        .map((e) => `${e.ID ?? "?"}: ${e.ErrorText ?? "invalid"}`)
        .join("; ");
      throw new Error(
        `Wufoo rejected the entry${result.ErrorText ? `: ${result.ErrorText}` : ""}` +
          `${fieldErrors ? ` — ${fieldErrors}` : ""}`,
      );
    }
    return result;
  },
};

export default entryCreate;
