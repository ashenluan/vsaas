'use client';

import { useState } from 'react';
import { aiApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2 } from 'lucide-react';

interface PromptPolishButtonProps {
  prompt: string;
  type: 'image' | 'video';
  onPolished: (polished: string) => void;
  className?: string;
}

export function PromptPolishButton({
  prompt,
  type,
  onPolished,
  className,
}: PromptPolishButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePolish = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const { polished } = await aiApi.polishPrompt(prompt.trim(), type);
      if (polished && polished !== prompt.trim()) {
        onPolished(polished);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePolish}
      disabled={!prompt.trim() || loading}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-all hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Sparkles size={12} />
      )}
      AI润色
    </button>
  );
}
