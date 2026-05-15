
import { useState, useMemo } from 'react';
import { 
  ShoppingCart, Search, ChevronRight, X, Minus, Plus, MessageCircle, 
  Share2, Package, Tag, Info, Eye, Edit, EyeOff, Star, 
  Settings, Check, Filter, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, Subcategory, CompanyInfo } from '../App';
import { salvarDados, STORAGE_KEYS } from '../lib/persistence';
import { UniversalImageSelector } from './UniversalImageSelector';

interface CatalogProps {
  products: Product[];
  categories: Category[];
  subcategories: Subcategory[];
  company: CompanyInfo;
  catalogDescriptions: Record<string, string>;
  setCatalogDescriptions: (v: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setProducts: (v: Product[] | ((prev: Product[]) => Product[])) => void;
  setCategories: (v: Category[] | ((prev: Category[]) => Category[])) => void;
  setSubcategories: (v: Subcategory[] | ((prev: Subcategory[]) => Subcategory[])) => void;
  canEdit: boolean;
  onBack?: () => void;
}

interface CartItem {
  productId: string;
  quantity: number;
}

export function CatalogView({ 
  products, 
  categories, 
  subcategories, 
  company, 
  catalogDescriptions, 
  setCatalogDescriptions,
  setProducts,
  setCategories,
  setSubcategories,
  canEdit,
  onBack
}: CatalogProps) {
  const [activeMode, setActiveMode] = useState<'editor' | 'preview'>('editor');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSubCatId, setSelectedSubCatId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Filter products for the catalog (only those toggled to show)
  const previewProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.showInCatalog) return false;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCatId ? p.categoryId === selectedCatId : true;
      const matchesSubcategory = selectedSubCatId ? p.subcategoryId === selectedSubCatId : true;
      return matchesSearch && matchesCategory && matchesSubcategory;
    });
  }, [products, searchTerm, selectedCatId, selectedSubCatId]);

  // All products for the editor
  const editorProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCatId ? p.categoryId === selectedCatId : true;
      const matchesSubcategory = selectedSubCatId ? p.subcategoryId === selectedSubCatId : true;
      return matchesSearch && matchesCategory && matchesSubcategory;
    });
  }, [products, searchTerm, selectedCatId, selectedSubCatId]);

  const toggleCatalogVisibility = (productId: string) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, showInCatalog: !p.showInCatalog } : p
    ));
  };

  const toggleFeatured = (productId: string) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, isFeatured: !p.isFeatured } : p
    ));
  };

  const updateProductField = (productId: string, field: keyof Product, value: any) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, [field]: value } : p
    ));
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Simulate data structure creation for public catalog
      const catalogData = {
        company,
        categories,
        subcategories,
        products: products.filter(p => p.showInCatalog),
        descriptions: catalogDescriptions,
        publishedAt: new Date().toISOString()
      };

      // In a real scenario, this would be an API call to update a public endpoint or store a file
      salvarDados(STORAGE_KEYS.PRODUCTS, products);
      salvarDados(STORAGE_KEYS.CATALOG_DESCRIPTIONS, catalogDescriptions);
      
      // We could also save a specific "published" snapshot
      salvarDados('published_catalog_data', catalogData);

      await new Promise(r => setTimeout(r, 1000));
      alert('Catálogo publicado com sucesso! Os dados foram preparados para a versão pública.');
    } catch (error) {
      alert('Erro ao publicar catálogo.');
    } finally {
      setPublishing(false);
    }
  };

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  }, [cart, products]);

  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    let message = `*Olá! Gostaria de fazer um pedido:*%0A%0A`;
    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        message += `• ${item.quantity}x ${product.name} - R$ ${(product.price * item.quantity).toFixed(2)}%0A`;
      }
    });
    message += `%0A*Total: R$ ${cartTotal.toFixed(2)}*`;
    const phone = company.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const buyNow = (product: Product) => {
    const message = `Olá! Tenho interesse no produto: ${product.name} - R$ ${product.price.toFixed(2)}`;
    const phone = company.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const saveDescription = () => {
    if (selectedProduct) {
      setCatalogDescriptions(prev => {
        const updated = { ...prev, [selectedProduct.id]: tempDescription };
        salvarDados(STORAGE_KEYS.CATALOG_DESCRIPTIONS, updated);
        return updated;
      });
      setIsEditingDescription(false);
    }
  };

  // Preview Mode Render
  if (activeMode === 'preview') {
    return (
      <div className="min-h-screen bg-transparent pb-32 animate-in fade-in duration-700 text-white overflow-x-hidden">
        {/* Admin Bar */}
        <div className="glass-panel rounded-none border-x-0 border-t-0 px-6 py-3 flex items-center justify-between sticky top-0 z-[100] backdrop-blur-2xl bg-[#12122b]/60">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Preview: Customer View</span>
           </div>
           <button 
             onClick={() => setActiveMode('editor')}
             className="glass-button-primary !py-2 !px-4 !text-[10px] flex items-center gap-2"
           >
              <Edit size={12} /> Return to Editor
           </button>
        </div>

        {/* Customer Header */}
        <header className="px-6 py-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#1e1b4b]/20 to-transparent -z-10" />
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              {company.logo && (
                <div className="w-24 h-24 rounded-3xl p-2 bg-[#12122b]/40 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-2xl">
                  <img src={company.logo} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">{company.name}</h1>
                {company.slogan && (
                  <p className="text-[11px] font-bold text-purple-400/80 uppercase tracking-[0.3em] mt-4 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20 inline-block backdrop-blur-md">{company.slogan}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <form 
                onSubmit={(e) => e.preventDefault()}
                className="relative flex-1 md:w-96"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" 
                  placeholder="What are you looking for?"
                  className="glass-input w-full pl-12 pr-6 py-4 text-sm font-medium tracking-wide"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </form>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative glass-button-secondary p-4 !rounded-2xl shrink-0"
              >
                <ShoppingCart size={24} />
                <AnimatePresence>
                  {cart.length > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#1e1b4b] shadow-xl"
                    >
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </header>

        {/* Categories Bar */}
        <div className="glass-panel mx-6 rounded-3xl border-white/5 overflow-hidden sticky top-[60px] z-[90] backdrop-blur-2xl">
          <div className="overflow-x-auto no-scrollbar whitespace-nowrap px-4 py-3 flex items-center gap-2">
             <button 
               onClick={() => { setSelectedCatId(null); setSelectedSubCatId(null); }}
               className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!selectedCatId ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
             >
               All Products
             </button>
             {categories.map(cat => (
               <button 
                 key={cat.id}
                 onClick={() => { setSelectedCatId(cat.id); setSelectedSubCatId(null); }}
                 className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCatId === cat.id ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
               >
                 {cat.name}
               </button>
             ))}
          </div>
        </div>

        {/* Product Grid */}
        <main className="max-w-7xl mx-auto p-6 md:p-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
            {previewProducts.map(product => (
              <motion.div 
                layout
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -8 }}
                className="glass-panel group flex flex-col h-full border-white/5 hover:border-white/20 transition-all duration-500 overflow-hidden"
              >
                <div 
                  onClick={() => { setSelectedProduct(product); setTempDescription(catalogDescriptions[product.id] || ''); }}
                  className="aspect-[4/5] bg-black/20 overflow-hidden cursor-pointer relative"
                >
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/5">
                      <Package size={64} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  {product.isFeatured && (
                    <div className="absolute top-4 left-4 glass-panel !bg-blue-600/80 !rounded-full px-3 py-1.5 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border-white/20 shadow-lg backdrop-blur-md">
                       <Star size={10} fill="currentColor" /> Featured
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 
                      onClick={() => { setSelectedProduct(product); setTempDescription(catalogDescriptions[product.id] || ''); }}
                      className="text-sm font-bold text-white/90 uppercase tracking-tight line-clamp-2 cursor-pointer hover:text-blue-400 transition-colors leading-tight min-h-[2.5rem]"
                    >
                      {product.name}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-xl font-black text-white tracking-tighter">R$ {product.price.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto flex flex-col gap-3">
                    <button 
                      onClick={() => addToCart(product.id)}
                      className="glass-button-primary w-full py-4 text-[10px] !rounded-xl"
                    >
                      <ShoppingCart size={16} /> Add to Cart
                    </button>
                    <button 
                      onClick={() => buyNow(product)}
                      className="glass-button-secondary w-full py-4 text-[10px] !rounded-xl !bg-emerald-600/10 hover:!bg-emerald-600/20 !text-emerald-400 !border-emerald-500/20"
                    >
                      <MessageCircle size={16} /> Buy on WhatsApp
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {previewProducts.length === 0 && (
            <div className="py-32 text-center">
              <div className="flex flex-col items-center justify-center space-y-6 opacity-20">
                <Search size={80} strokeWidth={1} />
                <p className="text-sm font-black uppercase tracking-[0.4em]">Product not found</p>
              </div>
            </div>
          )}
        </main>

        <AnimatePresence>
          {selectedProduct && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl relative border-white/10">
                <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 z-[210] glass-button-secondary !p-3 hover:!bg-red-500 hover:!text-white transition-all"><X size={24} /></button>
                
                <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-black/20 flex items-center justify-center p-8">
                  <div className="w-full h-full rounded-2xl overflow-hidden glass-panel border-white/5 relative">
                    {selectedProduct.imageUrl ? (
                      <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-5">
                        <Package size={120} strokeWidth={0.5} />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col overflow-y-auto no-scrollbar relative">
                  <div className="mb-12">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 block leading-none">Catalog Exclusive</span>
                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-6">{selectedProduct.name}</h2>
                    <div className="text-4xl font-black text-white tracking-tighter">R$ {selectedProduct.price.toFixed(2)}</div>
                  </div>
                  
                  <div className="space-y-12 flex-1">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-white/30">
                        <Info size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Description</span>
                      </div>
                      <p className="text-sm font-medium text-white/50 leading-relaxed uppercase italic">
                        {catalogDescriptions[selectedProduct.id] || 'Quality products selected with care for you. Satisfaction guaranteed in every detail of this exclusive items.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-12 grid grid-cols-1 gap-4">
                    <button onClick={() => { addToCart(selectedProduct.id); setSelectedProduct(null); }} className="glass-button-primary py-6 text-sm font-black uppercase tracking-widest">
                      <ShoppingCart size={24} /> Add to Cart
                    </button>
                    <button onClick={() => buyNow(selectedProduct)} className="glass-button-secondary py-6 !bg-emerald-600/10 hover:!bg-emerald-600/20 !text-emerald-400 !border-emerald-500/20 text-sm font-black uppercase tracking-widest">
                      <MessageCircle size={24} /> Contact via WhatsApp
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl" />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-full max-w-md z-[210] glass-panel rounded-none border-y-0 border-r-0 shadow-2xl flex flex-col">
                <div className="p-10 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <ShoppingCart size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-white leading-none">Your Cart</h3>
                      <p className="text-[10px] font-bold text-white/30 uppercase mt-1">Ready for checkout</p>
                    </div>
                  </div>
                  <button onClick={() => setIsCartOpen(false)} className="glass-button-secondary !p-2"><X size={24} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-10">
                      <ShoppingCart size={48} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Empty Cart</p>
                    </div>
                  ) : (
                    cart.map(item => { 
                      const p = products.find(prod => prod.id === item.productId); 
                      if (!p) return null; 
                      return ( 
                        <div key={item.productId} className="flex gap-5 p-5 glass-panel border-white/5 hover:bg-white/10 group transition-all"> 
                          <div className="w-20 h-20 bg-white/5 rounded-2xl overflow-hidden border border-white/10 shrink-0"> 
                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><Package /></div>} 
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-1"> 
                            <h4 className="text-[11px] font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{p.name}</h4>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 glass-panel border-white/10 p-1 bg-black/40"> 
                                <button onClick={() => updateCartQty(item.productId, -1)} className="w-6 h-6 flex items-center justify-center hover:text-red-400 transition-colors"><Minus size={12}/></button> 
                                <span className="text-xs font-black w-4 text-center">{item.quantity}</span> 
                                <button onClick={() => updateCartQty(item.productId, 1)} className="w-6 h-6 flex items-center justify-center hover:text-blue-400 transition-colors"><Plus size={12}/></button> 
                              </div>
                              <span className="text-xs font-black text-white/50">R$ {(p.price * item.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                        </div> 
                      ); 
                    })
                  )}
                </div>
                
                <div className="p-10 glass-panel rounded-none border-x-0 border-b-0 border-t border-white/10 bg-black/40 backdrop-blur-3xl"> 
                  <div className="flex justify-between items-center mb-10 px-2"> 
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Estimated Total</span> 
                    <span className="text-3xl font-black text-white tracking-tighter">R$ {cartTotal.toFixed(2)}</span> 
                  </div> 
                  <button 
                    onClick={handleWhatsAppCheckout} 
                    disabled={cart.length === 0} 
                    className="glass-button-primary w-full py-6 text-sm !rounded-2xl shadow-xl shadow-blue-600/20 disabled:grayscale disabled:opacity-40"
                  >
                    <MessageCircle size={20} /> Checkout on WhatsApp
                  </button> 
                </div> 
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- Editor Mode Render ---
  return (
    <div className="fixed inset-0 z-[200] bg-[#0a1628] text-white p-2 md:p-4 font-sans flex flex-col overflow-hidden">
      {/* Header Padrao */}
      <div className="flex items-center justify-between mb-2 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack || (() => window.history.back())}
            className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center border border-white/5 hover:bg-[#1a2744]/80 transition-all cursor-pointer group"
          >
            <ChevronRight className="w-5 h-5 text-[#64748b] group-hover:text-white rotate-180" />
          </button>
          <div>
            <h2 className="text-lg md:text-xl font-black text-white uppercase italic leading-none">Inteligência de Catálogo</h2>
            <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mt-1">Curadoria & Aparência Pública</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveMode('preview')}
            className="bg-[#1a2744] text-white rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-[#1a2744]/80 transition-all flex items-center gap-2"
          >
            <Eye size={14} />
            <span className="hidden md:inline">Ver como Cliente</span>
          </button>
          <button 
            onClick={handlePublish}
            disabled={publishing}
            className="bg-pink-600 text-white rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest border-none hover:bg-pink-500 transition-all flex items-center gap-2 shadow-lg shadow-pink-600/20"
          >
            {publishing ? <RefreshCw className="animate-spin" size={14} /> : <Share2 size={14} />}
            <span className="hidden md:inline">{publishing ? 'Publicando...' : 'Publicar'}</span>
          </button>
        </div>
      </div>

      {/* Seção Fixa: Stats e Filtros */}
      <div className="shrink-0 space-y-3 mb-2 px-2 md:px-0">
        {/* Stats Cards Compactos */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
           <div className="bg-[#1a2744] p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Package size={14} />
              </div>
              <div className="truncate">
                <p className="text-[7px] font-black text-[#64748b] uppercase tracking-widest">Total Produtos</p>
                <p className="text-sm font-black text-white italic leading-none">{products.length}</p>
              </div>
           </div>
           
           <div className="bg-[#1a2744] p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
                <Eye size={14} />
              </div>
              <div className="truncate">
                <p className="text-[7px] font-black text-[#64748b] uppercase tracking-widest">No Catálogo</p>
                <p className="text-sm font-black text-white italic leading-none">{products.filter(p => p.showInCatalog).length}</p>
              </div>
           </div>

           <div className="bg-[#1a2744] p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                <Star size={14} />
              </div>
              <div className="truncate">
                <p className="text-[7px] font-black text-[#64748b] uppercase tracking-widest">Destaques</p>
                <p className="text-sm font-black text-white italic leading-none">{products.filter(p => p.isFeatured).length}</p>
              </div>
           </div>

           <div className="bg-[#1a2744] p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Tag size={14} />
              </div>
              <div className="truncate">
                <p className="text-[7px] font-black text-[#64748b] uppercase tracking-widest">Categorias</p>
                <p className="text-sm font-black text-white italic leading-none">{categories.length}</p>
              </div>
           </div>
        </div>

        {/* Busca e Filtro */}
        <div className="flex flex-col md:flex-row gap-2">
          <form 
            onSubmit={(e) => e.preventDefault()}
            className="flex-1 relative"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#334155]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar produtos por nome, sku ou característica..."
              className="w-full bg-[#0d1c30] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-[10px] font-black text-white uppercase placeholder:text-[#334155] focus:ring-1 focus:ring-pink-500/30 transition-all outline-none"
            />
          </form>
          <div className="flex gap-2">
            <select 
              className="bg-[#0d1c30] border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black text-white uppercase outline-none cursor-pointer focus:ring-1 focus:ring-pink-500/30 transition-all min-w-[180px]"
              value={selectedCatId || ''}
              onChange={e => { setSelectedCatId(e.target.value || null); setSelectedSubCatId(null); }}
            >
              <option value="">TODAS AS COLEÇÕES</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Produtos com Scroll Interno */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar bg-[#0d1c30] rounded-2xl border border-white/5 shadow-inner">
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr] gap-4 px-6 py-4 border-b border-white/5 bg-black/20 sticky top-0 z-10">
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">Produto</span>
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest text-center">Status Público</span>
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest text-center">Destaque</span>
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest text-center">Preço</span>
          <span className="text-[9px] font-black text-[#64748b] uppercase tracking-widest text-right">Ações</span>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {editorProducts.length > 0 ? editorProducts.map((product) => (
            <div 
              key={product.id}
              className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_0.8fr] gap-4 px-6 py-3.5 items-center hover:bg-[#1a2744]/20 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-black/20 border border-white/10 overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                      <Package size={20} />
                    </div>
                  )}
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-black text-white group-hover:text-pink-400 transition-colors uppercase italic truncate">{product.name}</p>
                  <p className="text-[9px] font-black text-[#64748b] uppercase truncate">
                    {categories.find(c => c.id === product.categoryId)?.name || 'ESTOQUE GERAL'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-center">
                <button 
                  onClick={() => toggleCatalogVisibility(product.id)}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                    product.showInCatalog 
                    ? 'bg-pink-600/10 text-pink-400 border-pink-500/20 shadow-lg shadow-pink-500/10' 
                    : 'bg-[#0d1c30] text-[#334155] border-white/5 hover:text-[#64748b]'
                  }`}
                >
                  {product.showInCatalog ? 'PÚBLICO' : 'PRIVADO'}
                </button>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={() => toggleFeatured(product.id)}
                  className={`p-2 rounded-lg transition-all border ${
                    product.isFeatured 
                    ? 'bg-blue-600/10 text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/10' 
                    : 'bg-[#0d1c30] text-[#334155] border-white/5 hover:text-[#64748b]'
                  }`}
                >
                  <Star size={16} fill={product.isFeatured ? 'currentColor' : 'none'} />
                </button>
              </div>
              
              <div className="text-center font-black text-white italic text-[11px]">
                  R$ {product.price.toFixed(2)}
              </div>
              
              <div className="flex items-center lg:justify-end gap-2">
                <button 
                  onClick={() => { setSelectedProduct(product); setTempDescription(catalogDescriptions[product.id] || ''); }}
                  className="w-10 h-10 rounded-xl bg-[#1a2744] flex items-center justify-center hover:bg-[#334155] border border-white/5 transition-all"
                >
                  <Edit size={16} className="text-[#64748b] group-hover:text-white" />
                </button>
              </div>
            </div>
          )) : (
            <div className="py-24 text-center opacity-20">
              <Package size={64} className="mx-auto" strokeWidth={1} />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em]">Nenhum produto em catálogo</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="shrink-0 mt-3 px-4 flex justify-between items-center text-[9px] font-black text-[#64748b] uppercase tracking-widest">
         <span>{editorProducts.length} PRODUTOS ENCONTRADOS NO FILTRO</span>
         <span className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
           SINCRONIZADO EM TEMPO REAL
         </span>
      </div>

      {/* Product Edit Modal Layout */}
      <AnimatePresence>
         {selectedProduct && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
             <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-panel w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-white/10">
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                   <div>
                     <h3 className="text-xl font-black text-white uppercase tracking-tighter">Engagement Content</h3>
                     <p className="text-[10px] font-bold text-white/30 uppercase mt-1">Refine customer presentation</p>
                   </div>
                   <button onClick={() => setSelectedProduct(null)} className="glass-button-secondary !p-2 transition-all hover:bg-red-500 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="p-10 flex-1 overflow-y-auto no-scrollbar space-y-10">
                    <div className="flex gap-10 items-start">
                       <div className="w-40 h-40 rounded-3xl glass-panel border-white/10 overflow-hidden shrink-0 bg-white/5 relative">
                         {selectedProduct.imageUrl ? (
                           <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center opacity-5">
                             <Package size={50} />
                           </div>
                         )}
                         <div className="absolute inset-x-0 bottom-0 bg-blue-600/60 text-white text-[8px] font-black uppercase py-1.5 text-center backdrop-blur-md">
                            Linked to Inventory
                         </div>
                       </div>
                       <div className="flex-1 space-y-6">
                         <div>
                           <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block ml-1">Asset Identity</label>
                           <div className="w-full p-5 glass-panel !bg-white/2 border-white/10 text-sm font-bold uppercase italic text-white/50">
                             {selectedProduct.name}
                           </div>
                         </div>
                         <div className="grid grid-cols-2 gap-6">
                            <div>
                               <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block ml-1">Collection</label>
                               <div className="w-full p-4 glass-panel !bg-white/2 border-white/10 text-[10px] font-black uppercase text-white/40">
                                 {categories.find(c => c.id === selectedProduct.categoryId)?.name || 'General Inventory'}
                               </div>
                            </div>
                            <div>
                               <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block ml-1">Current Valuation</label>
                               <div className="w-full p-4 glass-panel !bg-white/2 border-white/10 text-[10px] font-black text-white/80 flex items-center justify-between">
                                 <span>R$ {selectedProduct.price.toFixed(2)}</span>
                                 <Tag size={12} className="text-blue-400" />
                               </div>
                            </div>
                         </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-1">
                         <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Publicity Narrative</label>
                         <span className="text-[9px] font-bold text-blue-400/60 uppercase">This copy is unique to the catalog</span>
                       </div>
                       <textarea 
                          value={tempDescription}
                          onChange={e => setTempDescription(e.target.value)}
                          className="glass-input w-full p-6 !rounded-[2rem] text-sm min-h-[180px] font-medium transition-all leading-relaxed"
                          placeholder="Craft a compelling narrative to drive sales..."
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-1">Presence</label>
                          <button 
                            onClick={() => toggleCatalogVisibility(selectedProduct.id)}
                            className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 border ${selectedProduct.showInCatalog ? 'bg-blue-600/10 text-blue-400 border-blue-500/20 shadow-blue-500/10' : 'bg-white/5 text-white/20 border-white/5 opacity-50'}`}
                          >
                             {selectedProduct.showInCatalog ? <Eye size={18} /> : <EyeOff size={18} />}
                             {selectedProduct.showInCatalog ? 'Public Visibility' : 'Private Archive'}
                          </button>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-1">Spotlight</label>
                          <button 
                            onClick={() => toggleFeatured(selectedProduct.id)}
                            className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 border ${selectedProduct.isFeatured ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-white/20 border-white/5 opacity-50'}`}
                          >
                             <Star size={18} fill={selectedProduct.isFeatured ? 'currentColor' : 'none'} />
                             {selectedProduct.isFeatured ? 'Featured Star' : 'Standard Tier'}
                          </button>
                       </div>
                    </div>
                </div>

                <div className="p-10 border-t border-white/10 bg-white/5 flex gap-4">
                   <button 
                     onClick={() => { saveDescription(); setSelectedProduct(null); }}
                     className="glass-button-primary flex-1 py-5 text-sm font-black uppercase tracking-[0.3em] shadow-blue-600/20"
                   >
                     Apply Intelligence
                   </button>
                </div>
             </motion.div>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
