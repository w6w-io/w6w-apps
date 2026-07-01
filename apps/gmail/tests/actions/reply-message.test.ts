import { assertEquals, assertStringIncludes } from "@std/assert";
import { decodeBase64Url } from "@std/encoding/base64url";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reply-message.ts";

Deno.test("reply-message: hydrates headers, sends with threadId and reply headers", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        threadId: "T-1",
        payload: {
          headers: [
            { name: "Subject", value: "Original" },
            { name: "Message-ID", value: "<orig@mail.gmail.com>" },
            { name: "From", value: "alice@x.com" },
            { name: "To", value: "me@x.com, bob@x.com" },
            { name: "References", value: "<older@mail.gmail.com>" },
          ],
        },
      },
    },
    { body: { emailAddress: "me@x.com" } },
    { body: { id: "sent-1", threadId: "T-1" } },
  ]);
  await action.execute!({ messageId: "m-1", text: "reply body" }, ctx);

  // 1. metadata fetch  2. profile fetch  3. send
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/messages/m-1");
  assertEquals(new URL(calls[1].url).pathname, "/gmail/v1/users/me/profile");
  assertEquals(new URL(calls[2].url).pathname, "/gmail/v1/users/me/messages/send");

  const sent = JSON.parse(calls[2].body!);
  assertEquals(sent.threadId, "T-1");
  const decoded = new TextDecoder().decode(decodeBase64Url(sent.raw));
  assertStringIncludes(decoded, "Subject: Re: Original");
  // Recipients: original sender + original To minus self.
  assertStringIncludes(decoded, "alice@x.com");
  assertStringIncludes(decoded, "bob@x.com");
  assertStringIncludes(decoded, "In-Reply-To: <orig@mail.gmail.com>");
  assertStringIncludes(decoded, "reply body");
});
