// Valores aproximados por 100 g (o 100 ml) de alimento tal cual se pesa en la receta.
// Fuentes de referencia: BEDCA (AESAN) y USDA FoodData Central. Hidratos = disponibles (sin fibra).
export type FoodCat = 'hidrato' | 'proteina' | 'verdura' | 'fruta' | 'lacteo' | 'grasa' | 'otros'

export interface Food {
  id: string
  n: string
  k: number
  p: number
  c: number
  f: number
  cat: FoodCat
  /** Peso de una unidad típica (para mostrar "1 ud ≈ x g") */
  u?: number
  custom?: boolean
}

type Row = [id: string, n: string, k: number, p: number, c: number, f: number, cat: FoodCat, u?: number]

const rows: Row[] = [
  // Hidratos
  ['arroz', 'Arroz (crudo)', 354, 7, 77, 0.6, 'hidrato'],
  ['quinoa', 'Quinoa (cruda)', 368, 14, 57, 6, 'hidrato'],
  ['pasta', 'Pasta seca', 357, 12.5, 71, 1.5, 'hidrato'],
  ['pasta-lenteja', 'Pasta de lenteja', 340, 25, 48, 2, 'hidrato'],
  ['noodles', 'Noodles (secos)', 360, 11, 74, 1.5, 'hidrato'],
  ['nyoquis', 'Ñoquis', 160, 3.5, 34, 0.5, 'hidrato'],
  ['cuscus', 'Cuscús (crudo)', 376, 12.8, 72, 0.6, 'hidrato'],
  ['patata', 'Patata', 77, 2, 16, 0.1, 'hidrato'],
  ['boniato', 'Boniato', 86, 1.6, 18, 0.1, 'hidrato'],
  ['pan-integral', 'Pan integral', 247, 10, 41, 3.4, 'hidrato'],
  ['tostas-santivery', 'Pan tostado Santivery (centeno/lenteja)', 375, 12, 68, 3, 'hidrato', 9],
  ['tortita-arroz', 'Tortita de arroz', 387, 8, 81, 3, 'hidrato', 8],
  ['tortita-maiz', 'Tortita de maíz', 380, 8, 79, 3, 'hidrato', 9],
  ['tortita-sarraceno', 'Tortita de trigo sarraceno', 370, 12, 70, 3, 'hidrato', 9],
  ['fajita-trigo', 'Fajita de trigo', 310, 8.5, 50, 8, 'hidrato', 40],
  ['fajita-maiz', 'Fajita de maíz pequeña', 220, 5.7, 43, 2.9, 'hidrato', 25],
  ['fajita-avena', 'Fajita de avena grande', 300, 9, 47, 7, 'hidrato', 40],
  ['avena', 'Copos de avena', 372, 13.5, 58.7, 7, 'hidrato'],
  ['harina-avena', 'Harina de avena', 389, 14, 60, 8, 'hidrato'],
  ['harina', 'Harina de trigo', 364, 10, 73, 1, 'hidrato'],
  ['corn-flakes', 'Corn flakes 0%', 378, 7, 84, 0.9, 'hidrato'],
  ['cereales-choco', 'Cereales crunchy de chocolate', 420, 9, 68, 12, 'hidrato'],
  ['castana', 'Castaña cocida', 131, 2, 28, 1.4, 'hidrato'],
  ['garbanzos-cocidos', 'Garbanzos cocidos', 125, 7.5, 16, 2.5, 'hidrato'],
  ['lentejas-cocidas', 'Lentejas cocidas', 110, 8.5, 17, 0.4, 'hidrato'],
  ['alubias-cocidas', 'Alubias blancas cocidas', 100, 6.8, 14, 0.5, 'hidrato'],
  ['lentejas-secas', 'Lentejas (secas)', 335, 24, 49, 1.1, 'hidrato'],
  ['lenteja-roja', 'Lenteja roja (seca)', 345, 24, 52, 2, 'hidrato'],
  ['garbanzos-secos', 'Garbanzos (secos)', 364, 19, 55, 6, 'hidrato'],
  ['guisantes', 'Guisantes', 81, 5.4, 10, 0.4, 'hidrato'],
  ['gyozas', 'Gyozas', 200, 7, 30, 5, 'hidrato', 20],

  // Proteínas
  ['pollo', 'Pechuga de pollo', 110, 23, 0, 1.6, 'proteina'],
  ['contramuslo', 'Contramuslo de pollo sin piel', 120, 20, 0, 4.5, 'proteina'],
  ['pollo-picado', 'Carne picada de pollo', 140, 19, 0, 7, 'proteina'],
  ['zorza', 'Zorza de pollo marinada', 160, 18, 2, 9, 'proteina'],
  ['hamburguesa', 'Hamburguesa de pollo', 150, 16, 3, 8, 'proteina'],
  ['pavo', 'Pechuga de pavo', 105, 24, 0, 1, 'proteina'],
  ['pavo-99', 'Pavo 99% (lonchas)', 95, 20, 1.5, 1, 'proteina'],
  ['pavo-97', 'Pavo 97% (lonchas)', 100, 18, 2, 2, 'proteina'],
  ['lomo-cerdo', 'Lomo de cerdo', 145, 21, 0, 6.5, 'proteina'],
  ['chuletillas', 'Chuletillas / filete', 200, 20, 0, 13, 'proteina'],
  ['ternera-picada', 'Carne picada de ternera', 180, 20, 0, 11, 'proteina'],
  ['pescado-blanco', 'Pescado blanco (merluza)', 80, 17, 0, 1.5, 'proteina'],
  ['bacalao', 'Bacalao desalado', 75, 17.5, 0, 0.5, 'proteina'],
  ['salmon', 'Salmón', 200, 20, 0, 13, 'proteina'],
  ['salmon-ahumado', 'Salmón ahumado', 117, 18, 0, 4.3, 'proteina'],
  ['pescado-azul', 'Pescado azul', 180, 20, 0, 11, 'proteina'],
  ['gambas', 'Gambas / calamar / pulpo', 85, 18, 0, 1, 'proteina'],
  ['atun', 'Atún al natural (escurrido)', 105, 24, 0, 1, 'proteina', 56],
  ['caballa', 'Caballa / melva al natural', 160, 21, 0, 8.5, 'proteina', 60],
  ['sardinas', 'Sardinas en lata', 200, 24, 0, 11, 'proteina', 80],
  ['huevo', 'Huevo', 143, 12.6, 0.7, 9.5, 'proteina', 55],
  ['clara', 'Claras de huevo', 52, 11, 0.7, 0.2, 'proteina'],
  ['tofu', 'Tofu', 125, 13, 2, 7.5, 'proteina'],
  ['heura', 'Heura (filete)', 170, 19, 3, 8, 'proteina'],
  ['jamon-serrano', 'Jamón serrano', 240, 30, 0, 13, 'proteina', 15],
  ['jamon-cocido', 'Jamón cocido 92%', 105, 18, 1.5, 3, 'proteina', 15],
  ['lomo-embuchado', 'Lomo embuchado', 230, 38, 1, 8, 'proteina'],
  ['proteina-polvo', 'Proteína en polvo', 380, 80, 6, 5, 'proteina', 30],

  // Lácteos
  ['yogur', 'Yogur natural', 61, 3.5, 4.7, 3.3, 'lacteo', 125],
  ['yogur-cabra', 'Yogur natural de cabra/oveja', 75, 3.8, 4.5, 4.5, 'lacteo', 125],
  ['yogur-coco', 'Yogur de coco natural', 95, 1, 5, 8, 'lacteo', 125],
  ['yogur-soja', 'Yogur de soja natural', 50, 4, 2.5, 2.2, 'lacteo', 125],
  ['yogur-proteina', 'Yogur +proteínas natural', 60, 10, 4, 0.2, 'lacteo', 120],
  ['kefir', 'Kéfir natural', 60, 3.5, 4.5, 3.2, 'lacteo'],
  ['kefir-0', 'Kéfir bebible 0%', 40, 4, 5, 0.1, 'lacteo'],
  ['skyr', 'Skyr natural', 63, 11, 4, 0.2, 'lacteo'],
  ['queso-batido', 'Queso fresco batido 0%', 46, 8, 4, 0.1, 'lacteo'],
  ['cottage', 'Queso cottage', 85, 11, 3.5, 3, 'lacteo'],
  ['requeson', 'Requesón 0% / ricotta light', 75, 12, 4, 1, 'lacteo'],
  ['feta', 'Queso feta', 265, 14, 4, 21, 'lacteo'],
  ['queso-fresco', 'Queso fresco', 175, 12, 3, 13, 'lacteo'],
  ['queso-rallado', 'Queso rallado / mozzarella', 280, 22, 2, 20, 'lacteo'],
  ['parmesano', 'Parmesano', 400, 33, 0, 29, 'lacteo'],
  ['queso-crema', 'Queso crema light', 160, 8, 5, 12, 'lacteo'],
  ['leche', 'Leche semidesnatada', 46, 3.2, 4.7, 1.6, 'lacteo'],
  ['bebida-almendra', 'Bebida de almendras sin azúcar', 13, 0.4, 0, 1.1, 'lacteo'],
  ['bebida-vegetal', 'Bebida vegetal (avena/soja)', 45, 1.5, 6, 1.5, 'lacteo'],
  ['nata-soja', 'Nata / crema de soja', 175, 2.5, 2, 17, 'lacteo'],
  ['leche-coco', 'Leche de coco', 180, 1.6, 3, 18, 'lacteo'],

  // Grasas
  ['aceite', 'Aceite de oliva virgen extra', 899, 0, 0, 100, 'grasa'],
  ['aguacate', 'Aguacate', 160, 2, 2, 15, 'grasa', 140],
  ['hummus', 'Hummus', 260, 7, 10, 20, 'grasa'],
  ['nueces', 'Nueces', 654, 15, 7, 65, 'grasa'],
  ['almendras', 'Almendras', 600, 21, 7, 53, 'grasa'],
  ['cacahuete-polvo', 'Cacahuete en polvo desgrasado', 400, 45, 20, 12, 'grasa'],
  ['crema-cacahuete', 'Crema de cacahuete / frutos secos', 600, 25, 12, 50, 'grasa'],
  ['aceitunas', 'Aceitunas', 145, 1, 1, 15, 'grasa'],
  ['coco-rallado', 'Coco rallado', 660, 7, 7, 65, 'grasa'],
  ['chia', 'Semillas de chía', 486, 17, 8, 31, 'grasa'],
  ['linaza', 'Linaza molida / psyllium', 534, 18, 1.6, 42, 'grasa'],
  ['chocolate', 'Chocolate negro 85%', 600, 10, 20, 50, 'grasa', 10],
  ['cacao', 'Cacao puro desgrasado', 360, 20, 12, 12, 'otros'],
  ['calamar', 'Calamar', 92, 15.6, 3.1, 1.4, 'proteina'],
  ['pesto', 'Pesto', 450, 5, 6, 45, 'grasa'],
  ['soja-texturizada', 'Soja texturizada (seca)', 330, 50, 18, 1, 'proteina'],
  ['maiz-palomitas', 'Maíz para palomitas', 375, 11, 63, 4.5, 'hidrato'],

  // Verduras
  ['calabacin', 'Calabacín', 17, 1.2, 2.2, 0.3, 'verdura'],
  ['zanahoria', 'Zanahoria', 41, 0.9, 7, 0.2, 'verdura', 70],
  ['espinacas', 'Espinacas', 23, 2.9, 1.4, 0.4, 'verdura'],
  ['calabaza', 'Calabaza', 26, 1, 5, 0.1, 'verdura'],
  ['berenjena', 'Berenjena', 25, 1, 3, 0.2, 'verdura'],
  ['judias-verdes', 'Judías verdes', 31, 1.8, 4.3, 0.2, 'verdura'],
  ['pimiento-rojo', 'Pimiento rojo', 31, 1, 4.6, 0.3, 'verdura'],
  ['pimiento-verde', 'Pimiento verde', 20, 0.9, 2.9, 0.2, 'verdura'],
  ['piquillo', 'Pimiento del piquillo', 30, 1, 5, 0.3, 'verdura', 20],
  ['tomate', 'Tomate', 18, 0.9, 3.1, 0.2, 'verdura'],
  ['tomate-triturado', 'Tomate triturado', 32, 1.4, 5, 0.2, 'verdura'],
  ['tomate-seco', 'Tomate seco', 258, 14, 44, 3, 'verdura'],
  ['pepino', 'Pepino', 15, 0.7, 2.6, 0.1, 'verdura'],
  ['champinon', 'Champiñón', 22, 3.1, 1, 0.3, 'verdura'],
  ['setas', 'Setas / shiitake', 30, 3, 3, 0.4, 'verdura'],
  ['pak-choi', 'Pak choi', 13, 1.5, 1.2, 0.2, 'verdura'],
  ['brotes', 'Brotes tiernos / canónigos', 15, 1.5, 1.5, 0.3, 'verdura'],
  ['cebolla', 'Cebolla', 40, 1.1, 7.6, 0.1, 'verdura', 110],
  ['puerro', 'Puerro', 40, 1.5, 7, 0.3, 'verdura', 90],
  ['ajo', 'Ajo', 149, 6.4, 30, 0.5, 'verdura', 4],
  ['esparragos', 'Espárragos', 20, 2.2, 2, 0.1, 'verdura'],
  ['esparragos-blancos', 'Espárragos blancos (bote)', 24, 2, 2.5, 0.3, 'verdura'],
  ['alcachofa', 'Alcachofas', 47, 3.3, 5, 0.2, 'verdura'],
  ['coliflor', 'Coliflor', 25, 1.9, 3, 0.3, 'verdura'],
  ['brocoli', 'Brócoli', 34, 2.8, 4, 0.4, 'verdura'],
  ['verduras-mix', 'Verduras congeladas (mezcla)', 32, 1.8, 4.5, 0.3, 'verdura'],
  ['crema-verduras', 'Crema de verduras', 40, 1.2, 5, 1.5, 'verdura'],
  ['perejil', 'Perejil / cilantro', 36, 3, 3, 0.8, 'verdura'],

  // Frutas
  ['fruta', 'Pieza de fruta', 52, 0.5, 12, 0.2, 'fruta', 150],
  ['platano', 'Plátano', 94, 1.2, 20, 0.3, 'fruta', 120],
  ['kiwi', 'Kiwi', 61, 1.1, 12, 0.5, 'fruta', 75],
  ['pina', 'Piña', 50, 0.5, 11, 0.1, 'fruta'],
  ['manzana', 'Manzana', 52, 0.3, 12, 0.2, 'fruta', 160],
  ['pera', 'Pera', 57, 0.4, 13, 0.1, 'fruta', 170],
  ['fresas', 'Fresas', 32, 0.7, 6, 0.3, 'fruta'],
  ['arandanos', 'Arándanos', 57, 0.7, 12, 0.3, 'fruta'],
  ['frutos-rojos', 'Frutos rojos (frambuesa, mora, fresa)', 45, 1, 8, 0.4, 'fruta'],
  ['mango', 'Mango', 60, 0.8, 14, 0.4, 'fruta'],
  ['papaya', 'Papaya', 43, 0.5, 10, 0.3, 'fruta'],
  ['melon', 'Melón', 34, 0.8, 8, 0.2, 'fruta'],
  ['caqui', 'Caqui', 70, 0.6, 16, 0.2, 'fruta', 200],
  ['datil', 'Dátil', 282, 2.5, 65, 0.4, 'fruta', 8],
  ['fruta-deshidratada', 'Fruta deshidratada', 300, 2, 70, 0.5, 'fruta'],
  ['limon', 'Limón (zumo)', 22, 0.4, 7, 0.2, 'fruta'],

  // Otros
  ['miel', 'Miel', 304, 0.3, 82, 0, 'otros', 7],
  ['mermelada', 'Mermelada sin azúcar', 150, 0.5, 35, 0, 'otros'],
  ['mostaza', 'Mostaza', 66, 4, 5, 3.5, 'otros', 5],
  ['caldo', 'Caldo de pollo o verduras', 7, 0.5, 0.5, 0.2, 'otros'],
  ['cafe', 'Café', 2, 0.1, 0, 0, 'otros'],
  ['salsa-soja', 'Salsa de soja', 53, 8, 5, 0, 'otros'],
  ['especias', 'Especias (curry, cúrcuma, pimentón…)', 300, 12, 30, 10, 'otros'],
]

export const BASE_FOODS: Record<string, Food> = Object.fromEntries(
  rows.map(([id, n, k, p, c, f, cat, u]) => [id, { id, n, k, p, c, f, cat, u }]),
)

export const CAT_LABEL: Record<FoodCat, string> = {
  hidrato: 'Hidratos',
  proteina: 'Proteína',
  verdura: 'Verdura',
  fruta: 'Fruta',
  lacteo: 'Lácteo',
  grasa: 'Grasa',
  otros: 'Otros',
}
