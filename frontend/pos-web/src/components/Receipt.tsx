import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatDate } from '../lib/utils';

interface ReceiptProps {
  order: any;
  user: any;
}

export const Receipt: React.FC<ReceiptProps> = ({ order, user }) => {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let node = document.getElementById('print-root');
    if (!node) {
      node = document.createElement('div');
      node.id = 'print-root';
      node.className = 'hidden print:block'; // Hide on screen, show on print
      document.body.appendChild(node);
    }
    setMountNode(node);
  }, []);

  if (!order || !mountNode) return null;

  return createPortal(
    <div id="printable-receipt" className="bg-white text-black p-4 mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold uppercase mb-1">N70 POS</h2>
        <p className="text-sm">Chi nhánh {user?.branchId || 1}</p>
        <p className="text-xs">ĐC: 12 Nguyễn Văn Bảo, Gò Vấp</p>
        <div className="border-b-2 border-dashed border-black my-2"></div>
        <h3 className="text-lg font-bold">PHIẾU THANH TOÁN</h3>
      </div>

      <div className="text-xs mb-3 space-y-1">
        <div className="flex justify-between">
          <span>Số HĐ:</span>
          <span className="font-bold">{order.id?.split('-')[0].toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Ngày:</span>
          <span>{formatDate(order.createdAt || new Date().toISOString())}</span>
        </div>
        <div className="flex justify-between">
          <span>Thu ngân:</span>
          <span>{user?.username || 'Thu ngân'}</span>
        </div>
        <div className="flex justify-between">
          <span>Phục vụ:</span>
          <span className="font-bold">{order.orderType === 'AT_TABLE' ? `Bàn ${order.tableId}` : 'Mang về'}</span>
        </div>
      </div>

      <div className="border-b-2 border-dashed border-black mb-2"></div>

      <table className="w-full text-xs mb-2">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left pb-1">Món</th>
            <th className="text-center pb-1 w-8">SL</th>
            <th className="text-right pb-1">T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any) => {
            const itemTotal = item.unitPrice * item.quantity;
            const toppingTotal = (item.toppings?.reduce((acc: number, t: any) => acc + t.price * t.quantity, 0) || 0) * item.quantity;
            
            return (
              <React.Fragment key={item.id || Math.random()}>
                <tr>
                  <td className="pt-2 font-bold">{item.productName} {item.size ? `(${item.size})` : ''}</td>
                  <td className="pt-2 text-center align-top" rowSpan={item.toppings?.length ? 2 : 1}>{item.quantity}</td>
                  <td className="pt-2 text-right align-top font-bold" rowSpan={item.toppings?.length ? 2 : 1}>
                    {formatCurrency(itemTotal + toppingTotal)}
                  </td>
                </tr>
                {item.toppings?.length > 0 && (
                  <tr>
                    <td className="text-[10px] text-gray-600 pl-2 pb-1">
                      + {item.toppings.map((t: any) => t.toppingName).join(', ')}
                    </td>
                  </tr>
                )}
                {item.note && (
                  <tr>
                    <td colSpan={3} className="text-[10px] italic pl-2 pb-1">Ghi chú: {item.note}</td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="border-b-2 border-dashed border-black mb-2"></div>

      <div className="text-sm space-y-1">
        <div className="flex justify-between font-bold text-base">
          <span>TỔNG CỘNG:</span>
          <span>{formatCurrency(order.finalAmount || order.totalAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Phương thức TT:</span>
          <span>{order.payment?.paymentMethod || 'Chưa TT'}</span>
        </div>
        {order.payment?.amount && (
          <>
            <div className="flex justify-between">
              <span>Tiền khách đưa:</span>
              <span>{formatCurrency(order.payment.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tiền thối:</span>
              <span>{formatCurrency(Math.max(0, order.payment.amount - (order.finalAmount || order.totalAmount)))}</span>
            </div>
          </>
        )}
      </div>

      <div className="border-b-2 border-dashed border-black my-4"></div>

      <div className="text-center text-xs space-y-1">
        <p className="font-bold">CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!</p>
        <p>Hotline: 0123.456.789</p>
        <p>Wifi: N70_Free / Pass: 12345678</p>
      </div>
    </div>,
    mountNode
  );
};
