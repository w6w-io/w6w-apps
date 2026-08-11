import { assert, assertEquals } from "@std/assert";
import projectDocumentCreate from "../../actions/project-document-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The file crosses as base64 text inside JSON. Nothing binary is sent, which is
 * why this endpoint is reachable from the sandbox and a multipart upload would
 * not be.
 */
Deno.test("project-document-create: sends base64 text in a nested JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "115" } }]);
  await projectDocumentCreate.execute({
    projectId: "1",
    name: "test.txt",
    attachment: "VGVzdAo=",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/projects/1/documents");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { document: { name: "test.txt", attachment: "VGVzdAo=" } });
});

Deno.test("project-document-create: states the 30 MB limit and the base64 overhead", () => {
  const attachment = projectDocumentCreate.params!.find((p) => p.key === "attachment")!;
  assert(/30 MB/.test(attachment.hint!), attachment.hint);
  assert(/third larger/.test(attachment.hint!), attachment.hint);
  assertEquals(projectDocumentCreate.idempotent, false);
});
