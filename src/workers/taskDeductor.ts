import {
  AccentColorId,
  BagLocation,
  CardStyle,
  CategoryId,
  PersonAssignment,
  TaskIconId,
  TaskPriority,
} from '../types/checklist';

export interface TaskDeduction {
  icon: TaskIconId;
  categoryId: CategoryId;
  bag: BagLocation;
  priority: TaskPriority;
  cardStyle: CardStyle;
  accentColor: AccentColorId;
  quantity: number;
  tags: string[];
  confidence: 'high' | 'medium' | 'fallback';
}

interface SemanticRule {
  roots: string[];
  icon: TaskIconId;
  categoryId: CategoryId;
  bag: BagLocation;
  priority?: TaskPriority;
  cardStyle?: CardStyle;
  accentColor?: AccentColorId;
  tags: string[];
  weight?: number;
}

const STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'pra', 'pro', 'com', 'sem', 'sob',
  'e', 'ou', 'que', 'se', 'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'levar',
  'pegar', 'comprar', 'colocar', 'botar', 'trazer', 'esquecer', 'nao', 'mais', 'extra',
  'reserva', 'novo', 'nova', 'novos', 'novas', 'par', 'pares', 'kit', 'itens', 'item',
  'coisa', 'coisas', 'tipo', 'bem', 'muito', 'muita', 'pouco', 'algo', 'todo', 'toda',
  'the', 'for', 'and', 'with', 'bag', 'pack', 'to', 'of',
]);

const WORD_NUMBERS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
};

const SEMANTIC_RULES: SemanticRule[] = [
  // Documentos, dinheiro e acesso
  {
    roots: [
      'passaporte', 'rg', 'cnh', 'documento', 'doc', 'identidade', 'cpf', 'certidao',
      'visto', 'passagem', 'bilhete', 'embarque', 'ingresso', 'voucher', 'reserva',
      'hotel', 'airbnb', 'cartao', 'credito', 'debito', 'pix',
    ],
    icon: 'credit-card',
    categoryId: 'saude_docs',
    bag: 'mao',
    priority: 'urgent',
    cardStyle: 'neon',
    accentColor: 'rose',
    tags: ['docs', 'viagem'],
    weight: 4,
  },
  {
    roots: ['carteira', 'dinheiro', 'especie', 'nota', 'moeda', 'dolar', 'euro', 'cash', 'wallet'],
    icon: 'wallet',
    categoryId: 'saude_docs',
    bag: 'mao',
    priority: 'urgent',
    cardStyle: 'neon',
    accentColor: 'blush',
    tags: ['docs'],
    weight: 4,
  },
  {
    roots: ['chave', 'cadeado', 'controle', 'garagem', 'portao', 'token', 'key'],
    icon: 'key-round',
    categoryId: 'praticidade',
    bag: 'mao',
    priority: 'urgent',
    cardStyle: 'neon',
    accentColor: 'rose',
    tags: ['acesso'],
    weight: 3,
  },

  // Saude e remedios
  {
    roots: [
      'remedio', 'medicamento', 'comprimido', 'dipirona', 'dorflex', 'paracetamol',
      'ibuprofeno', 'neosaldina', 'allegra', 'dramin', 'eno', 'engov', 'epocler',
      'antialergico', 'antibiotico', 'receita', 'vitamina', 'pomada', 'colirio',
      'bandaid', 'curativo', 'antisseptico', 'termometro', 'pressao', 'insulina',
      'inalador', 'bombinha', 'absorvente', 'coletor', 'preservativo', 'camisinha',
    ],
    icon: 'pill',
    categoryId: 'saude_docs',
    bag: 'necessaire',
    priority: 'essential',
    cardStyle: 'neon',
    accentColor: 'blush',
    tags: ['saude'],
    weight: 4,
  },
  {
    roots: ['saude', 'primeiros', 'socorro', 'emergencia', 'medico', 'clinica', 'seguro'],
    icon: 'heart-pulse',
    categoryId: 'saude_docs',
    bag: 'mochila',
    priority: 'urgent',
    cardStyle: 'neon',
    accentColor: 'rose',
    tags: ['saude'],
    weight: 3,
  },

  // Praia, sol e mar
  {
    roots: [
      'protetor', 'solar', 'fps', 'bloqueador', 'bronzeador', 'pos', 'sol', 'solar',
      'sunscreen', 'sunblock', 'labial',
    ],
    icon: 'sun',
    categoryId: 'praia',
    bag: 'mochila',
    priority: 'essential',
    cardStyle: 'gradient',
    accentColor: 'blush',
    tags: ['praia', 'sol'],
    weight: 4,
  },
  {
    roots: [
      'biquini', 'maio', 'sunga', 'saida', 'canga', 'boia', 'prancha', 'snorkel',
      'mergulho', 'natacao', 'piscina', 'mar', 'areia', 'praia', 'beach', 'toalha',
    ],
    icon: 'waves',
    categoryId: 'praia',
    bag: 'mala',
    priority: 'essential',
    cardStyle: 'gradient',
    tags: ['praia'],
    weight: 3,
  },
  {
    roots: ['guarda', 'guardasol', 'ombrelone', 'tenda', 'barraca', 'cadeira', 'esteira'],
    icon: 'umbrella',
    categoryId: 'praia',
    bag: 'carro',
    priority: 'normal',
    cardStyle: 'solid',
    tags: ['praia', 'carro'],
    weight: 3,
  },
  {
    roots: ['oculos', 'rayban', 'lente', 'grau', 'armacao', 'estojo'],
    icon: 'glasses',
    categoryId: 'praia',
    bag: 'mao',
    priority: 'essential',
    cardStyle: 'glass',
    tags: ['sol'],
    weight: 3,
  },

  // Eletronicos e energia
  {
    roots: [
      'carregador', 'cabo', 'usbc', 'lightning', 'tomada', 'adaptador', 'extensao',
      'benjamin', 'powerbank', 'bateria', 'pilha', 'fonte', 'energia', 'plug',
    ],
    icon: 'battery-charging',
    categoryId: 'praticidade',
    bag: 'mochila',
    priority: 'essential',
    cardStyle: 'solid',
    accentColor: 'pearl',
    tags: ['tech'],
    weight: 4,
  },
  {
    roots: [
      'celular', 'iphone', 'smartphone', 'telefone', 'tablet', 'ipad', 'kindle',
      'notebook', 'laptop', 'macbook', 'computador', 'mouse', 'chip', 'suporte',
    ],
    icon: 'smartphone',
    categoryId: 'praticidade',
    bag: 'mochila',
    priority: 'urgent',
    cardStyle: 'solid',
    accentColor: 'pearl',
    tags: ['tech'],
    weight: 3,
  },
  {
    roots: ['camera', 'gopro', 'drone', 'trip', 'tripe', 'selfie', 'cartao', 'sd', 'filmadora'],
    icon: 'camera',
    categoryId: 'praticidade',
    bag: 'mochila',
    priority: 'normal',
    cardStyle: 'glass',
    accentColor: 'orchid',
    tags: ['tech', 'foto'],
    weight: 3,
  },
  {
    roots: ['fone', 'airpods', 'headphone', 'caixinha', 'jbl', 'som', 'bluetooth', 'microfone'],
    icon: 'headphones',
    categoryId: 'praticidade',
    bag: 'mochila',
    priority: 'normal',
    cardStyle: 'glass',
    accentColor: 'orchid',
    tags: ['tech', 'som'],
    weight: 3,
  },

  // Vestuario e calcados
  {
    roots: [
      'roupa', 'camisa', 'camiseta', 'blusa', 'cropped', 'top', 'vestido', 'saia',
      'calca', 'jeans', 'short', 'bermuda', 'casaco', 'jaqueta', 'moletom', 'sueter',
      'blazer', 'terno', 'social', 'gravata', 'pijama', 'camisola', 'meia', 'cueca',
      'calcinha', 'sutia', 'lingerie', 'bone', 'chapeu', 'viseira', 'cinto', 'look',
      'casamento', 'festa', 'jantar', 'gala',
    ],
    icon: 'shirt',
    categoryId: 'vestuario',
    bag: 'mala',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['roupa'],
    weight: 3,
  },
  {
    roots: [
      'chinelo', 'havaianas', 'sandalia', 'rasteirinha', 'salto', 'tenis', 'sapato',
      'bota', 'sapatilha', 'crocs', 'calcado', 'papete',
    ],
    icon: 'footprints',
    categoryId: 'vestuario',
    bag: 'mala',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['calcado'],
    weight: 3,
  },
  {
    roots: ['lencol', 'fronha', 'travesseiro', 'coberta', 'cobertor', 'manta', 'edredom', 'rede'],
    icon: 'bed',
    categoryId: 'vestuario',
    bag: 'mala',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['quarto'],
    weight: 3,
  },

  // Higiene e beleza
  {
    roots: [
      'shampoo', 'xampu', 'condicionador', 'mascara', 'creme', 'hidratante', 'sabonete',
      'perfume', 'desodorante', 'escova', 'pasta', 'dental', 'bucal', 'fio', 'enxaguante',
      'maquiagem', 'make', 'batom', 'rimel', 'base', 'corretivo', 'po', 'blush',
      'skincare', 'serum', 'lavar', 'rosto', 'demaquilante', 'algodao', 'cotonete',
      'lenco', 'umedecido', 'papel', 'higienico', 'alcool', 'gel', 'gilete', 'barbear',
      'pinca', 'unha', 'esmalte', 'acetona', 'pente', 'elastico', 'xuxinha', 'grampo',
      'repelente', 'oleo',
    ],
    icon: 'droplets',
    categoryId: 'higiene',
    bag: 'necessaire',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['higiene'],
    weight: 3,
  },
  {
    roots: ['secador', 'prancha', 'chapinha', 'babyliss', 'escova', 'ventilador', 'capa', 'chuva', 'vento'],
    icon: 'wind',
    categoryId: 'higiene',
    bag: 'mala',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['cuidado'],
    weight: 3,
  },

  // Comida e bebidas
  {
    roots: [
      'comida', 'lanche', 'biscoito', 'bolacha', 'fruta', 'chocolate', 'barra', 'salgadinho',
      'snack', 'pao', 'queijo', 'marmita', 'churrasco', 'carne', 'gelo', 'cooler',
      'termica', 'talher', 'prato', 'guardanapo', 'sacola', 'saco', 'lixo',
    ],
    icon: 'utensils',
    categoryId: 'praticidade',
    bag: 'carro',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['comida'],
    weight: 3,
  },
  {
    roots: [
      'agua', 'garrafa', 'garrafinha', 'suco', 'refri', 'refrigerante', 'cerveja',
      'vinho', 'gin', 'vodka', 'drink', 'energetico', 'cafe', 'cha', 'copo', 'caneca', 'squeeze',
    ],
    icon: 'cup-soda',
    categoryId: 'praticidade',
    bag: 'mochila',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['bebida'],
    weight: 3,
  },

  // Transporte, rotas e bagagem
  {
    roots: ['carro', 'pedagio', 'semparar', 'tag', 'combustivel', 'estepe', 'suporte', 'cinto', 'porta', 'mala'],
    icon: 'car',
    categoryId: 'praticidade',
    bag: 'carro',
    priority: 'essential',
    cardStyle: 'solid',
    tags: ['estrada'],
    weight: 3,
  },
  {
    roots: ['voo', 'aviao', 'aeroporto', 'checkin', 'bagagem', 'despacho'],
    icon: 'plane',
    categoryId: 'praticidade',
    bag: 'mao',
    priority: 'urgent',
    cardStyle: 'neon',
    tags: ['voo'],
    weight: 3,
  },
  {
    roots: ['mochila', 'bolsa', 'pochete', 'ecobag', 'sacola'],
    icon: 'backpack',
    categoryId: 'praticidade',
    bag: 'mao',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['bagagem'],
    weight: 2,
  },
  {
    roots: ['mala', 'frasqueira', 'organizadora', 'necessaire'],
    icon: 'luggage',
    categoryId: 'praticidade',
    bag: 'mala',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['mala'],
    weight: 2,
  },
  {
    roots: ['trilha', 'passeio', 'mapa', 'gps', 'roteiro', 'guia', 'endereco'],
    icon: 'map-pin',
    categoryId: 'praticidade',
    bag: 'mao',
    priority: 'normal',
    cardStyle: 'glass',
    tags: ['passeio'],
    weight: 2,
  },
  {
    roots: ['seguranca', 'alarme', 'capa', 'pelicula', 'cadeado', 'trava'],
    icon: 'shield',
    categoryId: 'praticidade',
    bag: 'mochila',
    priority: 'essential',
    cardStyle: 'solid',
    tags: ['protecao'],
    weight: 2,
  },
  {
    roots: ['presente', 'lembrancinha', 'surpresa', 'aniversario', 'brinde', 'alianca'],
    icon: 'star',
    categoryId: 'geral',
    bag: 'mao',
    priority: 'essential',
    cardStyle: 'gradient',
    accentColor: 'blush',
    tags: ['especial'],
    weight: 3,
  },
];

function normalizeText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemToken(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith('oes')) return token.slice(0, -3) + 'ao';
  if (token.endsWith('aes')) return token.slice(0, -3) + 'ao';
  if (token.endsWith('is') && token.length > 4) return token.slice(0, -2) + 'l';
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function trigramDice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 3 || b.length < 3) return 0;

  const setA = new Set<string>();
  for (let i = 0; i <= a.length - 3; i++) {
    setA.add(a.slice(i, i + 3));
  }

  let intersection = 0;
  const totalB = b.length - 2;
  for (let i = 0; i <= b.length - 3; i++) {
    if (setA.has(b.slice(i, i + 3))) intersection++;
  }

  return (2 * intersection) / (setA.size + totalB);
}

function extractQuantity(normalized: string, tokens: string[]): number {
  // Padroes como "x3", "3x", "3 camisas", "2 pares"
  const xMatch = normalized.match(/\b(?:x(\d{1,2})|(\d{1,2})x)\b/);
  if (xMatch) {
    const val = Number(xMatch[1] || xMatch[2]);
    if (val >= 1 && val <= 99) return val;
  }

  const leadNum = normalized.match(/^\s*(\d{1,2})\b/);
  if (leadNum) {
    const val = Number(leadNum[1]);
    if (val >= 1 && val <= 99) return val;
  }

  const trailingNum = normalized.match(/\b(\d{1,2})\s*(?:un|unid|unidades|pares|pecas|pcs)?\s*$/);
  if (trailingNum) {
    const val = Number(trailingNum[1]);
    // Evita confundir FPS 50, iPhone 15 ou 220v com quantidade
    if (val >= 2 && val <= 12 && !/\b(?:fps|iphone|volt|v|ml|mg|gb)\b/.test(normalized)) {
      return val;
    }
  }

  for (let i = 0; i < tokens.length; i++) {
    const wordNum = WORD_NUMBERS[tokens[i]];
    if (wordNum && wordNum >= 2) return wordNum;
  }

  return 1;
}

function detectContextModifiers(normalized: string): {
  priority?: TaskPriority;
  bag?: BagLocation;
  extraTags: string[];
  cardStyle?: CardStyle;
  accentColor?: AccentColorId;
} {
  const extraTags: string[] = [];
  let priority: TaskPriority | undefined;
  let bag: BagLocation | undefined;
  let cardStyle: CardStyle | undefined;
  let accentColor: AccentColorId | undefined;

  if (/\b(?:urgente|imediato|critico|obrigatorio|nao esquecer|importante|prioridade)\b/.test(normalized)) {
    priority = 'urgent';
    cardStyle = 'neon';
    accentColor = 'rose';
  } else if (/\b(?:essencial|principal|preciso|indispensavel)\b/.test(normalized)) {
    priority = 'essential';
  }

  if (/\b(?:casamento|festa|gala|formatura)\b/.test(normalized)) {
    extraTags.push('casamento');
    cardStyle = cardStyle ?? 'gradient';
  } else if (/\b(?:noite|jantar|balada|bar|restaurante)\b/.test(normalized)) {
    extraTags.push('noite');
  } else if (/\b(?:frio|inverno|serra|neve|gelado)\b/.test(normalized)) {
    extraTags.push('clima');
  }

  if (/\b(?:carro|porta mala|porta-mala|banco)\b/.test(normalized)) bag = 'carro';
  else if (/\b(?:mochila)\b/.test(normalized)) bag = 'mochila';
  else if (/\b(?:necessaire|frasqueira)\b/.test(normalized)) bag = 'necessaire';
  else if (/\b(?:mao|bolso)\b/.test(normalized)) bag = 'mao';

  return { priority, bag, extraTags, cardStyle, accentColor };
}

function fallbackIconFromHash(normalized: string): TaskIconId {
  const fallbackPool: TaskIconId[] = ['tag', 'star', 'sparkles', 'compass', 'map-pin'];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return fallbackPool[Math.abs(hash) % fallbackPool.length];
}

function buildFallbackTags(tokens: string[], existingTags: string[]): string[] {
  const result = [...existingTags];
  for (let i = 0; i < tokens.length && result.length < 2; i++) {
    const t = tokens[i];
    if (t.length >= 3 && !/^\d+$/.test(t) && !STOPWORDS.has(t) && !result.includes(t)) {
      result.push(t.slice(0, 14));
    }
  }
  return result.slice(0, 3);
}

/**
 * Dedutor Semantico Silencioso (100% local, <2ms):
 * Interpreta qualquer texto escrito em portugues/ingles/girias/erros de digitacao
 * e escolhe automaticamente icone, categoria, bagagem, prioridade, estilo, tom e tags.
 */
export function deduceTaskCustomization(
  rawText: string,
  assignedTo: PersonAssignment
): TaskDeduction {
  const normalized = normalizeText(rawText);
  const defaultAccent: AccentColorId = 'auto';

  if (!normalized) {
    return {
      icon: 'sparkles',
      categoryId: 'geral',
      bag: 'mala',
      priority: 'normal',
      cardStyle: 'glass',
      accentColor: defaultAccent,
      quantity: 1,
      tags: [],
      confidence: 'fallback',
    };
  }

  const tokens = normalized.split(' ').filter(Boolean);
  const stemmedTokens = tokens.map(stemToken);
  const quantity = extractQuantity(normalized, tokens);
  const modifiers = detectContextModifiers(normalized);

  let bestRule: SemanticRule | null = null;
  let bestScore = 0;

  for (let r = 0; r < SEMANTIC_RULES.length; r++) {
    const rule = SEMANTIC_RULES[r];
    let score = 0;

    for (let k = 0; k < rule.roots.length; k++) {
      const root = rule.roots[k];
      const stemmedRoot = stemToken(root);

      for (let t = 0; t < tokens.length; t++) {
        const tok = tokens[t];
        const stem = stemmedTokens[t];

        if (tok === root || stem === stemmedRoot) {
          score += 10 * (rule.weight ?? 1);
          continue;
        }
        if (tok.length >= 4 && (tok.startsWith(stemmedRoot) || stemmedRoot.startsWith(tok))) {
          score += 6.5 * (rule.weight ?? 1);
          continue;
        }
        if (tok.length >= 4 && root.length >= 4) {
          const dice = trigramDice(tok, root);
          if (dice >= 0.56) {
            score += dice * 7 * (rule.weight ?? 1);
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (bestRule && bestScore > 0) {
    const mergedTags = Array.from(new Set([...bestRule.tags, ...modifiers.extraTags])).slice(0, 3);
    const resolvedAccent: AccentColorId =
      modifiers.accentColor ??
      bestRule.accentColor ??
      (assignedTo === 'marii' ? 'auto' : 'auto');

    return {
      icon: bestRule.icon,
      categoryId: bestRule.categoryId,
      bag: modifiers.bag ?? bestRule.bag,
      priority: modifiers.priority ?? bestRule.priority ?? 'normal',
      cardStyle: modifiers.cardStyle ?? bestRule.cardStyle ?? 'glass',
      accentColor: resolvedAccent,
      quantity,
      tags: mergedTags,
      confidence: bestScore >= 10 ? 'high' : 'medium',
    };
  }

  // Fallback semantico universal para qualquer texto inedito
  const fallbackTags = buildFallbackTags(tokens, modifiers.extraTags);
  return {
    icon: fallbackIconFromHash(normalized),
    categoryId: 'geral',
    bag: modifiers.bag ?? 'mala',
    priority: modifiers.priority ?? 'normal',
    cardStyle: modifiers.cardStyle ?? 'glass',
    accentColor: modifiers.accentColor ?? defaultAccent,
    quantity,
    tags: fallbackTags,
    confidence: 'fallback',
  };
}
