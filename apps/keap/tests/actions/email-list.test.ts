import { assertEquals } from "@std/assert";
import emailList from "../../actions/email-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { emails: [{ id: "1", subject: "Hi" }], next_page_token: "n" };

Deno.test("email-list: reads the emails collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await emailList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/emails");
  assertEquals(out.count, 1);
});

/**
 * The date clauses are named `start_created_time`/`end_created_time` here — a
 * third spelling of the same idea after contacts and tasks.
 */
Deno.test("email-list: the send window uses this endpoint's own clause names", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await emailList.execute(
    { sinceCreatedTime: "2026-01-01T00:00:00.000Z", untilCreatedTime: "2026-02-01T00:00:00.000Z" },
    ctx,
  );
  assertEquals(
    queryOf(calls[0].url).filter,
    "start_created_time==2026-01-01T00:00:00.000Z;end_created_time==2026-02-01T00:00:00.000Z",
  );
});

Deno.test("email-list: filters by contact, which is how a queued send is found afterwards", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await emailList.execute({ contactId: "42" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "contact_id==42");
});
