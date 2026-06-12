(function () {
  const defaultConfig = {
    titulo: "Assistente do Portal do Aluno",
    subtitulo: "Atendimento virtual",
    mensagemInicial: "Olá! Sou o assistente virtual do Portal do Aluno. Posso ajudar com dúvidas simples sobre acesso, senha, AVA, avaliações e serviços acadêmicos.",
    placeholder: "Digite sua dúvida...",
    whatsapp: "55DDDNUMERO",
    textoWhatsapp: "Olá! Preciso de ajuda com o Portal do Aluno.",
    respostasUrl: "./respostas.json",
    corPrincipal: "#25D366",
    corCabecalho: "#078C36",
    posicao: "right",
    textoBolha: "Precisa de ajuda?"
  };

  const config = Object.assign({}, defaultConfig, window.PortalAlunoChatConfig || {});
  let respostas = [];
  let aberto = false;

  const stopwords = new Set([
    "a", "o", "os", "as", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos",
    "em", "no", "na", "nos", "nas", "para", "pra", "por", "com", "sem", "e", "ou",
    "que", "qual", "quais", "como", "onde", "quando", "eu", "meu", "minha", "meus",
    "minhas", "não", "nao", "consigo", "preciso", "quero", "fazer", "ver", "acessar"
  ]);

  function normalizar(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(texto) {
    return normalizar(texto)
      .split(" ")
      .filter(t => t.length > 2 && !stopwords.has(t));
  }

  function pontuar(perguntaAluno, item) {
    const perguntaNormalizada = normalizar(perguntaAluno);
    const todasPerguntas = [item.titulo || "", ...(item.perguntas || [])];
    let melhor = 0;

    for (const pergunta of todasPerguntas) {
      const perguntaBanco = normalizar(pergunta);
      if (!perguntaBanco) continue;

      if (perguntaNormalizada === perguntaBanco) melhor = Math.max(melhor, 100);
      if (perguntaNormalizada.includes(perguntaBanco) || perguntaBanco.includes(perguntaNormalizada)) {
        melhor = Math.max(melhor, 85);
      }

      const tkAluno = tokens(perguntaNormalizada);
      const tkBanco = tokens(perguntaBanco);

      if (tkAluno.length && tkBanco.length) {
        const matches = tkAluno.filter(t => tkBanco.includes(t)).length;
        const score = Math.round((matches / Math.max(tkAluno.length, tkBanco.length)) * 100);
        melhor = Math.max(melhor, score);
      }
    }

    return melhor;
  }

  function buscarResposta(perguntaAluno) {
    let melhorItem = null;
    let melhorScore = 0;

    for (const item of respostas) {
      const score = pontuar(perguntaAluno, item);
      if (score > melhorScore) {
        melhorScore = score;
        melhorItem = item;
      }
    }

    return melhorScore >= 34 ? melhorItem : null;
  }

  function whatsappUrl(perguntaOriginal) {
    const numero = String(config.whatsapp || "").replace(/[^\d]/g, "");
    const texto = `${config.textoWhatsapp}\n\nDúvida: ${perguntaOriginal || ""}`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  function criarElemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  function adicionarMensagem(tipo, texto) {
    const lista = document.querySelector(".pa-chat-messages");
    const msg = criarElemento("div", `pa-msg ${tipo === "user" ? "pa-user" : "pa-bot"}`);
    msg.innerHTML = texto;
    lista.appendChild(msg);
    lista.scrollTop = lista.scrollHeight;
  }

  function adicionarBotaoWhatsapp(pergunta) {
    const lista = document.querySelector(".pa-chat-messages");
    const wrap = criarElemento("div", "pa-actions");
    const link = criarElemento("a", "pa-whatsapp-link", "Falar com a tutoria no WhatsApp");
    link.href = whatsappUrl(pergunta);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    wrap.appendChild(link);
    lista.appendChild(wrap);
    lista.scrollTop = lista.scrollHeight;
  }

  function salvarDuvidaLocal(pergunta) {
    try {
      const chave = "portalAlunoChat_duvidasNaoRespondidas";
      const atuais = JSON.parse(localStorage.getItem(chave) || "[]");
      atuais.push({
        pergunta,
        data: new Date().toISOString(),
        pagina: window.location.href
      });
      localStorage.setItem(chave, JSON.stringify(atuais.slice(-50)));
    } catch (e) {}
  }

  function responder(pergunta) {
    const item = buscarResposta(pergunta);

    if (!item) {
      adicionarMensagem("bot", "Não consegui localizar uma resposta segura para essa dúvida. Para evitar passar uma informação incorreta, vou te encaminhar para a tutoria acadêmica.");
      adicionarBotaoWhatsapp(pergunta);
      salvarDuvidaLocal(pergunta);
      return;
    }

    adicionarMensagem("bot", item.resposta);

    if (item.acao === "whatsapp") {
      adicionarBotaoWhatsapp(pergunta);
    }
  }

  function mostrarPerguntasRapidas() {
    const lista = document.querySelector(".pa-chat-messages");
    const wrap = criarElemento("div", "pa-quick");
    const titulo = criarElemento("div", "pa-quick-title", "Escolha uma opção ou digite sua dúvida");
    wrap.appendChild(titulo);

    respostas.slice(0, 6).forEach(item => {
      const btn = criarElemento("button", "pa-chip", item.titulo || item.categoria);
      btn.addEventListener("click", () => {
        adicionarMensagem("user", item.titulo);
        responder(item.titulo);
      });
      wrap.appendChild(btn);
    });

    lista.appendChild(wrap);
  }

  function enviarPergunta() {
    const input = document.querySelector(".pa-chat-input");
    const pergunta = input.value.trim();
    if (!pergunta) return;

    adicionarMensagem("user", pergunta);
    input.value = "";
    responder(pergunta);
  }

  function abrirChat() {
    aberto = true;
    document.querySelector(".pa-chat-window").classList.add("pa-open");
    document.querySelector(".pa-chat-launcher").classList.add("pa-hidden");
    setTimeout(() => {
      const input = document.querySelector(".pa-chat-input");
      if (input) input.focus();
    }, 150);
  }

  function fecharChat() {
    aberto = false;
    document.querySelector(".pa-chat-window").classList.remove("pa-open");
    document.querySelector(".pa-chat-launcher").classList.remove("pa-hidden");
  }

  function criarCSS() {
    const css = `
      :root { --pa-cor: ${config.corPrincipal}; --pa-cabecalho: ${config.corCabecalho}; }
      .pa-chat-root * { box-sizing: border-box; }
      .pa-chat-root { font-family: Inter, Arial, Helvetica, sans-serif; position: fixed; z-index: 999999; ${config.posicao === "left" ? "left" : "right"}: 22px; bottom: 22px; }

      .pa-chat-launcher {
        display: flex;
        align-items: center;
        gap: 10px;
        border: none;
        cursor: pointer;
        background: transparent;
        padding: 0;
        transition: transform .2s ease, opacity .2s ease;
      }

      .pa-chat-launcher:hover { transform: translateY(-2px); }
      .pa-chat-launcher.pa-hidden { opacity: 0; pointer-events: none; transform: scale(.92); }

      .pa-launcher-label {
        background: #fff;
        color: #1f2937;
        border-radius: 999px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 10px 30px rgba(0,0,0,.16);
        border: 1px solid rgba(0,0,0,.06);
        white-space: nowrap;
      }

      .pa-whatsapp-icon {
        width: 64px;
        height: 64px;
        border-radius: 999px;
        background: var(--pa-cor);
        color: #fff;
        display: grid;
        place-items: center;
        box-shadow: 0 14px 35px rgba(0,0,0,.24);
        position: relative;
      }

      .pa-whatsapp-icon::before {
        content: "";
        position: absolute;
        inset: -5px;
        border-radius: 999px;
        background: rgba(37, 211, 102, .22);
        animation: pa-pulse 1.9s infinite;
        z-index: -1;
      }

      @keyframes pa-pulse {
        0% { transform: scale(.86); opacity: .7; }
        70% { transform: scale(1.22); opacity: 0; }
        100% { transform: scale(1.22); opacity: 0; }
      }

      .pa-whatsapp-icon svg { width: 34px; height: 34px; }

      .pa-chat-window {
        width: min(390px, calc(100vw - 30px));
        height: min(635px, calc(100vh - 105px));
        background: #fff;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 70px rgba(0,0,0,.28);
        display: flex;
        flex-direction: column;
        opacity: 0;
        pointer-events: none;
        transform: translateY(18px) scale(.98);
        transition: opacity .2s ease, transform .2s ease;
        border: 1px solid rgba(0,0,0,.08);
      }

      .pa-chat-window.pa-open {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }

      .pa-chat-header {
        background: linear-gradient(135deg, var(--pa-cabecalho), #065f28);
        color: #fff;
        padding: 18px 18px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .pa-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .pa-header-avatar {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        background: #25D366;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 2px solid rgba(255,255,255,.35);
      }

      .pa-header-avatar svg {
        width: 21px;
        height: 21px;
      }

      .pa-chat-title { font-weight: 900; font-size: 15px; line-height: 1.2; }
      .pa-chat-subtitle { font-size: 12px; opacity: .92; margin-top: 3px; line-height: 1.3; }

      .pa-close {
        border: none;
        background: rgba(255,255,255,.18);
        color: #fff;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        cursor: pointer;
        font-size: 22px;
        line-height: 1;
        flex: 0 0 auto;
      }

      .pa-chat-messages {
        flex: 1;
        padding: 18px 14px;
        overflow-y: auto;
        background: #f7f8fa;
      }

      .pa-msg {
        max-width: 86%;
        padding: 12px 14px;
        border-radius: 16px;
        margin: 0 0 10px;
        font-size: 14px;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      .pa-bot {
        background: #fff;
        color: #202124;
        border-top-left-radius: 5px;
        box-shadow: 0 1px 0 rgba(0,0,0,.04);
      }

      .pa-user {
        margin-left: auto;
        background: var(--pa-cabecalho);
        color: #fff;
        border-top-right-radius: 5px;
      }

      .pa-quick {
        margin: 12px 0 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .pa-quick-title {
        width: 100%;
        font-size: 12px;
        color: #5f6368;
        font-weight: 800;
        margin-bottom: 2px;
      }

      .pa-chip {
        border: 1px solid rgba(7,140,54,.22);
        color: #105c2d;
        background: #fff;
        border-radius: 999px;
        padding: 9px 11px;
        font-size: 12px;
        cursor: pointer;
        text-align: left;
      }

      .pa-chip:hover { border-color: var(--pa-cabecalho); }

      .pa-actions { margin: 4px 0 12px; }

      .pa-whatsapp-link {
        display: inline-block;
        text-decoration: none;
        color: #fff;
        background: #25D366;
        padding: 11px 13px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 900;
      }

      .pa-chat-form {
        padding: 12px;
        background: #fff;
        border-top: 1px solid rgba(0,0,0,.08);
        display: flex;
        gap: 8px;
      }

      .pa-chat-input {
        flex: 1;
        border: 1px solid rgba(0,0,0,.14);
        border-radius: 999px;
        padding: 12px 14px;
        outline: none;
        font-size: 14px;
        min-width: 0;
      }

      .pa-chat-input:focus {
        border-color: var(--pa-cabecalho);
        box-shadow: 0 0 0 3px rgba(7,140,54,.12);
      }

      .pa-send {
        border: none;
        background: var(--pa-cabecalho);
        color: #fff;
        width: 44px;
        height: 44px;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 900;
      }

      .pa-footer {
        padding: 0 14px 12px;
        background: #fff;
        color: #6b7280;
        font-size: 10px;
        text-align: center;
      }

      @media (max-width: 520px) {
        .pa-chat-root {
          right: 14px;
          left: 14px;
          bottom: 14px;
        }

        .pa-chat-window {
          width: 100%;
          height: min(640px, calc(100vh - 92px));
          border-radius: 20px;
        }

        .pa-chat-launcher {
          margin-left: auto;
        }

        .pa-launcher-label {
          display: none;
        }

        .pa-whatsapp-icon {
          width: 60px;
          height: 60px;
        }
      }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function whatsappSvg() {
    return `
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path fill="currentColor" d="M16.04 3.2C9 3.2 3.28 8.9 3.28 15.9c0 2.42.69 4.67 1.88 6.59L3.2 29l6.72-1.86a12.7 12.7 0 0 0 6.12 1.56c7.03 0 12.76-5.7 12.76-12.75S23.07 3.2 16.04 3.2Zm0 23.32c-1.98 0-3.82-.55-5.4-1.52l-.39-.24-3.99 1.1 1.13-3.88-.25-.4a10.5 10.5 0 0 1-1.68-5.68c0-5.82 4.75-10.55 10.58-10.55 5.85 0 10.6 4.73 10.6 10.55 0 5.84-4.75 10.62-10.6 10.62Zm5.81-7.92c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65s1.14 3.07 1.3 3.28c.16.21 2.25 3.44 5.45 4.82.76.33 1.36.53 1.82.68.77.24 1.47.21 2.02.13.62-.09 1.88-.77 2.14-1.51.26-.74.26-1.38.18-1.51-.08-.13-.29-.21-.61-.37Z"/>
      </svg>
    `;
  }

  function criarHTML() {
    const root = criarElemento("div", "pa-chat-root");

    root.innerHTML = `
      <button class="pa-chat-launcher" aria-label="Abrir atendimento virtual">
        <span class="pa-launcher-label">${config.textoBolha}</span>
        <span class="pa-whatsapp-icon">${whatsappSvg()}</span>
      </button>

      <section class="pa-chat-window" aria-label="Chat do Portal do Aluno">
        <header class="pa-chat-header">
          <div class="pa-header-left">
            <div class="pa-header-avatar">${whatsappSvg()}</div>
            <div>
              <div class="pa-chat-title">${config.titulo}</div>
              <div class="pa-chat-subtitle">${config.subtitulo}</div>
            </div>
          </div>
          <button class="pa-close" aria-label="Fechar chat">×</button>
        </header>

        <main class="pa-chat-messages"></main>

        <form class="pa-chat-form">
          <input class="pa-chat-input" type="text" autocomplete="off" placeholder="${config.placeholder}" />
          <button class="pa-send" type="submit" aria-label="Enviar">➜</button>
        </form>

        <div class="pa-footer">As respostas são orientativas. Em caso de dúvida específica, fale com a tutoria.</div>
      </section>
    `;

    document.body.appendChild(root);

    document.querySelector(".pa-chat-launcher").addEventListener("click", abrirChat);
    document.querySelector(".pa-close").addEventListener("click", fecharChat);
    document.querySelector(".pa-chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      enviarPergunta();
    });

    adicionarMensagem("bot", config.mensagemInicial);
    mostrarPerguntasRapidas();
  }

  async function carregarRespostas() {
    try {
      const resp = await fetch(config.respostasUrl, { cache: "no-store" });
      if (!resp.ok) throw new Error("Não foi possível carregar respostas.json");
      respostas = await resp.json();
    } catch (e) {
      respostas = [];
      console.warn("[PortalAlunoChat]", e);
    }
  }

  async function iniciar() {
    if (document.querySelector(".pa-chat-root")) return;
    criarCSS();
    await carregarRespostas();
    criarHTML();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();