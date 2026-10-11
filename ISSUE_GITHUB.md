# [Feature] GMIN Inspeções v1.1 — Checklists offline e avaliação condicional

## Objetivo

Evoluir o editor de relatórios v1.0 sem quebrar o funcionamento offline ou os relatórios salvos. Adicionar cabeçalho técnico da máquina, modelos de checklist por frota e avaliação de anomalias na própria linha do relatório.

## Escopo

- [x] Incluir TAG, modelo, horímetro e odômetro no cabeçalho, editáveis e exportáveis.
- [x] Adicionar botão **Checklists** no canto superior direito, com filtro por modelo/frota.
- [x] Incorporar localmente 10 modelos extraídos dos arquivos Excel fornecidos: 474 pontos de inspeção.
- [x] Cada ponto de checklist é uma linha rearranjável do relatório, com comando e opções **OK** / **Não OK**.
- [x] **OK**: linha verde.
- [x] **Não OK**: exibir avaliação da severidade (**Monitorar**, **Anormal**, **Crítico**, **Muito Crítico**), comentário e fotografias. Cor condicional, inclusive vermelho escuro e negrito em Muito Crítico.
- [x] Adicionar o quarto tipo de linha **Avaliação**, com comando livre.
- [x] Preservar os três tipos existentes (texto, lista e fotografia), a reordenação e o botão `+`.
- [x] Preservar os dados nos exportadores **HTML, Word, Excel e PDF (impressão)** e nos backups JSON.
- [x] Manter funcionamento offline: todos os modelos em `js/checklists-data.js`, sem requisições remotas, e inclusão no cache do service worker v1.1.
- [x] Aceitar backups e dados salvos no formato v1.0.

## Critérios de aceite — testar no tablet

- [ ] Atualizar o PWA em HTTPS e confirmar que os 10 modelos aparecem com e sem conexão.
- [ ] Preencher TAG, modelo, horímetro e odômetro; recarregar a página e confirmar persistência.
- [ ] Filtrar por `CAT 777`, `6030`, `D9` e `DR410i` e carregar um checklist.
- [ ] Validar OK → verde; Não OK → classificação e campos extras; Muito Crítico → vermelho escuro/negrito.
- [ ] Adicionar foto da câmera offline, fechar e abrir novamente e confirmar persistência.
- [ ] Duplicar, mover e excluir uma linha; inserir uma linha Avaliação manual.
- [ ] Exportar DOCX, XLSX, HTML e PDF contendo campos, condições, comentários e fotos.
- [ ] Importar um backup `.json` v1.0 e confirmar que texto, listas e fotografias permanecem íntegros.
- [ ] Restaurar conectividade e confirmar funcionamento, sem perda de dados locais.

## Arquivos da implementação

- `index.html`
- `css/styles.css`
- `js/app.js`
- `js/exports.js`
- `js/checklists-data.js` **(novo)**
- `service-worker.js`
- `README.md`
- `tests/test_exports.cjs`

## Atenção

O editor é offline e não integra automaticamente com SAP PM. Os relatórios continuam gravados no **IndexedDB do dispositivo**, sem sincronização entre tablets. Os modelos não devem ser interpretados como critérios de liberação automática da máquina. Antes de publicar a atualização, exportar o backup JSON do relatório em andamento.
