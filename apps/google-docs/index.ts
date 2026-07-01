import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";
import documentCreate from "./actions/document-create.ts";
import documentGet from "./actions/document-get.ts";
import documentBatchUpdate from "./actions/document-batch-update.ts";
import documentInsertText from "./actions/document-insert-text.ts";
import documentReplaceText from "./actions/document-replace-text.ts";
import documentInsertTable from "./actions/document-insert-table.ts";
import documentInsertPageBreak from "./actions/document-insert-page-break.ts";
import documentCreateHeader from "./actions/document-create-header.ts";
import documentCreateFooter from "./actions/document-create-footer.ts";
import documentDeleteHeader from "./actions/document-delete-header.ts";
import documentDeleteFooter from "./actions/document-delete-footer.ts";
import documentDeletePositionedObject from "./actions/document-delete-positioned-object.ts";
import documentCreateNamedRange from "./actions/document-create-named-range.ts";
import documentDeleteNamedRange from "./actions/document-delete-named-range.ts";
import documentCreateParagraphBullets from "./actions/document-create-paragraph-bullets.ts";
import documentDeleteParagraphBullets from "./actions/document-delete-paragraph-bullets.ts";
import documentInsertTableRow from "./actions/document-insert-table-row.ts";
import documentInsertTableColumn from "./actions/document-insert-table-column.ts";
import documentDeleteTableRow from "./actions/document-delete-table-row.ts";
import documentDeleteTableColumn from "./actions/document-delete-table-column.ts";

export default {
  actions: [
    documentCreate,
    documentGet,
    documentBatchUpdate,
    documentInsertText,
    documentReplaceText,
    documentInsertTable,
    documentInsertPageBreak,
    documentCreateHeader,
    documentCreateFooter,
    documentDeleteHeader,
    documentDeleteFooter,
    documentDeletePositionedObject,
    documentCreateNamedRange,
    documentDeleteNamedRange,
    documentCreateParagraphBullets,
    documentDeleteParagraphBullets,
    documentInsertTableRow,
    documentInsertTableColumn,
    documentDeleteTableRow,
    documentDeleteTableColumn,
  ],
  auth: [oauth2, serviceAccount],
} satisfies AppDefinition;
