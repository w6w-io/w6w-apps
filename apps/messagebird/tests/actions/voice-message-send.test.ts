import { assert, assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/voice-message-send.ts";

Deno.test("voice-message-send: POSTs a JSON body to /voicemessages with stripped recipients", async () => {
  const body = { id: "e8077d803532c0b5937c639b60216938", href: "https://x", body: "hi there" };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await action.execute!(
    { recipients: ["+31612345678"], message: "hi there" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/voicemessages");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.recipients, ["31612345678"]);
  assertEquals(sent.body, "hi there");
  assertEquals(result, body);
});

Deno.test("voice-message-send: passes voice, language, repeat, ifMachine, machineTimeout, reference", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      recipients: ["1"],
      message: "x",
      originator: "+1",
      voice: "male",
      language: "en-us",
      repeat: 3,
      ifMachine: "hangup",
      machineTimeout: 5000,
      reference: "ref-1",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.originator, "+1");
  assertEquals(sent.voice, "male");
  assertEquals(sent.language, "en-us");
  assertEquals(sent.repeat, 3);
  assertEquals(sent.ifMachine, "hangup");
  assertEquals(sent.machineTimeout, 5000);
  assertEquals(sent.reference, "ref-1");
});

Deno.test("voice-message-send: idempotent is explicitly false — a retry must not double-call", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("voice-message-send: unset optional fields are omitted from the payload", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ recipients: ["1"], message: "x" }, ctx);
  const sent = JSON.parse(calls[0].body ?? "{}");
  assert(!("scheduledDatetime" in sent), JSON.stringify(sent));
  assert(!("reference" in sent), JSON.stringify(sent));
});
