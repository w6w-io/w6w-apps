import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-profile.ts";

Deno.test("create-profile: POSTs a JSON:API envelope to /profiles/", async () => {
  const body = { data: { type: "profile", id: "p1" } };
  const { ctx, calls } = mockCtx([{ status: 201, body }]);
  const result = await action.execute!(
    {
      email: "a@x.com",
      firstName: "Alice",
      properties: { tier: "gold" },
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/profiles/");
  assertEquals(calls[0].method, "POST");

  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "profile");
  assertEquals(sent.data.attributes.email, "a@x.com");
  assertEquals(sent.data.attributes.first_name, "Alice");
  assertEquals(sent.data.attributes.properties.tier, "gold");
  assertEquals(result, body);
});
