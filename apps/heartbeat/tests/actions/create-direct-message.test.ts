import { assertEquals } from "@std/assert";
import createDirectMessage from "../../actions/create-direct-message.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-direct-message: PUT /directMessages, 204 No Content handled cleanly", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await createDirectMessage.execute({ to: "u2", text: "<p>Hi</p>" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/directMessages");
  assertEquals(JSON.parse(calls[0].body!), { text: "<p>Hi</p>", to: "u2" });
  assertEquals(out, {});
});

Deno.test("create-direct-message: is not idempotent", () => {
  assertEquals(createDirectMessage.idempotent, false);
});
