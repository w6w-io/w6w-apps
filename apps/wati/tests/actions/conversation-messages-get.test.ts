import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-messages-get.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("conversation-messages-get: GETs /conversations/{target}/messages with pagination", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { message_list: [], page_number: 1, page_size: 10 } }],
    conn,
  );
  const out = await action.execute(
    { target: "123456789:1415552671", pageNumber: 1, pageSize: 10 },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/conversations/123456789%3A1415552671/messages?page_number=1&page_size=10",
  );
  assertEquals(out, { message_list: [], page_number: 1, page_size: 10 });
});
