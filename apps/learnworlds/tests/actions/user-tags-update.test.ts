import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-tags-update.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("user-tags-update: PUTs /v2/users/{id}/tags with tags as an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", tags: ["vip"] } }], conn);
  await action.execute!({ id: "1", tags: "vip, new", action: "attach" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://yourschool.learnworlds.com/admin/api/v2/users/1/tags",
  );
  assertEquals(JSON.parse(calls[0].body!), { tags: ["vip", "new"], action: "attach" });
});

Deno.test("user-tags-update: an empty tags list throws before any request is made", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ id: "1", tags: "", action: "attach" }, ctx);
  } catch (err) {
    threw = true;
    assert((err as Error).message.includes("at least one tag"));
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

Deno.test("user-tags-update: idempotent is true", () => {
  assertEquals(action.idempotent, true);
});
