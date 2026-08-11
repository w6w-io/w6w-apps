import { assert, assertEquals } from "@std/assert";
import {
  FIELD_TYPES,
  summarizeApp,
  summarizeAppFields,
  UNKNOWN_VALUE_SHAPE,
  VALUE_SHAPES,
} from "../../lib/fields.ts";

/** An app definition shaped exactly as `GET /app/{app_id}` documents it. */
const APP = {
  app_id: 123,
  space_id: 7,
  status: "active",
  token: "the-app-token",
  push: { channel: "/app/123", signature: "sig" },
  config: { name: "Leads", item_name: "Lead" },
  fields: [
    {
      field_id: 1,
      type: "text",
      external_id: "title",
      status: "active",
      config: {
        label: "Title",
        description: "",
        delta: 0,
        required: true,
        settings: { size: "small" },
      },
    },
    {
      field_id: 2,
      type: "category",
      external_id: "status",
      status: "active",
      config: {
        label: "Status",
        delta: 1,
        required: false,
        settings: {
          multiple: false,
          display: "inline",
          options: [
            { id: 11, text: "Open", status: "active", color: "DCEBD8" },
            { id: 12, text: "Won", status: "active" },
          ],
        },
      },
    },
    {
      field_id: 3,
      type: "calculation",
      external_id: "score",
      config: { label: "Score", delta: 2, settings: { script: "1+1" } },
    },
  ],
};

Deno.test("summarizeApp: drops the app token and the push signature", () => {
  const out = summarizeApp(APP);
  assertEquals(out.token, undefined, "the app token survived — it mints access tokens");
  assertEquals(out.push, undefined);
  assertEquals(out.app_id, 123);
  assertEquals(out.config, { name: "Leads", item_name: "Lead" });
});

Deno.test("summarizeAppFields: projects id, external id, type, label and requiredness", () => {
  const fields = summarizeAppFields(APP);
  assertEquals(fields.length, 3);
  assertEquals(fields[0].fieldId, 1);
  assertEquals(fields[0].externalId, "title");
  assertEquals(fields[0].type, "text");
  assertEquals(fields[0].label, "Title");
  assertEquals(fields[0].required, true);
  // `required` is a hard boolean, not the vendor's possibly-absent field: an
  // absent `required` must read as false, not as undefined.
  assertEquals(fields[2].required, false);
});

/**
 * The single most common Podio write failure: sending a category's *text* where
 * Podio wants its option *id*. Surfacing the option list is what stops it.
 */
Deno.test("summarizeAppFields: surfaces category option ids, which is what a value must be", () => {
  const status = summarizeAppFields(APP).find((f) => f.externalId === "status")!;
  assertEquals(status.options, [
    { id: 11, text: "Open", status: "active", color: "DCEBD8" },
    { id: 12, text: "Won", status: "active" },
  ]);
  assert(
    status.valueShape.includes("option id"),
    "the category value shape must say the value is the option id",
  );
  assert(status.valueShape.includes("NOT the option text"));
});

Deno.test("summarizeAppFields: reports an undocumented type's shape as unknown, not as a guess", () => {
  const score = summarizeAppFields(APP).find((f) => f.externalId === "score")!;
  assertEquals(score.valueShape, UNKNOWN_VALUE_SHAPE);
  assertEquals(score.options, undefined);
  assertEquals(score.settings, { script: "1+1" });
});

Deno.test("summarizeAppFields: an app with no fields array yields an empty list, not a throw", () => {
  assertEquals(summarizeAppFields({}), []);
  assertEquals(summarizeAppFields(null), []);
  assertEquals(summarizeAppFields({ fields: "nope" }), []);
});

Deno.test("FIELD_TYPES holds exactly the eighteen types Podio's Applications area lists", () => {
  assertEquals(FIELD_TYPES.length, 18);
  assertEquals([...FIELD_TYPES].sort(), [
    "app",
    "calculation",
    "category",
    "contact",
    "date",
    "duration",
    "email",
    "embed",
    "file",
    "image",
    "location",
    "media",
    "money",
    "number",
    "progress",
    "separator",
    "tel",
    "text",
  ]);
});

/**
 * The renaming trap: Podio documents value sub_ids under `member`, `video` and
 * `phone`, but `GET /app/{app_id}` reports those field types as `contact`,
 * `image` and `tel`. VALUE_SHAPES is keyed by what the API returns, and says
 * where the other name lives.
 */
Deno.test("VALUE_SHAPES resolves the three field-type / value-name renamings", () => {
  assert(VALUE_SHAPES.contact!.includes("member"));
  assert(VALUE_SHAPES.image!.includes("video"));
  assert(VALUE_SHAPES.tel!.includes("phone"));
  // And keys by the field type, never by the value name.
  assertEquals((VALUE_SHAPES as Record<string, string | undefined>).member, undefined);
  assertEquals((VALUE_SHAPES as Record<string, string | undefined>).video, undefined);
  assertEquals((VALUE_SHAPES as Record<string, string | undefined>).phone, undefined);
});

Deno.test("VALUE_SHAPES covers every field type that carries a documented value", () => {
  // The three absences are deliberate: `separator` holds no value, and
  // `calculation` and `media` are not in the vendor's sub_id list.
  const missing = FIELD_TYPES.filter((t) => !VALUE_SHAPES[t]);
  assertEquals([...missing].sort(), ["calculation", "media", "separator"]);
});

Deno.test("VALUE_SHAPES names the multi-sub_id shapes rather than pretending they are scalars", () => {
  assert(VALUE_SHAPES.date!.includes("start_date"));
  assert(VALUE_SHAPES.date!.includes("end_time"));
  assert(VALUE_SHAPES.money!.includes("currency"));
  assert(VALUE_SHAPES.email!.includes("type"));
  assert(VALUE_SHAPES.location!.includes("lat"));
});
