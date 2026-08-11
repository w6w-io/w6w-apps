import { assertEquals } from "@std/assert";
import folderCreate from "../../actions/folder-create.ts";
import { jsonBody, mockCtx, q, url } from "../_helpers.ts";

const folder = { uri: "/users/152184/projects/12345", name: "Rough cuts" };

Deno.test("folder-create: POSTs /me/projects with just the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: folder }]);
  await folderCreate.execute({ name: "Rough cuts" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(url(calls[0]).pathname, "/me/projects");
  assertEquals(jsonBody(calls[0]), { name: "Rough cuts" });
});

/** Vimeo takes the parent as a full URI, not an id. */
Deno.test("folder-create: forwards the parent folder URI verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: folder }]);
  await folderCreate.execute(
    { name: "Sub", parentFolderUri: "/users/152184/projects/6789" },
    ctx,
  );
  assertEquals(jsonBody(calls[0]), {
    name: "Sub",
    parent_folder_uri: "/users/152184/projects/6789",
  });
});

Deno.test("folder-create: fields goes on the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: folder }]);
  await folderCreate.execute({ name: "x", fields: "uri,name" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri,name");
});

/** No idempotency key and no name uniqueness, so a retry creates a second folder. */
Deno.test("folder-create: is explicitly not idempotent", () => {
  assertEquals(folderCreate.type, "perform");
  assertEquals(folderCreate.idempotent, false);
});
