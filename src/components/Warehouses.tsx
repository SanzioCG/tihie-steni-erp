import React, { useState } from 'react';
import { 
  Warehouse as WarehouseIcon, 
  Plus, 
  MapPin, 
  Package, 
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCreateWarehouse, useUpdateWarehouse } from '../hooks/useInventory';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '../utils';

const warehouseSchema = z.object({
  name_uz: z.string().min(2, 'Name (UZ) is required'),
  name_ru: z.string().min(2, 'Name (RU) is required'),
  name_en: z.string().min(2, 'Name (EN) is required'),
  type: z.enum(['textile', 'profile', 'other']),
  location: z.string().optional(),
});

export default function Warehouses() {
  const { t, i18n } = useTranslation();
  const { data: warehouses, isLoading } = useWarehouses();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(warehouseSchema),
  });

  const onSubmit = (data: any) => {
    if (editingWarehouse) {
      updateWarehouse.mutate({ id: editingWarehouse.id, ...data }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setEditingWarehouse(null);
          reset();
        }
      });
    } else {
      createWarehouse.mutate(data, {
        onSuccess: () => {
          setIsModalOpen(false);
          reset();
        }
      });
    }
  };

  const handleEdit = (wh: any) => {
    setEditingWarehouse(wh);
    reset(wh);
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const handleDelete = (id: string) => {
    deleteWarehouse.mutate(id, {
      onSuccess: () => setShowDeleteConfirm(null)
    });
  };

  const getWarehouseName = (wh: any) => {
    const lang = i18n.language;
    if (lang === 'uz') return wh.name_uz;
    if (lang === 'ru') return wh.name_ru;
    return wh.name_en;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('warehouses')}</h2>
        <button 
          onClick={() => { setEditingWarehouse(null); reset({}); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm"
        >
          <Plus size={18} />
          {t('add_warehouse')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses?.map((wh) => (
          <div key={wh.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-shadow group relative">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
                <WarehouseIcon className="text-slate-400 group-hover:text-emerald-500 transition-colors" size={24} />
              </div>
              <div className="relative">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === wh.id ? null : wh.id)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <MoreVertical size={18} />
                </button>
                {activeDropdown === wh.id && (
                  <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-lg z-10 overflow-hidden">
                    <button 
                      onClick={() => handleEdit(wh)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Edit size={14} /> {t('edit') || 'Edit'}
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(wh.id)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <Trash2 size={14} /> {t('delete') || 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{getWarehouseName(wh)}</h3>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mb-4">
              <MapPin size={14} />
              {wh.location || 'No location'}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</p>
                <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">{wh.type}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Created</p>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {new Date(wh.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Warehouse Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Name (UZ)</label>
                <input {...register('name_uz')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20" />
                {errors.name_uz && <p className="text-xs text-rose-500">{errors.name_uz.message as string}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Name (RU)</label>
                <input {...register('name_ru')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20" />
                {errors.name_ru && <p className="text-xs text-rose-500">{errors.name_ru.message as string}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Name (EN)</label>
                <input {...register('name_en')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20" />
                {errors.name_en && <p className="text-xs text-rose-500">{errors.name_en.message as string}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Type</label>
                <select {...register('type')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20">
                  <option value="textile">Textile</option>
                  <option value="profile">Profile</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Location</label>
                <input {...register('location')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100 dark:shadow-none">
                  {editingWarehouse ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Are you sure?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">This action cannot be undone. All data associated with this warehouse will be permanently deleted.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
