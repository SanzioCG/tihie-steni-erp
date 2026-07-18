import { Trash2 } from 'lucide-react';

interface CartProps {
  items: any[];
  onRemove: (id: string) => void;
}

export default function Cart({ items, onRemove }: CartProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {items.map(item => (
        <div key={item.id} className="flex justify-between items-center p-3 bg-white/3 border border-white/5 rounded-xl">
          <div className="flex-1">
            <p className="text-xs font-bold text-white">{item.product_name}</p>
            <p className="text-[9px] text-gray-400">
              {item.details} = {item.total_qty.toFixed(2)} {item.isTekstil ? 'm²' : 'm'}
            </p>
          </div>
          <div className="text-sm font-bold text-primary">
            {item.total_price.toLocaleString()}$
          </div>
          <button onClick={() => onRemove(item.id)} className="p-2 text-gray-400 hover:text-rose-500">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}