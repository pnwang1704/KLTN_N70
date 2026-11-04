import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Copy, Check, ExternalLink, QrCode, Coffee } from 'lucide-react';

interface TableQrModalProps {
  tableId: string;
  branchId: string;
  onClose: () => void;
}

const DEFAULT_CUSTOMER_WEB_URL = (
  import.meta.env.VITE_CUSTOMER_WEB_URL || 'https://customer-web-lac.vercel.app'
).replace(/\/+$/, '');

function formatTableCode(tableId: string): string {
  if (/^\d+$/.test(tableId.trim())) {
    return `B${String(parseInt(tableId.trim(), 10)).padStart(2, '0')}`;
  }
  return tableId.trim().toUpperCase();
}

export const TableQrModal: React.FC<TableQrModalProps> = ({ tableId, branchId, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let node = document.getElementById('print-root');
    if (!node) {
      node = document.createElement('div');
      node.id = 'print-root';
      node.className = 'hidden print:block';
      document.body.appendChild(node);
    }
    setMountNode(node);
  }, []);

  const tableCode = formatTableCode(tableId);
  const branchParam = branchId && String(branchId) !== '1' ? `&branchId=${encodeURIComponent(branchId)}` : '';
  const qrUrl = `${DEFAULT_CUSTOMER_WEB_URL}/?tableId=${encodeURIComponent(tableId)}${branchParam}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 print:hidden">
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <QrCode size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Mã QR Gọi Món • Bàn {tableId} ({tableCode})
                </h3>
                <p className="text-xs text-zinc-500">Chi nhánh {branchId || '1'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-200/70 transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          {/* QR Sticker Preview */}
          <div className="p-6 flex flex-col items-center">
            <div className="w-full max-w-[290px] bg-white border-2 border-dashed border-zinc-300 rounded-3xl p-5 flex flex-col items-center text-center shadow-sm">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-orange-600 mb-1">
                <Coffee size={14} /> N70 COFFEE & TEA
              </div>
              <div className="px-4 py-1 rounded-full bg-zinc-900 text-white text-sm font-black tracking-wide mb-4">
                BÀN SỐ: {tableCode}
              </div>

              <div className="p-3 bg-white rounded-2xl border border-zinc-200 shadow-xs">
                <QRCodeSVG
                  value={qrUrl}
                  size={200}
                  level="H"
                  marginSize={2}
                />
              </div>

              <p className="mt-3.5 text-xs font-bold text-zinc-800">
                Quét mã QR để xem Menu & Gọi món
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Hỗ trợ Camera điện thoại hoặc Zalo
              </p>
            </div>

            {/* Target URL Box */}
            <div className="w-full mt-4 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-600 font-mono truncate pl-1" title={qrUrl}>
                {qrUrl}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Sao chép đường dẫn"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copied ? 'Đã chép' : 'Chép'}</span>
                </button>
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white border border-zinc-200 text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Mở thử đường dẫn"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-[1.6] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer size={18} />
              <span>In tem QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable QR Sticker rendered via Portal to #print-root */}
      {mountNode &&
        createPortal(
          <div id="table-qr-print" className="bg-white text-black p-4 mx-auto text-center">
            <div className="border-2 border-black rounded-2xl p-4 flex flex-col items-center">
              <div className="text-sm font-extrabold uppercase tracking-wider">N70 COFFEE & TEA</div>
              <div className="text-[11px] mb-2">Chi nhánh {branchId || '1'}</div>
              <div className="border-y-2 border-dashed border-black py-1.5 px-6 my-1 text-lg font-black">
                BÀN SỐ: {tableCode}
              </div>
              <div className="my-3 flex justify-center">
                <QRCodeSVG value={qrUrl} size={190} level="H" marginSize={1} />
              </div>
              <div className="text-xs font-bold uppercase">Quét mã để gọi món tại bàn</div>
              <div className="text-[10px] mt-0.5">Mở Camera hoặc Zalo quét mã QR</div>
            </div>
          </div>,
          mountNode
        )}
    </>
  );
};

