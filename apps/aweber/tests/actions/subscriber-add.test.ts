import { assertEquals } from "@std/assert";
import subscriberAdd from "../../actions/subscriber-add.ts";
import { created, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-add: adds a subscriber and reads the id off Location", async () => {
  const { ctx, calls } = mockCtx([
    created("https://api.aweber.com/1.0/accounts/1/lists/2/subscribers/789"),
  ]);
  const out = await subscriberAdd.execute(
    { accountId: "1", listId: "2", email: "a@b.com", name: "A B" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/subscribers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com", name: "A B" });
  assertEquals(out, {
    id: 789,
    location: "https://api.aweber.com/1.0/accounts/1/lists/2/subscribers/789",
  });
});

/**
 * The whole point of this test: `update_existing` and `strict_custom_fields`
 * are the literal strings "true"/"false" in AWeber's schema, not JSON
 * booleans. Sending a real boolean is outside the documented enum.
 */
Deno.test("subscriber-add: converts boolean flags to the string enum AWeber documents", async () => {
  const { ctx, calls } = mockCtx([
    created("https://api.aweber.com/1.0/accounts/1/lists/2/subscribers/1"),
  ]);
  await subscriberAdd.execute(
    {
      accountId: "1",
      listId: "2",
      email: "a@b.com",
      updateExisting: true,
      strictCustomFields: false,
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.update_existing, "true");
  assertEquals(body.strict_custom_fields, "false");
  assertEquals(typeof body.update_existing, "string");
});

Deno.test("subscriber-add: omits update_existing/strict_custom_fields entirely when not set", async () => {
  const { ctx, calls } = mockCtx([
    created("https://api.aweber.com/1.0/accounts/1/lists/2/subscribers/1"),
  ]);
  await subscriberAdd.execute({ accountId: "1", listId: "2", email: "a@b.com" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals("update_existing" in body, false);
  assertEquals("strict_custom_fields" in body, false);
});

Deno.test("subscriber-add: normalizes a single tag string into a one-element array", async () => {
  const { ctx, calls } = mockCtx([
    created("https://api.aweber.com/1.0/accounts/1/lists/2/subscribers/1"),
  ]);
  await subscriberAdd.execute({ accountId: "1", listId: "2", email: "a@b.com", tags: "vip" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).tags, ["vip"]);
});
