import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-update.ts";

Deno.test("person-update: PUTs /people/:id with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 5 } } }]);
  await action.execute!({ id: 5, title: "VP Sales", doNotContact: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/people/5");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.title, "VP Sales");
  assertEquals(body.do_not_contact, true);
  assertEquals(body.id, undefined);
});
