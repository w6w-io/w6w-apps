import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/templates-list.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("templates-list: GETs /messageTemplates with pagination, omitting channel when unset", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { templates: [], page_number: 1, page_size: 10, total: 0 } }],
    conn,
  );
  const out = await action.execute({ pageNumber: 1, pageSize: 10 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/messageTemplates?page_number=1&page_size=10",
  );
  assertEquals(out, { templates: [], page_number: 1, page_size: 10, total: 0 });
});

Deno.test("templates-list: includes channel when set", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { templates: [], page_number: 1, page_size: 10 } }],
    conn,
  );
  await action.execute({ channel: "1234567890", pageNumber: 1, pageSize: 10 }, ctx);
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/messageTemplates?channel=1234567890&page_number=1&page_size=10",
  );
});
