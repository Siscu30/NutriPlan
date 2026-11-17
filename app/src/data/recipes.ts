// Recetas extraídas de los planes de noviembre (Plan Noviembre 2.0 y Lua Noviembre 2).
// Las cantidades son por ración y por persona: [Francisco, Lua]. 0 = no lo lleva.
import type { Meal, PersonId } from './types'
export type { Meal, PersonId }

export interface RecipeIng {
  f: string
  g: number | [number, number]
  t?: string
}

export interface Recipe {
  id: string
  name: string
  meal: Meal[]
  group?: string
  only?: PersonId
  ing: RecipeIng[]
  steps: string[]
  note?: string
  /** Notas distintas por persona */
  noteBy?: Partial<Record<PersonId, string>>
  /** Rinde para N raciones (las cantidades ya están divididas por ración) */
  yields?: string
}

const I = (f: string, g: number | [number, number], t?: string): RecipeIng => ({ f, g, t })

const PISTO = [I('cebolla', 50), I('pimiento-rojo', 60), I('calabacin', 100), I('tomate', 80), I('aceite', 5, '1 cdta')]

export const RECIPES: Recipe[] = [
  // ───────────── Desayunos ─────────────
  {
    id: 'bol-yogur',
    name: 'Bol de yogur con fruta y copos de avena',
    meal: ['desayuno'],
    ing: [
      I('yogur', 150, '150 ml de kéfir o yogur natural'),
      I('platano', [100, 0], 'Plátano, kiwi, piña, mango… entero o triturado'),
      I('avena', [20, 0], '2 cdas'),
      I('frutos-rojos', [0, 50], 'Frambuesas, arándanos, moras, fresas…'),
      I('nueces', [0, 20], 'Nueces o almendras'),
      I('linaza', [0, 5], 'Lino molido o psyllium'),
    ],
    steps: ['Sirve el lácteo en un bol.', 'Añade la fruta troceada o triturada.', 'Termina con los copos (o frutos secos y semillas).'],
    noteBy: {
      fran: 'Otra opción: yogur vegetal triturado con plátano y fresas congeladas y 1 cdta de chía.',
      lua: 'En tu plan el bol lleva fruta roja, frutos secos y linaza en lugar de cereal.',
    },
  },
  {
    id: 'bol-kefir',
    name: 'Bol de kéfir con fruta y copos de avena',
    meal: ['desayuno'],
    ing: [
      I('kefir', 150, '150 ml'),
      I('fruta', [120, 0], 'Plátano, kiwi, piña, manzana, pera…'),
      I('avena', [20, 0], '2 cdas de copos o crunchy de avena'),
      I('frutos-rojos', [0, 50]),
      I('almendras', [0, 20]),
      I('linaza', [0, 5]),
    ],
    steps: ['Sirve el kéfir en un bol.', 'Añade la fruta y los toppings.'],
  },
  {
    id: 'tosta-aguacate-pavo-huevo',
    name: 'Tostada de aguacate con pavo y huevo',
    meal: ['desayuno'],
    ing: [
      I('pan-integral', 55, '50-60 g de pan'),
      I('aguacate', [50, 35]),
      I('pavo-99', 40),
      I('huevo', 55, '1 huevo'),
      I('fruta', 150, 'Pieza de fruta'),
    ],
    steps: ['Tuesta el pan.', 'Chafa el aguacate por encima.', 'Añade el pavo y el huevo (revuelto, a la plancha o cocido).', 'Acompaña con una pieza de fruta.'],
    note: 'Grasa a elegir: ½ aguacate, 2 cdas de cottage, 1 cda de hummus o 5 ml de aceite.',
  },
  {
    id: 'tosta-aguacate-fresas',
    name: 'Tostada de aguacate con fresas y miel',
    meal: ['desayuno'],
    ing: [I('pan-integral', 55), I('aguacate', [50, 35]), I('fresas', 100), I('miel', 7, '1 cdta')],
    steps: ['Tuesta el pan y unta el aguacate.', 'Lamina las fresas por encima.', 'Termina con un hilo de miel.'],
  },
  {
    id: 'gachas-avena',
    name: 'Gachas de avena con plátano y cacao',
    meal: ['desayuno'],
    ing: [I('avena', 40), I('bebida-vegetal', 150, '150 ml de leche o bebida vegetal'), I('platano', 100), I('cacao', 5, '1 cdta')],
    steps: ['Calienta la bebida con la avena 3-4 min removiendo.', 'Añade el cacao.', 'Sirve con el plátano en rodajas por encima.'],
    note: 'El plan indica 40 g de cereal o copos de avena por bol.',
  },
  {
    id: 'chia-pudding',
    name: 'Chia pudding con kiwi',
    meal: ['desayuno'],
    ing: [
      I('bebida-almendra', 150, '150 ml de bebida o 120 ml de yogur/skyr'),
      I('chia', [12, 24], '1 cda (Lua: 2 cdas)'),
      I('kiwi', 75),
      I('tostas-santivery', [0, 18], '2 tostas de centeno o lenteja roja'),
      I('aguacate', [0, 30]),
      I('huevo', [0, 55], 'Huevo cocido'),
    ],
    steps: ['Mezcla la chía con la bebida y deja en la nevera mínimo 2 h (mejor la noche antes).', 'Sirve con el kiwi por encima.'],
    noteBy: {
      fran: 'Sabor tiramisú: añade 30 ml de café y 1 cdta de miel. Sabor Raffaello: con yogur de coco y 1 cdta de coco rallado.',
      lua: 'Acompáñalo con 2 tostas: aguacate y huevo cocido, aguacate y tomate + pavo, o hummus y huevo duro.',
    },
  },

  // ───────────── Meriendas ─────────────
  {
    id: 'bocadillo',
    name: 'Bocadillo integral',
    meal: ['merienda'],
    ing: [
      I('pan-integral', [60, 50], 'Fran: 60 g · Lua: pulga de 45-55 g'),
      I('hummus', 15, 'Base de hummus, aguacate o queso'),
      I('pavo-97', 40, 'Pavo, 2 lonchas de serrano, tortilla de 2 huevos o atún'),
      I('tomate', 40, 'Tomate, piquillo o canónigos'),
      I('fruta', 150, 'Pieza de fruta'),
    ],
    steps: ['Abre el pan y unta la base.', 'Añade la proteína y el complemento.', 'Acompaña con una pieza de fruta.'],
  },
  {
    id: 'kefir-fruta',
    name: 'Kéfir bebible 0% con fruta',
    meal: ['merienda'],
    ing: [I('kefir-0', 150, '150 ml'), I('fruta', 150)],
    steps: ['Un bebible de kéfir y una pieza de fruta.'],
  },
  {
    id: 'tortitas-lomo',
    name: 'Tortitas con lomo embuchado o queso fresco',
    meal: ['merienda'],
    ing: [
      I('tortita-arroz', [32, 0], '4 tortitas de arroz o maíz'),
      I('tortita-sarraceno', [0, 36], '4 tortitas de centeno Santivery (o 3 de arroz)'),
      I('lomo-embuchado', [40, 30]),
      I('tomate', 40),
    ],
    steps: ['Monta las tortitas con el lomo (o queso fresco) y tomate.'],
  },
  {
    id: 'bol-merienda',
    name: 'Bol de yogur con copos y fruta',
    meal: ['merienda'],
    ing: [
      I('queso-batido', 150, '150 ml de yogur, kéfir o queso batido'),
      I('corn-flakes', [40, 0], '40 g de corn flakes 0% o avena'),
      I('fruta', [150, 165], 'Fruta picada'),
    ],
    steps: ['Mezcla el lácteo con los copos.', 'Añade la fruta picada y canela al gusto.'],
  },

  // ───────────── Comidas ─────────────
  {
    id: 'pollo-mostaza',
    name: 'Pollo a la mostaza con verduras',
    meal: ['comida'],
    ing: [
      I('pollo', 140, '120-150 g'),
      I('cebolla', 50),
      I('champinon', 80),
      I('mostaza', 5, '1 cdta'),
      I('caldo', 50, 'Un chorrito'),
      I('yogur', 15, '1 cda'),
      I('calabacin', 150, 'Verduras al gusto'),
      I('arroz', 40, '¼ de plato de hidratos'),
      I('aceite', 5),
    ],
    steps: ['Dora el pollo con pimienta.', 'Pocha la cebolla y los champiñones.', 'Añade la mostaza, el caldo y el yogur.', 'Deja espesar y sirve con verduras y el hidrato.'],
  },
  {
    id: 'legumbre-calabaza-feta',
    name: 'Lentejas o garbanzos con espinacas, calabaza asada y feta',
    meal: ['comida'],
    ing: [I('garbanzos-cocidos', 200, '200 g de legumbre cocida'), I('espinacas', 100), I('calabaza', 150), I('feta', 30), I('ajo', 4), I('aceite', 5), I('limon', 10)],
    steps: ['Asa la calabaza en dados.', 'Calienta la legumbre cocida con las espinacas y el ajo.', 'Mezcla todo.', 'Termina con feta desmigado y limón.'],
  },
  {
    id: 'pasta-calabaza',
    name: 'Pasta con salsa de calabaza',
    meal: ['comida'],
    ing: [
      I('pasta', 40),
      I('calabaza', 200),
      I('cebolla', 50),
      I('requeson', 30, '2 cdas de requesón o queso batido 0% (o 30 ml de leche de coco)'),
      I('pollo', 150, 'Proteína del plato a elegir'),
    ],
    steps: ['Asa la calabaza con la cebolla.', 'Tritura con un poco de agua de cocción y el requesón.', 'Cuece la pasta.', 'Mezcla, ajusta y sirve con pimienta.'],
    note: 'Proteína según «Montar el plato» de la guía (150 g de pollo o pavo, o la que elijas de la tabla).',
  },
  {
    id: 'quinoa-garbanzos-pisto',
    name: 'Quinoa con garbanzos y pisto',
    meal: ['comida'],
    ing: [I('quinoa', 40), I('garbanzos-cocidos', 150), ...PISTO],
    steps: ['Lava y cuece la quinoa.', 'Prepara el pisto con cebolla, pimiento, calabacín y tomate.', 'Añade los garbanzos escurridos.', 'Sirve sobre la quinoa.'],
  },
  {
    id: 'nyoquis-espinacas-salmon',
    name: 'Ñoquis con salsa de espinacas, tomate seco, ricotta y salmón',
    meal: ['comida'],
    ing: [I('nyoquis', 120), I('espinacas', 150), I('requeson', 70, '70 g de requesón 0%, crema de soja o coco'), I('tomate-seco', 10), I('salmon', 150)],
    steps: ['Saltea las espinacas.', 'Mezcla con el requesón y un poco de agua.', 'Incorpora el tomate seco picado.', 'Cuece los ñoquis y añade el salmón al final.'],
    note: 'Otra opción: ½ plato de verduras asadas congeladas + ñoquis + 2 cdas de tomate y proteína a la plancha.',
  },
  {
    id: 'pasta-lenteja-pisto',
    name: 'Pasta de lenteja o ñoquis con pisto y contramuslos',
    meal: ['comida'],
    ing: [I('pasta-lenteja', 50), ...PISTO, I('contramuslo', 150)],
    steps: ['Haz un pisto con cebolla, pimiento, calabacín y tomate.', 'Dora el contramuslo sin piel.', 'Cuece la pasta de lenteja o los ñoquis.', 'Junta todo y deja integrar.'],
  },
  {
    id: 'macarrones-guisantes-salmon',
    name: 'Macarrones con salsa de guisantes, ricotta, limón y salmón ahumado',
    meal: ['comida'],
    ing: [I('pasta', 40), I('guisantes', 150), I('requeson', 70), I('limon', 10), I('salmon-ahumado', 60)],
    steps: ['Cuece los guisantes y tritúralos con el requesón, limón y agua de la pasta.', 'Cuece los macarrones.', 'Junta y añade tiras de salmón ahumado al servir.'],
  },
  {
    id: 'noodles-gambas',
    name: 'Noodles con champiñones, nata de soja, gambas y queso',
    meal: ['comida'],
    ing: [I('noodles', 40), I('champinon', 120), I('ajo', 4), I('gambas', 200), I('nata-soja', 30), I('aceite', 5)],
    steps: ['Saltea ajo y champiñones.', 'Incorpora las gambas peladas y cocina.', 'Añade nata de soja o un poquito de queso.', 'Mezcla los noodles cocidos con la salsa.'],
  },
  {
    id: 'salteado-bacalao',
    name: 'Salteado rústico con bacalao o merluza y tomate',
    meal: ['comida', 'cena'],
    ing: [I('verduras-mix', 220, 'Verduras rústicas + asadas'), I('tomate-triturado', 60), I('bacalao', 100, 'Bacalao desalado, merluza o caballa'), I('patata', [200, 0], 'Patata cocida'), I('aceite', 5)],
    steps: ['Saltea las verduras.', 'Incorpora el tomate triturado.', 'Añade el bacalao desmigado o la merluza y cocina.', 'Si eliges caballa en conserva, añádela al final.'],
  },
  {
    id: 'pescado-patata-esparragos',
    name: 'Pescado con patata, espárragos y salsa de mostaza, limón y miel',
    meal: ['comida', 'cena'],
    ing: [I('pescado-blanco', [200, 120]), I('patata', [250, 100]), I('esparragos', 225, 'Espárragos o judías'), I('mostaza', 5), I('miel', 4), I('limon', 10), I('aceite', 5)],
    steps: ['Asa o cuece la patata.', 'Haz el pescado a la plancha.', 'Saltea los espárragos o judías.', 'Mezcla 1 cdta de mostaza con limón y poca miel y riega.'],
  },

  // ───────────── Cenas ─────────────
  {
    id: 'crema-setas',
    name: 'Crema de setas y castañas',
    meal: ['cena'],
    ing: [I('puerro', 80), I('setas', 200), I('castana', 40), I('caldo', 200), I('aceite', 5)],
    steps: ['Pocha el puerro y las setas.', 'Añade las castañas cocidas y el caldo.', 'Cuece 15 min y tritura.'],
    noteBy: {
      fran: 'Sola se acompaña con 2 huevos + daditos de jamón, 200 g de pescado o 150 g de hamburguesa.',
      lua: 'Sola se acompaña con 1 huevo o 80-100 g de pescado/caballa.',
    },
  },
  {
    id: 'tosta-caballa',
    name: 'Tosta de aguacate, huevo y caballa',
    meal: ['cena'],
    ing: [I('pan-integral', [60, 40], 'O 4 tostas Santivery (Lua: 3)'), I('aguacate', 30), I('huevo', 55), I('caballa', [60, 55])],
    steps: ['Tuesta el pan.', 'Chafa el aguacate.', 'Añade el huevo y la caballa al natural.'],
  },
  {
    id: 'crema-calabaza',
    name: 'Crema de calabaza y boniato',
    meal: ['cena'],
    ing: [I('cebolla', 50, 'Cebolla o puerro'), I('calabaza', 250), I('boniato', 150), I('caldo', 200), I('aceite', 5)],
    steps: ['Sofríe la cebolla o el puerro.', 'Añade calabaza y boniato.', 'Cubre con caldo, cuece y tritura.'],
    noteBy: {
      fran: 'Sola se acompaña con 2 huevos duros + 40 g de jamón, o 200 g de pescado.',
      lua: 'Sola se acompaña con 2 huevos duros o 100 g de pescado.',
    },
  },
  {
    id: 'alcachofas-huevo-jamon',
    name: 'Alcachofas con huevo y jamón',
    meal: ['cena'],
    ing: [I('alcachofa', 200, 'Alcachofas congeladas (u otra verdura)'), I('ajo', 4), I('jamon-serrano', [40, 30], 'Taquitos'), I('huevo', 55), I('tostas-santivery', [18, 9], 'Fran: 2 rebanadas · Lua: 1')],
    steps: ['Cocina las alcachofas hasta que estén tiernas.', 'Saltea el ajo.', 'Añade los taquitos de jamón y un huevo revuelto o a la plancha.', 'Acompaña con el pan tostado.'],
    noteBy: { lua: 'Puedes usar espárragos, judías, alcachofas o coles de Bruselas en tarro.' },
  },
  {
    id: 'salmon-calabacin-cottage',
    name: 'Salmón ahumado con calabacín, tomate seco y cottage',
    meal: ['cena'],
    ing: [I('calabacin', 250), I('tomate-seco', 10), I('salmon-ahumado', 50, 'O 100-120 g de salmón a la plancha'), I('cottage', 50), I('pan-integral', [60, 40], 'Fran: o tarrina de arroz')],
    steps: ['Marca el calabacín a la plancha.', 'Añade tomate seco picado.', 'Sirve con cottage y lonchas de salmón.'],
  },
  {
    id: 'judias-patata-atun',
    name: 'Judías verdes, lentejas, patata, tomate seco y atún',
    meal: ['cena'],
    ing: [I('judias-verdes', 200, 'Judías o guisantes'), I('patata', [250, 90]), I('lentejas-cocidas', [0, 80]), I('tomate-seco', 10), I('atun', [80, 70]), I('limon', 10), I('aceite', 5)],
    steps: ['Cuece la patata y las judías.', 'Añade las lentejas escurridas y el tomate seco.', 'Mezcla con el atún y aliña con limón.'],
  },
  {
    id: 'judias-boniato-atun',
    name: 'Judías verdes con boniato y atún',
    meal: ['cena'],
    ing: [I('judias-verdes', 200), I('boniato', [250, 125]), I('ajo', 4), I('atun', 80, 'Atún, caballa, melva o aguja'), I('aceite', 5)],
    steps: ['Cuece las judías y asa el boniato.', 'Saltea el ajo.', 'Junta todo con el atún escurrido.'],
    noteBy: { fran: 'Alternativa: 150 g de zorza de pollo marinada (solo puntualmente).' },
  },
  {
    id: 'chuletillas-pina',
    name: 'Chuletillas con ensalada templada y piña a la plancha',
    meal: ['cena'],
    ing: [I('chuletillas', [150, 110], 'Lomo, filete o contramuslo'), I('brotes', 100), I('tomate', 100), I('pina', 90, '3-4 rebanadas'), I('boniato', [200, 0], 'Boniato o patata'), I('aceite', 5)],
    steps: ['Cocina las chuletillas.', 'Marca la piña.', 'Mezcla hojas verdes, tomate y verduras templadas.', 'Aliña con limón.'],
    note: 'Carne roja (ternera) solo de forma ocasional.',
  },
  {
    id: 'ensalada-invierno',
    name: 'Ensalada de invierno: espinacas, pera, queso, nueces y jamón',
    meal: ['cena'],
    ing: [I('espinacas', 100), I('tomate', 100, 'Otras verduras hasta 200 g'), I('pera', 170), I('queso-fresco', 20), I('nueces', [20, 15]), I('jamon-serrano', [40, 30], 'O 100 g de pollo en tiras'), I('quinoa', [40, 0], 'Tarrina de quinoa o avena cocida'), I('aceite', 5)],
    steps: ['Lava las espinacas.', 'Añade la pera en láminas, el queso, las nueces y el jamón.', 'Aliña con vinagre y AOVE.'],
  },
  {
    id: 'salteado-pollo',
    name: 'Salteado rústico con carne picada de pollo',
    meal: ['cena'],
    ing: [I('verduras-mix', 210, 'Mezcla rústica congelada'), I('pollo-picado', 150), I('tomate-triturado', 60), I('boniato', [0, 165], 'Al micro, airfryer u horno'), I('aceite', 5)],
    steps: ['Saltea las verduras hasta evaporar el agua.', 'Añade la carne picada y especias.', 'Cocina bien y añade tomate triturado.'],
  },
  {
    id: 'migas-coliflor',
    name: 'Migas de coliflor con tomate triturado y huevo',
    meal: ['cena'],
    ing: [I('coliflor', 225, 'Migas congeladas (o cualquier verdura)'), I('tomate-triturado', 80), I('huevo', 110, '2 huevos'), I('caballa', [60, 0], 'Lata de caballa o 100 g de pollo'), I('aceite', 5)],
    steps: ['Saltea las migas de coliflor 6-8 min.', 'Añade tomate triturado y especias.', 'Haz un hueco y cuaja los huevos.'],
  },
  {
    id: 'sopa-pollo',
    name: 'Sopa de pollo con contramuslo',
    meal: ['cena'],
    ing: [I('verduras-mix', 150), I('caldo', 300), I('pasta', 40, 'Pasta de sopa'), I('contramuslo', [150, 120]), I('tortita-sarraceno', [36, 0], '4 tortitas Santivery o 50 g de pan')],
    steps: ['Sofríe las verduras.', 'Añade el caldo.', 'Cuece la pasta y el pollo sin piel hasta que esté bien hecho.', 'Desmiga el pollo.'],
  },

  // ───────────── Extras ─────────────
  {
    id: 'lentejas-pollo', name: 'Lentejas con pollo', meal: ['comida', 'extra'], group: 'Platos de cuchara', yields: 'Para 4',
    ing: [I('lentejas-secas', 75), I('pollo', 90), I('patata', 85), I('zanahoria', 20), I('cebolla', 30), I('pimiento-verde', 25), I('ajo', 3), I('tomate-triturado', 8), I('aceite', 5)],
    steps: ['Dora el pollo con un poco de aceite. Retira y reserva.', 'En la misma olla cocina cebolla, ajo, pimientos y zanahoria. Añade el tomate.', 'Incorpora el pimentón y remueve rápido para que no se queme.', 'Añade las lentejas lavadas, el pollo, las patatas chascadas y el laurel.', 'Cubre con agua o caldo, sala y lleva a ebullición. Tapa y cuece 40-45 min.', 'Deja reposar 5 min antes de servir.'],
    note: 'Las patatas chascadas espesan el caldo. Tritura 3 cucharones de lentejas para que quede más cremoso.',
  },
  {
    id: 'falafel', name: 'Falafel con salsa de yogur', meal: ['comida', 'extra'], group: 'Platos de cuchara', yields: 'Para 4', only: 'fran',
    ing: [I('garbanzos-secos', 150), I('cebolla', 30), I('perejil', 100, 'Perejil y cilantro'), I('ajo', 3), I('harina', 10, 'Pan rallado o harina de garbanzo'), I('aceite', 15, 'Absorbido en la fritura (estimado)'), I('yogur', 30, 'Salsa')],
    steps: ['Remoja los garbanzos al menos 6 h (mejor toda la noche).', 'Pica perejil y cilantro y mezcla con cebolla, ajo, comino, sal y pimienta. Añade bicarbonato.', 'Tritura los garbanzos crudos poco a poco hasta lograr una pasta verde.', 'Añade pan rallado o harina hasta que esté firme.', 'Forma bolitas y refrigera 30 min.', 'Fríe a 170-180 °C 6-8 min hasta dorar.'],
    note: 'Salsa: yogur griego ligero + 1 cda de aceite + zumo de ½ limón, hierbas y ajo en polvo.',
  },
  {
    id: 'ramen', name: 'Ramen casero', meal: ['cena', 'extra'], group: 'Platos de cuchara',
    ing: [I('caldo', 300), I('tomate-triturado', 50), I('leche-coco', 50), I('setas', 60), I('pimiento-rojo', 50), I('gyozas', 80, '4 gyozas'), I('noodles', 50), I('heura', 150), I('huevo', 55, 'Cocido 6 min'), I('salsa-soja', 10)],
    steps: ['Mezcla en una sartén el tomate triturado con la leche de coco y el caldo.', 'Añade las setas shiitake y el pimiento rojo.', 'Pasa las gyozas por la sartén y cuece los noodles.', 'Marca la heura con salsa de soja.', 'Sirve con el huevo cocido y 1 cda de salsa especial.'],
    note: 'Salsa especial: perejil, orégano, pimentón, cayena, ajo y cebolla en polvo, aceite y vinagre blanco emulsionados. Se guarda en bote de cristal en la nevera.',
  },
  {
    id: 'caldo-pollo', name: 'Caldo de pollo y verduras', meal: ['extra'], group: 'Platos de cuchara', yields: '8-10 raciones',
    ing: [I('caldo', 250, '1 ración')],
    steps: ['Pon 4 l de agua fría con la carcasa de pollo, los huesos y todas las verduras.', 'Calienta poco a poco y retira las impurezas con una espumadera.', 'Añade hierbas y un poco de sal.', 'Cocina 2 h 30 min a fuego suave (o 1 h en olla a presión).', 'Desgrasa, cuela y rectifica de sal.'],
    note: 'Con 4 litros de agua quedan unos 2,5-3 litros de caldo.',
  },
  {
    id: 'crema-calabaza-4r', name: 'Crema de calabaza', meal: ['cena', 'extra'], group: 'Cremas calientes', yields: 'Para 4',
    ing: [I('puerro', 20), I('cebolla', 28), I('calabaza', 190), I('zanahoria', 60), I('queso-crema', 10, '1 cda')],
    steps: ['Sofríe ½ puerro y 1 cebolla.', 'Junta con 750 g de calabaza (si está asada, mejor) y 4 zanahorias.', 'Cubre con agua y cuece hasta que la calabaza se pinche.', 'Tritura y añade 4 cdas de queso crema light.'],
  },
  {
    id: 'crema-calabacin-4r', name: 'Crema de calabacín y guisantes', meal: ['cena', 'extra'], group: 'Cremas calientes', yields: 'Para 4',
    ing: [I('cebolla', 28), I('zanahoria', 18), I('calabacin', 60), I('guisantes', 70), I('patata', 40), I('queso-crema', 7)],
    steps: ['Sofríe cebolla, zanahoria, calabacín y los guisantes 5 min.', 'Cubre con agua y añade 1 patata.', 'Cuando se pinche, tritura todo.', 'Puedes añadir 2 cdas de queso crema light.'],
  },
  {
    id: 'crema-puerro-4r', name: 'Crema de puerro y patata', meal: ['cena', 'extra'], group: 'Cremas calientes', yields: 'Para 4',
    ing: [I('cebolla', 28), I('puerro', 45), I('patata', 62), I('queso-crema', 7)],
    steps: ['Sofríe 1 cebolla y 2 puerros.', 'Añade 250 g de patata en dados y cubre con agua.', 'Tritura y añade 2 cdas de queso crema light o 1 quesito.'],
  },
  {
    id: 'crema-lenteja-roja-4r', name: 'Crema de lentejas rojas', meal: ['cena', 'extra'], group: 'Cremas calientes', yields: 'Para 4',
    ing: [I('cebolla', 28), I('ajo', 2), I('puerro', 22), I('zanahoria', 18), I('patata', 40), I('lenteja-roja', 45), I('aceite', 3)],
    steps: ['Sofríe la cebolla y 2 dientes de ajo.', 'Añade 1 puerro, 1 zanahoria y 1 patata troceados.', 'Incorpora 180 g de lenteja roja y cubre con 1,5 l de agua o caldo.', 'Cuece y tritura.'],
  },
  {
    id: 'tostas-hummus-atun', name: 'Tostas de hummus con atún', meal: ['cena', 'extra'], group: 'Modo supervivencia',
    ing: [I('pan-integral', [60, 40], '2 tostas'), I('hummus', 20), I('atun', 56), I('esparragos-blancos', 60, 'O piquillos sin azúcar')],
    steps: ['Unta el hummus en las tostas.', 'Añade el atún y los espárragos o piquillos.'],
  },
  {
    id: 'crema-jamon-huevo', name: 'Crema o gazpacho con jamón y huevo', meal: ['cena', 'extra'], group: 'Modo supervivencia',
    ing: [I('crema-verduras', 250, 'Crema de verduras, salmorejo o gazpacho'), I('jamon-serrano', 40, 'Dados'), I('huevo', 55, 'Picado')],
    steps: ['Sirve la crema y añade los dados de jamón y el huevo picado.'],
  },
  {
    id: 'ensalada-quinoa', name: 'Ensalada de quinoa', meal: ['cena', 'extra'], group: 'Modo supervivencia',
    ing: [I('quinoa', 40, 'Tarrina de quinoa'), I('tomate', 80, 'Cherry'), I('pimiento-rojo', 50), I('brotes', 30), I('aguacate', 40, 'Aguacate o queso'), I('tofu', 100, 'Tofu desmenuzado o pollo preparado')],
    steps: ['Junta todo en un bol y aliña.'],
  },
  {
    id: 'ensalada-campera', name: 'Ensalada campera', meal: ['cena', 'extra'], group: 'Modo supervivencia',
    ing: [I('judias-verdes', 200, 'Judías o verduras al micro'), I('patata', 200, 'Patata cocida en conserva'), I('sardinas', 80)],
    steps: ['Calienta las verduras al micro.', 'Añade la patata cocida y las sardinas.'],
  },
  {
    id: 'tosta-hummus-caballa', name: 'Tosta de hummus con caballa', meal: ['cena', 'extra'], group: 'Cenas perezosas',
    ing: [I('pan-integral', [70, 40]), I('hummus', 20), I('piquillo', 40, 'Piquillo, tomate o calabacín a la plancha'), I('caballa', 80)],
    steps: ['Unta el pan con hummus.', 'Añade el pimiento y la caballa o melva.'],
  },
  {
    id: 'tosta-huevos-setas', name: 'Tosta de huevos revueltos con setas', meal: ['cena', 'extra'], group: 'Cenas perezosas',
    ing: [I('pan-integral', [70, 40], 'O 2 fajitas de maíz'), I('aguacate', 70, '½ aguacate'), I('brotes', 20), I('huevo', 110), I('setas', 80)],
    steps: ['Saltea las setas y haz un revuelto con los huevos.', 'Monta sobre el pan con aguacate y brotes.'],
  },
  {
    id: 'tosta-tofu-curry', name: 'Tosta de tofu con curry', meal: ['cena', 'extra'], group: 'Cenas perezosas',
    ing: [I('pan-integral', [70, 40]), I('tofu', 100, 'O 200 g de gambas'), I('leche-coco', 30), I('espinacas', 30, 'Espinacas o tomate'), I('especias', 3, 'Curry, cúrcuma, ajo en polvo')],
    steps: ['Desmiga el tofu con las manos.', 'Cocínalo con curry, leche de coco, cúrcuma y ajo en polvo.', 'Añade espinacas o tomate y monta sobre el pan.'],
  },
  {
    id: 'pate-alubias', name: 'Paté de alubias y pimiento', meal: ['cena', 'extra'], group: 'Cenas perezosas',
    ing: [I('tortita-sarraceno', [36, 27], 'Fran: 4 · Lua: 3 tortitas'), I('alubias-cocidas', 100), I('piquillo', 40, '2 piquillos'), I('huevo', 55, 'O 50 g de tofu, 40 g de atún o 1 loncha de queso')],
    steps: ['Tritura las alubias con los piquillos, pimentón y un poco del líquido de los pimientos.', 'Unta las tortitas y añade el huevo cocido desmenuzado.'],
  },
  {
    id: 'bol-yogur-cena', name: 'Bol de yogur con fruta', meal: ['cena', 'extra'], group: 'Cenas perezosas', only: 'lua',
    ing: [I('yogur-proteina', 120), I('arandanos', 80, 'Arándanos o fruta troceada'), I('cereales-choco', 15, '2 cdas')],
    steps: ['Sirve el yogur con la fruta y los cereales por encima.'],
  },
  {
    id: 'gachas-proteicas', name: 'Gachas proteicas', meal: ['cena', 'extra'], group: 'Cena dulce salvavidas', only: 'lua',
    ing: [I('avena', 70), I('bebida-vegetal', 30), I('proteina-polvo', 30, '1 scoop o 100 ml de claras'), I('platano', 120), I('crema-cacahuete', 10, 'O 1 onza de chocolate')],
    steps: ['Mezcla todo en un cuenco con un toque de canela.', 'Micro 3-4 min.', 'Topping: onza de chocolate o crema de cacahuete y más fruta.'],
    note: 'Ocasional.',
  },
  {
    id: 'tortitas-proteicas', name: 'Tortitas proteicas', meal: ['cena', 'extra'], group: 'Cena dulce salvavidas', only: 'lua',
    ing: [I('clara', 100), I('harina-avena', 40), I('cacao', 6), I('leche', 50)],
    steps: ['Mezcla las claras con la harina de avena, canela y el cacao.', 'Añade la leche.', 'A la sartén: cuando salgan burbujitas, dales la vuelta.'],
    note: 'Ocasional.',
  },
  {
    id: 'paninis-alubia', name: 'Paninis de alubia blanca', meal: ['cena', 'extra'], group: 'Recetillas extra', yields: 'Receta entera',
    ing: [I('alubias-cocidas', 125, '½ bote escurrido'), I('cottage', 15), I('huevo', 110)],
    steps: ['Tritura las alubias con el cottage, los huevos, sal, pimienta, ajo y orégano.', 'Extiende en la bandeja y hornea 15 min a 180 °C.', 'Saca, rellena y 10 min más.'],
  },
  {
    id: 'lactonesa', name: 'Lactonesa', meal: ['extra'], group: 'Recetillas extra', yields: '1 cucharada',
    ing: [I('aceite', 7), I('leche', 3.5)],
    steps: ['En un vaso batidor junta 100 ml de aceite, 50 ml de leche, 1 cda de vinagre y sal.', 'Tritura 30 s.'],
    note: 'Aguanta 5 días en la nevera en bote cerrado.',
  },
  {
    id: 'pizza-coliflor', name: 'Pizza de base de coliflor', meal: ['cena', 'extra'], group: 'Bases de pizza', yields: 'Para 2',
    ing: [I('coliflor', 250), I('queso-rallado', 15), I('parmesano', 8), I('huevo', 28)],
    steps: ['Ralla la coliflor y cocínala 6 min en el micro tapada.', 'Escúrrela en un paño hasta que esté muy seca.', 'Mezcla con los quesos, el huevo, sal, orégano y ajo.', 'Extiende sobre papel y hornea 15 min a 200 °C.', 'Añade toppings y 6-7 min más.'],
  },
  {
    id: 'pizza-brocoli', name: 'Pizza de brócoli', meal: ['cena', 'extra'], group: 'Bases de pizza', yields: 'Para 2',
    ing: [I('brocoli', 150), I('huevo', 55), I('queso-rallado', 35), I('tomate-triturado', 20), I('jamon-cocido', 20), I('tomate', 25, 'Cherry')],
    steps: ['Procesa el brócoli y mezcla con los huevos y el queso.', 'Hornea 20 min a 200 °C.', 'Topping: tomate, jamón 92 %, queso y cherry.'],
  },
  {
    id: 'pizza-atun', name: 'Pizza de atún', meal: ['cena', 'extra'], group: 'Bases de pizza',
    ing: [I('atun', 112, '2 latas pequeñas'), I('huevo', 55), I('harina-avena', 10), I('tomate-triturado', 40), I('queso-rallado', 20)],
    steps: ['Tritura el atún con el huevo, la harina y especias.', 'Hornea 10 min a 180 °C.', 'Cubre con tomate, queso y anchoas o jamón. 2 min más.'],
  },
  {
    id: 'pizza-calabacin', name: 'Pizza de calabacín', meal: ['cena', 'extra'], group: 'Bases de pizza', yields: 'Para 2',
    ing: [I('calabacin', 100), I('harina-avena', 25), I('huevo', 55), I('clara', 33), I('tomate-triturado', 15), I('queso-rallado', 20), I('jamon-cocido', 30), I('champinon', 20)],
    steps: ['Tritura ½ calabacín con 5 cdas de harina de avena, 2 huevos y 2 claras. Sal, orégano y ajo.', 'Hornea la base.', 'Relleno: tomate, queso, jamón 92 % o atún, champiñón y cherry.'],
  },
  {
    id: 'fajipizza', name: 'Fajipizza', meal: ['cena', 'extra'], group: 'Bases de pizza',
    ing: [I('fajita-avena', 40), I('tomate-triturado', 30), I('jamon-cocido', 15), I('atun', 56), I('aceitunas', 10), I('queso-rallado', 20)],
    steps: ['Base de tomate y orégano sobre la fajita.', 'Añade jamón, atún, aceitunas y queso.', 'Al horno hasta que se funda.'],
    note: 'Acompaña con salmorejo, ensalada o crema.',
  },
  {
    id: 'pizza-boniato', name: 'Pizza con base de boniato', meal: ['cena', 'extra'], group: 'Bases de pizza', yields: 'Para 2',
    ing: [I('boniato', 150), I('huevo', 28), I('harina', 35)],
    steps: ['Aplasta 300 g de boniato cocido con 1 huevo y 70 g de harina.', 'Extiende fino sobre papel engrasado.', 'Hornea 15 min a 200 °C.', 'Añade toppings y 10 min más a 190 °C.'],
  },
  {
    id: 'energy-balls', name: 'Energy balls pre-entreno', meal: ['extra'], group: 'Pre-entreno', yields: '12 bolitas · 1 bolita',
    ing: [I('datil', 17), I('chocolate', 2), I('cacao', 1), I('coco-rallado', 2.5)],
    steps: ['Procesa 200 g de dátil, 2 onzas de chocolate, 1 cda de cacao, 30 g de coco, vainilla y sal.', 'Forma bolitas y a la nevera (o aplana en un táper para barritas).'],
  },
  // ───────────── Meriendas y recetas dulces del plan de Lua ─────────────
  { id: 'bizcocho-taza', name: 'Bizcocho a la taza', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('platano', 120, '1 plátano aplastado'), I('huevo', 55), I('harina-avena', 30, '3 cdas'), I('chocolate', 10, '1 onza de chocolate 85% picado')],
    steps: ['Aplasta el plátano y mézclalo con el huevo, la harina de avena y una pizca de levadura.', 'Añade el chocolate picado.', '3 min al micro.'] },
  { id: 'pulga-atun', name: 'Pulga de atún', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('pan-integral', 50, '1 pulga o panecillo 100% integral'), I('atun', 56, 'Atún al natural'), I('hummus', 15, '1 cda'), I('tomate', 40)],
    steps: ['Unta el hummus en el pan.', 'Añade el atún y el tomate.'] },
  { id: 'tarro-fruta', name: 'Tarro con fruta', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('yogur', 125, '1 yogur natural o skyr'), I('avena', 20, '2 cdas de copos de avena'), I('fruta', 120, 'Fruta de temporada')],
    steps: ['Monta en un tarro el yogur, los copos y la fruta.'] },
  { id: 'sandwich-dulce', name: 'Sándwich dulce', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('pan-integral', 60, '2 rebanadas de pan 100% integral'), I('crema-cacahuete', 15, '1 cda de crema de cacahuete 100%'), I('platano', 120, '1 plátano en rodajas')],
    steps: ['Unta la crema de cacahuete.', 'Añade el plátano en rodajas y cierra.'] },
  { id: 'kefir-bebible', name: 'Kéfir bebible con fruta y frutos secos', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('kefir', 200, '1 kéfir natural bebible'), I('fruta', 120, 'Fruta de temporada'), I('nueces', 25, '20-30 g de frutos secos al natural')],
    steps: ['Un kéfir bebible, una pieza de fruta y un puñado de frutos secos.'] },
  { id: 'burrito', name: 'Burrito', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('fajita-trigo', 40, '1 tortilla integral'), I('huevo', 55, '1 huevo cocido'), I('cottage', 30, '2 cdas de queso cottage'), I('aguacate', 70, '½ aguacate'), I('tomate', 40)],
    steps: ['Rellena la tortilla con el huevo picado, el cottage, el aguacate y el tomate.', 'Enróllala.'] },
  { id: 'fruta-kefir', name: 'Pieza de fruta', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('fruta', 150, 'Primera elección: pieza de fruta')],
    steps: ['Primera elección: una pieza de fruta.'],
    note: 'Alternativa: kéfir natural 0% bebible.' },
  { id: 'pulga-serrano', name: 'Pulga de jamón serrano', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('pan-integral', 30, '½ sándwich'), I('hummus', 10), I('jamon-serrano', 20), I('fresas', 150, 'Pieza de fruta: fresas')],
    steps: ['Medio sándwich de hummus con jamón serrano.', 'Acompaña con fresas.'] },
  { id: 'bol-kefir-chia', name: 'Bol de kéfir con chía', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('kefir', 120), I('chia', 12, '1 cda sopera, hidratada toda la noche'), I('arandanos', 80, 'Arándanos o mango')],
    steps: ['Hidrata la chía en el kéfir toda la noche.', 'Sirve con arándanos o mango.'] },
  { id: 'ideas-sandwich', name: 'Sándwich de aguacate, jamón y tomate', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('pan-integral', 60), I('aguacate', 35), I('jamon-serrano', 20), I('tomate', 30)],
    steps: ['Monta el sándwich con aguacate, jamón y tomate.'],
    note: 'Otras ideas: crema de cacahuete 0% con plátano laminado, o huevo picado con queso crema o aguacate.' },
  { id: 'tortitas-quinoa', name: 'Tortitas de quinoa con jamón o queso', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('tortita-arroz', 24, 'Tortitas de quinoa o arroz'), I('jamon-cocido', 30, 'Jamón o queso')],
    steps: ['Monta las tortitas con jamón o queso.'],
    note: 'El plan no indica cantidades: 3 tortitas y 30 g de jamón como referencia.' },
  { id: 'merienda-salada', name: 'Tortitas de arroz tipo pizza', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('tortita-arroz', 16, '2 tortitas de arroz'), I('tomate-triturado', 30, 'Con orégano'), I('pavo-97', 30, 'Pavo cocido'), I('queso-rallado', 15), I('aceitunas', 10, 'Laminadas')],
    steps: ['Base de tomate triturado con orégano.', 'Añade pavo, queso y aceitunas.', 'Micro 2 min o air fryer 5 min a 150 °C.'] },
  { id: 'merienda-dulce', name: 'Queso batido con arándanos y almendras', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('queso-batido', 150, 'O kéfir natural'), I('arandanos', 50), I('fruta', 80, 'Fruta picada'), I('almendras', 10, 'Picadas')],
    steps: ['Mezcla el queso batido con la fruta.', 'Añade las almendras picadas.'] },
  { id: 'nutella-fit', name: 'Tostada de nutella fit', meal: ['merienda'], group: 'Meriendas', only: 'lua',
    ing: [I('pan-integral', 40, '1 tostada (o 2 tortitas)'), I('cacahuete-polvo', 12, '1 cda de cacahuete en polvo desgrasado'), I('cacao', 5, '1 cdta de cacao puro'), I('fresas', 80, 'Fruta')],
    steps: ['Disuelve el cacahuete en polvo y el cacao con agua hasta una textura suave.', 'Unta la tostada y añade fruta.'] },
  { id: 'bizcocho-chocolate', name: 'Bizcocho a la taza de chocolate', meal: ['merienda', 'extra'], group: 'Recetas dulces', only: 'lua',
    ing: [I('platano', 120), I('huevo', 55), I('harina-avena', 10, '1 cda'), I('cacao', 5, 'Opcional'), I('chocolate', 10, '1 onza en el centro')],
    steps: ['Aplasta un plátano y mézclalo con el huevo, la harina de avena y 3 g de levadura.', 'Opcional: cacao, vainilla o canela.', 'Pon una onza de chocolate en el centro.', 'Micro 2-3 min.'] },
  { id: 'mousse-caqui', name: 'Mousse de caqui y chocolate', meal: ['merienda', 'extra'], group: 'Recetas dulces', only: 'lua',
    ing: [I('caqui', 200, '1 caqui'), I('yogur-coco', 125, '1 yogur de coco'), I('cacao', 6, '1 cda'), I('chia', 12, '1 cda, opcional')],
    steps: ['Tritura el caqui con el yogur de coco, el cacao y la chía.'] },
  { id: 'tortitas-platano', name: 'Tortitas de plátano y avena', meal: ['merienda', 'extra'], group: 'Recetas dulces', only: 'lua',
    ing: [I('huevo', 55), I('platano', 60, '½ plátano'), I('harina-avena', 40), I('bebida-vegetal', 50, 'Hasta textura cremosa')],
    steps: ['Bate el huevo con el plátano machacado y vainilla.', 'Añade la harina de avena y bebida vegetal hasta que quede cremoso.', 'Cuaja en la sartén por los dos lados.'] },
  { id: 'mug-cake', name: 'Mug cake de manzana', meal: ['merienda', 'extra'], group: 'Recetas dulces', only: 'lua',
    ing: [I('manzana', 160), I('huevo', 55), I('harina-avena', 10, '1 cda'), I('chocolate', 5, 'Virutas')],
    steps: ['Pela y trocea la manzana; 3 min al micro.', 'Mezcla con el huevo, la harina, canela, vainilla y 1 g de levadura.', 'Tritura y micro 3-4 min.', 'Añade virutas de chocolate al final.'] },
  { id: 'galletas-quinoa', name: 'Galletas de quinoa y chocolate', meal: ['merienda', 'extra'], group: 'Recetas dulces', only: 'lua', yields: '1 galleta',
    ing: [I('quinoa', 10), I('chocolate', 12), I('aceite', 1, 'Aceite de coco')],
    steps: ['Lava la quinoa y déjala en remojo 15 min.', 'Tuéstala en una sartén.', 'Funde ½ tableta de chocolate con ½ cdta de aceite de coco al micro.', 'Mezcla, da forma de galleta y a la nevera.'],
    note: 'El plan no indica raciones; cantidades por galleta orientativas. Se puede usar arroz hinchado.' },
  { id: 'tostas-dulces', name: 'Tosta de crema de cacao casera', meal: ['merienda', 'extra'], group: 'Recetas dulces', only: 'lua',
    ing: [I('pan-integral', 40), I('cacahuete-polvo', 20, '2 cdas'), I('cacao', 6, '1 cda'), I('leche', 20, 'Hasta la textura deseada'), I('platano', 60, 'Plátano o fresas')],
    steps: ['Mezcla el cacahuete en polvo y el cacao con leche.', 'Unta la tostada y lamina la fruta por encima.'] },
  { id: 'flan-taza', name: 'Flan a la taza', meal: ['merienda', 'extra'], group: 'Recetas dulces', only: 'lua', yields: '2 raciones',
    ing: [I('huevo', 55), I('leche', 125), I('miel', 4)],
    steps: ['Mezcla 2 huevos, 250 ml de leche, 1 cda de miel y vainilla.', 'Reparte en dos tazas.', 'Micro 4-5 min.'] },
  { id: 'tartaleta', name: 'Tostas dulces (tartaleta)', meal: ['merienda', 'extra'], group: 'Recetas dulces', only: 'lua', yields: '2 raciones',
    ing: [I('pan-integral', 30, '1 tosta de pan de molde'), I('huevo', 28), I('leche', 15), I('platano', 60, '½ plátano'), I('miel', 4)],
    steps: ['Aplasta la tosta y en el hueco añade el huevo batido con 2 cdas de leche y vainilla.', 'Pon medio plátano partido por encima.', 'Canela y miel.', '8 min a 190 °C.'] },
  { id: 'brownie-pera', name: 'Brownie de pera', meal: ['extra'], group: 'Recetas dulces', only: 'lua', yields: 'Receta entera',
    ing: [I('pera', 300, '2 peras pequeñas muy maduras'), I('huevo', 110, '2 huevos'), I('cacao', 15, '3 cdas'), I('miel', 7, '1 cda'), I('harina', 25, '3 cdas de maicena o 2 de harina de almendra')],
    steps: ['Tritura las peras con los huevos, el cacao, la miel, vainilla, 12 g de levadura y la maicena.', 'Hornea a 180 °C 15-20 min.'] },
  { id: 'banana-bread', name: 'Banana bread (cuadraditos)', meal: ['extra'], group: 'Recetas dulces', only: 'lua', yields: '8 raciones',
    ing: [I('platano', 30), I('huevo', 21), I('harina-avena', 25), I('miel', 2), I('aceite', 3)],
    steps: ['Tritura 2 plátanos muy maduros con 3 huevos, 200 g de harina de avena, 14 g de levadura, 1 cda de miel (o 5 dátiles), 2 cdas de aceite y canela.', 'Hornea a 180 °C 40-45 min, hasta que el palillo salga limpio.'] },
]
