import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
  });

  useEffect(() => {
    if (needRefresh) {
      // Avtomatik yangilash — toast'siz
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}