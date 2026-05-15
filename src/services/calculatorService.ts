
export type CostCategory = 'Direto' | 'Indireto' | 'Operacional';

export type CalculationType = 'peso' | 'volume' | 'folha' | 'unidade' | 'tempo' | 'energia';

export interface CalculatorMaterial {
  id: string;
  name: string;
  category: string; // Subcategory like 'Resina', 'Filamento', etc.
  rootCategory: CostCategory;
  type: CalculationType;
  
  // Purchase Info
  buyPrice: number;
  buyQuantity: number;
  buyUnit: string; // kg, g, L, ml, pacote, etc.
  
  // Sheet/Fractional specific
  partsPerUnit?: number; // Artes por folha
  
  // Energy specific
  potencyWatts?: number;
  kwhPrice?: number;
  
  // Time specific
  hourlyRate?: number;
  
  // Metadata
  updatedAt: number;
  createdAt: number;
}

export interface ProjectUsage {
  materialId: string;
  quantityUsed: number; // For weight, volume, unit, parts, hours
  timeUsed?: { hours: number; minutes: number }; // For time and energy
  cost: number;
}

export interface CalculatorProject {
  id: string;
  name: string;
  usages: ProjectUsage[];
  margin: number;
  totalCost: number;
  suggestedPrice: number;
  updatedAt: number;
  createdAt: number;
}

export const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const calculateMaterialCost = (material: CalculatorMaterial, usage: Partial<ProjectUsage>): number => {
  const { type, buyPrice, buyQuantity, partsPerUnit, hourlyRate, potencyWatts, kwhPrice } = material;
  
  switch (type) {
    case 'peso':
    case 'volume':
    case 'unidade':
      return (buyPrice / buyQuantity) * (usage.quantityUsed || 0);
    
    case 'folha':
      // buyQuantity is number of sheets in package
      const costPerSheet = buyPrice / buyQuantity;
      const costPerPart = costPerSheet / (partsPerUnit || 1);
      return costPerPart * (usage.quantityUsed || 0);
      
    case 'tempo':
      const totalHours = usage.quantityUsed || 0; // Usage is stored as decimal hours
      return (hourlyRate || 0) * totalHours;
      
    case 'energia':
      const hours = usage.quantityUsed || 0;
      return ((potencyWatts || 0) / 1000) * hours * (kwhPrice || 0);
      
    default:
      return 0;
  }
};
