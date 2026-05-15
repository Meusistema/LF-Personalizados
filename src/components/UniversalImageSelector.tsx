import React, { useState, useRef, ChangeEvent } from 'react';
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { getDeviceId } from '../lib/persistence';
import { uploadToServer } from '../lib/utils';

/**
 * Componente Reutilizável de Seleção de Imagem (Upload Direto)
 */
export function UniversalImageSelector({ 
  value, 
  onChange, 
  category, 
  label = "Imagem",
  aspectRatio = "aspect-square"
}: { 
  value: string, 
  onChange: (url: string) => void, 
  category: 'greeting' | 'customer' | 'product' | 'logo',
  label?: string,
  aspectRatio?: string
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const url = await uploadToServer(file, category);
        onChange(url);
      } catch (error) {
        console.error("Erro no upload:", error);
        alert("Erro ao realizar upload da imagem. Verifique sua conexão ou tente novamente.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase block ml-1">{label}</label>
      <div className="flex gap-4 items-start">
        {/* Container da Imagem */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`relative ${aspectRatio} bg-zinc-950 rounded-[2rem] border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer flex-1 group`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Enviando...</p>
            </div>
          ) : value ? (
            <>
              <img src={value} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xl">
                  <Upload size={20} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-6 opacity-40 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <ImageIcon size={24} />
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Clique para selecionar</p>
                <p className="text-[7px] text-zinc-700 uppercase mt-1">Upload Direto</p>
              </div>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleUpload} 
            className="hidden" 
          />
        </div>

        {/* Coluna de Ação de Remover (Exibida apenas se houver imagem) */}
        {value && (
          <div className="flex flex-col gap-2 shrink-0 pt-1">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="w-11 h-11 bg-zinc-900 text-zinc-500/60 rounded-2xl border border-zinc-800 hover:text-red-500 hover:border-red-500/50 transition-all flex items-center justify-center shadow-lg"
              title="Remover Imagem"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
