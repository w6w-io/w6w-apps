import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: GETs /users and forwards the cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { users: [{ id: "u1", email: "jane.doe@example.com", username: "Jane Doe" }] },
  }]);
  const out = await action.execute({ cursor: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/users");
  assertEquals(url.searchParams.get("_"), "abc");
  assertEquals(out.users, [{ id: "u1", email: "jane.doe@example.com", username: "Jane Doe" }]);
});

Deno.test("user-list: extracts nextCursor", async () => {
  const { ctx } = mockCtx([{
    body: {
      users: [],
      links: [{
        name: "next",
        href: "https://public-api.process.st/api/v1.1/users?_=u2",
        type: "Api",
      }],
    },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(out.nextCursor, "u2");
});
