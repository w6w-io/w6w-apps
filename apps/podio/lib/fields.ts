import { stripSecrets } from "./client.ts";

/**
 * Podio's app-field model, and the one honest projection of it.
 *
 * ## The problem this file exists for
 *
 * A Podio "app" is a user-defined record type: an org contains workspaces
 * (spelled `space` everywhere in the API), a workspace contains apps, and an
 * app contains items. The app's *fields* are defined by whoever built it, at
 * runtime, in the Podio UI. So this integration cannot know — and must not
 * pretend to know — what an item looks like.
 *
 * Concretely, `GET /app/{app_id}` returns:
 *
 * ```json
 * "fields": [{ "field_id": 1, "type": "text", "external_id": "title",
 *              "config": { "label": "Title", "required": true, "settings": {…} } }]
 * ```
 *
 * where `type` is one of the eighteen the vendor lists — `text`, `number`,
 * `image`, `media`, `date`, `app`, `money`, `progress`, `location`, `duration`,
 * `contact`, `calculation`, `embed`, `category`, `file`, `tel`, `separator`,
 * `email` — and `settings` is a different object for each.
 *
 * {@link summarizeAppFields} is the projection that turns that into the answer
 * to the only question a workflow author actually has: *what keys may I put in
 * `fields`, and what shape does each one's value take?*
 *
 * ## What it deliberately does not do
 *
 * It does not flatten item values. Reading an item gives
 * `values: [{ "<sub_id>": value }]`, and the sub_id vocabulary is per type — a
 * `text` field is `{value, format}`, a `date` field is
 * `{start_date, start_time, end_date, end_time}`, a `money` field is
 * `{value, currency}`, an `app` reference is `{value: <item_id>}`, a `category`
 * is `{value: <option_id>}`, a `location` has nine sub_ids. Collapsing those to
 * one scalar per field is what most Podio integrations do, and it is lossy in a
 * way the user cannot see: an end date, a currency, a phone type and a text
 * format all silently disappear. So item actions return Podio's own array
 * verbatim, and the README says what that costs.
 *
 * ## A vocabulary trap worth naming
 *
 * The *field type* list and the *value sub_id* list are two different
 * vocabularies for the same things, and the vendor publishes them on two
 * different pages. A field of type `contact` takes values documented under
 * `member`; type `image` takes values documented under `video`; type `tel`
 * takes values documented under `phone`. {@link VALUE_SHAPES} keys by the
 * **field type**, which is what `GET /app/{app_id}` actually returns, and
 * carries the value vocabulary as the description.
 */

/** The eighteen field types Podio's Applications area lists, verbatim. */
export const FIELD_TYPES = [
  "text",
  "number",
  "image",
  "media",
  "date",
  "app",
  "money",
  "progress",
  "location",
  "duration",
  "contact",
  "calculation",
  "embed",
  "category",
  "file",
  "tel",
  "separator",
  "email",
] as const;

export type FieldType = typeof FIELD_TYPES[number];

/**
 * The sub_id vocabulary each field type's *values* use, transcribed from
 * Podio's Items area ("The sub_ids and their values are listed for each field
 * below").
 *
 * Keyed by the field type `GET /app/{app_id}` reports, so the three renamings
 * (`contact`→member, `image`→video, `tel`→phone) are resolved here rather than
 * left for the reader to trip over.
 *
 * `calculation`, `separator` and `media` are absent from the vendor's list:
 * `separator` holds no value at all, and `calculation` is computed by Podio and
 * cannot be written. They are reported as unknown rather than guessed at.
 */
export const VALUE_SHAPES: Partial<Record<FieldType, string>> = {
  text: "value (string), format (plain | markdown | html)",
  number: "value (decimal, as a string)",
  image: "value (file id) — documented under the name `video`",
  date: "start_date, start_time, end_date, end_time",
  app: "value (the referenced item_id)",
  money: "value (decimal, as a string), currency (ISO 4217)",
  progress: "value (integer 0-100)",
  location: "value, formatted, street_number, street_name, postal_code, city, state, " +
    "country, lat, lng",
  duration: "value (seconds)",
  contact: "value (profile_id) — documented under the name `member`, whose sub_id is a user_id",
  embed: "embed (embed id), file (thumbnail file id)",
  category: "value (the option id, NOT the option text)",
  file: "value (file id)",
  tel: "value (string, max 50), type (mobile | work | home | main | work_fax | " +
    "private_fax | other) — documented under the name `phone`",
  email: "value (string, max 254), type (home | work | other)",
};

/** One field of a Podio app, as `GET /app/{app_id}` returns it. */
export interface PodioAppField {
  field_id?: number;
  type?: string;
  external_id?: string;
  status?: string;
  config?: {
    label?: string;
    description?: string;
    delta?: number;
    required?: boolean;
    mapping?: string | null;
    settings?: Record<string, unknown>;
  };
}

/** What `app-fields-list` returns per field. */
export interface FieldSummary {
  fieldId?: number;
  externalId?: string;
  type?: string;
  label?: string;
  description?: string;
  required: boolean;
  status?: string;
  /** How to spell this field's value, per {@link VALUE_SHAPES}. */
  valueShape: string;
  /** The type-specific `config.settings` object, verbatim. */
  settings?: Record<string, unknown>;
  /**
   * For `category` and `app` fields only: the ids a value may take. A category
   * value is the option **id**, not its text, and getting that wrong is the
   * single most common write failure against this API.
   */
  options?: Array<{ id?: number; text?: string; status?: string; color?: string }>;
}

/** The sentence used when the vendor documents no value shape for a type. */
export const UNKNOWN_VALUE_SHAPE =
  "not documented by Podio — read an existing item's values for this field to see its shape";

/**
 * Project an app definition down to its writable field schema.
 *
 * Keeps `external_id` prominently, because it is the key that survives: Podio
 * documents it as "External id automatically generated that will never change",
 * whereas a `field_id` is stable too but meaningless to a human reading a
 * workflow. Both are accepted as `fields` keys on write.
 */
export function summarizeAppFields(app: unknown): FieldSummary[] {
  const fields = (app as { fields?: PodioAppField[] } | null)?.fields;
  if (!Array.isArray(fields)) return [];
  return fields.map((f) => {
    const settings = f.config?.settings;
    const options = Array.isArray((settings as { options?: unknown })?.options)
      ? (settings as {
        options: Array<{ id?: number; text?: string; status?: string; color?: string }>;
      }).options
      : undefined;
    return {
      fieldId: f.field_id,
      externalId: f.external_id,
      type: f.type,
      label: f.config?.label,
      description: f.config?.description,
      required: f.config?.required === true,
      status: f.status,
      valueShape: VALUE_SHAPES[f.type as FieldType] ?? UNKNOWN_VALUE_SHAPE,
      settings,
      options,
    };
  });
}

/**
 * Project an app definition down to the identity + configuration a workflow
 * needs, with {@link stripSecrets} applied.
 *
 * Called by both `app-get` and `app-fields-list` so the app token can only be
 * dropped in one place.
 */
export function summarizeApp(app: unknown): Record<string, unknown> {
  const stripped = stripSecrets(app) as Record<string, unknown> | null;
  return stripped ?? {};
}
