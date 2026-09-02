# Checklist de Viagem - Praia

Aplicação web moderna, responsiva e elegante desenvolvida com React, TypeScript, Tailwind CSS e Vite. Projetada especialmente para organização de malas para viagens à praia, com suporte completo a **Modo Escuro (Dark Mode)**, interface otimizada para smartphones, persistência automática no navegador (`localStorage`) e estrutura pronta para publicação na Vercel via repositório no GitHub.

---

## Funcionalidades

- **Itens Pré-configurados**: 20 itens essenciais categorizados por área (Praia e Sol, Vestuário e Acomodação, Higiene e Cuidados, Saúde e Documentos, Praticidade e Viagem).
- **Modo Escuro & Claro (Dark / Light)**: Alternância elegante de tema com persistência local e adaptação automática à preferência do sistema operacional.
- **Otimizado para Celular (Mobile-First)**:
  - Botão flutuante (FAB) de fácil alcance para adicionar itens com o polegar.
  - Áreas de toque confortáveis (mínimo 44px).
  - Modal em formato Bottom Sheet deslizante no smartphone.
  - Prevenção de auto-zoom indesejado no Safari / iOS.
- **Gerenciamento Completo**: Adicione novos itens personalizados, edite nomes/categorias e remova itens a qualquer momento.
- **Sugestões Inteligentes**: Atalhos com sugestões úteis para praia ao adicionar um novo item.
- **Progresso em Tempo Real**: Barra de status visual com percentual, contador de itens concluídos versus pendentes.
- **Filtros e Busca Instantânea**: Filtre por status (Todos, Pendentes, Prontos) ou por categoria temática, além de busca por texto em tempo real.
- **Ações em Lote**: Marque todos como prontos, desmarque todos (ideal para reutilizar a lista na próxima viagem) ou restaure a lista original.
- **Exportação Limpa**: Copie o checklist completo formatado em texto para colar no WhatsApp ou aplicativo de notas.
- **Identidade Visual Refinada**: Design costeiro minimalista, sem poluição visual e estritamente sem emojis, utilizando ícones vetoriais modernos (`Lucide Icons`).

---

## Itens Inclusos por Categoria

1. **Saúde e Documentos**
   - Remédios
   - Documentos

2. **Praia e Sol**
   - Protetor solar
   - Roupa para banho na praia
   - Cadeira de praia
   - Guarda-sol
   - Canga
   - Garrafinha de água

3. **Vestuário e Acomodação**
   - Roupa de casamento
   - Roupa de cama
   - Coberta
   - Toalha

4. **Higiene e Cuidados**
   - Shampoo
   - Sabonete
   - Produtos de higiene bucal
   - Perfume / desodorante

5. **Praticidade e Viagem**
   - Carregador
   - Comidinhas e lanches
   - Sacolas
   - Papel higiênico / toalha

---

## Como Executar Localmente

### 1. Iniciar servidor de desenvolvimento
```bash
npm.cmd run dev
```
Acesse o link indicado no terminal (normalmente `http://localhost:5173`).

### 2. Gerar build de produção
```bash
npm.cmd run build
```

---

## Como Subir no GitHub e Publicar na Vercel

### Passo 1: Criar o Repositório no GitHub
1. Acesse [github.com/new](https://github.com/new) e crie um novo repositório (ex: `checklist-praia`).

### Passo 2: Enviar os Arquivos
No terminal da pasta do projeto, execute:

```bash
wsl -e git remote add origin https://github.com/SEU_USUARIO/checklist-praia.git
wsl -e git push -u origin main
```

### Passo 3: Conectar e Publicar na Vercel
1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta do GitHub.
2. Clique em **"Add New..."** e selecione **"Project"**.
3. Localize e clique em **"Import"** ao lado de `checklist-praia`.
4. A Vercel detectará automaticamente a configuração do Vite:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Clique em **"Deploy"**.
6. Sua aplicação estará online com HTTPS e link público!
