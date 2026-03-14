import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, X } from 'lucide-react';

interface ChatInputBarProps {
  onSend: (text: string, imageBase64?: string) => void;
  disabled?: boolean;
}

export default function ChatInputBar({ onSend, disabled }: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [attachedImage, setAttachedImage] = useState<{ base64: string; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 144) + 'px';
    }
  }, [text]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAttachedImage({ base64: result, name: file.name });
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !attachedImage) return;
    if (disabled) return;

    onSend(trimmed, attachedImage?.base64);
    setText('');
    setAttachedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl focus-within:border-[#0056b3] focus-within:ring-2 focus-within:ring-[#0056b3]/20 p-3 transition-all">
      {attachedImage && (
        <div className="relative inline-block mb-2">
          <img
            src={attachedImage.base64}
            alt="Anexo"
            className="w-10 h-10 object-cover rounded-lg border border-slate-200"
          />
          <button
            onClick={() => setAttachedImage(null)}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            type="button"
          >
            <X size={10} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 p-2 text-slate-400 hover:text-[#0056b3] transition-colors rounded-lg hover:bg-slate-50"
          title="Anexar imagem"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Faça uma pergunta sobre ortopedia veterinária... (Enter para enviar)"
          className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder-slate-400 font-mono min-h-[44px] max-h-[144px]"
          rows={2}
          disabled={disabled}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !attachedImage)}
          className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0056b3] flex items-center justify-center hover:bg-[#004494] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          <Send size={15} className="text-white" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}