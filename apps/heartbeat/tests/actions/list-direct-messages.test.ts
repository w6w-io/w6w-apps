import { assertEquals } from "@std/assert";
import listDirectMessages from "../../actions/list-direct-messages.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-direct-messages: GET /directMessages/{chatID}, wrapped under `messages`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "m1" }] }]);
  const out = await listDirectMessages.execute({ chatID: "dc1" }, ctx) as { messages: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/directMessages/dc1");
  assertEquals(out.messages.length, 1);
});
