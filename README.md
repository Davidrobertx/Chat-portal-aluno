# Chat Portal do Aluno com ícone flutuante estilo WhatsApp

Este projeto cria um chat simples para site, com:

- Ícone flutuante estilo WhatsApp no canto inferior da página;
- Pop-up de conversa ao clicar no ícone;
- Banco de respostas em JSON;
- Respostas controladas por você;
- Botão de encaminhamento para WhatsApp da tutoria quando o chat não souber responder;
- Compatível com GitHub Pages e incorporação no GreatPages.

## Arquivos

```text
chat-portal-aluno-greatpages-whatsapp-popup/
├── index.html
├── widget.js
├── respostas.json
├── codigo-para-greatpages.html
└── README.md
```

## Como configurar o WhatsApp

No arquivo `index.html` e no código que será colado no GreatPages, troque:

```js
whatsapp: "5581999999999"
```

Pelo número da tutoria com código do Brasil + DDD + número.

Exemplo:

```js
whatsapp: "5581999999999"
```

## Como editar as respostas

Abra o arquivo `respostas.json`.

Cada resposta segue este modelo:

```json
{
  "id": "acesso-portal",
  "categoria": "Acesso",
  "titulo": "Como acessar o Portal do Aluno?",
  "perguntas": [
    "como acessar o portal do aluno",
    "onde acesso o portal",
    "portal do aluno"
  ],
  "resposta": "Texto da resposta que o aluno vai receber."
}
```

## Como publicar no GitHub Pages

1. Crie um repositório público no GitHub.
2. Envie os arquivos para a raiz do repositório.
3. Vá em `Settings`.
4. Clique em `Pages`.
5. Em `Build and deployment`, selecione:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: /root
6. Salve e aguarde o link ser gerado.

O link ficará parecido com:

```text
https://seu-usuario.github.io/nome-do-repositorio/
```

## Como inserir no GreatPages

Depois de publicar no GitHub Pages, use o conteúdo do arquivo `codigo-para-greatpages.html`.

Exemplo:

```html
<script>
  window.PortalAlunoChatConfig = {
    titulo: "Assistente do Portal do Aluno",
    subtitulo: "Acesso, AVA, avaliações e tutoria",
    whatsapp: "5581999999999",
    textoWhatsapp: "Olá! Preciso de ajuda com o Portal do Aluno.",
    respostasUrl: "https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/respostas.json",
    corPrincipal: "#25D366",
    corCabecalho: "#078C36",
    textoBolha: "Precisa de ajuda?"
  };
</script>

<script src="https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/widget.js"></script>
```

Troque:

- `SEU-USUARIO`;
- `NOME-DO-REPOSITORIO`;
- `5581999999999`.

## Como mudar o texto da bolha

Altere:

```js
textoBolha: "Precisa de ajuda?"
```

Exemplos:

```js
textoBolha: "Fale conosco"
textoBolha: "Ajuda acadêmica"
textoBolha: "Atendimento"
```

## Observação

O `respostas.json` ficará público no GitHub Pages. Use apenas respostas institucionais simples e não coloque dados sensíveis.
