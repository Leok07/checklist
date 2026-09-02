import { CategoryInfo, ChecklistItem } from '../types/checklist';

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

export const INITIAL_ITEMS: ChecklistItem[] = [
  // Saúde & Documentos
  {
    id: 'item-1',
    name: 'Remédios',
    categoryId: 'saude_docs',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 1,
  },
  {
    id: 'item-2',
    name: 'Documentos',
    categoryId: 'saude_docs',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 2,
  },

  // Praia & Sol
  {
    id: 'item-3',
    name: 'Protetor solar',
    categoryId: 'praia',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 3,
  },
  {
    id: 'item-4',
    name: 'Roupa para banho na praia',
    categoryId: 'praia',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 4,
  },
  {
    id: 'item-5',
    name: 'Cadeira de praia',
    categoryId: 'praia',
    assignedTo: 'leeo',
    completed: false,
    createdAt: 5,
  },
  {
    id: 'item-6',
    name: 'Guarda-sol',
    categoryId: 'praia',
    assignedTo: 'leeo',
    completed: false,
    createdAt: 6,
  },
  {
    id: 'item-7',
    name: 'Canga',
    categoryId: 'praia',
    assignedTo: 'marii',
    completed: false,
    createdAt: 7,
  },
  {
    id: 'item-8',
    name: 'Garrafinha de água',
    categoryId: 'praia',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 8,
  },

  // Vestuário & Acomodação
  {
    id: 'item-9',
    name: 'Roupa de casamento',
    categoryId: 'vestuario',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 9,
  },
  {
    id: 'item-10',
    name: 'Roupa de cama',
    categoryId: 'vestuario',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 10,
  },
  {
    id: 'item-11',
    name: 'Coberta',
    categoryId: 'vestuario',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 11,
  },
  {
    id: 'item-12',
    name: 'Toalha',
    categoryId: 'vestuario',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 12,
  },

  // Higiene & Cuidados
  {
    id: 'item-13',
    name: 'Shampoo',
    categoryId: 'higiene',
    assignedTo: 'marii',
    completed: false,
    createdAt: 13,
  },
  {
    id: 'item-14',
    name: 'Sabonete',
    categoryId: 'higiene',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 14,
  },
  {
    id: 'item-15',
    name: 'Produtos de higiene bucal',
    categoryId: 'higiene',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 15,
  },
  {
    id: 'item-16',
    name: 'Perfume / desodorante',
    categoryId: 'higiene',
    assignedTo: 'marii',
    completed: false,
    createdAt: 16,
  },

  // Praticidade & Viagem
  {
    id: 'item-17',
    name: 'Carregador',
    categoryId: 'praticidade',
    assignedTo: 'leeo',
    completed: false,
    createdAt: 17,
  },
  {
    id: 'item-18',
    name: 'Comidinhas e lanches',
    categoryId: 'praticidade',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 18,
  },
  {
    id: 'item-19',
    name: 'Sacolas',
    categoryId: 'praticidade',
    assignedTo: 'leeo',
    completed: false,
    createdAt: 19,
  },
  {
    id: 'item-20',
    name: 'Papel higiênico / toalha',
    categoryId: 'praticidade',
    assignedTo: 'ambos',
    completed: false,
    createdAt: 20,
  },
];
