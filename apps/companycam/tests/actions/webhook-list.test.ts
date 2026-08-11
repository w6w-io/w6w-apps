import { assert, assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * Every row of this response carries `token`, the HMAC key CompanyCam signs
 * deliveries with. Returning it would copy a live secret into the run record.
 */
Deno.test("webhook-list: strips the signing token from every row", async () => {
  const { ctx, calls } = mockCtx([{
    body: [
      { id: "42", url: "https://a/hook", scopes: ["*"], token: "s3cret-a", enabled: true },
      { id: "43", url: "https://b/hook", scopes: ["photo.*"], token: "s3cret-b", enabled: false },
    ],
  }]);
  const page = await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhooks");
  assertEquals(page.count, 2);
  const serialised = JSON.stringify(page);
  assert(!serialised.includes("s3cret-a"), "a signing token survived");
  assert(!serialised.includes("s3cret-b"), "a signing token survived");
  // Everything else is returned verbatim.
  assertEquals(page.items[0], { id: "42", url: "https://a/hook", scopes: ["*"], enabled: true });
});
