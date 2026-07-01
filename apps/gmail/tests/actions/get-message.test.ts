import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-message.ts";

Deno.test("get-message: GETs users/me/messages/{id} with format=full by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!({ messageId: "m1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/gmail/v1/users/me/messages/m1");
  assertEquals(url.searchParams.get("format"), "full");
});

Deno.test("get-message: forwards format + metadataHeaders when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m2" } }]);
  await action.execute!(
    { messageId: "m2", format: "metadata", metadataHeaders: ["From", "Subject"] },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("format"), "metadata");
  assertEquals(url.searchParams.getAll("metadataHeaders"), ["From", "Subject"]);
});
