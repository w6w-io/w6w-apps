import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("user-create: POSTs to /v2/users", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1", email: "a@b.com" } }], conn);
  await action.execute!({ email: "a@b.com", username: "ab" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://yourschool.learnworlds.com/admin/api/v2/users");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com", username: "ab" });
});

Deno.test("user-create: tags become an array and fields JSON is parsed", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!(
    { email: "a@b.com", username: "ab", tags: "vip, lead", fields: '{"country":"GR"}' },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tags, ["vip", "lead"]);
  assertEquals(body.fields, { country: "GR" });
});

Deno.test("user-create: invalid fields JSON throws before any request is made", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ email: "a@b.com", username: "ab", fields: "{not json" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("user-create: idempotent is false — two calls could both fail with duplicate-email, not necessarily create two users", () => {
  assertEquals(action.idempotent, false);
});
