import React, { useState, useEffect, useCallback } from 'react';
import { User, Camera, Save, LogOut, Globe, Check, Loader2, ShieldCheck, X, Scissors } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next'; // QO'SHILDI
import Cropper from 'react-easy-crop';
import { cn } from '../utils';

export default function Settings() {
  const { t, i18n } = useTranslation(); // QO'SHILDI
  const { profile, user, updateLocalProfile, signOut } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  
  // CROP
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImage(reader.result as string);
        setIsCropping(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleAvatarUpdate = async () => {
    setLoading(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      const fileName = `${user.id}-${Date.now()}.webp`;
      await supabase.storage.from('avatars').upload(fileName, croppedImage, { upsert: true });
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
      
      updateLocalProfile({ avatar_url: urlData.publicUrl });
      setIsCropping(false);
      setImage(null);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    if (!error) {
      updateLocalProfile({ full_name: fullName });
      alert(t('name_updated')); // Tarjima qilindi
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 animate-in fade-in font-sans text-left">
      <h2 className="text-3xl font-black text-white uppercase tracking-tighter px-2">{t('settings')}</h2>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-4xl p-8 md:p-12 shadow-2xl space-y-10 relative">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : <User size={48} className="text-gray-700" />}
            </div>
            <label className="absolute -bottom-2 -right-2 p-3 bg-primary text-black rounded-2xl shadow-xl cursor-pointer hover:scale-110 transition-all border-4 border-[#0c0c0e]">
              <Camera size={20} strokeWidth={3} />
              <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
            </label>
          </div>
          <div className="text-center">
            <h4 className="text-xl font-black text-white uppercase tracking-tight">{profile?.full_name}</h4>
            <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">{profile?.role}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-2">{t('full_name_label')}</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              className="w-full px-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white font-black outline-none focus:border-primary/30 uppercase text-sm" 
            />
          </div>
          <button onClick={handleSaveProfile} disabled={loading} className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-lg uppercase text-[11px] tracking-widest flex justify-center items-center gap-3">
             {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={3} />} {t('save')}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isCropping && (
          <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-[#0c0c0e] rounded-4xl p-8 border border-white/10 shadow-2xl">
              <h3 className="text-white font-black uppercase mb-6 flex items-center gap-2"><Scissors size={18} className="text-primary"/> {t('adjust_image')}</h3>
              <div className="relative w-full h-80 bg-black rounded-3xl overflow-hidden shadow-inner">
                <Cropper image={image!} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setIsCropping(false)} className="flex-1 py-4 text-gray-500 font-black uppercase text-[10px] hover:text-white transition-colors">
                  {t('cancel')}
                </button>
                <button onClick={handleAvatarUpdate} disabled={loading} className="flex-1 py-4 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg">
                  {loading ? <Loader2 className="animate-spin" /> : t('upload')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

async function getCroppedImg(imageSrc: any, pixelCrop: any): Promise<Blob> {
  const image = new Image(); image.src = imageSrc;
  await new Promise(res => (image.onload = res));
  const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')!;
  canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise(res => canvas.toBlob(blob => res(blob!), 'image/webp'));
}