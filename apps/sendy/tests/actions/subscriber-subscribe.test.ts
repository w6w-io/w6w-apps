import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-subscribe.ts";

const conn = { display: { baseUrl: "https://example.com/sendy" } };

Deno.test("subscriber-subscribe: posts to /subscribe with boolean=true forced", async () => {
  const { ctx, calls } = mockCtx([{ body: "true" }], conn);
  const result = await action.execute(
    { email: "ada@example.com", listId: "abc123", name: "Ada" },
    ctx,
  );
  assertEquals(calls[0].url, "https://example.com/sendy/subscribe");
  assertEquals(calls[0].method, "POST");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("email"), "ada@example.com");
  assertEquals(body.get("list"), "abc123");
  assertEquals(body.get("name"), "Ada");
  assertEquals(body.get("boolean"), "true");
  assertEquals(result, { subscribed: true });
});

Deno.test("subscriber-subscribe: merges custom fields verbatim into the form", async () => {
  const { ctx, calls } = mockCtx([{ body: "true" }], conn);
  await action.execute(
    {
      email: "ada@example.com",
      listId: "abc123",
      customFields: { Birthday: "1990-01-01" },
    },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("Birthday"), "1990-01-01");
});

Deno.test("subscriber-subscribe: a documented error becomes a thrown error", async () => {
  const { ctx } = mockCtx([{ body: "Already subscribed." }], conn);
  await assertRejects(
    async () => await action.execute({ email: "ada@example.com", listId: "abc123" }, ctx),
    Error,
    "Already subscribed.",
  );
});

Deno.test("subscriber-subscribe: is marked idempotent", () => {
  assert(action.idempotent === true);
});
