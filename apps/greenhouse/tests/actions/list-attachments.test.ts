import { assert, assertEquals, assertThrows } from "@std/assert";
import listAttachments from "../../actions/list-attachments.ts";
import { attachmentTypeOptions } from "../../lib/params.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-attachments: calls GET /v3/attachments", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1, url: "https://s3/signed" }])]);
  await listAttachments.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/attachments");
});

Deno.test("list-attachments: carries all ten documented types", () => {
  assertEquals(attachmentTypeOptions.length, 10);
  assert(attachmentTypeOptions.some((o) => o.value === "resume"));
  assert(attachmentTypeOptions.some((o) => o.value === "signed_offer_letter"));
});

Deno.test("list-attachments: attachments live at both the candidate and application level", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listAttachments.execute({ candidateIds: "1", applicationIds: "2", type: "resume" }, ctx);
  assertEquals(queryOf(calls[0].url), {
    candidate_ids: "1",
    application_ids: "2",
    type: "resume",
  });
});

/**
 * Greenhouse hands out signed S3 links valid for seven days and says outright
 * not to rely on them later. Storing one and following it next month gets an S3
 * error, not a file — so the action warns at run time, not only in prose.
 */
Deno.test("list-attachments: warns at run time that the URLs are short-lived", async () => {
  const { ctx, logs } = mockCtx([listPage([])]);
  await listAttachments.execute({}, ctx);
  assert(logs.some((l) => l.message.includes("signed and temporary")), JSON.stringify(logs));
});

Deno.test("list-attachments: a cursor rejects the type filter it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listAttachments.execute({ cursor: "N", type: "resume" }, ctx),
    Error,
  );
  assert(err.message.includes("type"), err.message);
});
