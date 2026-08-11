import { assert, assertEquals, assertRejects } from "@std/assert";
import smartEmailGet from "../../actions/smart-email-get.ts";
import { API_PATH, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("smart-email-get: builds /transactional/smartEmail/{id} with no extension", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await smartEmailGet.execute({ smartEmailId: "c475db61-665e-11eb-b2b7-51b1f4471faa" }, ctx);
  assertEquals(
    pathOf(calls[0].url),
    `${API_PATH}/transactional/smartEmail/c475db61-665e-11eb-b2b7-51b1f4471faa`,
  );
});

/**
 * EmailVariables is the field that makes this action worth calling: it names
 * exactly what smart-email-send's Data object may contain.
 */
Deno.test("smart-email-get: surfaces the template's email variables", async () => {
  const body = {
    SmartEmailID: "c475db61-665e-11eb-b2b7-51b1f4471faa",
    Name: "Welcome email",
    Status: "Active",
    CreatedAt: "2014-01-15T16:09:19-05:00",
    Properties: {
      From: "Hello <a@example.com>",
      Content: { Html: "...", EmailVariables: ["username", "user_id"] },
    },
    AddRecipientsToList: "62eaaa0338245ca68e5e93daa6f591e9",
  };
  const { ctx } = mockCtx([{ body }]);
  const out = await smartEmailGet.execute({ smartEmailId: "id" }, ctx);
  const props = out.Properties as { Content: { EmailVariables: string[] } };
  assertEquals(props.Content.EmailVariables, ["username", "user_id"]);
  // Here AddRecipientsToList is a LIST ID; on the send endpoint it is a boolean.
  assertEquals(typeof out.AddRecipientsToList, "string");
});

Deno.test("smart-email-get: surfaces code 926 for an unknown smart email", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody(926, "Smart email not found") }]);
  const err = await assertRejects(
    async () => await smartEmailGet.execute({ smartEmailId: "nope" }, ctx),
    Error,
  );
  assert(err.message.includes("code 926"), err.message);
});
