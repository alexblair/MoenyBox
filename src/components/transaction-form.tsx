"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Upload,
  Trash2,
  FileText,
  ImageIcon,
  FilmIcon,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CategorySelect } from "@/components/category-select";
import { toast } from "sonner";
import type { Category, Account, TransactionType, Attachment } from "@/types";

function isImage(mime: string) {
  return mime.startsWith("image/");
}

function isVideo(mime: string) {
  return mime.startsWith("video/");
}

function getFileIcon(mime: string) {
  if (isImage(mime)) return ImageIcon;
  if (isVideo(mime)) return FilmIcon;
  return FileText;
}

function getPreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

export interface SaveData {
  type: TransactionType;
  amount: number;
  categoryId: number | null;
  accountId: number;
  toAccountId: number | null;
  dateTime: string;
  note: string | null;
}

export interface TransactionFormHandle {
  applyTemplate: (data: {
    type: TransactionType;
    amount: string;
    categoryId: number | null;
    accountId: number;
    toAccountId: number | null;
    note: string;
  }) => void;
}

interface TransactionFormProps {
  initialData?: {
    type: TransactionType;
    amount: string;
    categoryId: number | null;
    accountId: number | null;
    toAccountId: number | null;
    dateTime: string;
    note: string;
  };
  defaultType?: TransactionType;
  attachments?: Attachment[];
  onAttachmentsChange?: (attachmentId: number) => void;
  onSave: (data: SaveData, newFiles: File[]) => Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
  saving?: boolean;
  categories: Category[];
  accounts: Account[];
  showQuickAmounts?: boolean;
}

function AttachmentPreview({ attachment, onDelete }: { attachment: Attachment; onDelete: () => void }) {
  const FileIcon = getFileIcon(attachment.mimeType);
  const preview = isImage(attachment.mimeType) || isVideo(attachment.mimeType);

  return (
    <div className="relative group rounded-md border overflow-hidden">
      {preview ? (
        <a href={attachment.filepath} target="_blank" rel="noreferrer" className="block w-24 h-24">
          {isImage(attachment.mimeType) ? (
            <img
              src={attachment.filepath}
              alt={attachment.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={attachment.filepath}
              className="w-full h-full object-cover"
              controls={false}
              muted
            />
          )}
        </a>
      ) : (
        <a
          href={attachment.filepath}
          target="_blank"
          rel="noreferrer"
          className="w-24 h-24 flex flex-col items-center justify-center gap-1 bg-muted hover:bg-accent/50 transition-colors"
        >
          <FileIcon className="h-8 w-8 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground truncate px-1 max-w-full">
            {attachment.filename}
          </span>
        </a>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </button>
      {preview && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
          <span className="text-[9px] text-white truncate block">{attachment.filename}</span>
        </div>
      )}
    </div>
  );
}

export const TransactionForm = forwardRef<TransactionFormHandle, TransactionFormProps>(function TransactionForm(
  {
    initialData,
    defaultType,
    attachments,
    onAttachmentsChange,
    onSave,
    onCancel,
    saveLabel = "保存",
    saving = false,
    categories,
    accounts,
    showQuickAmounts = false,
  },
  ref
) {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);
  const [dateTime, setDateTime] = useState("");
  const [note, setNote] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount);
        setCategoryId(initialData.categoryId);
        setAccountId(initialData.accountId);
        setToAccountId(initialData.toAccountId);
        setDateTime(initialData.dateTime);
        setNote(initialData.note);
      } else {
        setType(defaultType ?? "EXPENSE");
        setDateTime(new Date().toISOString().slice(0, 16));
        if (accounts.length > 0) {
          setAccountId(accounts[0].id);
        }
      }
      initialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialData && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, initialData, accountId]);

  useImperativeHandle(ref, () => ({
    applyTemplate(data) {
      setType(data.type);
      setAmount(data.amount);
      setCategoryId(data.categoryId);
      setAccountId(data.accountId);
      setToAccountId(data.toAccountId);
      setNote(data.note);
    },
  }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setNewFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (submitting || saving) return;

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("请输入有效金额");
      return;
    }
    if (!accountId) {
      toast.error("请选择账户");
      return;
    }
    if (type === "TRANSFER" && !toAccountId) {
      toast.error("请选择目标账户");
      return;
    }
    if (type === "TRANSFER" && toAccountId === accountId) {
      toast.error("转出和转入账户不能相同");
      return;
    }

    setSubmitting(true);
    try {
      const data: SaveData = {
        type,
        amount: parseFloat(amount),
        accountId,
        dateTime: new Date(dateTime).toISOString(),
        note: note || null,
        categoryId: type !== "TRANSFER" ? categoryId : null,
        toAccountId: type === "TRANSFER" ? toAccountId : null,
      };

      await onSave(data, newFiles);
    } finally {
      setSubmitting(false);
    }
  };

  const amountButtons = [100, 500, 1000, 5000];

  return (
    <>
      <Tabs value={type} onValueChange={(v) => { setType(v as TransactionType); setCategoryId(null); }}>
        <TabsList className="w-full">
          <TabsTrigger value="EXPENSE" className="flex-1 gap-1">
            <ArrowDownCircle className="h-4 w-4 text-red-500" /> 支出
          </TabsTrigger>
          <TabsTrigger value="INCOME" className="flex-1 gap-1">
            <ArrowUpCircle className="h-4 w-4 text-green-500" /> 收入
          </TabsTrigger>
          <TabsTrigger value="TRANSFER" className="flex-1 gap-1">
            <ArrowLeftRight className="h-4 w-4 text-blue-500" /> 转账
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-5 max-w-lg">
          <div>
            <Label className="text-base">金额</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
                ¥
              </span>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                className="h-16 pl-10 text-3xl font-bold"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            {showQuickAmounts && (
              <div className="mt-2 flex gap-2">
                {amountButtons.map((v) => (
                  <Button
                    key={v}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setAmount((prev) => String((parseFloat(prev) || 0) + v))}
                  >
                    +{v}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {type !== "TRANSFER" && (
            <div>
              <Label>分类</Label>
              <CategorySelect
                value={categoryId?.toString() || ""}
                onChange={(v) => setCategoryId(v ? Number(v) : null)}
                categories={categories}
                filterByType={type as "INCOME" | "EXPENSE"}
                className="mt-1 w-full"
              />
            </div>
          )}

          <div>
            <Label>账户</Label>
            <Select
              value={accountId?.toString() || ""}
              onValueChange={(v) => setAccountId(Number(v))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择账户" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.name} ({formatCurrency(Number(a.balance))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "TRANSFER" && (
            <div>
              <Label>到账户</Label>
              <Select
                value={toAccountId?.toString() || ""}
                onValueChange={(v) => setToAccountId(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择目标账户" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name} ({formatCurrency(Number(a.balance))})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>日期时间</Label>
            <Input
              type="datetime-local"
              className="mt-1"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>

          <div>
            <Label>备注</Label>
            <Textarea
              className="mt-1"
              placeholder="添加备注..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label>附件</Label>
            <div className="mt-1 space-y-2">
              {attachments && attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <AttachmentPreview
                      key={att.id}
                      attachment={att}
                      onDelete={() => onAttachmentsChange?.(att.id)}
                    />
                  ))}
                </div>
              )}
              {newFiles.length > 0 && (
                <div>
                  {attachments && attachments.length > 0 && (
                    <p className="text-xs text-muted-foreground mb-1">新增附件：</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {newFiles.map((file, idx) => {
                      const FileIcon = getFileIcon(file.type);
                      const preview = isImage(file.type) || isVideo(file.type);
                      return (
                        <div key={idx} className="relative group rounded-md border overflow-hidden">
                          {preview ? (
                            <div className="w-24 h-24">
                              {isImage(file.type) ? (
                                <img
                                  src={getPreviewUrl(file)}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <video
                                  src={getPreviewUrl(file)}
                                  className="w-full h-full object-cover"
                                  controls={false}
                                  muted
                                />
                              )}
                            </div>
                          ) : (
                            <div className="w-24 h-24 flex flex-col items-center justify-center gap-1 bg-muted">
                              <FileIcon className="h-8 w-8 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground truncate px-1 max-w-full">
                                {file.name}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeNewFile(idx)}
                            className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </button>
                          {preview && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                              <span className="text-[9px] text-white truncate block">{file.name}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:bg-accent/50">
                <Upload className="h-4 w-4" />
                {newFiles.length > 0
                  ? "继续添加附件"
                  : attachments && attachments.length > 0
                    ? "点击上传新附件（支持多选）"
                    : "点击上传附件（支持多选）"}
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
              </label>
            </div>
          </div>

          <div className={onCancel ? "flex gap-3" : ""}>
            {onCancel && (
              <Button
                variant="outline"
                className="flex-1 h-12 text-base"
                onClick={onCancel}
              >
                取消
              </Button>
            )}
            <Button
              className={onCancel ? "flex-1 h-12 text-base" : "w-full h-12 text-base"}
              onClick={handleSave}
              disabled={saving || submitting}
            >
              {saving || submitting ? "保存中..." : saveLabel}
            </Button>
          </div>
        </div>
      </Tabs>
    </>
  );
});
