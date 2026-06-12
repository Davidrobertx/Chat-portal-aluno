(function () {
  const defaultConfig = {
    titulo: "Sofia",
    subtitulo: "Assistente do Portal do Aluno",
    mensagemInicial: "Olá, eu sou Sofia! Posso ajudar com dúvidas sobre acesso, senha, AVA, avaliações e serviços acadêmicos e muito mais.",
    placeholder: "Digite sua dúvida aqui...",
    whatsapp: "55DDDNUMERO",
    textoWhatsapp: "Olá! Preciso de ajuda com o Portal do Aluno.",
    respostasUrl: "./respostas.json",
    imagemLauncher: "./sofia-avatar.png",
    corPrincipal: "#25D366",
    corCabecalho: "#0B5CFF",
    corOpcoes: "#0B5CFF",
    textoBolha: "Como posso te ajudar?",
    distanciaDireita: "32px",
    distanciaInferior: "32px"
  };

  const config = Object.assign({}, defaultConfig, window.PortalAlunoChatConfig || {});
  let respostas = [];

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

      if (
        perguntaNormalizada.length > 4 &&
        (perguntaNormalizada.includes(perguntaBanco) || perguntaBanco.includes(perguntaNormalizada))
      ) {
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

  function linkificar(texto) {
    return String(texto || "").replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  function adicionarMensagem(tipo, texto) {
    const lista = document.querySelector(".pa-chat-messages");
    const msg = criarElemento("div", `pa-msg ${tipo === "user" ? "pa-user" : "pa-bot"}`);
    msg.innerHTML = linkificar(texto);
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
      adicionarMensagem("bot", "Não encontrei uma resposta segura para essa dúvida. Para evitar uma orientação incorreta, vou te encaminhar para a tutoria acadêmica.");
      adicionarBotaoWhatsapp(pergunta);
      salvarDuvidaLocal(pergunta);
      return;
    }

    adicionarMensagem("bot", item.resposta);

    if (item.acao === "whatsapp") {
      adicionarBotaoWhatsapp(pergunta);
    }
  }

  function enviarPergunta() {
    const input = document.querySelector(".pa-chat-input");
    const pergunta = input.value.trim();
    if (!pergunta) return;

    adicionarMensagem("user", pergunta);
    input.value = "";
    responder(pergunta);
  }

  function selecionarOpcao(item, botao) {
    document.querySelectorAll(".pa-option").forEach(btn => btn.classList.remove("pa-selected"));
    botao.classList.add("pa-selected");
    adicionarMensagem("user", item.titulo);
    responder(item.titulo);
  }

  function abrirChat() {
    document.querySelector(".pa-chat-window").classList.add("pa-open");
    document.querySelector(".pa-chat-launcher").classList.add("pa-hidden");
    setTimeout(() => {
      const input = document.querySelector(".pa-chat-input");
      if (input) input.focus();
    }, 150);
  }

  function fecharChat() {
    document.querySelector(".pa-chat-window").classList.remove("pa-open");
    document.querySelector(".pa-chat-launcher").classList.remove("pa-hidden");
  }

  function avatarSofiaSvg() {
    return `
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="20" fill="#0B5CFF"/>
        <circle cx="15" cy="16" r="2.2" fill="white"/>
        <circle cx="25" cy="16" r="2.2" fill="white"/>
        <path d="M14 25c3.4 3.2 8.6 3.2 12 0" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
      </svg>
    `;
  }

  function criarCSS() {
    const css = `
      :root {
        --pa-whatsapp: ${config.corPrincipal};
        --pa-blue: ${config.corCabecalho};
        --pa-options: ${config.corOpcoes};
      }

      .pa-chat-root * { box-sizing: border-box; }

      .pa-chat-root {
        font-family: Inter, Arial, Helvetica, sans-serif;
        position: fixed !important;
        z-index: 999999 !important;
        right: ${config.distanciaDireita} !important;
        bottom: ${config.distanciaInferior} !important;
        top: auto !important;
        left: auto !important;
        transform: none !important;
      }

      .pa-chat-launcher {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        border: none;
        cursor: pointer;
        background: transparent;
        padding: 0;
        transition: transform .2s ease, opacity .2s ease;
      }

      .pa-chat-launcher:hover { transform: translateY(-2px); }
      .pa-chat-launcher.pa-hidden { opacity: 0; pointer-events: none; transform: scale(.92); }

      .pa-launcher-bubble {
        background: #fff;
        color: #1f2937;
        border-radius: 18px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 10px 30px rgba(0,0,0,.16);
        border: 1px solid rgba(0,0,0,.06);
        white-space: nowrap;
        position: relative;
      }

      .pa-launcher-bubble::after {
        content: "";
        position: absolute;
        left: 50%;
        bottom: -7px;
        width: 14px;
        height: 14px;
        background: #fff;
        border-right: 1px solid rgba(0,0,0,.06);
        border-bottom: 1px solid rgba(0,0,0,.06);
        transform: translateX(-50%) rotate(45deg);
      }

      .pa-launcher-image {
        width: 72px;
        height: 72px;
        border-radius: 999px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 14px 35px rgba(0,0,0,.24);
        position: relative;
        border: 3px solid #fff;
      }

      .pa-launcher-image::before {
        content: "";
        position: absolute;
        inset: -6px;
        border-radius: 999px;
        background: rgba(37, 211, 102, .18);
        animation: pa-pulse 1.9s infinite;
        z-index: -1;
      }

      .pa-launcher-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center top;
        display: block;
      }

      @keyframes pa-pulse {
        0% { transform: scale(.86); opacity: .7; }
        70% { transform: scale(1.18); opacity: 0; }
        100% { transform: scale(1.18); opacity: 0; }
      }

      .pa-chat-window {
        width: min(390px, calc(100vw - 30px));
        height: min(670px, calc(100vh - 105px));
        background: #f4f5fb;
        border-radius: 30px;
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
        background: #f4f5fb;
        color: #111827;
        padding: 16px 18px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .pa-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .pa-header-avatar {
        width: 40px;
        height: 40px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
      }

      .pa-header-avatar svg {
        width: 40px;
        height: 40px;
      }

      .pa-chat-title {
        font-weight: 900;
        font-size: 17px;
        line-height: 1.2;
      }

      .pa-chat-subtitle {
        font-size: 11px;
        color: #7b8190;
        margin-top: 2px;
        line-height: 1.3;
      }

      .pa-close {
        border: none;
        background: #fff;
        color: #4b5563;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        cursor: pointer;
        font-size: 22px;
        line-height: 1;
        flex: 0 0 auto;
        box-shadow: 0 8px 22px rgba(0,0,0,.08);
      }

      .pa-chat-form {
        padding: 8px 16px 14px;
        background: #f4f5fb;
        display: flex;
        gap: 8px;
      }

      .pa-chat-input {
        flex: 1;
        border: none;
        background: #fff;
        border-radius: 18px;
        padding: 13px 14px;
        outline: none;
        font-size: 14px;
        min-width: 0;
        box-shadow: 0 8px 22px rgba(0,0,0,.06);
      }

      .pa-chat-input:focus {
        box-shadow: 0 0 0 3px rgba(11,92,255,.12), 0 8px 22px rgba(0,0,0,.06);
      }

      .pa-send {
        border: none;
        background: var(--pa-blue);
        color: #fff;
        width: 44px;
        height: 44px;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 900;
        box-shadow: 0 8px 22px rgba(11,92,255,.24);
      }

      .pa-chat-messages {
        flex: 1;
        padding: 8px 16px 14px;
        overflow-y: auto;
        background: #f4f5fb;
      }

      .pa-msg {
        max-width: 86%;
        padding: 12px 14px;
        border-radius: 16px;
        margin: 0 0 10px;
        font-size: 13px;
        line-height: 1.45;
        white-space: pre-wrap;
      }

      .pa-msg a {
        color: inherit;
        font-weight: 800;
        text-decoration: underline;
        word-break: break-word;
      }

      .pa-bot {
        background: #fff;
        color: #202124;
        border-top-left-radius: 6px;
        box-shadow: 0 1px 0 rgba(0,0,0,.04);
      }

      .pa-bot a { color: #0B5CFF; }

      .pa-user {
        margin-left: auto;
        background: var(--pa-blue);
        color: #fff;
        border-top-right-radius: 6px;
      }

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

      .pa-options-panel {
        background: var(--pa-options);
        padding: 12px;
        color: #fff;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -10px 28px rgba(0,0,0,.08);
      }

      .pa-options-title {
        font-size: 13px;
        font-weight: 900;
        margin: 0 0 8px;
        opacity: .95;
      }

      .pa-options-list {
        display: grid;
        gap: 2px;
        max-height: 190px;
        overflow-y: auto;
        border-radius: 16px;
      }

      .pa-option {
        width: 100%;
        border: none;
        cursor: pointer;
        background: rgba(255,255,255,.08);
        color: #fff;
        padding: 13px 12px;
        text-align: left;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        transition: background .15s ease;
      }

      .pa-option:hover { background: rgba(255,255,255,.15); }
      .pa-option.pa-selected { background: rgba(255,255,255,.2); }

      .pa-option-text {
        line-height: 1.25;
        font-weight: 700;
      }

      .pa-option-radio {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: rgba(0,0,0,.22);
        display: grid;
        place-items: center;
        flex: 0 0 auto;
      }

      .pa-option.pa-selected .pa-option-radio::after {
        content: "✓";
        font-size: 12px;
        font-weight: 900;
        color: #fff;
      }

      .pa-footer {
        padding: 8px 12px 10px;
        background: var(--pa-options);
        color: rgba(255,255,255,.78);
        font-size: 10px;
        text-align: center;
      }

      @media (max-width: 520px) {
        .pa-chat-root {
          right: 16px !important;
          left: auto !important;
          bottom: 16px !important;
          top: auto !important;
          transform: none !important;
        }

        .pa-chat-window {
          position: fixed !important;
          right: 14px !important;
          left: 14px !important;
          bottom: 14px !important;
          width: auto !important;
          height: min(680px, calc(100vh - 92px));
          border-radius: 26px;
        }

        .pa-launcher-bubble { font-size: 12px; }

        .pa-launcher-image {
          width: 64px;
          height: 64px;
        }
      }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function criarOpcoesHTML() {
    return respostas.map((item, index) => `
      <button class="pa-option" data-index="${index}" type="button">
        <span class="pa-option-text">${item.titulo || item.categoria}</span>
        <span class="pa-option-radio"></span>
      </button>
    `).join("");
  }

  function criarHTML() {
    const root = criarElemento("div", "pa-chat-root");

    root.innerHTML = `
      <button class="pa-chat-launcher" aria-label="Abrir atendimento virtual">
        <span class="pa-launcher-bubble">${config.textoBolha}</span>
        <span class="pa-launcher-image"><img src="${config.imagemLauncher}" alt="Sofia" /></span>
      </button>

      <section class="pa-chat-window" aria-label="Chat Sofia">
        <header class="pa-chat-header">
          <div class="pa-header-left">
            <div class="pa-header-avatar">${avatarSofiaSvg()}</div>
            <div>
              <div class="pa-chat-title">${config.titulo}</div>
              <div class="pa-chat-subtitle">${config.subtitulo}</div>
            </div>
          </div>
          <button class="pa-close" aria-label="Fechar chat">×</button>
        </header>

        <form class="pa-chat-form">
          <input class="pa-chat-input" type="text" autocomplete="off" placeholder="${config.placeholder}" />
          <button class="pa-send" type="submit" aria-label="Enviar">➜</button>
        </form>

        <main class="pa-chat-messages"></main>

        <section class="pa-options-panel" aria-label="Escolha uma opção">
          <div class="pa-options-title">Escolha uma opção</div>
          <div class="pa-options-list">
            ${criarOpcoesHTML()}
          </div>
        </section>

        <div class="pa-footer">Se a resposta não aparecer, a Sofia encaminha você para a tutoria.</div>
      </section>
    `;

    document.body.appendChild(root);

    document.querySelector(".pa-chat-launcher").addEventListener("click", abrirChat);
    document.querySelector(".pa-close").addEventListener("click", fecharChat);
    document.querySelector(".pa-chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      enviarPergunta();
    });

    document.querySelectorAll(".pa-option").forEach((botao) => {
      botao.addEventListener("click", function () {
        const item = respostas[Number(this.dataset.index)];
        selecionarOpcao(item, this);
      });
    });

    adicionarMensagem("bot", config.mensagemInicial);
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
