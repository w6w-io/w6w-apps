import { assertEquals } from "@std/assert";
import transcriptSubmit from "../../actions/transcript-submit.ts";
import { hostOf, mockCtx, pathOf } from "../_helpers.ts";

const RESPONSE = { id: "t1", status: "queued", audio_url: "https://x/a.mp3" };

Deno.test("transcript-submit: POSTs audio_url and passes through flag params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await transcriptSubmit.execute(
    {
      audioUrl: "https://x/a.mp3",
      speakerLabels: true,
      sentimentAnalysis: true,
      redactPii: true,
      redactPiiPolicies: ["person_name", "email_address"],
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(hostOf(calls[0].url), "api.assemblyai.com");
  assertEquals(pathOf(calls[0].url), "/v2/transcript");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.audio_url, "https://x/a.mp3");
  assertEquals(body.speaker_labels, true);
  assertEquals(body.sentiment_analysis, true);
  assertEquals(body.redact_pii, true);
  assertEquals(body.redact_pii_policies, ["person_name", "email_address"]);
  assertEquals(out.id, "t1");
});

Deno.test("transcript-submit: omits unset optional flags rather than sending false/null", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await transcriptSubmit.execute({ audioUrl: "https://x/a.mp3" }, ctx);
  const body = JSON.parse(calls[0].body!);
  // JSON.stringify drops undefined-valued keys entirely — an unset flag must not appear
  // as `false`/`null` on the wire, which would override the vendor's own default.
  assertEquals("punctuate" in body, false);
  assertEquals("speaker_labels" in body, false);
  assertEquals(body.audio_url, "https://x/a.mp3");
});

Deno.test("transcript-submit: region 'eu' routes to the EU host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await transcriptSubmit.execute({ audioUrl: "https://x/a.mp3", region: "eu" }, ctx);
  assertEquals(hostOf(calls[0].url), "api.eu.assemblyai.com");
});

Deno.test("transcript-submit: is declared non-idempotent with a required audioUrl param", () => {
  assertEquals(transcriptSubmit.idempotent, false);
  const audioUrlParam = transcriptSubmit.params?.find((p) => p.key === "audioUrl");
  assertEquals(audioUrlParam?.required, true);
});
