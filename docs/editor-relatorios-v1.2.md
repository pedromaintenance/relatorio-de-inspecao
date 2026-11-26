# Editor de relatórios técnicos — v1.2

O fluxo de inspeção continua disponível. O editor permite criar documentos gerais sem identificação de equipamento, usando o mesmo armazenamento local.

## Recursos
- Cabeçalho institucional editável e identificação de máquina opcional.
- Bloco Cabeçalho e título opcional nos blocos de texto, lista, foto e avaliação.
- Editor visual de texto com seleção e negrito, itálico e sublinhado; estilos normal, título principal, título de seção, subtítulo e legenda.
- Bloco fotográfico com introdução, descrição individual antes da imagem, legenda após a imagem e 1 a 4 fotos por linha.
- Maximizar fotos seleciona uma coluna e amplia o limite de altura; não garante o preenchimento exato da área restante da folha.
- Bloco de quebra de página explícita em Word e impressão PDF.
- Backup JSON v3; importação aceita versões 1, 2 e 3.
- HTML e Word conservam a formatação; Excel conserva o conteúdo tabular, descrições e marcações de tipo, não a diagramação do documento.
- Atualização do cache offline.

## Critérios de aceitação manual
1. Em um perfil de teste, importar backup v1/v2, verificar texto, avaliações, listas, fotografias e metadados, exportar novo JSON e reimportar.
2. Criar cabeçalho, selecionar texto e aplicar N/I/S em trechos diferentes; testar também combinação, desfazer, colagem e digitação em tablet.
3. Adicionar título e alterar estilo de cada bloco, reordenar e duplicar.
4. Inserir 5 fotos juntas; escolher 1, 2, 3 e 4 por linha, maximizar, adicionar descrições e legendas.
5. Criar quebra de página, ocultar a identificação de máquina e exportar PDF, HTML e DOCX; verificar paginação, tabelas de fotografias, texto e estilos em Word.
6. Exportar Excel, verificar ordem, texto e referências fotográficas.
7. Recarregar sem conexão após atualização do cache; verificar recuperação local e checklist de inspeção.
8. Confirmar renderização em desktop e tablet, incluindo ausência de Montserrat instalada (fallback Segoe UI no navegador).

## Verificações desta alteração
Sintaxe dos scripts validada; teste de fumaça dos exportadores usando DOMParser e ZIP simulados confirmou a presença dos elementos HTML e OOXML esperados. Ainda não há validação de layout em navegador/Word nem teste ponta a ponta no tablet. Testar antes de publicar em produção.

## Fora do escopo
Tabela editável de conteúdo geral, cabeçalho repetido automaticamente em todas as páginas, preenchimento exato da área restante da página, formatação rica no Excel.
