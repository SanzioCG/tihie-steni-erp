import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageModal({ src, isOpen, onClose }: { src: string, isOpen: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-20">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="relative z-50 max-w-full max-h-full flex items-center justify-center"
          >
            <button 
              onClick={onClose} 
              className="absolute -top-14 right-0 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X size={32}/>
            </button>
            <img 
              src={src} 
              className="rounded-3xl shadow-2xl max-w-full max-h-[80vh] object-contain border border-white/10" 
              alt="Zoomed Product" 
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}