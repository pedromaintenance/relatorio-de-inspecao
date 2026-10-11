# GMIN Inspeções — Mina TZ

Aplicativo web estático e **offline-first**, criado para relatórios de inspeção de equipamentos móveis da Mina Tocantinzinho. Não exige Node, serviços em nuvem, banco externo ou bibliotecas online.

## Funcionalidades

- Marca Mina TZ no cabeçalho; título sugerido pela data e hora, editável.
- Linhas de altura automática; cada linha pode conter **texto**, **fotos com legendas** ou **lista/checklist**.
- Botão `+` abaixo de cada linha, alça `⋮⋮` para arrastar no mouse ou no tablet e menu `⋯` para editar, duplicar e excluir.
- Fotos importadas da câmera/galeria e reduzidas para até 1800 pixels para economizar armazenamento.
- Salvamento automático **local** com IndexedDB (inclusive fotos). Ao retornar, o relatório pode ser retomado no mesmo navegador e dispositivo.
- Exportação **HTML** independente (com fotos embutidas), **Word .docx**, **Excel .xlsx** (aba de dados e aba de fotografias com imagens) e **PDF** via caixa nativa de impressão do navegador, escolhendo *Salvar como PDF*.
- Exportação/importação `.json` para backup e continuidade da edição em outro dispositivo.
- Instalação como PWA a partir de GitHub Pages / HTTPS. Após o primeiro carregamento online, os arquivos do aplicativo ficam disponíveis no cache offline.

## Estrutura do repositório

```text
GMIN_Inspecoes_App/
├── index.html               # Interface
├── css/styles.css           # Tema corporativo + impressão
├── js/app.js                # Blocos, edição, fotos, organização
├── js/storage.js            # IndexedDB
├── js/exports.js            # HTML, PDF, DOCX, XLSX
├── js/zip.js                # Pacotes Office Open XML sem dependências
├── js/logo-data.js          # Identidade visual incorporada em exports
├── assets/                  # Marca e ícones locais
├── service-worker.js        # Cache offline da aplicação
├── manifest.webmanifest     # Instalação no tablet
├── .nojekyll
└── README.md
```

## Rodar localmente

**Forma rápida:** abra `index.html` no Chrome ou Edge. A interface foi desenvolvida em JavaScript clássico e não exige servidor. O navegador pode restringir IndexedDB ao abrir diretamente como `file://`; se o status indicar falha de armazenamento, use um servidor local.

**Forma recomendada:** com Python instalado:

```bash
cd GMIN_Inspecoes_App
python -m http.server 8000
```

Acesse `http://localhost:8000`. Para teste em tablet, publique em HTTPS com GitHub Pages.

## Publicar no GitHub Pages

1. Crie um repositório (privado apenas se a política da empresa permitir; GitHub Pages pode expor conteúdo conforme plano/configuração).
2. Envie os arquivos desta pasta para a **raiz** do repositório.
3. Vá em **Settings → Pages → Build and deployment → Deploy from a branch**; selecione `main` e `/ (root)`.
4. Abra a URL fornecida; quando estiver online, use o menu do navegador **Instalar aplicativo / Adicionar à tela inicial**.
5. Faça o primeiro carregamento, salve um teste e desligue o Wi-Fi para validar offline no dispositivo real.

> Atenção: ao publicar o código, **não envie relatórios operacionais nem fotografias reais** para o GitHub. O projeto contém somente a ferramenta. Os dados ficam no navegador do dispositivo, não no repositório.

## Exportações e backup

| Saída | Conteúdo | Observação |
| --- | --- | --- |
| PDF | Título, marca, textos, listas e fotos | Abre a impressão: escolha **Salvar como PDF** |
| HTML | Relatório completo, com fotos incorporadas | Pode ser aberto offline, mas não é o editor |
| Word `.docx` | Relatório editável no Word, com imagens | Não preserva blocos interativos |
| Excel `.xlsx` | Dados organizados e fotografias em segunda aba | Não substitui os arquivos do projeto |
| Projeto `.json` | Estrutura original completa, com fotos | **Único formato para reabrir no editor** |

O histórico do navegador pode ser limpo automaticamente pelo usuário, sistema ou políticas corporativas. Faça backups `.json` periodicamente e mantenha-os em local aprovado pela TI.

## Segurança, governança e limitações

- **Não há login, nuvem ou integração com SAP PM nesta versão.** O relatório não cria Notificações SAP automaticamente.
- Funciona offline após carregamento inicial (PWA em HTTPS); fotos e texto ficam **armazenados localmente, sem criptografia própria**. Use somente dispositivos corporativos gerenciados, conforme orientação de Segurança da Informação.
- Recomenda-se iniciar com fotos **não sensíveis** ou dados fictícios até obter autorização para o piloto.
- O aplicativo cria relatórios de formato livre; não é um banco de dados relacional de falhas nem substitui o SAP.
- A capacidade e retenção do armazenamento local dependem do dispositivo/navegador. Fotos são comprimidas antes de salvar; monitore espaço livre.
- Exportação PDF depende das opções de impressão do sistema operacional/navegador. Caso a aba de impressão não abra, habilite pop-ups para o site.
- O modo offline não sincroniza relatórios entre usuários/dispositivos. Compartilhamento é feito por exportação, não por envio automático.
- Não use GitHub Pages público para armazenar documentação ou dados internos; consulte o TI sobre hospedagem interna.

## Licenças e identidade visual

Marca Mina TZ fornecida para este projeto; manter o uso conforme as diretrizes de identidade visual da G Mining Ventures. Nenhuma dependência JS ou fonte externa é necessária.
