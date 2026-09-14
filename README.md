# Task de Viagem

Aplicação web moderna, minimalista e responsiva desenvolvida para organização de tarefas e bagagem de viagem a dois (**Leeo & Marii**), com sincronização atômica em tempo real via **Firebase Firestore**, suporte completo a **Modo Escuro (Dark Mode)**, layout direto ao ponto meio a meio com divisor central e deploy contínuo na Vercel via GitHub.

---

## Funcionalidades

- **Tela Meio a Meio Direta**: Layout 50/50 com um divisor central nítido entre **Leeo** e **Marii**, sem telas intermediárias.
- **Sincronização Atômica em Tempo Real**: Cada tarefa é gerenciada individualmente no Firebase Firestore. As ações de um usuário nunca sobrescrevem nem resetam os itens do outro.
- **Lista Inicial Limpa (Sem Presets)**: A aplicação inicia completamente vazia, permitindo adicionar apenas as tarefas reais da sua viagem.
- **Transferência Instantânea**: Transfira qualquer tarefa entre o Leeo e a Marii com 1 toque.
- **Modo Escuro & Claro (Dark / Light)**: Alternância suave com persistência local e suporte ao sistema operacional.
- **Otimizado para Celular (Mobile-First)**: Áreas de toque confortáveis (mínimo 44px) e inputs com prevenção de auto-zoom no Safari iOS.
- **Exportação Limpa**: Copie o relatório formatado para o WhatsApp separado por responsável, com marcadores `[X]` e `[ ]`.
- **Identidade Visual Refinada**: Estritamente **zero emojis**, utilizando ícones vetoriais modernos (`Lucide Icons`).

---

## Como Executar Localmente

### 1. Iniciar servidor de desenvolvimento
```bash
npm.cmd run dev
```

### 2. Gerar build de produção
```bash
npm.cmd run build
```

---

## Deploy na Vercel

O projeto está configurado para deploy automático na Vercel a cada commit no branch `main`.

Variáveis de ambiente necessárias na Vercel:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
