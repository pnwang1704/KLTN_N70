import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
} from 'lucide-react';
import api from '../lib/axios';
import { cn } from '../lib/utils';

interface AiSummaryData {
  overview: string;
  highlights: string[];
  warnings: string[];
  actionableTips: string[];
  source?: 'gemini' | 'smart-fallback';
  model?: string;
  cached?: boolean;
  generatedAt?: string;
  notice?: string;
}

interface AiSummaryPanelProps {
  branchId: string;
  startDate: string;
  endDate: string;
}

export const AiSummaryPanel: React.FC<AiSummaryPanelProps> = ({
  branchId,
  startDate,
  endDate,
}) => {
  const [summary, setSummary] = useState<AiSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.post(
          '/reports/ai-summary',
          {
            branchId,
            startDate,
            endDate,
            forceRefresh,
          },
          { timeout: 60000 },
        );
        setSummary(res.data);
      } catch (err: any) {
        console.error('Lỗi gọi AI summary:', err);
        setError('Không thể tải phân tích AI lúc này. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    },
    [branchId, startDate, endDate],
  );

  useEffect(() => {
    fetchSummary(false);
  }, [fetchSummary]);

  return (
    <div className="bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/80 rounded-2xl border border-indigo-200/90 p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-zinc-900">
              ✨ AI Phân tích & Đề xuất Vận hành
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchSummary(true)}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          <span>{loading ? 'Đang phân tích...' : 'Phân tích lại'}</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-indigo-100/80 rounded-lg w-5/6" />
          <div className="h-4 bg-indigo-100/60 rounded-lg w-2/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
            <div className="h-28 bg-emerald-50/70 rounded-xl border border-emerald-100" />
            <div className="h-28 bg-amber-50/70 rounded-xl border border-amber-100" />
            <div className="h-28 bg-blue-50/70 rounded-xl border border-blue-100" />
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && summary && (
        <div className="space-y-4">
          {summary.notice && (
            <div className="px-3 py-2 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-800 text-[11px] font-medium">
              ℹ️ {summary.notice}
            </div>
          )}

          {/* Overview sentence */}
          {summary.overview && (
            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed bg-white/80 p-3.5 rounded-xl border border-indigo-100 font-medium">
              {summary.overview}
            </p>
          )}

          {/* 3 Structured Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Highlights */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs mb-2.5">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Điểm sáng kinh doanh</span>
              </div>
              <ul className="space-y-2 text-xs text-emerald-950/90 leading-relaxed">
                {(summary.highlights || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-black mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Warnings */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs mb-2.5">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>Cảnh báo rủi ro</span>
              </div>
              <ul className="space-y-2 text-xs text-amber-950/90 leading-relaxed">
                {(summary.warnings || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-black mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Tips */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-blue-900 font-extrabold text-xs mb-2.5">
                <Lightbulb size={15} className="text-blue-600 shrink-0" />
                <span>Gợi ý hành động thực tế</span>
              </div>
              <ul className="space-y-2 text-xs text-blue-950/90 leading-relaxed">
                {(summary.actionableTips || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-black inline-flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
 * AI COPILOT CHAT DRAWER
 * ========================================================================= */
interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface AiCopilotDrawerProps {
  branchId: string;
  branchLabel: string;
  startDate: string;
  endDate: string;
}

const SUGGESTED_PROMPTS = [
  'Chi nhánh nào đang hoạt động hiệu quả nhất?',
  'Tại sao tỷ lệ hủy đơn kỳ này lại tăng?',
  'Nên đẩy mạnh combo cho món nào?',
  'Khung giờ cao điểm nào cần tăng cường nhân sự?',
];

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  branchId,
  branchLabel,
  startDate,
  endDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content:
        'Xin chào! Tôi là Trợ lý AI Copilot của N70 POS. Hãy đặt câu hỏi về doanh thu, lợi nhuận, món bán chạy hoặc hiệu suất chi nhánh trong kỳ đang chọn nhé!',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, isOpen]);

  const sendQuestion = async (text: string) => {
    const q = text.trim();
    if (!q || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const res = await api.post(
        '/reports/ai-chat',
        {
          question: q,
          branchId,
          startDate,
          endDate,
          history: nextMessages.slice(-6),
        },
        { timeout: 60000 },
      );
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: res.data?.answer || 'Xin lỗi, tôi chưa nhận được phản hồi từ hệ thống AI.',
        },
      ]);
    } catch (err) {
      console.error('Lỗi AI chat:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: 'Đã xảy ra lỗi khi kết nối Trợ lý AI. Vui lòng thử lại sau giây lát.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
      >
        <Sparkles size={16} />
        <span>Hỏi đáp AI về số liệu</span>
      </button>

      {/* Slide-over Chat Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-zinc-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">AI Copilot • Hỏi đáp Số liệu</h3>
                  <p className="text-[11px] text-indigo-100 truncate max-w-[260px]">
                    {branchLabel} • {startDate} → {endDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setMessages([
                      {
                        role: 'model',
                        content:
                          'Đã làm mới cuộc trò chuyện! Bạn muốn tôi phân tích chỉ số nào trong kỳ này?',
                      },
                    ])
                  }
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white cursor-pointer"
                  title="Xóa lịch sử chat"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Suggested Prompt Chips */}
            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Câu hỏi gợi ý nhanh
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={sending}
                    onClick={() => sendQuestion(prompt)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/40">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-2',
                    m.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      m.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-indigo-100 text-indigo-700',
                    )}
                  >
                    {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div
                    className={cn(
                      'max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-2xs',
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm font-medium'
                        : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm',
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Bot size={14} />
                  </div>
                  <div className="px-3.5 py-2.5 rounded-2xl bg-white border border-zinc-200 text-xs text-zinc-500 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-600" />
                    <span>AI đang phân tích số liệu...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendQuestion(input);
              }}
              className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi về doanh thu, món ăn, chi nhánh..."
                disabled={sending}
                className="flex-1 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors cursor-pointer"
                aria-label="Gửi câu hỏi"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
