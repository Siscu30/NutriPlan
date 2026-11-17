// Menú de las dos semanas del plan de noviembre (igual para los dos; cambian las raciones).
type Day = { desayuno: string[]; comida: string[]; cena: string[] }
const d = (desayuno: string[], comida: string[], cena: string[]): Day => ({ desayuno, comida, cena })

export const WEEK_MENUS: Day[][] = [
  [
    d(['bol-yogur'], ['pollo-mostaza'], ['crema-setas', 'tosta-caballa']),
    d(['tosta-aguacate-pavo-huevo'], ['legumbre-calabaza-feta'], ['salmon-calabacin-cottage']),
    d(['tosta-aguacate-fresas'], ['pasta-calabaza'], ['judias-patata-atun']),
    d(['bol-kefir'], ['quinoa-garbanzos-pisto'], ['crema-calabaza', 'alcachofas-huevo-jamon']),
    d(['gachas-avena'], ['nyoquis-espinacas-salmon'], ['ensalada-invierno']),
    d(['chia-pudding'], ['pescado-patata-esparragos'], ['salteado-pollo']),
    d(['tosta-aguacate-pavo-huevo'], ['pasta-lenteja-pisto'], ['crema-setas', 'tosta-caballa']),
  ],
  [
    d(['bol-yogur'], ['quinoa-garbanzos-pisto'], ['judias-boniato-atun']),
    d(['tosta-aguacate-pavo-huevo'], ['macarrones-guisantes-salmon'], ['crema-calabaza', 'tosta-caballa']),
    d(['tosta-aguacate-fresas'], ['legumbre-calabaza-feta'], ['chuletillas-pina']),
    d(['bol-kefir'], ['noodles-gambas'], ['ensalada-invierno']),
    d(['gachas-avena'], ['salteado-bacalao'], ['migas-coliflor']),
    d(['chia-pudding'], ['judias-patata-atun'], ['sopa-pollo']),
    d(['tosta-aguacate-pavo-huevo'], ['pescado-patata-esparragos'], ['alcachofas-huevo-jamon']),
  ],
]

export const MERIENDA_ROTATION = {
  fran: ['bocadillo', 'kefir-fruta', 'tortitas-lomo', 'bol-merienda'],
  lua: ['bocadillo', 'tarro-fruta', 'pulga-atun', 'kefir-bebible', 'merienda-salada', 'burrito', 'bol-merienda'],
}

export const MENU_NOTES = [
  '¼ de plato de hidratos: arroz, quinoa, cuscús, pasta integral, legumbres, pasta de legumbres, patata, boniato, pan o fajita.',
  'Si no haces merienda, puedes tomar de postre fruta o un lácteo natural.',
]
