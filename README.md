# Ascend - Evolução Pessoal 🚀

O **Ascend** é uma plataforma de tracking de hábitos e evolução pessoal de alta performance, projetada para gerenciar metas diárias, nutrição, performance física e finanças em uma interface premium escura com detalhes dourados.

---

## 🛠️ Stack Tecnológica

O ecossistema do projeto foi migrado de Flask para uma arquitetura moderna e escalável:

1. **Núcleo (Core)**: Next.js 14 (App Router) + React + TypeScript.
2. **Banco de Dados (ORM)**: Prisma ORM conectado ao banco local MySQL/MariaDB (`Ascend`).
3. **Estilização**: Vanilla CSS com efeitos de glassmorphism, responsividade móvel e identidade visual dourada premium.
4. **Interface**: Sidebar adaptativa expandível e Mobile Bottom Nav para navegação em smartphones.
5. **Efeitos & Gamificação**: Efeitos sonoros integrados (clique, caixa registradora e comemoração de metas) e sistema reativo de confetes.

---

## 🌟 Funcionalidades Principais

### 🏥 Módulo de Saúde & Nutrição (`/saude`)
* **Cronograma de Atividades Semanal**: Agenda dinâmica (Segunda a Domingo) que exibe as atividades de hoje de forma filtrada de acordo com o planejamento do usuário.
* **Múltiplos Tipos de Rotinas**:
  * **Musculação**: Fichas estruturadas com controle e persistência de carga por exercício em tempo real.
  * **Cardio / Esportes**: Planejamento livre de treinos com diretrizes e descrições personalizadas (luta, corrida, futevôlei).
* **Importador Inteligente em Lote**: Copie o treino do seu bloco de notas ou WhatsApp, cole no importador e o parser extrairá séries, repetições e cargas instantaneamente.
* **Acompanhamento de Calorias e Macros**: Anel calórico dinâmico e barras de progresso proporcionais para Proteínas, Carboidratos e Gorduras.
* **Registro de Hidratação**: Lançamento rápido de água com incrementos reativos e efeitos sonoros de preenchimento.

### 💰 Gestão Financeira (`/financas`)
* **Gráfico Donut de Distribuição**: Distribuição visual percentual das despesas por categorias calculada em tempo real.
* **IA Parser de Logger Rápido**: Digite comandos rápidos como `-25 almoço` ou `+200 freela` para registrar e categorizar despesas e ganhos sem formulários complexos.
* **Extrato Geral de Lançamentos**: Histórico de transações com controle de saldo de alto contraste (verde para positivo, vermelho para negativo) e deleção reativa.

---

## 🚀 Como Iniciar o Projeto Localmente

1. **Instalar as dependências**:
   ```bash
   npm install
   ```

2. **Configurar as variáveis de ambiente**:
   Crie um arquivo `.env` na raiz do projeto com a URL de conexão do seu banco local MySQL:
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/Ascend"
   ```

3. **Gerar o Cliente do Prisma**:
   ```bash
   npx prisma generate
   ```

4. **Executar o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```

Acesse a plataforma em: **[http://localhost:3001](http://localhost:3001)**
