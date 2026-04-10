import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import toast from 'react-hot-toast';

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      toast((t) => (
        <div className="flex items-center gap-4">
          <span>Tizim yangilandi! Yangi funksiyalar tayyor.</span>
          <button 
            onClick={() => updateServiceWorker(true)}
            className="bg-primary text-black px-3 py-1 rounded-lg font-bold text-[10px]"
          >
            YANGILASH
          </button>
        </div>
      ), { duration: Infinity, position: 'bottom-center' });
    }
  }, [needRefresh]);

  return null;
}