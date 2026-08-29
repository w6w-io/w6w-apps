import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/email-finder.ts";

Deno.test("email-finder: GETs /email-finder with domain + first/last name", async () => {
  const body = envelope({ email: "alexis@reddit.com", score: 97 });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({
    domain: "reddit.com",
    firstName: "Alexis",
    lastName: "Ohanian",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/email-finder");
  const q = queryOf(calls[0].url);
  assertEquals(q.domain, "reddit.com");
  assertEquals(q.first_name, "Alexis");
  assertEquals(q.last_name, "Ohanian");
  assertEquals(result, body);
});

Deno.test("email-finder: forwards linkedinHandle and maxDuration", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute!({ linkedinHandle: "aohanian", maxDuration: 15 }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.linkedin_handle, "aohanian");
  assertEquals(q.max_duration, "15");
});
