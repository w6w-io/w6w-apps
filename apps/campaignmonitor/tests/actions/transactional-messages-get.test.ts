import { assert, assertEquals } from "@std/assert";
import transactionalMessagesGet, {
  MAX_MESSAGE_COUNT,
} from "../../actions/transactional-messages-get.ts";
import { API_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transactional-messages-get: GETs /transactional/messages with no extension", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await transactionalMessagesGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/transactional/messages`);
});

/**
 * Cursor pagination, not page numbers. Offering `page` here would be offering a
 * parameter this endpoint ignores.
 */
Deno.test("transactional-messages-get: pages by message ID cursor, never by page number", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await transactionalMessagesGet.execute({
    status: "bounced",
    count: 200,
    sentBeforeId: "m1",
    sentAfterId: "m2",
    group: "Password Reset",
    smartEmailId: "sid",
    clientId: "cid",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    status: "bounced",
    count: "200",
    sentBeforeID: "m1",
    sentAfterID: "m2",
    group: "Password Reset",
    smartEmailID: "sid",
    clientID: "cid",
  });

  const keys = (transactionalMessagesGet.params ?? []).map((p) => p.key);
  assert(!keys.includes("page"), "this endpoint has no page parameter");
  assert(!keys.includes("pageSize"), "this endpoint has no pagesize parameter");
});

Deno.test("transactional-messages-get: the count param declares the vendor's 200 ceiling", () => {
  const count = (transactionalMessagesGet.params ?? []).find((p) => p.key === "count");
  assertEquals(count?.default, 50);
  assertEquals(count?.validation?.max, MAX_MESSAGE_COUNT);
  assertEquals(MAX_MESSAGE_COUNT, 200);
});
