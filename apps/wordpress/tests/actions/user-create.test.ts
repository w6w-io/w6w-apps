import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("user-create: POSTs /users with all required fields snake_cased", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }], { display });
  await action.execute!(
    {
      username: "alice",
      name: "Alice",
      firstName: "Al",
      lastName: "Ice",
      email: "a@b.co",
      password: "pw",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/users");
  assertEquals(JSON.parse(calls[0].body!), {
    username: "alice",
    name: "Alice",
    first_name: "Al",
    last_name: "Ice",
    email: "a@b.co",
    password: "pw",
  });
});

Deno.test("user-create: adds optional fields when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!(
    {
      username: "alice",
      name: "Alice",
      firstName: "Al",
      lastName: "Ice",
      email: "a@b.co",
      password: "pw",
      url: "https://alice.co",
      description: "hi",
      nickname: "al",
      slug: "alice",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.url, "https://alice.co");
  assertEquals(body.description, "hi");
  assertEquals(body.nickname, "al");
  assertEquals(body.slug, "alice");
});
