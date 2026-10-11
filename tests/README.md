# Verificação técnica local

`node tests/test_exports.cjs` cria exemplos de relatório HTML, DOCX e XLSX em `tests/artifacts/` usando somente dados fictícios. Esses arquivos não entram no repositório, por padrão, graças ao `.gitignore`.

A aplicação também foi verificada manualmente em navegador Chromium (desktop e tela de celular), incluindo criação de blocos, fotografias, controles de reordenação e exportações. Para testes completos no tablet, verificar salvamento IndexedDB, fotografia pela câmera, encerramento/reabertura do aplicativo, ausência de rede, reordenação por toque e impressão em PDF no navegador real.
