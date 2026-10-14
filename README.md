# GMIN Inspeções — Mina TZ (v1.1.1)

Editor de relatórios técnico **offline-first**, feito em HTML, CSS e JavaScript sem bibliotecas externas. Mantém compatibilidade com relatórios da versão 1.0. Aplicativo estático adequado para GitHub Pages ou hospedagem corporativa HTTPS.

## Recursos disponíveis na versão 1.1.1

- Cabeçalho editável com **TAG**, **modelo**, **horímetro (h)** e **odômetro (km)**.
- Botão **Checklists** no canto superior direito, com filtragem automática pelo modelo digitado e pesquisa manual. A **Inspeção de Caçamba** permanece na primeira posição quando não há pesquisa manual, mesmo com um modelo de máquina preenchido.
- **11 modelos de checklist**, com **482 itens** reais extraídos das planilhas fornecidas. Todos os textos ficam empacotados em `js/checklists-data.js`, sem conexão externa.
- Cada ponto do checklist é uma linha independente, rearranjável pela alça `⋮⋮`.
- Bloco **Avaliação** disponível como quarto botão em linhas vazias. Campo de comando livre, opções **OK** e **Não OK**:
  - **OK**: bloco verde.
  - **Não OK**: escolha obrigatoriamente a severidade na prática de campo (Monitorar — amarelo; Anormal — laranja; Crítico — vermelho; Muito Crítico — vermelho escuro e negrito), insira comentários e fotos.
- Exportadores HTML, DOCX, XLSX e PDF via impressão incluem os campos da máquina e os novos blocos de avaliação.
- Importação de backups `.json` da versão 1.0 ou 1.1. Os dados da v1.0 no IndexedDB são lidos e migrados em memória; a base de armazenamento mantém o mesmo nome.
- Cache de PWA atualizado (`gmin-inspecoes-v1.1.1`) com a biblioteca local das checklists.

## Estrutura do repositório

```text
GMIN_Inspecoes_App/
├── index.html
├── css/styles.css
├── js/app.js
├── js/checklists-data.js       # NOVO: modelos locais
├── js/exports.js
├── js/storage.js               # Inalterado
├── js/zip.js                   # Inalterado
├── js/logo-data.js             # Inalterado
├── assets/                     # Inalterados
├── service-worker.js
├── manifest.webmanifest        # Inalterado
├── tests/test_exports.cjs
├── ISSUE_GITHUB.md
├── README.md
└── .nojekyll
```

## Atualizar uma instalação v1.0 (GitHub Pages)

1. No dispositivo antigo, abra `⋯ → Exportar projeto editável (.json)` e guarde o backup em local seguro. **Não limpe os dados do site nem desinstale o PWA.**
2. Substitua os arquivos modificados listados na estrutura acima e inclua `js/checklists-data.js`, preservando os demais arquivos v1.0.
3. Faça o commit e publique a atualização no GitHub Pages.
4. Com o tablet **online**, abra o aplicativo, aguarde carregar, feche e reabra/atualize para ativar o novo service worker e garantir que o cache `v1.1.1` substituiu o anterior.
5. Teste o carregamento de um checklist e fotos; desligue Wi-Fi e dados móveis, feche o aplicativo, abra novamente e valide uso offline.
6. Se um dado antigo não aparecer, recupere pelo menu `⋯ → Importar projeto (.json)` usando o backup da etapa 1.

**Importante:** se abrir `index.html` diretamente como arquivo local (`file://`), os arquivos da pasta precisam permanecer juntos. Os recursos básicos funcionam sem rede, mas o cache de PWA só se aplica em HTTPS/localhost.

## Funcionamento

O documento é composto de linhas independentes, com alça para arrastar, menu `⋯` (editar/duplicar/excluir) e botão `+` para criar nova linha. Os blocos podem ser texto, fotos, listas ou avaliações. Os checklists pré-definidos apenas inserem vários blocos de avaliação previamente preenchidos.

A filtragem de checklists é um facilitador, **não um bloqueio**: deixe o campo de modelo vazio ou limpe a pesquisa para ver todos os modelos. Para a linha pesada há modelos genéricos e específicos. Um checklist acrescentado ao relatório não apaga conteúdo anterior.

### Formatos de exportação

| Formato | Conteúdo | Característica |
| --- | --- | --- |
| PDF | Identificação da máquina e blocos do relatório, fotos e cores | Abre a impressão nativa: escolha *Salvar como PDF* |
| HTML | Relatório independente com identidade visual e fotos embutidas | Abre offline, não é o editor |
| Word `.docx` | Identificação, avaliações, comentários e fotografias | Editável no Word |
| Excel `.xlsx` | Aba `Relatório` tabular e aba `Fotografias` com imagens | Permite análises posteriores |
| Backup `.json` | Estado completo editável, incluindo fotos | Para continuar a edição ou migrar de tablet |

### Biblioteca pré-instalada

| Modelo | Itens | Fonte |
| --- | ---: | --- |
| **Inspeção de Caçamba** | **8** | `Inspecao_de_Cacamba_projeto_editavel.json` (em destaque, primeira da lista) |
| Escavadeira CAT 6030 | 49 | `CHECK LIST 6030.xlsx` |
| Perfuratrizes DR410i / DI650i | 55 | `CHECK LIST PERFURATRIZES.xlsx` |
| Caminhão articulado | 41 | `Checklist_ARTICULADO_PT.xlsx` |
| Caminhão fora de estrada | 43 | `Checklist_CAMINHAO_PT.xlsx` |
| Carregadeira | 44 | `Checklist_CARREGADEIRA_PT.xlsx` |
| Escavadeira hidráulica | 49 | `Checklist_ESCAVADEIRA_PT.xlsx` |
| Motoniveladora | 43 | `Checklist_MOTONIVELADORA_PT.xlsx` |
| Rolo compactador | 40 | `Checklist_ROLO_PT.xlsx` |
| Trator de esteiras | 47 | `Checklist_TRATOR_PT.xlsx` |
| Trommel | 63 | `Checklist_Trommel.xlsx` |

O texto de cada ponto de inspeção segue a fonte original (planilha ou projeto editável JSON). A biblioteca é estática: mudanças nos checklists exigem uma nova versão do arquivo `js/checklists-data.js` e nova publicação do aplicativo.

## Testes

Execute `node tests/test_exports.cjs` na raiz do projeto. O teste valida que existem 11 modelos/482 itens e gera documentos exemplo em `tests/artifacts/`. A qualidade visual e a gravação de fotos offline devem ser verificadas **no tablet real**.

## Segurança e limitações

- Sem sincronização remota: dados e fotos ficam no **IndexedDB do dispositivo**, sem criptografia própria. Utilizar dispositivos corporativos e a política de TI.
- A biblioteca de checklists é parte do **código do aplicativo**. Nunca suba fotos, backups JSON ou relatórios internos ao GitHub.
- O sistema **não cria notificações SAP** e não substitui o registro formal nem a avaliação técnica humana.
- As severidades registram a percepção do inspetor; **não são critérios de liberação de equipamento** ou classificação automática de prioridade SAP.
- Os campos de TAG, horímetro e odômetro são livres nesta versão, sem validação por cadastro oficial.
- Ao alternar um item de Não OK para OK, os comentários/fotos anteriores ficam **ocultos, mas preservados no backup** e reaparecem se voltar a Não OK; exportações imprimem apenas os dados da condição ativa.
- Em instalações antigas com service worker, a atualização pode exigir fechar e reabrir o aplicativo após a primeira conexão à internet.

## GitHub Issues e atualização

Copie `ISSUE_GITHUB.md` ao criar uma issue de melhoria. Trabalhe preferencialmente em uma branch `feature/checklists-offline-v1.1`, abra um Pull Request com `Closes #NUMERO_DA_ISSUE` e só publique após validar offline no tablet.
