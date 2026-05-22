import { useTranslation } from 'react-i18next';

interface ClientSelectorProps {
  clients: any[];
  value: string;
  onChange: (id: string) => void;
}

export default function ClientSelector({ clients, value, onChange }: ClientSelectorProps) {
  const { t } = useTranslation();
  
  return (
    <select 
      className="w-full px-5 py-4 bg-white/5 border border-white/5 rounded-2xl text-white outline-none font-bold uppercase text-sm" 
      value={value} 
      onChange={e => onChange(e.target.value)}
    >
      <option value="" className="bg-black">{t('select_client')}...</option>
      {clients.map(c => (
        <option key={c.id} value={c.id} className="bg-black">
          {c.full_name}
        </option>
      ))}
    </select>
  );
}