import { assert, assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/send-sms.ts";

Deno.test("send-sms: POSTs a JSON body to /messages", async () => {
  const body = { id: "e8077d803532c0b5937c639b60216938", href: "https://x", recipients: {} };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await action.execute!(
    { recipients: ["+31612345678"], originator: "YourName", message: "hello" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/messages");
  assertEquals(calls[0].headers["content-type"], "application/json");

  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.recipients, ["31612345678"]);
  assertEquals(sent.originator, "YourName");
  assertEquals(sent.body, "hello");
  assertEquals(result, body);
});

Deno.test("send-sms: strips a leading + from every recipient", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { recipients: ["+31612345678", "31687654321"], originator: "A", message: "x" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.recipients, ["31612345678", "31687654321"]);
});

Deno.test("send-sms: optional fields are omitted from the payload when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ recipients: ["1"], originator: "A", message: "x" }, ctx);
  const sent = JSON.parse(calls[0].body ?? "{}");
  assert(!("reference" in sent), JSON.stringify(sent));
  assert(!("scheduledDatetime" in sent), JSON.stringify(sent));
});

Deno.test("send-sms: passes through type, datacoding, reference, reportUrl, validity, scheduling", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      recipients: ["1"],
      originator: "A",
      message: "x",
      type: "flash",
      datacoding: "unicode",
      reference: "ref-1",
      reportUrl: "https://example.com/hook",
      validity: 60,
      scheduledDatetime: "2026-09-01T10:00:00Z",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.type, "flash");
  assertEquals(sent.datacoding, "unicode");
  assertEquals(sent.reference, "ref-1");
  assertEquals(sent.reportUrl, "https://example.com/hook");
  assertEquals(sent.validity, 60);
  assertEquals(sent.scheduledDatetime, "2026-09-01T10:00:00Z");
});

Deno.test("send-sms: idempotent is explicitly false — a retry must not double-send", () => {
  assertEquals(action.idempotent, false);
});
