# **Documentação: PontoTrackerPro**

## **1\. Visão Geral**

O PontoTrackerPro é um sistema de gerenciamento de ponto eletrônico projetado para registrar e gerenciar as horas de trabalho dos funcionários. A aplicação é dividida em três níveis de acesso, cada um com funcionalidades específicas: Administrador, Gestor e Funcionário.

O objetivo desta documentação é fornecer um guia completo para que outros desenvolvedores possam replicar o ambiente, dar manutenção e evoluir a aplicação, compreendendo suas funcionalidades, arquitetura e limitações.

## **2\. Funcionalidades por Nível de Acesso**

#### **2.1. Funcionário**

O perfil de funcionário é o nível de acesso mais básico, focado no registro das próprias atividades.

* **Registro de Ponto:** O funcionário pode registrar seus horários de entrada e saída. O sistema é configurado para quatro marcações diárias: início da jornada, início do intervalo, fim do intervalo e fim da jornada.  
* **Visualização de Registros:** É possível visualizar o histórico de registros de ponto, com um filtro por mês.  
* **Envio de Justificativas:** O funcionário pode enviar justificativas para faltas, atrasos ou outros eventos, que serão analisadas pelo gestor.  
* **Geração de Relatórios:** O funcionário pode gerar relatórios em PDF do seu espelho de ponto para um determinado período.  
* **Alteração de Senha:** Ao fazer o primeiro login, o funcionário é obrigado a alterar sua senha.

#### **2.2. Gestor**

O gestor tem acesso às funcionalidades de funcionário e também pode gerenciar a sua equipe.

* **Visualização da Equipe:** O gestor tem uma visão geral de todos os funcionários do seu departamento, incluindo seus registros de ponto para um determinado dia.  
* **Aprovação de Justificativas:** As justificativas enviadas pelos funcionários são analisadas e aprovadas ou rejeitadas pelo gestor.  
* **Ajuste de Ponto:** O gestor pode corrigir ou inserir manualmente os registros de ponto dos funcionários de sua equipe.  
* **Lançamento de Justificativas em Massa:** Permite lançar uma mesma justificativa (como um feriado ou recesso) para todos os funcionários do departamento de uma só vez.  
* **Geração de Relatórios da Equipe:** O gestor pode gerar relatórios individuais de ponto para qualquer funcionário de sua equipe.

#### **2.3. Administrador**

O administrador possui acesso total ao sistema, incluindo todas as funcionalidades de gestor e funcionário, além de configurações globais.

* **Gerenciamento de Usuários:** Criação, edição e inativação de usuários de todos os níveis (funcionários, gestores e outros administradores).  
* **Reset de Senha:** O administrador pode resetar a senha de qualquer usuário, gerando uma senha temporária.  
* **Gerenciamento de Estruturas:** Criação e gerenciamento de Departamentos, Funções e Vínculos empregatícios.  
* **Gerenciamento de Tipos de Justificativas:** O administrador pode configurar os tipos de justificativas disponíveis no sistema, definindo se um tipo abona as horas do dia ou se exige a apresentação de um documento comprobatório.

## **3\. Limitações e Premissas**

* **Intervalo entre Marcações:** O sistema exige um intervalo mínimo de 1 hora entre os registros de ponto para evitar marcações duplicadas acidentalmente.  
* **Ajuste de Ponto Retroativo:** Gestores não podem ajustar registros do dia atual. A edição de registros passados é permitida apenas para o mês corrente e o mês anterior, garantindo a integridade dos fechamentos.  
* **Senha Temporária:** A senha temporária para novos usuários é, por padrão, os 6 primeiros dígitos do CPF. O sistema força a alteração no primeiro acesso.  
* **Banco de Horas:** O cálculo do banco de horas é feito com base nos registros e justificativas aprovadas, considerando os dias úteis no período (segunda a sexta, exceto feriados cadastrados como justificativa).

## **4\. Guia de Instalação e Deploy**

Esta seção detalha como configurar e executar a aplicação em um ambiente de desenvolvimento e produção.

#### **4.1. Pré-requisitos**

* **Docker** e **Docker Compose**  
* **Node.js** (opcional, para gerenciamento de dependências e execução local sem Docker)  
* Um editor de código (ex: VS Code)

#### **4.2. Configuração do Ambiente**

1. **Clone o repositório:**  
   git clone \<url-do-repositorio\>  
   cd PontoTrackerPro

2. Crie o arquivo de ambiente:  
   Crie um arquivo chamado .env na raiz do projeto, copiando o conteúdo do arquivo docker-compose.yml e preenchendo as variáveis de ambiente. Exemplo:  
   \# Segredo para a sessão de usuário  
   SESSION\_SECRET="uma\_chave\_secreta\_muito\_longa\_e\_aleatoria"

   \# Variáveis do Banco de Dados PostgreSQL  
   DB\_USER=postgres  
   DB\_PASSWORD=secret  
   DB\_NAME=pontotrackerpro  
   DATABASE\_URL="postgresql://postgres:secret@db:5432/pontotrackerpro"

#### **4.3. Executando com Docker (Desenvolvimento)**

A forma mais simples de executar a aplicação é usando Docker Compose, que orquestra os contêineres da aplicação e do banco de dados.

1. **Suba os contêineres:**  
   docker-compose up \--build

   O comando \--build garante que as imagens Docker serão reconstruídas caso haja alguma alteração nos arquivos Dockerfile ou no código-fonte.  
2. **Primeira Execução:**  
   * Na primeira vez que a aplicação é executada, o entrypoint.sh irá:  
     * Aplicar as migrações do banco de dados (npm run db:migrate).  
     * Criar um usuário administrador padrão (npm run create:admin:docker) com as credenciais:  
       * **Usuário:** admin  
       * **Senha:** admin  
3. Acesso:  
   A aplicação estará disponível em http://localhost:5000.

#### **4.4. Deploy em Produção**

Para produção, recomenda-se o uso de um serviço de banco de dados gerenciado (como AWS RDS, Google Cloud SQL, etc.) em vez de um contêiner.

1. **Ajuste o .env:** Altere a DATABASE\_URL para apontar para o seu banco de dados de produção.  
2. **Construa a imagem Docker:**  
   docker build \-t seu-registro/pontotrackerpro:latest .

3. **Publique a imagem:**  
   docker push seu-registro/pontotrackerpro:latest

4. **Execute o contêiner no seu servidor de produção**, passando as variáveis de ambiente necessárias.

## **5\. Arquitetura e Detalhes Técnicos**

#### **5.1. Estrutura de Arquivos**

A estrutura de diretórios do projeto é a seguinte:

/  
├── client/                 \# Código do frontend (React)  
├── server/                 \# Código do backend (Node.js/Express)  
├── shared/                 \# Código compartilhado (Schema do BD)  
├── migrations/             \# Arquivos de migração do Drizzle  
├── attached\_assets/        \# Ativos como o logo da empresa.  
├── docker-compose.yml      \# Configuração do Docker Compose  
├── Dockerfile              \# Configuração do container Docker da aplicação  
└── package.json            \# Dependências e scripts do projeto

#### **5.2. Modelo de Dados Detalhado**

O schema do banco de dados é definido em shared/schema.ts usando o Drizzle ORM. Abaixo estão as principais tabelas:

* **users**: Armazena informações dos usuários.  
  * role: Define o nível de acesso ('employee', 'manager', 'admin').  
  * mustChangePassword: Flag que força a troca de senha no primeiro login.  
  * status: Controla se o usuário está 'active', 'blocked' ou 'inactive'.  
* **timeRecords**: Guarda os registros de ponto diários.  
  * entry1, exit1, entry2, exit2: Horários das 4 marcações.  
  * totalHours: Total de horas trabalhadas no dia, calculado após a última marcação.  
  * isAdjusted: Flag que indica se o registro foi alterado por um gestor.  
* **justifications**: Armazena as justificativas de ausência ou ajustes.  
  * type: O tipo da justificativa (ex: 'Falta', 'Atestado Médico').  
  * status: O estado da solicitação ('pending', 'approved', 'rejected').  
  * abona\_horas: Flag (definida pelo tipo) que indica se as horas devem ser abonadas.  
* **departments**, **functions**, **employmentTypes**: Tabelas de cadastro para estruturação organizacional.  
* **justificationTypes**: Tabela para configurar os tipos de justificativas disponíveis.

#### **5.3. Documentação da API (Endpoints Principais)**

A API REST é definida em server/routes.ts.

| Método | Rota | Autenticação | Descrição |
| :---- | :---- | :---- | :---- |
| **Auth** |  |  |  |
| POST | /api/login | Nenhuma | Autentica um usuário e cria uma sessão. |
| POST | /api/logout | Autenticado | Encerra a sessão do usuário. |
| GET | /api/user | Autenticado | Retorna os dados do usuário logado. |
| POST | /api/password-reset | Nenhuma | Inicia uma solicitação de redefinição de senha. |
| **Funcionário** |  |  |  |
| POST | /api/time-records | Autenticado | Registra um ponto (entrada/saída). |
| GET | /api/time-records/today | Autenticado | Retorna os registros de ponto do dia atual. |
| POST | /api/justifications | Autenticado | Envia uma nova justificativa para aprovação. |
| GET | /api/user/report/monthly | Autenticado | Gera o relatório de ponto em PDF do usuário. |
| **Gestor** |  |  |  |
| GET | /api/manager/employees | Gestor ou Admin | Lista os funcionários do departamento do gestor. |
| GET | /api/manager/justifications/pending | Gestor ou Admin | Lista as justificativas pendentes de aprovação. |
| POST | /api/manager/justifications/:id/approve | Gestor ou Admin | Aprova ou rejeita uma justificativa. |
| POST | /api/manager/time-records/upsert | Gestor ou Admin | Cria ou atualiza o registro de ponto de um funcionário. |
| **Admin** |  |  |  |
| GET | /api/admin/users | Admin | Lista todos os usuários do sistema. |
| POST | /api/admin/users | Admin | Cria um novo usuário. |
| PUT | /api/admin/departments/:id | Admin | Atualiza um departamento. |

## **6\. Fluxos de Trabalho (Workflows)**

#### **6.1. Registro de Ponto (Funcionário)**

sequenceDiagram  
    participant U as Usuário  
    participant F as Frontend  
    participant B as Backend

    U-\>\>F: Clica em "Registrar Ponto"  
    F-\>\>B: POST /api/time-records  
    B-\>\>B: Verifica último registro do dia  
    alt Já existe registro e não é o último  
        B-\>\>B: Adiciona nova marcação (saída/entrada)  
    else Nenhum registro hoje  
        B-\>\>B: Cria novo registro com "entry1"  
    else Todos os 4 registros preenchidos  
        B--\>\>F: Erro: "Registros completos"  
    end  
    B--\>\>F: Retorna registro atualizado  
    F--\>\>U: Exibe confirmação e atualiza UI

#### **6.2. Aprovação de Justificativa (Gestor)**

sequenceDiagram  
    participant G as Gestor  
    participant F as Frontend  
    participant B as Backend

    G-\>\>F: Acessa o Painel do Gestor  
    F-\>\>B: GET /api/manager/justifications/pending  
    B--\>\>F: Retorna lista de justificativas pendentes  
    F--\>\>G: Exibe lista  
    G-\>\>F: Clica em "Aprovar" em uma justificativa  
    F-\>\>B: POST /api/manager/justifications/:id/approve  
    B-\>\>B: Atualiza status da justificativa para "approved"  
    B--\>\>F: Retorna sucesso  
    F--\>\>G: Remove item da lista de pendentes

## **7\. Guia de Contribuição**

Para manter a consistência e a qualidade do código, siga as diretrizes abaixo:

* **Estilo de Código:** O projeto utiliza Prettier e ESLint para formatação e análise estática do código. Execute npm run lint e npm run format antes de submeter alterações.  
* **Estrutura de Commits:** Adote o padrão de [Conventional Commits](https://www.conventionalcommits.org/) para as mensagens de commit (ex: feat:, fix:, docs:, chore:).  
* **Submissão de Alterações:**  
  1. Crie um fork do repositório.  
  2. Crie uma nova branch para a sua funcionalidade ou correção.  
  3. Faça os commits seguindo o padrão.  
  4. Abra um Pull Request detalhando as alterações realizadas.
