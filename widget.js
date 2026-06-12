(function () {
  const defaultConfig = {
    titulo: "Sofia",
    subtitulo: "Assistente do Portal do Aluno",
    mensagemInicial: "Olá, eu sou Sofia! Posso ajudar com dúvidas sobre acesso, senha, AVA, avaliações e serviços acadêmicos e muito mais.",
    placeholder: "Digite sua dúvida...",
    whatsapp: "55DDDNUMERO",
    textoWhatsapp: "Olá! Preciso de ajuda com o Portal do Aluno.",
    respostasUrl: "./respostas.json",
    imagemLauncher: "./sofia-avatar.png",
    corPrincipal: "#0c8c36",
    corChips: "#f5fff8",
    textoBolha: "Como posso te ajudar?",
    distanciaDireita: "28px",
    distanciaInferior: "28px"
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
      if (perguntaNormalizada.length > 4 && (perguntaNormalizada.includes(perguntaBanco) || perguntaBanco.includes(perguntaNormalizada))) {
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
    return String(texto || "").replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function adicionarMensagem(tipo, texto, especial) {
    const lista = document.querySelector('.sf-messages');
    const msg = criarElemento('div', `sf-msg ${tipo === 'user' ? 'sf-user' : 'sf-bot'} ${especial || ''}`.trim());
    msg.innerHTML = linkificar(texto);
    lista.appendChild(msg);
    lista.scrollTop = lista.scrollHeight;
  }

  function adicionarBotaoWhatsapp(pergunta) {
    const lista = document.querySelector('.sf-messages');
    const wrap = criarElemento('div', 'sf-actions');
    const link = criarElemento('a', 'sf-whatsapp-link', 'Falar com a tutoria no WhatsApp');
    link.href = whatsappUrl(pergunta);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    wrap.appendChild(link);
    lista.appendChild(wrap);
    lista.scrollTop = lista.scrollHeight;
  }

  function salvarDuvidaLocal(pergunta) {
    try {
      const chave = 'sofiaChat_duvidasNaoRespondidas';
      const atuais = JSON.parse(localStorage.getItem(chave) || '[]');
      atuais.push({ pergunta, data: new Date().toISOString(), pagina: window.location.href });
      localStorage.setItem(chave, JSON.stringify(atuais.slice(-50)));
    } catch (e) {}
  }

  function responder(pergunta) {
    const item = buscarResposta(pergunta);
    if (!item) {
      adicionarMensagem('bot', 'Não encontrei uma resposta segura para essa dúvida. Para evitar uma orientação incorreta, vou te encaminhar para a tutoria acadêmica.');
      adicionarBotaoWhatsapp(pergunta);
      salvarDuvidaLocal(pergunta);
      return;
    }
    adicionarMensagem('bot', item.resposta);
    if (item.acao === 'whatsapp') adicionarBotaoWhatsapp(pergunta);
  }

  function enviarPergunta() {
    const input = document.querySelector('.sf-input');
    const pergunta = input.value.trim();
    if (!pergunta) return;
    adicionarMensagem('user', pergunta, 'sf-user-main');
    input.value = '';
    responder(pergunta);
  }

  function selecionarOpcao(item, botao) {
    document.querySelectorAll('.sf-chip').forEach(btn => btn.classList.remove('sf-chip-active'));
    botao.classList.add('sf-chip-active');
    adicionarMensagem('user', item.titulo, 'sf-user-main');
    responder(item.titulo);
  }

  function abrirChat() {
    document.querySelector('.sf-window').classList.add('sf-open');
    document.querySelector('.sf-launcher').classList.add('sf-hidden');
    setTimeout(() => {
      const input = document.querySelector('.sf-input');
      if (input) input.focus();
    }, 150);
  }

  function fecharChat() {
    document.querySelector('.sf-window').classList.remove('sf-open');
    document.querySelector('.sf-launcher').classList.remove('sf-hidden');
  }

  function criarCSS() {
    const css = `
      :root {
        --sf-green: ${config.corPrincipal};
        --sf-chip-bg: ${config.corChips};
      }
      .sf-root * { box-sizing: border-box; }
      .sf-root {
        font-family: Inter, Arial, Helvetica, sans-serif;
        position: fixed !important;
        right: ${config.distanciaDireita} !important;
        bottom: ${config.distanciaInferior} !important;
        left: auto !important;
        top: auto !important;
        z-index: 999999 !important;
      }
      .sf-launcher {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        background: transparent;
        border: none;
        padding: 0;
        cursor: pointer;
        transition: transform .2s ease, opacity .2s ease;
      }
      .sf-launcher:hover { transform: translateY(-2px); }
      .sf-launcher.sf-hidden { opacity: 0; pointer-events: none; transform: scale(.92); }
      .sf-bubble {
        background: #fff;
        color: #1f2937;
        border-radius: 18px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 800;
        box-shadow: 0 10px 28px rgba(0,0,0,.14);
        border: 1px solid rgba(0,0,0,.06);
        white-space: nowrap;
        position: relative;
      }
      .sf-bubble::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: -7px;
        width: 14px;
        height: 14px;
        background: #fff;
        transform: translateX(-50%) rotate(45deg);
        border-right: 1px solid rgba(0,0,0,.06);
        border-bottom: 1px solid rgba(0,0,0,.06);
      }
      .sf-avatar-wrap {
        width: 78px;
        height: 78px;
        border-radius: 999px;
        background: #fff;
        overflow: hidden;
        border: 4px solid #fff;
        box-shadow: 0 14px 34px rgba(0,0,0,.22);
      }
      .sf-avatar-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center top;
        display: block;
      }
      .sf-window {
        width: min(392px, calc(100vw - 24px));
        height: 690px;
        max-height: calc(100vh - 24px);
        border-radius: 26px;
        overflow: hidden;
        background: #efefef;
        box-shadow: 0 22px 60px rgba(0,0,0,.28);
        opacity: 0;
        pointer-events: none;
        transform: translateY(18px) scale(.98);
        transition: opacity .2s ease, transform .2s ease;
        display: flex;
        flex-direction: column;
      }
      .sf-window.sf-open { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }
      .sf-header {
        background: var(--sf-green);
        color: #fff;
        padding: 16px 16px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .sf-header-left { display:flex; align-items:center; gap: 10px; min-width:0; }
      .sf-header-icon {
        width: 36px; height: 36px; border-radius: 999px;
        display:grid; place-items:center; background: rgba(255,255,255,.18);
        flex: 0 0 auto;
      }
      .sf-header-icon img { width:100%; height:100%; object-fit:cover; border-radius:999px; }
      .sf-title { font-size: 15px; font-weight: 900; line-height:1.2; }
      .sf-subtitle { font-size: 12px; font-weight: 600; opacity: .92; line-height:1.2; margin-top: 2px; }
      .sf-close {
        width: 36px; height: 36px; border-radius: 999px; border: none;
        background: rgba(255,255,255,.18); color:#fff; font-size:24px; line-height:1;
        cursor:pointer; flex: 0 0 auto;
      }
      .sf-body {
        flex:1; background:#efefef; overflow-y:auto; padding: 14px 12px 8px;
      }
      .sf-chip-row {
        display:flex; flex-wrap:wrap; gap:10px; margin-bottom: 14px;
      }
      .sf-chip {
        border: 1px solid #abd9b7; background: #f8fffa; color:#0f6627;
        border-radius: 999px; padding: 10px 14px; font-size: 13px; cursor:pointer;
      }
      .sf-chip:hover { border-color: #5cb273; }
      .sf-chip.sf-chip-active { background: var(--sf-green); color:#fff; border-color: var(--sf-green); }
      .sf-msg {
        max-width: 92%; border-radius: 18px; padding: 14px 14px; font-size: 14px;
        line-height: 1.5; margin-bottom: 12px; white-space: pre-wrap;
      }
      .sf-bot {
        background: #fff; color:#202124; border-top-left-radius: 8px;
        box-shadow: 0 1px 0 rgba(0,0,0,.04);
      }
      .sf-bot a { color: #0b5cff; font-weight: 800; text-decoration: underline; word-break: break-word; }
      .sf-user {
        margin-left: auto; background: var(--sf-green); color:#fff; border-top-right-radius: 8px;
      }
      .sf-user-main { width: 100%; max-width: 100%; text-align:center; font-weight:700; padding: 13px 14px; border-radius: 14px; }
      .sf-actions { margin: 4px 0 12px; }
      .sf-whatsapp-link {
        display:inline-block; text-decoration:none; color:#fff; background:#25D366;
        padding: 11px 13px; border-radius: 999px; font-size: 13px; font-weight: 900;
      }
      .sf-footer {
        background: #efefef; border-top: 1px solid rgba(0,0,0,.08); padding: 10px 12px 12px;
      }
      .sf-form { display:flex; align-items:center; gap: 10px; }
      .sf-input {
        flex:1; min-width:0; height: 44px; border-radius: 999px; border: 1px solid #d0d0d0;
        background:#fff; padding: 0 16px; font-size: 14px; outline:none;
      }
      .sf-input:focus { border-color: #6fb783; box-shadow: 0 0 0 3px rgba(12,140,54,.08); }
      .sf-send {
        width: 44px; height: 44px; border:none; border-radius:999px; background: var(--sf-green);
        color:#fff; font-size: 20px; font-weight:900; cursor:pointer;
      }
      .sf-note {
        margin-top: 8px; font-size: 10px; color:#777; text-align:center;
      }
      @media (max-width: 520px) {
        .sf-root { right: 12px !important; bottom: 12px !important; }
        .sf-window {
          position: fixed !important;
          right: 10px !important; left: 10px !important; bottom: 10px !important;
          width: auto !important; height: min(690px, calc(100vh - 20px));
        }
        .sf-avatar-wrap { width: 72px; height: 72px; }
        .sf-bubble { font-size: 12px; }
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function criarChips() {
    return respostas.slice(0, 6).map((item, index) => `
      <button class="sf-chip" data-index="${index}" type="button">${item.titulo || item.categoria}</button>
    `).join('');
  }

  function criarHTML() {
    const root = criarElemento('div', 'sf-root');
    root.innerHTML = `
      <button class="sf-launcher" aria-label="Abrir atendimento da Sofia">
        <span class="sf-bubble">${config.textoBolha}</span>
        <span class="sf-avatar-wrap"><img src="${config.imagemLauncher}" alt="Sofia" /></span>
      </button>

      <section class="sf-window" aria-label="Chat da Sofia">
        <header class="sf-header">
          <div class="sf-header-left">
            <div class="sf-header-icon"><img src="${config.imagemLauncher}" alt="Sofia" /></div>
            <div>
              <div class="sf-title">${config.titulo}</div>
              <div class="sf-subtitle">${config.subtitulo}</div>
            </div>
          </div>
          <button class="sf-close" aria-label="Fechar chat">×</button>
        </header>
        <main class="sf-body">
          <div class="sf-chip-row">${criarChips()}</div>
          <div class="sf-messages"></div>
        </main>
        <footer class="sf-footer">
          <form class="sf-form">
            <input class="sf-input" type="text" autocomplete="off" placeholder="${config.placeholder}" />
            <button class="sf-send" type="submit" aria-label="Enviar">➜</button>
          </form>
          <div class="sf-note">As respostas são orientativas. Em caso de dúvida específica, fale com a tutoria.</div>
        </footer>
      </section>
    `;
    document.body.appendChild(root);

    document.querySelector('.sf-launcher').addEventListener('click', abrirChat);
    document.querySelector('.sf-close').addEventListener('click', fecharChat);
    document.querySelector('.sf-form').addEventListener('submit', function (e) {
      e.preventDefault();
      enviarPergunta();
    });
    document.querySelectorAll('.sf-chip').forEach((botao) => {
      botao.addEventListener('click', function () {
        const item = respostas[Number(this.dataset.index)] || respostas[0];
        selecionarOpcao(item, this);
      });
    });
    adicionarMensagem('bot', config.mensagemInicial);
  }

  async function carregarRespostas() {
    try {
      const resp = await fetch(config.respostasUrl, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Não foi possível carregar respostas.json');
      respostas = await resp.json();
    } catch (e) {
      respostas = [];
      console.warn('[SofiaChat]', e);
    }
  }

  async function iniciar() {
    if (document.querySelector('.sf-root')) return;
    await carregarRespostas();
    criarCSS();
    criarHTML();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
