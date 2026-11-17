/* ============ DOCX IMPORT PARSER (pure, no deps) ============ */

export function emptyMeal() { return { nombre: '', ingredientes: [], calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, comments: '' }; }

export const UNIT_RULES = [
  [/pollo/i, { unit: "g", def: 200 }],
  [/pavo/i, { unit: "g", def: 200 }],
  [/ternera|res/i, { unit: "g", def: 180 }],
  [/cerdo/i, { unit: "g", def: 180 }],
  [/cordero/i, { unit: "g", def: 180 }],
  [/salm[oó]n/i, { unit: "g", def: 180 }],
  [/merluza|bacalao|dorada|lubina/i, { unit: "g", def: 180 }],
  [/at[uú]n/i, { unit: "lata", def: 1 }],
  [/sardina|caballa/i, { unit: "g", def: 120 }],
  [/huevo/i, { unit: "ud", def: 2 }],
  [/jam[oó]n/i, { unit: "g", def: 60 }],
  [/queso/i, { unit: "g", def: 50 }],
  [/tofu/i, { unit: "g", def: 150 }],
  [/garbanzo|lenteja|alub|jud[ií]a(?! verde)/i, { unit: "g", def: 200 }],
  [/patata/i, { unit: "g", def: 250 }],
  [/boniato/i, { unit: "g", def: 200 }],
  [/arroz/i, { unit: "g", def: 60 }],
  [/pasta|fideo|macarr|espagueti|tallarin/i, { unit: "g", def: 70 }],
  [/quinoa/i, { unit: "g", def: 60 }],
  [/pan(?!\s*rallado)/i, { unit: "g", def: 60 }],
  [/tortilla de trigo|wrap|fajita/i, { unit: "ud", def: 2 }],
  [/tortita/i, { unit: "ud", def: 2 }],
  [/pizza/i, { unit: "ud", def: 1 }],
  [/yogur/i, { unit: "ud", def: 1 }],
  [/leche/i, { unit: "ml", def: 200 }],
  [/aceite/i, { unit: "ml", def: 10 }]
];

export function unitForName(name) {
  for (const [r, info] of UNIT_RULES) if (r.test(name)) return info;
  return { unit: "g", def: 100 };
}

export function findExplicitQty(text, matchWord) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(matchWord.toLowerCase());
  if (idx < 0) return null;
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + matchWord.length + 50);
  const win = text.slice(start, end);
  let m = win.match(/(\d+(?:[.,]\d+)?)\s*(kg|kgs|gramos|gr|g)\b/i);
  if (m) {
    const n = parseFloat(m[1].replace(",", "."));
    const u = m[2].toLowerCase();
    return { qty: u.startsWith("kg") ? Math.round(n * 1000) : Math.round(n), unit: "g" };
  }
  m = win.match(/(\d+)\s*(ml|cl|l)\b/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const u = m[2].toLowerCase();
    return { qty: u === "l" ? n * 1000 : (u === "cl" ? n * 10 : n), unit: "ml" };
  }
  m = win.match(/(\d+)\s*(unidades?|uds?|fajitas?|tortitas?|wraps?|latas?|huevos?|piezas?|rebanadas?|lonchas?|yogures?|yogurts?)\b/i);
  if (m) {
    let u = m[2].toLowerCase().replace(/s$/, "");
    if (u === "huevo" || u === "pieza" || u === "unidade" || u === "unidad" || u === "ud") u = "ud";
    if (u === "yogure" || u === "yogurt") u = "ud";
    return { qty: parseInt(m[1], 10), unit: u };
  }
  return null;
}

export function formatIng(name, qty, unit) {
  if (!qty || !unit) return name;
  if (unit === "g" || unit === "ml") return `${name} ${qty}${unit}`;
  return `${name} ${qty} ${unit}`;
}

export function parseIngString(str) {
  if (!str) return { name: "", qty: null, unit: null };
  let m = str.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|gramos|gr|ml|cl|l)\b/i);
  if (m) {
    const n = parseFloat(m[2].replace(",", "."));
    const u = m[3].toLowerCase();
    if (u.startsWith("k")) return { name: m[1].trim(), qty: Math.round(n * 1000), unit: "g" };
    if (u === "l")        return { name: m[1].trim(), qty: Math.round(n * 1000), unit: "ml" };
    if (u === "cl")       return { name: m[1].trim(), qty: Math.round(n * 10),   unit: "ml" };
    if (u === "ml")       return { name: m[1].trim(), qty: Math.round(n),         unit: "ml" };
    return { name: m[1].trim(), qty: Math.round(n), unit: "g" };
  }
  m = str.match(/^(.+?)\s+(\d+)\s*(ud|uds|unidades?|unidad|fajitas?|tortitas?|wraps?|latas?|piezas?|rebanadas?|lonchas?|raciones?)\b/i);
  if (m) {
    let u = m[3].toLowerCase().replace(/s$/, "");
    if (u === "unidade" || u === "unidad" || u === "ud" || u === "pieza" || u === "racione" || u === "racion") u = "ud";
    return { name: m[1].trim(), qty: parseInt(m[2], 10), unit: u };
  }
  return { name: str.trim(), qty: null, unit: null };
}

export function formatGrams(n) {
  if (n >= 1000) {
    const v = n / 1000;
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, "")).replace(".", ",") + " kg";
  }
  return n + " g";
}

export function formatMl(n) {
  if (n >= 1000) return (n/1000).toFixed(n%1000===0?0:1).replace(".", ",") + " L";
  return n + " ml";
}

export function formatShopQty(it) {
  const parts = [];
  if (it.grams) parts.push(formatGrams(it.grams));
  if (it.ml) parts.push(formatMl(it.ml));
  for (const [u, n] of Object.entries(it.units)) parts.push(`x${n} ${u}`);
  if (!parts.length && it.count > 1) parts.push(`x${it.count} raciones`);
  return parts.join(" · ");
}

/* ----- DOCX PARSER ----- */
export const FOOD_DICT = [
  // protein
  { match: /pollo/i,            qty: 200, kcal: 330, prot: 62, carb: 0,  fat: 7  },
  { match: /pavo/i,             qty: 200, kcal: 270, prot: 60, carb: 0,  fat: 4  },
  { match: /ternera|res/i,      qty: 180, kcal: 350, prot: 50, carb: 0,  fat: 16 },
  { match: /cerdo/i,            qty: 180, kcal: 340, prot: 48, carb: 0,  fat: 16 },
  { match: /cordero/i,          qty: 180, kcal: 360, prot: 46, carb: 0,  fat: 18 },
  { match: /salm[oó]n/i,        qty: 180, kcal: 370, prot: 36, carb: 0,  fat: 24 },
  { match: /merluza|bacalao|dorada|lubina|pescado/i, qty: 180, kcal: 180, prot: 36, carb: 0, fat: 4 },
  { match: /at[uú]n( en lata|al natural)?/i, qty: 80, kcal: 140, prot: 28, carb: 0, fat: 3 },
  { match: /sardina|caballa/i,  qty: 120, kcal: 230, prot: 30, carb: 0,  fat: 12 },
  { match: /huevo(s)?/i,        qty: 100, kcal: 154, prot: 12, carb: 0,  fat: 11 },
  { match: /jam[oó]n( cocido| ibérico| serrano| york)?/i, qty: 60, kcal: 105, prot: 17, carb: 0, fat: 4 },
  { match: /queso/i,            qty: 50,  kcal: 180, prot: 12, carb: 1,  fat: 14 },
  { match: /tofu/i,             qty: 150, kcal: 110, prot: 12, carb: 2,  fat: 6  },
  { match: /garbanzo|lenteja|alub|jud[ií]a/i, qty: 200, kcal: 240, prot: 14, carb: 36, fat: 4 },
  // carbs
  { match: /patata/i,           qty: 250, kcal: 215, prot: 5,  carb: 49, fat: 0  },
  { match: /boniato/i,          qty: 200, kcal: 180, prot: 3,  carb: 42, fat: 0  },
  { match: /arroz/i,            qty: 60,  kcal: 216, prot: 4,  carb: 48, fat: 0  },
  { match: /pasta|fideo|macarr|espagueti|tallarin/i, qty: 70, kcal: 250, prot: 9, carb: 50, fat: 1 },
  { match: /quinoa/i,           qty: 60,  kcal: 220, prot: 8,  carb: 38, fat: 4  },
  { match: /pan integral|pan de molde|tostada/i, qty: 60, kcal: 160, prot: 6, carb: 30, fat: 2 },
  { match: /pan(?!\s*rallado)/i, qty: 60, kcal: 160, prot: 6, carb: 30, fat: 2 },
  { match: /tortilla de trigo|wrap|tortita/i, qty: 60, kcal: 180, prot: 5, carb: 30, fat: 4 },
  { match: /avena|copos/i,      qty: 50,  kcal: 190, prot: 7,  carb: 33, fat: 4  },
  // veg
  { match: /brécol|brócoli|coliflor/i, qty: 200, kcal: 60, prot: 5, carb: 8, fat: 1 },
  { match: /espinaca|acelga|lechuga|rúcula|kale/i, qty: 100, kcal: 22, prot: 3, carb: 3, fat: 0 },
  { match: /tomate/i,           qty: 150, kcal: 27,  prot: 1,  carb: 6,  fat: 0  },
  { match: /pimient/i,          qty: 150, kcal: 30,  prot: 1,  carb: 6,  fat: 0  },
  { match: /calabac/i,          qty: 200, kcal: 34,  prot: 2,  carb: 6,  fat: 1  },
  { match: /berenjena/i,        qty: 200, kcal: 50,  prot: 2,  carb: 12, fat: 0  },
  { match: /zanahoria/i,        qty: 100, kcal: 41,  prot: 1,  carb: 9,  fat: 0  },
  { match: /cebolla/i,          qty: 80,  kcal: 32,  prot: 1,  carb: 8,  fat: 0  },
  { match: /champi|seta/i,      qty: 150, kcal: 33,  prot: 5,  carb: 4,  fat: 1  },
  { match: /aguacate/i,         qty: 100, kcal: 160, prot: 2,  carb: 9,  fat: 15 },
  { match: /verdura(s)?( variada(s)?)?|ensalada|menestra/i, qty: 200, kcal: 70, prot: 4, carb: 12, fat: 1 },
  // dairy
  { match: /yogur/i,            qty: 125, kcal: 70,  prot: 5,  carb: 8,  fat: 2  },
  { match: /leche/i,            qty: 200, kcal: 100, prot: 7,  carb: 10, fat: 4  },
  // pizza/junk
  { match: /pizza/i,            qty: 1,   kcal: 700, prot: 28, carb: 78, fat: 28 },
  // oil
  { match: /aceite( de oliva)?/i, qty: 10, kcal: 90, prot: 0, carb: 0, fat: 10 }
];

export function parseDocxText(text) {
  // Normalize
  const lines = text.split(/\r?\n/).map(l => l.replace(/ /g, " ").trim()).filter(Boolean);
  const upper = lines.map(l => l.toUpperCase());

  let desayuno = "", merienda = "";
  // find desayuno line
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^desayuno\s*[:\-–]\s*(.+)$/i);
    if (m) { desayuno = collectMulti(lines, i, m[1]); break; }
  }
  // find merienda / postre / media tarde
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(media tarde|merienda|postre(?: medio?d[ií]a)?)\s*[:\-–]\s*(.+)$/i);
    if (m) { merienda = collectMulti(lines, i, m[2]); break; }
  }

  // find day blocks
  const dayRegex = /^\s*\**\s*(LUNES|MARTES|MIÉRCOLES|MIERCOLES|JUEVES|VIERNES|S[ÁA]BADO|DOMINGO)\b\s*\**(.*)$/i;
  const startsByDay = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(dayRegex);
    if (m) startsByDay.push({ idx: i, name: normalizeDay(m[1]), tail: m[2] });
  }
  const dias = [];
  for (let k = 0; k < startsByDay.length; k++) {
    const cur = startsByDay[k];
    const end = startsByDay[k+1]?.idx ?? lines.length;
    const blockLines = lines.slice(cur.idx, end);
    const block = blockLines.join("\n");
    const trainHere = /\(\s*d[ií]a de entreno\s*\)|entreno/i.test(block);

    // Find Comida and Cena segments
    const comida = extractMealSegment(blockLines, /^comida\b/i, [/^cena\b/i]);
    const cena   = extractMealSegment(blockLines, /^cena\b/i, []);
    dias.push({
      dia: cur.name,
      entreno: trainHere,
      comida: estimateMacros(comida.text, comida.title),
      cena:   estimateMacros(cena.text,   cena.title),
      meriendaEspecial: ""
    });
  }
  return { desayuno, merienda, dias };
}

export function collectMulti(lines, startIdx, firstChunk) {
  let out = firstChunk.trim();
  for (let j = startIdx + 1; j < lines.length; j++) {
    const ln = lines[j];
    if (/^(desayuno|media tarde|merienda|postre|comida|cena|lunes|martes|mi[eé]rcoles|jueves|viernes|s[áa]bado|domingo)\b/i.test(ln)) break;
    if (ln.length > 200) break;
    if (out.length > 250) break;
    out += " " + ln;
  }
  return out.trim();
}

export function normalizeDay(d) {
  d = d.toUpperCase().replace("MIERCOLES","MIÉRCOLES").replace("SABADO","SÁBADO");
  return d.charAt(0) + d.slice(1).toLowerCase();
}

export function extractMealSegment(blockLines, startRe, stopRes) {
  // search for line starting with startRe
  for (let i = 0; i < blockLines.length; i++) {
    const ln = blockLines[i];
    const m = ln.match(/^(comida|cena)\s*[:\-–]?\s*(.*)$/i);
    if (m && startRe.test(ln)) {
      const title = m[2]?.trim() || "";
      const out = [title];
      for (let j = i + 1; j < blockLines.length; j++) {
        const cur = blockLines[j];
        if (stopRes.some(r => r.test(cur))) break;
        if (/^(comida|cena)\b/i.test(cur)) break;
        if (/^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[áa]bado|domingo)\b/i.test(cur)) break;
        out.push(cur);
      }
      const fullText = out.filter(Boolean).join(". ");
      return { text: fullText, title: shortName(fullText) };
    }
  }
  return { text: "", title: "" };
}

export function shortName(text) {
  if (!text) return "";
  // take first sentence-ish chunk, max 60 chars
  let t = text.split(/[.\n;]/)[0].trim();
  if (t.length > 60) t = t.slice(0, 57) + "…";
  return t;
}

export function estimateMacros(text, title) {
  const meal = emptyMeal();
  meal.nombre = title || shortName(text);
  if (!text) return meal;
  const found = new Set();
  const ings = [];
  for (const f of FOOD_DICT) {
    if (f.match.test(text) && !found.has(f.match.source)) {
      found.add(f.match.source);
      meal.calorias += f.kcal; meal.proteinas += f.prot; meal.carbohidratos += f.carb; meal.grasas += f.fat;
      const word = (text.match(f.match) || [""])[0];
      const cap = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      const explicit = findExplicitQty(text, word);
      const fallback = unitForName(cap);
      const qty = explicit ? explicit.qty : fallback.def;
      const unit = explicit ? explicit.unit : fallback.unit;
      ings.push(formatIng(cap, qty, unit));
    }
  }
  if (!ings.length) ings.push(...guessIngredients(meal.nombre));
  meal.ingredientes = [...new Set(ings)];
  if (meal.calorias < 300) meal.calorias = Math.max(meal.calorias, 400);
  return meal;
}

export function guessIngredients(name) {
  const tokens = name.toLowerCase().split(/\s+|,|\sy\s|\scon\s/).filter(t => t.length > 2);
  const seen = new Set(); const out = [];
  for (const t of tokens) {
    const cap = t[0].toUpperCase() + t.slice(1);
    if (!seen.has(cap) && !["con","sin","plancha","horno","integral","cocida","cocido","asado","asada"].includes(t)) {
      seen.add(cap); out.push(cap);
    }
  }
  return out.length ? out : [name];
}
