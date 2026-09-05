import { assertEquals, assertRejects } from "@std/assert";
import messageMulticast from "../../actions/message-multicast.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const MESSAGES = [{ type: "text", text: "Hello, world1" }];

Deno.test("message-multicast: POSTs an array of user ids", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await messageMulticast.execute({ to: ["U1", "U2"], messages: MESSAGES }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/bot/message/multicast");
  assertEquals(JSON.parse(calls[0].body!), { to: ["U1", "U2"], messages: MESSAGES });
});

Deno.test("message-multicast: accepts a comma-separated string for to", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await messageMulticast.execute({ to: "U1, U2", messages: MESSAGES }, ctx);
  assertEquals(JSON.parse(calls[0].body!).to, ["U1", "U2"]);
});

Deno.test("message-multicast: requires at least one recipient", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await messageMulticast.execute({ to: [], messages: MESSAGES }, ctx),
    Error,
    "non-empty list",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-multicast: refuses more than 500 recipients before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const to = Array.from({ length: 501 }, (_, i) => `U${i}`);
  await assertRejects(
    async () => await messageMulticast.execute({ to, messages: MESSAGES }, ctx),
    Error,
    "at most 500",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-multicast: is declared non-idempotent", () => {
  assertEquals(messageMulticast.idempotent, false);
});
