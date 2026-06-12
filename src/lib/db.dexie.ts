import Dexie, { type Table } from "dexie";

export interface OfflineTransaction {
  id?: number;
  localId: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  categoryId: number | null;
  accountId: number;
  toAccountId: number | null;
  note: string | null;
  dateTime: string;
  synced: boolean;
  createdAt: string;
}

export interface OfflineAttachment {
  id?: number;
  localId: string;
  transactionLocalId: string;
  filename: string;
  data: Blob;
  mimeType: string;
  synced: boolean;
  createdAt: string;
}

class MoneyBoxDB extends Dexie {
  offlineTransactions!: Table<OfflineTransaction, number>;
  offlineAttachments!: Table<OfflineAttachment, number>;

  constructor() {
    super("MoneyBoxDB");
    this.version(1).stores({
      offlineTransactions:
        "++id, localId, type, categoryId, accountId, synced, dateTime",
      offlineAttachments:
        "++id, localId, transactionLocalId, synced",
    });
  }
}

export const db = new MoneyBoxDB();
