import { CategoryInfo, CategoryId } from '../types/checklist';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'praia',
    label: 'Praia e Sol',
    description: 'Itens essenciais para a areia e o mar',
  },
  {
    id: 'vestuario',
    label: 'Vestuário e Acomodação',
    description: 'Roupas para eventos, estadia e descanso',
  },
  {
    id: 'higiene',
    label: 'Higiene e Cuidados',
    description: 'Produtos de cuidado pessoal e banho',
  },
  {
    id: 'saude_docs',
    label: 'Saúde e Documentos',
    description: 'Identificação pessoal e medicamentos',
  },
  {
    id: 'praticidade',
    label: 'Praticidade e Viagem',
    description: 'Acessórios úteis, alimentação e suporte',
  },
  {
    id: 'geral',
    label: 'Outros Itens',
    description: 'Itens diversos adicionados por você',
  },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryInfo> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  },
  {} as Record<CategoryId, CategoryInfo>
);

export function isValidCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && value in CATEGORY_MAP;
}
