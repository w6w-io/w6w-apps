import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-voice.ts";

const okEnvelope = (data: unknown) => ({
  http_code: 200,
  response_code: "SUCCESS",
  response_msg: "Here are your data.",
  data,
});

Deno.test("send-voice: sends lang/voice and only includes require_input/machine_detection when set", async () => {
  const { ctx, calls } = mockCtx([
    { body: okEnvelope({ messages: [{ message_id: "V1", status: "SUCCESS" }] }) },
  ]);

  await action.execute(
    { to: "+61411111111", body: "hi", lang: "en-au", voice: "female" } as never,
    ctx,
  );

  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.messages[0].lang, "en-au");
  assertEquals(sent.messages[0].voice, "female");
  assertEquals("require_input" in sent.messages[0], false);
  assertEquals("machine_detection" in sent.messages[0], false);
});

Deno.test("send-voice: require_input/machine_detection are sent as 1 when true", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ messages: [] }) }]);
  await action.execute(
    {
      to: "+1",
      body: "hi",
      lang: "en-us",
      voice: "male",
      requireInput: true,
      machineDetection: true,
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.messages[0].require_input, 1);
  assertEquals(sent.messages[0].machine_detection, 1);
});

Deno.test("send-voice: requires either `to` or `listId`", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ body: "hi", lang: "en-au", voice: "female" } as never, ctx),
    Error,
    "requires either",
  );
  assertEquals(calls.length, 0);
});
