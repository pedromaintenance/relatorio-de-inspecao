# Editor de Relatórios Técnicos — v1.3

## Uso
- **Modelos**: oito estruturas iniciais (inspeção, relatório livre, ficha de condição, AFA, POP, intervenção, Project Charter, melhoria contínua). Escolher Usar substitui o documento atual após confirmação.
- **Salvar relatório como modelo**: guarda estrutura e textos localmente, removendo fotos, dados de máquina, resultados de avaliações, data e responsáveis de elaboração/revisão/aprovação. Modelos pessoais podem ser exportados/importados em JSON ou excluídos.
- **Tabela**: adicionar linha no final ou abaixo de outra; remover linha; adicionar/remover última coluna; mesclar células horizontalmente com a célula à direita e separar; cabeçalho opcional. Mesclar concatena conteúdo; separar mantém o conteúdo na primeira célula. Limites: 12 colunas, 200 linhas.
- **Lista**: checklist, marcadores ou numerada.
- **Controle documental**: código, revisão, data, área, elaboração, revisão técnica, aprovação, rodapé, cabeçalho textual repetido e numeração. Campos opcionais; não representa aprovação formal.
- **Prévia A4**: abre a pré-visualização de impressão do navegador, a mesma usada na exportação PDF.

## Compatibilidade e exportação
JSON v4 lê backups v1/v2/v3/v4. Word contém tabelas editáveis, mesclagem horizontal, cabeçalhos de tabela repetidos, cabeçalho e rodapé de seção e campos PAGE/NUMPAGES. Listas Word usam marcadores/números textuais. HTML mantém tabelas e estilos; PDF usa impressão do navegador, com cabeçalho/rodapé e numeração via caixas de margem CSS @page (dependentes de suporte do navegador). Excel registra conteúdo por célula com linha, coluna e extensão, sem reproduzir o layout da tabela. Cache offline v1.3.0.

## Verificações
Sintaxe JavaScript e teste de fumaça de operações da tabela, oito modelos, limpeza de dados do modelo, presença de elementos esperados HTML e OOXML, IDs e cache. DOM e ZIP simulados. Não houve teste visual em navegador, Word ou tablet; validar antes de usar em documentos oficiais.

## Próximos ajustes
Mesclagem vertical, inserção/exclusão de colunas em posição arbitrária, prévia A4 interna sem diálogo de impressão, listas Word com numeração nativa, e layout idêntico ao template institucional em todas as plataformas.
