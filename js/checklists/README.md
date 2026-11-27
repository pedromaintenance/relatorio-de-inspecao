# Biblioteca modular de checklists

`js/checklists-data.js` contém apenas o registro e a validação básica. Cada arquivo chama `window.GMINRegisterChecklist({...})`.

## Organização

- `implementos/`: inspeções de implementos.
- `inspecao-geral/`: inspeções gerais por família de equipamento.
- `pm/pre-lavador/`: inspeções do contexto PM antes da lavagem.

## Como versionar

1. Crie um arquivo por checklist na pasta apropriada. Use ID único, título, categoria, contexto, revisão de catálogo, modelos, fonte e itens (cada item com ID estável, system, command e method). Não reutilize IDs de itens retirados.
2. Registre o arquivo em index.html depois do registro e antes de app.js; inclua o mesmo caminho em ASSETS no service-worker.js. Scripts locais, sem fetch, sem CDN, compatíveis com file://.
3. Ao revisar o conteúdo, altere apenas seu arquivo, incremente revision e documente a mudança no commit. Revisão de catálogo não é aprovação formal de engenharia.
4. Atualize a versão do cache PWA, totais e testes quando adicionar/remover modelos. Execute node tests/test_exports.cjs e valide no tablet online e offline.
5. Não suba relatórios preenchidos, fotos, dados pessoais ou arquivos internos não autorizados ao repositório público.

## Primeira revisão do PM Pré-Lavador

Fonte: Checklist - - Inspeção Pré-Lavador equipamentos.xlsx, aba Checklist - Pré-Lavador -. Os IDs r16 a r115 correspondem às linhas originais, excluindo cabeçalhos. São 94 itens em 7 seções (15, 18, 12, 10, 14, 12, 13). Textos e repetições preservados, com espaços finais removidos. A linha 101 mantém a quebra de linha e o intervalo de 2 a 4 minutos.

Pontos para revisão técnica, não corrigidos sem autorização: linha 33 cita lado direito dentro da seção Inferior 02; linha 93 cita roda esquerda na seção dianteira 01; linhas 52 e 65 têm descrição incompleta e a linha 47 contém parêntese sem fechamento. A aplicação geral a equipamentos de grande porte não garante aplicabilidade de todos os itens a todas as frotas. O app ainda não oferece estado N/A ou "não inspecionado" explícito distinto da avaliação em branco; não marcar OK para itens inaplicáveis. A opção de não conformidade usa o fluxo de severidade já existente do editor, sem criar prioridade SAP automática.

Metadados dos novos itens: checklistId, checklistRevision e checklistItemId são preservados no backup editável. Relatórios já criados não são reescritos pela revisão da biblioteca.
