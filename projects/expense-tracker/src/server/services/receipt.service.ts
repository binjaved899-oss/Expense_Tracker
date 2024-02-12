import { z } from 'zod';
import { TransactionalLedgerDatabase, db } from '../db/client';
import { ReceiptItemRecord, ReimbursementStatus } from '../db/schema';
import { NotFoundError } from '../../utils/errors';

export const CreateReceiptItemSchema = z.object({
  transactionId: z.string().min(1, 'Parent transaction is required.'),
  itemName: z.string().trim().min(2, 'Line item description is required.').max(120),
  quantity: z.number().int().positive('Quantity must be a positive integer.').default(1),
  unitPriceCents: z.number().int().positive('Unit price must be positive cents.'),
  taxCents: z.number().int().nonnegative('Tax cents cannot be negative.').default(0),
  categoryId: z.string().min(1, 'Category is required.'),
  reimbursementStatus: z.enum(['NONE', 'PENDING', 'SUBMITTED', 'REIMBURSED']).default('NONE'),
  reimbursementClaimCode: z.string().trim().nullable().optional(),
  sharedWithPerson: z.string().trim().nullable().optional(),
});

export interface ReceiptsSummary {
  items: ReceiptItemRecord[];
  totalItemizedCents: number;
  pendingReimbursementCents: number;
  submittedReimbursementCents: number;
  reimbursedTotalCents: number;
  sharedSplitTotalCents: number;
}

export class ReceiptService {
  private readonly database: TransactionalLedgerDatabase;

  constructor(database: TransactionalLedgerDatabase = db) {
    this.database = database;
  }

  public getReceiptsSummary(filterStatus?: ReimbursementStatus | 'ALL' | 'SHARED'): ReceiptsSummary {
    const all = this.database.getStateRef().receiptItems;
    const filtered = all.filter((item) => {
      if (!filterStatus || filterStatus === 'ALL') return true;
      if (filterStatus === 'SHARED') return Boolean(item.sharedWithPerson);
      return item.reimbursementStatus === filterStatus;
    });

    let totalItemizedCents = 0;
    let pendingReimbursementCents = 0;
    let submittedReimbursementCents = 0;
    let reimbursedTotalCents = 0;
    let sharedSplitTotalCents = 0;

    for (const item of all) {
      totalItemizedCents += item.totalCents;
      if (item.reimbursementStatus === 'PENDING') pendingReimbursementCents += item.totalCents;
      if (item.reimbursementStatus === 'SUBMITTED') submittedReimbursementCents += item.totalCents;
      if (item.reimbursementStatus === 'REIMBURSED') reimbursedTotalCents += item.totalCents;
      if (item.sharedWithPerson) sharedSplitTotalCents += Math.round(item.totalCents / 2);
    }

    return {
      items: filtered,
      totalItemizedCents,
      pendingReimbursementCents,
      submittedReimbursementCents,
      reimbursedTotalCents,
      sharedSplitTotalCents,
    };
  }

  public addReceiptLineItem(
    rawInput: unknown,
    actorUserId = 'usr-owner-01'
  ): ReceiptItemRecord {
    const parsed = CreateReceiptItemSchema.parse(rawInput);

    return this.database.transaction((draft) => {
      const tx = draft.transactions.find((t) => t.id === parsed.transactionId);
      if (!tx) {
        throw new NotFoundError('Transaction', parsed.transactionId);
      }

      const totalCents = parsed.quantity * parsed.unitPriceCents + parsed.taxCents;
      const item: ReceiptItemRecord = {
        id: this.database.nextId('rcp-item'),
        transactionId: tx.id,
        merchantName: tx.merchant,
        occurredOn: tx.occurredOn,
        itemName: parsed.itemName,
        quantity: parsed.quantity,
        unitPriceCents: parsed.unitPriceCents,
        taxCents: parsed.taxCents,
        totalCents,
        categoryId: parsed.categoryId,
        reimbursementStatus: parsed.reimbursementStatus,
        reimbursementClaimCode:
          parsed.reimbursementClaimCode ??
          (parsed.reimbursementStatus !== 'NONE' ? `CLM-2024-${this.database.nextId('c')}` : null),
        sharedWithPerson: parsed.sharedWithPerson ?? null,
      };

      draft.receiptItems.unshift(item);

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'RECEIPT_ITEM_ADDED',
        entityType: 'RECEIPT_ITEM',
        entityId: item.id,
        summary: `Added receipt line item "${item.itemName}" (${item.totalCents} cents) to "${tx.merchant}".`,
        metadata: {
          transactionId: tx.id,
          totalCents: item.totalCents,
          reimbursementStatus: item.reimbursementStatus,
        },
      });

      return item;
    });
  }

  public updateReimbursementStatus(
    itemId: string,
    newStatus: ReimbursementStatus,
    actorUserId = 'usr-owner-01'
  ): ReceiptItemRecord {
    return this.database.transaction((draft) => {
      const item = draft.receiptItems.find((r) => r.id === itemId);
      if (!item) {
        throw new NotFoundError('Receipt Line Item', itemId);
      }
      const prevStatus = item.reimbursementStatus;
      item.reimbursementStatus = newStatus;
      if (!item.reimbursementClaimCode && newStatus !== 'NONE') {
        item.reimbursementClaimCode = `CLM-2024-${this.database.nextId('c')}`;
      }

      this.database.appendAuditLog({
        actorUserId,
        actorName: 'Amina Tariq',
        action: 'RECEIPT_REIMBURSEMENT_UPDATED',
        entityType: 'RECEIPT_ITEM',
        entityId: item.id,
        summary: `Updated reimbursement status for "${item.itemName}" from ${prevStatus} to ${newStatus}.`,
        metadata: { prevStatus, newStatus },
      });

      return { ...item };
    });
  }
}

export const receiptService = new ReceiptService(db);
