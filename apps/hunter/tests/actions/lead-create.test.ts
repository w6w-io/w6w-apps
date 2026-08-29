import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/lead-create.ts";

Deno.test("lead-create: POSTs /leads with a JSON body", async () => {
  const body = envelope({ id: 3, email: "alexis@reddit.com" });
  const { ctx, calls } = mockCtx([{ status: 201, body }]);
  const result = await action.execute!({
    email: "alexis@reddit.com",
    firstName: "Alexis",
    lastName: "Ohanian",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.email, "alexis@reddit.com");
  assertEquals(sent.first_name, "Alexis");
  assertEquals(sent.last_name, "Ohanian");
  assertEquals(result, body);
});

Deno.test("lead-create: is not marked idempotent", () => {
  assertEquals(action.idempotent, false);
});
