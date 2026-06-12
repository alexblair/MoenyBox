import Dexie, { type Table } from "dexie";

export interface OfflineTransaction {
  id?: number;
  type: string;
  amount: number;
  categoryId: number | null;
  accountId: number;
  toAccountId: number | null;
  note: string | null;
  dateTime: string;
  synced: boolean;
}

export interface OfflineAttachment {
  id?: number;
  localId: number;
  filename: string;
  data: ArrayBuffer;
  mimeType: string;
  synced: boolean;
}

class OfflineDb extends Dexie {
  transactions!: Table<OfflineTransaction, number>;
  attachments!: Table<OfflineAttachment, number>;

  constructor() {
    super("MoneyBoxOffline");
    this.version(1).stores({
      transactions: "++id, dateTime, type, synced",
      attachments: "++id, localId, synced",
    });
  }
}

export const offlineDb = new OfflineDb();

export async function saveOfflineTransaction(
  data: Omit<OfflineTransaction, "id" | "synced">
): Promise<number> {
  return offlineDb.transactions.add({ ...data, synced: false });
}

export async function getOfflineTransactions(): Promise<
  OfflineTransaction[]
> {
  return offlineDb.transactions
    .where("synced")
    .equals(0)
    .sortBy("dateTime");
}

export async function markSynced(id: number): Promise<void> {
  await offlineDb.transactions.update(id, { synced: true });
}

export async function clearSynced(): Promise<void> {
  await offlineDb.transactions.where("synced").equals(1).delete();
  await offlineDb.attachments.where("synced").equals(1).delete();
}

export async function syncOfflineTransactions(): Promise<void> {
  const pending = await getOfflineTransactions();
  for (const tx of pending) {
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tx.type,
          amount: tx.amount,
          categoryId: tx.categoryId,
          accountId: tx.accountId,
          toAccountId: tx.toAccountId,
          note: tx.note,
          dateTime: tx.dateTime,
        }),
      });
      if (res.ok) {
        await markSynced(tx.id!);
      }
    } catch {
      // will retry next sync
    }
  }
}
