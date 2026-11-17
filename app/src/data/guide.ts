import type { GuideSection } from './types'

export const GUIDE: GuideSection[] = [
  {
    id: 'plato',
    title: 'El método del plato',
    tone: 'veg',
    intro:
      'Cada comida principal (comida y cena) lleva los cuatro grupos: verduras, proteína, hidratos integrales y grasas saludables.',
    bullets: [
      'Medio plato de verduras: 150-200 g en crudo o 200-250 g cocinadas.',
      'Un cuarto de plato de proteína y un cuarto de hidratos.',
      'Incluye al menos 3 colores distintos al día para variar nutrientes.',
      'Cocina con difusor: 5 ml por toma, 10-15 ml de aceite al día en total.',
    ],
  },
  {
    id: 'montar',
    title: 'Montar el plato',
    tone: 'prot',
    intro: 'Elige una opción de cada columna. Las cantidades de hidratos son en crudo.',
    table: {
      head: ['Hidratos', 'Proteína', 'Verduras'],
      rows: [
        ['40 g de arroz', '150 g de pollo o pavo', 'Calabacín, zanahoria'],
        ['40 g de quinoa', '120 g de lomo de cerdo', 'Espinaca cocinada'],
        ['40 g de pasta o noodles', '120 g de carne picada', 'Calabaza, berenjena'],
        ['120 g de ñoquis', '200 g de pescado blanco', 'Judías verdes'],
        ['200 g de patata', '150 g de pescado azul', 'Pimiento rojo asado'],
        ['150 g de boniato', '200 g de gambas, calamar o pulpo', 'Tomate cocinado, pepino'],
        ['60 g de pan', 'Lata de conserva de 80 g', 'Champiñón, pak choi'],
        ['1 fajita de trigo o 2 de maíz', '100 g de tofu o 200 g de legumbres', 'Brotes tiernos'],
      ],
    },
  },
  {
    id: 'grasas',
    title: 'Grasas del día',
    tone: 'fat',
    bullets: ['10-15 ml de aceite al día, con difusor.', 'Además, una de estas: 10 g de nueces, ¼ de aguacate o 10 g de aceitunas.'],
  },
  {
    id: 'equivalencias',
    title: 'De crudo a cocido',
    tone: 'carb',
    intro: 'Para cuando cocinas en tanda y pesas después.',
    table: {
      head: ['En crudo', 'En cocido', 'Medida casera'],
      rows: [
        ['40 g de arroz o quinoa', '110-130 g', '3 cdas soperas rasas'],
        ['40 g de pasta sin gluten', '90-100 g', '½ vaso de pasta corta seca'],
        ['50 g de pasta de lenteja', '110-130 g', '—'],
        ['50 g de noodles', '130 g', '½ bloque o 1 vaso troceados'],
        ['130 g de ñoquis', '140 g', '¾-1 vaso lleno'],
        ['200 g de patata', '180-190 g', '1 patata mediana-grande'],
        ['150 g de boniato', '140-150 g', '1 boniato pequeño-mediano'],
        ['40 g de puré en polvo', '200 g preparado', '4 cdas soperas colmadas'],
      ],
    },
  },
  {
    id: 'preentreno',
    title: 'Pre-entreno, según tolerancia',
    tone: 'carb',
    intro: '30-40 minutos antes de entrenar.',
    bullets: [
      'Líquidos: zumo natural (manzana, naranja, remolacha), smoothie de frutas o compota.',
      'Semisólidos: 30 g de fruta deshidratada, 2-3 dátiles o batido de plátano con bebida de almendras y 1 dátil.',
      'Sólidos: 1-2 tortitas de arroz con mermelada sin azúcar, 2 dátiles con crema de cacahuete o una pieza de fruta.',
      'Hidratación: 2 vasos de agua antes de salir y al menos 500 ml durante el entreno.',
    ],
  },
]
