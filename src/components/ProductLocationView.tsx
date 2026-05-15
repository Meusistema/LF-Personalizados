/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { ProductLocation } from '../App';
import { generateUniqueId } from '../lib/persistence';
import { MapPin, Plus, Trash2, Edit3, Search, ChevronLeft, Save, X, Box, Layers, AlignJustify, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductLocationViewProps {
  locations: ProductLocation[];
  setLocations: (locations: ProductLocation[]) => void;
  onBack: () => void;
  canEdit: boolean;
}

export function ProductLocationView({ locations, setLocations, onBack, canEdit }: ProductLocationViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ProductLocation | null>(null);

  // Form state
  const [rua, setRua] = useState('');
  const [gondola, setGondola] = useState('');
  const [prateleira, setPrateleira] = useState('');
  const [gaveta, setGaveta] = useState('');

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => 
      loc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.rua.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.gondola.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.prateleira.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.gaveta.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [locations, searchTerm]);

  const handleSave = () => {
    if (!rua) {
      alert('A Rua é obrigatória.');
      return;
    }

    const description = [
      rua ? `RUA ${rua}` : '',
      gondola ? `GÔNDOLA ${gondola}` : '',
      prateleira ? `PRATELEIRA ${prateleira}` : '',
      gaveta ? `GAVETA ${gaveta}` : ''
    ].filter(Boolean).join(' / ');
    
    // Short name like A-33-31-02
    const name = [rua, gondola, prateleira, gaveta].filter(Boolean).join('-');

    if (editingLocation) {
      setLocations(locations.map(loc => 
        loc.id === editingLocation.id 
          ? { ...loc, rua, gondola, prateleira, gaveta, description, name, updatedAt: Date.now() }
          : loc
      ));
      setEditingLocation(null);
    } else {
      const newLoc: ProductLocation = {
        id: generateUniqueId('loc'),
        rua,
        gondola,
        prateleira,
        gaveta,
        description,
        name,
        updatedAt: Date.now(),
        createdAt: Date.now()
      };
      setLocations([...locations, newLoc]);
    }

    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setRua('');
    setGondola('');
    setPrateleira('');
    setGaveta('');
    setEditingLocation(null);
  };

  const handleEdit = (loc: ProductLocation) => {
    setEditingLocation(loc);
    setRua(loc.rua);
    setGondola(loc.gondola);
    setPrateleira(loc.prateleira);
    setGaveta(loc.gaveta);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir esta localização?')) {
      setLocations(locations.filter(loc => loc.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/[0.02] backdrop-blur-3xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all border border-white/10 shadow-xl group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Localizações</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Organização Física do Estoque</p>
          </div>
        </div>

        {canEdit && !isAdding && (
          <button 
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="glass-button-primary px-6 py-3 flex items-center gap-2 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[11px] font-black tracking-widest uppercase">Nova Localização</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          {isAdding ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto w-full"
            >
              <div className="glass-panel p-8 border-white/10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <button onClick={() => { setIsAdding(false); resetForm(); }} className="p-2 text-white/30 hover:text-white transition-colors">
                      <X size={20} />
                   </button>
                </div>

                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xl">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">{editingLocation ? 'Editar Localização' : 'Nova Localização'}</h3>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Preencha os campos abaixo para organizar seu estoque</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rua */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#64748b] tracking-[0.2em] uppercase ml-1 flex items-center gap-2">
                      <AlignJustify size={10} /> Rua / Setor
                    </label>
                    <input 
                      autoFocus
                      value={rua}
                      onChange={e => setRua(e.target.value.toUpperCase())}
                      placeholder="EX: RUA A"
                      className="glass-input w-full p-4 rounded-xl text-sm font-black uppercase text-white placeholder:text-white/10"
                    />
                  </div>

                  {/* Gôndola */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#64748b] tracking-[0.2em] uppercase ml-1 flex items-center gap-2">
                      <Box size={10} /> Gôndola
                    </label>
                    <input 
                      value={gondola}
                      onChange={e => setGondola(e.target.value.toUpperCase())}
                      placeholder="EX: 33"
                      className="glass-input w-full p-4 rounded-xl text-sm font-black uppercase text-white placeholder:text-white/10"
                    />
                  </div>

                  {/* Prateleira */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#64748b] tracking-[0.2em] uppercase ml-1 flex items-center gap-2">
                      <Layers size={10} /> Prateleira
                    </label>
                    <input 
                      value={prateleira}
                      onChange={e => setPrateleira(e.target.value.toUpperCase())}
                      placeholder="EX: 31"
                      className="glass-input w-full p-4 rounded-xl text-sm font-black uppercase text-white placeholder:text-white/10"
                    />
                  </div>

                  {/* Gaveta */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#64748b] tracking-[0.2em] uppercase ml-1 flex items-center gap-2">
                      <Hash size={10} /> Gaveta / Caixa
                    </label>
                    <input 
                      value={gaveta}
                      onChange={e => setGaveta(e.target.value.toUpperCase())}
                      placeholder="EX: 02"
                      className="glass-input w-full p-4 rounded-xl text-sm font-black uppercase text-white placeholder:text-white/10"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                   <button 
                    onClick={() => { setIsAdding(false); resetForm(); }}
                    className="flex-1 py-4 px-6 bg-white/5 text-white/50 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-white/5 hover:bg-white/10 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex-[2] glass-button-primary py-4 px-6 flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Save size={18} />
                    <span className="text-[11px] font-black tracking-widest uppercase">{editingLocation ? 'Salvar Alterações' : 'Confirmar Cadastro'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Search */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="BUSCAR LOCALIZAÇÃO..."
                  className="glass-input w-full pl-14 pr-6 py-5 rounded-[2rem] text-sm font-black uppercase text-white placeholder:text-white/10 shadow-2xl"
                />
              </div>

              {/* List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLocations.map((loc) => (
                  <motion.div
                    layout
                    key={loc.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel p-5 group hover:border-blue-500/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                        <MapPin size={20} />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(loc)}
                          className="p-2 text-white/20 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(loc.id)}
                          className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-white uppercase tracking-tighter truncate">
                        {loc.description}
                      </h4>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                        REF: {loc.name}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-2 text-[8px] font-black uppercase text-white/20">
                       <div className="flex items-center gap-1.5 truncate">
                          <span className="text-white/40">R:</span> {loc.rua}
                       </div>
                       <div className="flex items-center gap-1.5 truncate">
                          <span className="text-white/40">G:</span> {loc.gondola || '---'}
                       </div>
                       <div className="flex items-center gap-1.5 truncate">
                          <span className="text-white/40">P:</span> {loc.prateleira || '---'}
                       </div>
                       <div className="flex items-center gap-1.5 truncate">
                          <span className="text-white/40">GAV:</span> {loc.gaveta || '---'}
                       </div>
                    </div>
                  </motion.div>
                ))}

                {filteredLocations.length === 0 && (
                   <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4 opacity-20">
                      <MapPin size={48} />
                      <p className="text-sm font-black uppercase tracking-[0.2em]">Nenhuma localização encontrada</p>
                   </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
