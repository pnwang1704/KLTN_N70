import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const BaseModal: React.FC<BaseModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
          <h3 className="font-bold text-lg text-zinc-800">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const SuccessModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  message: string;
  subMessage?: string;
}> = ({ isOpen, onClose, message, subMessage }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Thành công">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={32} />
        </div>
        <p className="text-zinc-800 font-semibold text-lg">{message}</p>
        {subMessage && <p className="text-zinc-500 mt-2 text-sm">{subMessage}</p>}
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
        >
          Đóng
        </button>
      </div>
    </BaseModal>
  );
};

export const ErrorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  error: string;
}> = ({ isOpen, onClose, error }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Đã có lỗi xảy ra">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 animate-in slide-in-from-bottom-2">
          <AlertTriangle size={32} />
        </div>
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
        >
          Đóng
        </button>
      </div>
    </BaseModal>
  );
};

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', isDestructive = false }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4",
          isDestructive ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
        )}>
          <AlertCircle size={32} />
        </div>
        <p className="text-zinc-700">{message}</p>
        
        <div className="flex gap-3 w-full mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl font-semibold hover:bg-zinc-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "flex-1 py-2.5 text-white rounded-xl font-semibold transition-colors",
              isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
