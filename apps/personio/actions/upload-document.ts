import type { ActionDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, flattenAttributes, formatPersonioError } from "../lib/client.ts";

/**
 * `POST /company/documents` — `multipart/form-data`, built directly with `FormData` since
 * every other call in this app sends JSON. Personio's own description names a documented
 * per-endpoint rate limit of **60 requests per minute** — separate from any account-wide
 * limit — and a 30MB file-size ceiling; exceeding either fails, not throttles-and-retries.
 */
interface Input {
  employeeId: number;
  categoryId: number;
  title: string;
  file: unknown;
  comment?: string;
  date?: string;
}

interface UploadResponse {
  data?: {
    id?: number;
    attributes?: {
      title?: string;
      date?: string;
      comment?: string;
      employee?: { attributes?: Record<string, { value?: unknown }> };
      category?: { id?: number; attributes?: { name?: string } };
    };
  };
}

const uploadDocument: ActionDefinition<Input, unknown> = {
  key: "upload-document",
  type: "perform",
  resource: "document",
  title: "Upload Document",
  description: "Upload a document to an employee's profile. Rate-limited to 60 requests " +
    "per minute; max file size 30MB.",
  idempotent: false,
  params: [
    { key: "employeeId", label: "Employee ID", type: "number", required: true },
    {
      key: "categoryId",
      label: "Document category ID",
      type: "number",
      required: true,
      hint: "From List Document Categories.",
    },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "file", label: "File", type: "file", required: true },
    { key: "comment", label: "Comment", type: "text", advanced: true },
    { key: "date", label: "Date", type: "date", advanced: true },
  ],
  output: [
    { key: "id", type: "number", label: "Document ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "employee", type: "object", label: "Employee (flattened attributes)" },
  ],

  async execute(input, ctx) {
    const form = new FormData();
    form.append("employee_id", String(input.employeeId));
    form.append("category_id", String(input.categoryId));
    form.append("title", input.title);
    // `input.file` arrives as whatever the host's `file` param resolves to (a Blob/File in
    // the reference runtime); FormData accepts it directly.
    form.append("file", input.file as Blob);
    if (input.comment) form.append("comment", input.comment);
    if (input.date) form.append("date", input.date);

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/company/documents`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      throw new Error(await formatPersonioError(res, "POST", "/company/documents"));
    }
    const body = await res.json() as UploadResponse;
    const a = body.data?.attributes;
    return {
      id: body.data?.id,
      title: a?.title,
      employee: flattenAttributes(a?.employee?.attributes),
    };
  },
};

export default uploadDocument;
