import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/request-create.ts";

Deno.test("request-create: POSTs summary/description as plain strings, not ADF", async () => {
  const { ctx, calls } = mockJsmCtx([{ status: 201, body: { issueId: "1", issueKey: "HD-1" } }]);
  await action.execute(
    {
      serviceDeskId: "10",
      requestTypeId: "25",
      summary: "Need a mouse",
      description: "For my Mac",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/servicedeskapi/request");
  assertEquals(JSON.parse(calls[0].body!), {
    serviceDeskId: "10",
    requestTypeId: "25",
    requestFieldValues: { summary: "Need a mouse", description: "For my Mac" },
  });
});

Deno.test("request-create: merges additional field values and participants", async () => {
  const { ctx, calls } = mockJsmCtx([{ status: 201, body: {} }]);
  await action.execute(
    {
      serviceDeskId: "10",
      requestTypeId: "25",
      summary: "x",
      requestFieldValues: { customfield_1: "y" },
      requestParticipants: "acc-1, acc-2",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.requestFieldValues, { summary: "x", customfield_1: "y" });
  assertEquals(body.requestParticipants, ["acc-1", "acc-2"]);
});
