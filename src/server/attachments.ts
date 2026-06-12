import { prisma } from "@/lib/db";
import { Attachment } from "@/types";
import { unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

function computeHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function createAttachment(userId: number, data: {
  transactionId: number;
  filename: string;
  filepath: string;
  mimeType: string;
  size: number;
  hash: string;
}): Promise<Attachment> {
  const existing = await prisma.attachment.findFirst({
    where: { hash: data.hash, userId },
  });

  if (existing) {
    await prisma.transactionAttachment.upsert({
      where: {
        transactionId_attachmentId: {
          transactionId: data.transactionId,
          attachmentId: existing.id,
        },
      },
      create: {
        transactionId: data.transactionId,
        attachmentId: existing.id,
      },
      update: {},
    });
    return existing;
  }

  const attachment = await prisma.attachment.create({
    data: {
      hash: data.hash,
      filename: data.filename,
      filepath: data.filepath,
      mimeType: data.mimeType,
      size: data.size,
      userId,
      transactions: {
        create: { transactionId: data.transactionId },
      },
    },
  });
  return attachment;
}

export async function getAttachmentsByTransaction(
  transactionId: number,
  userId: number
): Promise<Attachment[]> {
  const links = await prisma.transactionAttachment.findMany({
    where: { transactionId, attachment: { userId } },
    include: { attachment: true },
    orderBy: { createdAt: "desc" },
  });
  return links.map((l) => l.attachment);
}

export async function deleteAttachment(id: number, userId: number): Promise<void> {
  const attachment = await prisma.attachment.findFirst({
    where: { id, userId },
    include: { transactions: true },
  });
  if (!attachment) throw new Error("附件不存在");

  await prisma.transactionAttachment.deleteMany({
    where: { attachmentId: id },
  });

  const remaining = await prisma.transactionAttachment.count({
    where: { attachmentId: id },
  });

  if (remaining === 0) {
    try {
      await unlink(path.join(process.cwd(), "public", attachment.filepath));
    } catch {
      // ignore if file not found
    }
    await prisma.attachment.delete({ where: { id } });
  }
}

export async function unlinkAttachmentFromTransaction(
  attachmentId: number,
  transactionId: number,
  userId: number
): Promise<void> {
  const txn = await prisma.transaction.findFirst({ where: { id: transactionId, userId } });
  if (!txn) throw new Error("交易不存在");
  const att = await prisma.attachment.findFirst({ where: { id: attachmentId, userId } });
  if (!att) throw new Error("附件不存在");

  await prisma.transactionAttachment.delete({
    where: {
      transactionId_attachmentId: {
        transactionId,
        attachmentId,
      },
    },
  });

  const remaining = await prisma.transactionAttachment.count({
    where: { attachmentId },
  });

  if (remaining === 0) {
    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, userId },
    });
    if (attachment) {
      try {
        await unlink(path.join(process.cwd(), "public", attachment.filepath));
      } catch {
        // ignore if file not found
      }
      await prisma.attachment.delete({ where: { id: attachmentId } });
    }
  }
}

export async function cleanupOrphanAttachments(userId?: number): Promise<number> {
  const where: any = { transactions: { none: {} } };
  if (userId !== undefined) where.userId = userId;
  const orphans = await prisma.attachment.findMany({ where });

  let count = 0;
  for (const attachment of orphans) {
    try {
      await unlink(path.join(process.cwd(), "public", attachment.filepath));
    } catch {
      // ignore if file not found
    }
    await prisma.attachment.delete({ where: { id: attachment.id } });
    count++;
  }
  return count;
}

export async function uploadFiles(
  transactionId: number,
  userId: number,
  files: File[]
): Promise<Attachment[]> {
  const txn = await prisma.transaction.findFirst({ where: { id: transactionId, userId } });
  if (!txn) throw new Error("交易不存在");

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const { mkdir, writeFile } = await import("fs/promises");
  await mkdir(uploadDir, { recursive: true });

  const results: Attachment[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = computeHash(buffer);

    const ext = path.extname(file.name);
    const safeName = `${hash}${ext}`;
    const webPath = `/uploads/${safeName}`;
    const fullPath = path.join(uploadDir, safeName);

    const existing = await prisma.attachment.findFirst({
      where: { hash, userId },
    });

    if (existing) {
      await prisma.transactionAttachment.upsert({
        where: {
          transactionId_attachmentId: {
            transactionId,
            attachmentId: existing.id,
          },
        },
        create: {
          transactionId,
          attachmentId: existing.id,
        },
        update: {},
      });
      results.push(existing);
      continue;
    }

    await writeFile(fullPath, buffer);

    const attachment = await prisma.attachment.create({
      data: {
        hash,
        filename: file.name,
        filepath: webPath,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        userId,
        transactions: {
          create: { transactionId },
        },
      },
    });
    results.push(attachment);
  }

  return results;
}

export async function getAttachmentById(id: number, userId: number): Promise<Attachment | null> {
  return prisma.attachment.findFirst({ where: { id, userId } });
}
