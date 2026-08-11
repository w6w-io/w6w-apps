import { assert, assertEquals, assertRejects } from "@std/assert";
import listGet from "../../actions/list-get.ts";
import { API_PATH, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-get: GETs /lists/{listid}.json with no client id", async () => {
  const body = {
    ConfirmedOptIn: false,
    Title: "Website Subscribers",
    UnsubscribeSetting: "AllClientLists",
    ListID: "a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await listGet.execute({ listId: "a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" }, ctx);
  assertEquals(
    pathOf(calls[0].url),
    `${API_PATH}/lists/a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1.json`,
  );
  assertEquals(out, body);
});

/**
 * The 401 that is NOT an auth failure. Code 102 means the credential is fine and
 * the id belongs to someone else; the message must not read like an expired key.
 */
Deno.test("list-get: a 401 code 102 is reported as a wrong ID, not a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(102, "Invalid ClientID") }]);
  const err = await assertRejects(
    async () => await listGet.execute({ listId: "nope" }, ctx),
    Error,
  );
  assert(err.message.includes("code 102"), err.message);
  assert(
    err.message.includes("the credential is fine"),
    "code 102 must be glossed as a resource-id problem: " + err.message,
  );
});
