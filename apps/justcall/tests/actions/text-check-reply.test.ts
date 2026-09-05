import { assertEquals } from "@std/assert";
import textCheckReply from "../../actions/text-check-reply.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("text-check-reply: POSTs to /v2.1/texts/checkreply", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, direction: "Inbound" }) }]);
  await textCheckReply.execute({ contact_number: "+14155555678" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2.1/texts/checkreply");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { contact_number: "+14155555678" });
});

Deno.test("text-check-reply: is modeled as a read despite the POST verb — no side effect", () => {
  assertEquals(textCheckReply.type, "read");
});
