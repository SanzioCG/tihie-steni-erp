import React, { forwardRef } from 'react';
import { useCurrencyStore } from '../store/useCurrencyStore';

interface ReceiptProps {
  storeInfo: any;
  clientName: string;
  items: any[];
  total: number;
  paid: number;
  debt: number;
  date: string;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ 
  storeInfo, clientName, items, total, paid, debt, date 
}, ref) => {
  const { convert } = useCurrencyStore();

  return (
    <div ref={ref} className="p-8 bg-white text-black font-mono text-[12px] w-[80mm] mx-auto">
      {/* HEADER */}
      <div className="text-center space-y-1 mb-4 border-b border-dashed border-black pb-4">
        <h2 className="text-lg font-bold uppercase">{storeInfo?.name || 'TIHIE STENI'}</h2>
        <p className="text-[10px]">{storeInfo?.address || 'O‘zbekiston'}</p>
        <p className="text-[10px]">Tel: {storeInfo?.phone || '+998'}</p>
        <p className="text-[10px] mt-2">{date}</p>
      </div>

      {/* CLIENT */}
      <div className="mb-4">
        <p>MIJOZ: <span className="font-bold uppercase">{clientName}</span></p>
      </div>

      {/* ITEMS TABLE */}
      <table className="w-full text-left border-collapse mb-4">
        <thead className="border-b border-black">
          <tr>
            <th className="py-1">Mahsulot</th>
            <th className="py-1 text-right">Jami</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-gray-300">
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-2">
                <p className="font-bold">{item.product_name}</p>
                <p className="text-[10px]">{item.length}m x {item.isTekstil ? item.width + 'm' : item.count + 'ta'}</p>
              </td>
              <td className="py-2 text-right align-top font-bold">
                {convert(item.total_price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALS */}
      <div className="space-y-1 border-t border-black pt-2">
        <div className="flex justify-between text-base font-bold">
          <span>JAMI:</span>
          <span>{convert(total)}</span>
        </div>
        <div className="flex justify-between">
          <span>TO'LANDI:</span>
          <span>{convert(paid)}</span>
        </div>
        {debt > 0 && (
          <div className="flex justify-between text-red-600 font-bold border-t border-dashed border-gray-400 mt-1 pt-1">
            <span>QARZ:</span>
            <span>{convert(debt)}</span>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="text-center mt-8 space-y-1">
        <p className="font-bold italic">Xaridingiz uchun rahmat!</p>
        <p className="text-[9px]">Tizim: TS ERP Uzbekistan</p>
        <div className="pt-4 flex justify-center">
            {/* Bu yerga QR kod rasm qo'yishingiz mumkin */}
        </div>
      </div>
    </div>
  );
});