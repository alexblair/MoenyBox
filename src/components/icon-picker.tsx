"use client";

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "饮食", emojis: ["🍔", "🍕", "🍜", "🥗", "🍣", "🍩", "🍺", "☕", "🍎", "🥑", "🥩", "🍝", "🌮", "🍦", "🧃"] },
  { label: "交通", emojis: ["🚗", "🚌", "🚇", "✈️", "🚲", "⛽", "🅿️", "🚆", "🚢", "🚕", "🛵", "🚁"] },
  { label: "购物", emojis: ["🛒", "👗", "👟", "👜", "💄", "🎁", "🛍️", "👕", "👖", "👠", "🧢", "⌚"] },
  { label: "家居", emojis: ["🏠", "💡", "🔧", "🔨", "🔌", "💧", "🔥", "🧹", "🪴", "🛋️", "🚿", "🧊"] },
  { label: "娱乐", emojis: ["🎬", "🎮", "🎵", "🎤", "🎪", "🎯", "🎨", "🎭", "🎧", "🎸", "🎲", "📺"] },
  { label: "健康", emojis: ["💊", "🏥", "💉", "🩺", "🧘", "💪", "🏋️", "🧠", "🦷", "👁️"] },
  { label: "金融", emojis: ["💰", "💳", "🏦", "💵", "📈", "📉", "🧾", "💸", "🏧", "🪙"] },
  { label: "教育", emojis: ["📚", "✏️", "🎓", "📖", "📝", "📐", "🔬", "💻", "📔", "🎒"] },
  { label: "旅行", emojis: ["🏖️", "🗺️", "🏔️", "🌊", "🏛️", "🏕️", "🌅", "🎡", "🏯", "🗼"] },
  { label: "通讯", emojis: ["📱", "💻", "📧", "📞", "💬", "📷", "🎥", "🖥️", "⌨️", "📡"] },
  { label: "家庭宠物", emojis: ["👨‍👩‍👧‍👦", "🐶", "🐱", "🐾", "👶", "👪", "🐕", "🐈", "🐰"] },
  { label: "其他", emojis: ["📦", "🔋", "⚙️", "🔄", "🔑", "🛡️", "🧰", "🎀", "📌", "🧩"] },
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allEmojis = EMOJI_GROUPS.flatMap((g) => g.emojis);
  const filtered = search.trim()
    ? allEmojis.filter((e) => e.includes(search))
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-10 text-lg"
          title="选择图标"
        >
          {value || "—"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-7 text-xs"
              placeholder="搜索 emoji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
            className={`h-8 w-full flex items-center justify-center rounded-md text-xs hover:bg-accent transition-colors mb-1 ${
              value === "" ? "bg-accent ring-1 ring-ring" : ""
            }`}
          >
            无
          </button>
          {filtered ? (
            <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">未找到匹配的 emoji</p>
              ) : (
                filtered.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => { onChange(emoji); setOpen(false); setSearch(""); }}
                    className={`h-8 w-8 flex items-center justify-center rounded-md text-base hover:bg-accent transition-colors ${
                      value === emoji ? "bg-accent ring-1 ring-ring" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {EMOJI_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">{group.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => { onChange(emoji); setOpen(false); }}
                        className={`h-7 w-7 flex items-center justify-center rounded-md text-sm hover:bg-accent transition-colors ${
                          value === emoji ? "bg-accent ring-1 ring-ring" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1 border-t">
            <span className="text-[10px] text-muted-foreground shrink-0">自定义:</span>
            <Input
              className="h-7 text-xs flex-1"
              placeholder="粘贴任意 emoji"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
