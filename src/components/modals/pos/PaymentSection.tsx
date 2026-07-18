import { Loader2, CheckCircle2 } from 'lucide-react';
import { useCurrencyStore } from '../../../store/useCurrencyStore';
import { useTranslation } from 'react-i18next';

interface PaymentSectionProps {
  totalCartSum: number;
  paidAmount: string;
  onPaidChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  cartLength: number;
}

export default function PaymentSection({ 
  totalCartSum, 
  paidAmount, 
  onPaidChange, 
  onSubmit, 
  loading,
  cartLength
}: PaymentSectionProps) {
  const { t } = useTranslation();
  const { convert } = useCurrencyStore();
  const debtAmount = totalCartSum - Number(paidAmount || 0);

  return (
    <div className="pt-4 border-t border-white/5 space-y-4">
      <div className="flex justify-between items-center px-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase">{t('total')}:</span>
        <span className="text-3xl font-bold text-white italic">{convert(totalCartSum)}</span>
      </div>
      
      <input 
        type="number" 
        step="0.01"
        className="w-full px-5 py-5 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-emerald-500 text-2xl font-bold outline-none text-center" 
        placeholder={t('paid_amount_placeholder')} 
        value={paidAmount} 
        onChange={e => onPaidChange(e.target.value)} 
      />
      
      {debtAmount > 0 && (
        <div className="text-center text-rose-500 text-xs font-bold uppercase">
          {t('debt')}: {debtAmount.toLocaleString()}$
        </div>
      )}
      
      <button 
        disabled={loading || cartLength === 0} 
        onClick={onSubmit} 
        className="w-full py-5 bg-primary text-black font-bold rounded-2xl uppercase text-xs tracking-wide flex justify-center items-center gap-3 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} 
        {t('complete_sale')}
      </button>
    </div>
  );
}