import { assertEquals, assertStringIncludes } from "@std/assert";
import { decodeBase64Url } from "@std/encoding/base64url";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reply-thread.ts";

Deno.test("reply-thread: replies to the last message and posts to messages/send with threadId", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        id: "T-1",
        messages: [
          { payload: { headers: [{ name: "Subject", value: "s1" }] } },
          {
            payload: {
              headers: [
                { name: "Subject", value: "Deep discussion" },
                { name: "Message-ID", value: "<last@mail.gmail.com>" },
                { name: "From", value: "alice@x.com" },
                { name: "To", value: "me@x.com" },
              ],
            },
          },
        ],
      },
    },
    { body: { emailAddress: "me@x.com" } },
    { body: { id: "sent" } },
  ]);
  await action.execute!({ threadId: "T-1", text: "thanks" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/threads/T-1");
  assertEquals(new URL(calls[1].url).pathname, "/gmail/v1/users/me/profile");
  assertEquals(new URL(calls[2].url).pathname, "/gmail/v1/users/me/messages/send");

  const sent = JSON.parse(calls[2].body!);
  assertEquals(sent.threadId, "T-1");
  const decoded = new TextDecoder().decode(decodeBase64Url(sent.raw));
  // Subject should come from the *last* message, not the first.
  assertStringIncludes(decoded, "Subject: Re: Deep discussion");
  assertStringIncludes(decoded, "In-Reply-To: <last@mail.gmail.com>");
  assertStringIncludes(decoded, "alice@x.com");
  assertStringIncludes(decoded, "thanks");
});
