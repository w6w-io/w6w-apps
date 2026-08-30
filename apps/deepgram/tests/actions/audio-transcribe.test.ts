import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audio-transcribe.ts";

const display = { projectId: "proj_1" };
const transcript = {
  status: 200,
  body: {
    metadata: { request_id: "req_1", duration: 12.5 },
    results: { channels: [{ alternatives: [{ transcript: "hello there" }] }] },
  },
};

/** Deepgram fetches the media itself — nothing passes through the workflow. */
Deno.test("audio-transcribe: posts the URL and pulls the plain transcript out", async () => {
  const { ctx, calls } = mockCtx([transcript], { display });
  const result = await action.execute!({ url: "https://example.com/a.mp3" }, ctx) as {
    transcript: string;
    pending: boolean;
  };
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.deepgram.com/v1/listen");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://example.com/a.mp3" });
  assertEquals(result.transcript, "hello there");
  assertEquals(result.pending, false);
});

Deno.test("audio-transcribe: sensible formatting defaults reach the query", async () => {
  const { ctx, calls } = mockCtx([transcript], { display });
  await action.execute!({ url: "https://x/a.mp3" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("model"), "nova-3");
  assertEquals(q.get("smart_format"), "true");
  assertEquals(q.get("punctuate"), "true");
});

/** Repeated keys, not a joined string. */
Deno.test("audio-transcribe: key terms and redaction are sent as repeated keys", async () => {
  const { ctx, calls } = mockCtx([transcript], { display });
  await action.execute!({
    url: "https://x/a.mp3",
    keyterm: "Postgres, w6w",
    redact: "pii,pci",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("keyterm"), ["Postgres", "w6w"]);
  assertEquals(q.getAll("redact"), ["pii", "pci"]);
});

/**
 * A callback turns this asynchronous: nothing has been transcribed when it
 * returns, so claiming otherwise would be a lie.
 */
Deno.test("audio-transcribe: a callback returns pending with the request id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { request_id: "req_2" } }], { display });
  const result = await action.execute!({
    url: "https://x/a.mp3",
    callbackUrl: "https://hooks.example.com/dg",
  }, ctx) as { pending: boolean; request_id: string; transcript?: string };
  assertEquals(new URL(calls[0].url).searchParams.get("callback"), "https://hooks.example.com/dg");
  assertEquals(result.pending, true);
  assertEquals(result.request_id, "req_2");
  assertEquals(result.transcript, undefined);
});

/** Whether submitted audio trains Deepgram's models is a decision, not a default. */
Deno.test("audio-transcribe: the model-improvement opt-out is off unless asked for", async () => {
  const off = mockCtx([transcript], { display });
  await action.execute!({ url: "https://x/a.mp3" }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.get("mip_opt_out"), null);

  const on = mockCtx([transcript], { display });
  await action.execute!({ url: "https://x/a.mp3", mipOptOut: true }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("mip_opt_out"), "true");

  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "mipOptOut")!;
  assert(/NDA/.test(p.hint!), p.hint);
});

/** The transcript is the caller's content and never reaches a log. */
Deno.test("audio-transcribe: logs the request id and duration, not the words", async () => {
  const { ctx, logs } = mockCtx([transcript], { display });
  await action.execute!({ url: "https://x/a.mp3" }, ctx);
  assert(!JSON.stringify(logs).includes("hello there"), JSON.stringify(logs));
  assertEquals(logs[0].data, { requestId: "req_1", seconds: 12.5 });
});

Deno.test("audio-transcribe: needs a URL, and says it never uploads", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "never by upload");
  assertEquals(calls.length, 0);
});
