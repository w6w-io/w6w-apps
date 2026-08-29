import { assertEquals } from "@std/assert";
import { transcriptOptionsBody } from "../../lib/params.ts";

Deno.test("transcriptOptionsBody: maps camelCase input to the vendor's snake_case fields", () => {
  const body = transcriptOptionsBody({
    languageCode: "en_us",
    punctuate: true,
    speakerLabels: true,
    speakersExpected: 2,
    redactPii: true,
    redactPiiPolicies: ["person_name", "email_address"],
    speechModels: "universal-2",
  });
  assertEquals(body.language_code, "en_us");
  assertEquals(body.punctuate, true);
  assertEquals(body.speaker_labels, true);
  assertEquals(body.speakers_expected, 2);
  assertEquals(body.redact_pii, true);
  assertEquals(body.redact_pii_policies, ["person_name", "email_address"]);
  assertEquals(body.speech_models, ["universal-2"]);
});

Deno.test("transcriptOptionsBody: empty-string fields become undefined, not sent as ''", () => {
  const body = transcriptOptionsBody({ languageCode: "", prompt: "", domain: "" });
  assertEquals(body.language_code, undefined);
  assertEquals(body.prompt, undefined);
  assertEquals(body.domain, undefined);
});

Deno.test("transcriptOptionsBody: array fields accept a comma-string the same as an array", () => {
  const body = transcriptOptionsBody({ redactPiiPolicies: "person_name, email_address" });
  assertEquals(body.redact_pii_policies, ["person_name", "email_address"]);
});

Deno.test("transcriptOptionsBody: an empty array field becomes undefined, not []", () => {
  const body = transcriptOptionsBody({ redactPiiPolicies: [] });
  assertEquals(body.redact_pii_policies, undefined);
});
