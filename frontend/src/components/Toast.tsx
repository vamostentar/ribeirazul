import { useEffect, useState } from 'react';

export function Toast({ text, show, onClose }: { text: string; show: boolean; onClose: () => void }) {
  const [visible, setVisible] = useState(show);
  useEffect(() => setVisible(show), [show]);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onClose(), 2500);
    return () => clearTimeout(t);
  }, [visible, onClose]);
  return (
    <div className={`fixed bottom-4 right-4 transition-all ${visible ? 'opacity-100' : 'opacity-0 translate-y-2'}`}>
      <div className="px-4 py-2 rounded-lg bg-emerald-600 text-white shadow-lg">{text}</div>
    </div>
  );
}