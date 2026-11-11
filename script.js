/* ============================================================
   SOBRE ETNIAS — comportamento
   ------------------------------------------------------------
   1. Entrada em duas etapas
      1a. o fólio se abre em duas folhas
      1b. a tela de entrar aparece e espera o clique
   2. Paralaxe 3D dos retratos
   3. Utilidades
   ============================================================ */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     1. ENTRADA EM DUAS ETAPAS
     ------------------------------------------------------------ */
  var entrada     = document.getElementById('entrada');
  var folio       = document.getElementById('folio');
  var pagina      = document.getElementById('pagina');
  var btnEntrar   = document.getElementById('btn-entrar');
  var btnPular    = document.getElementById('btn-pular');
  var tituloHeroi = document.getElementById('titulo-inicio');

  var SEM_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Durações que precisam acompanhar o CSS */
  var DURACAO_SAIDA = 900;   /* .entrada.is-saindo (cortina) */
  var DURACAO_FOLIO = 550;   /* .folio.is-fora */

  /* Roteiro do fólio (ms). Cada folha leva 850 ms para virar; a
     guarda parte quando a capa está de perfil (metade do giro). */
  var T_CAPA    = 400;
  var T_GUARDA  = 820;
  var T_LEGENDA = 1450;
  var T_ENTRADA = 2300;

  var saindo = false;
  var pronta = false;
  var temporizadores = [];

  function reduzirMovimento() {
    return SEM_MOVIMENTO.matches;
  }

  function agendar(acao, atraso) {
    temporizadores.push(window.setTimeout(acao, atraso));
  }

  function cancelarAgenda() {
    temporizadores.forEach(window.clearTimeout);
    temporizadores = [];
  }

  /* Bloqueia a página de trás enquanto a entrada está aberta:
     o atributo inert remove os elementos do foco e da árvore de
     acessibilidade sem escondê-los visualmente. */
  function prenderPagina() {
    if (!pagina) return;
    pagina.setAttribute('inert', '');
    document.body.classList.add('travado');
  }

  function liberarPagina() {
    if (!pagina) return;
    pagina.removeAttribute('inert');
    document.body.classList.remove('travado');
  }

  /* Etapa 2: o fólio sai de cena e a entrada começa a se montar */
  function revelarEntrada() {
    if (pronta || !entrada) return;
    pronta = true;
    cancelarAgenda();

    entrada.classList.add('is-pronta');
    entrada.setAttribute('aria-busy', 'false');

    if (folio && !folio.hidden) {
      folio.classList.add('is-fora');

      if (reduzirMovimento()) {
        folio.hidden = true;
      } else {
        window.setTimeout(function () { folio.hidden = true; }, DURACAO_FOLIO);
      }
    }
  }

  function sair() {
    if (saindo || !entrada) return;
    saindo = true;

    if (btnEntrar) btnEntrar.disabled = true;
    if (btnPular) btnPular.disabled = true;

    window.scrollTo(0, 0);
    pararParalaxe();

    if (reduzirMovimento()) {
      concluir();
      return;
    }

    entrada.classList.add('is-saindo');
    window.setTimeout(concluir, DURACAO_SAIDA);
  }

  function concluir() {
    if (entrada) {
      entrada.hidden = true;
      entrada.classList.remove('is-saindo');
    }

    liberarPagina();

    if (pagina) pagina.classList.add('revelada');

    /* Move o foco para o início do conteúdo, para quem navega
       por teclado ou leitor de tela não voltar ao topo. */
    if (tituloHeroi) {
      tituloHeroi.focus({ preventScroll: true });
    }
  }

  if (entrada && btnEntrar) {
    prenderPagina();

    btnEntrar.addEventListener('click', sair);
    if (btnPular) btnPular.addEventListener('click', sair);

    if (folio && !reduzirMovimento()) {
      /* Etapa 1 — a abertura roda sozinha. Clicar no fólio
         (ou teclar) adianta para a tela de entrar. */
      folio.addEventListener('click', revelarEntrada);

      agendar(function () { folio.classList.add('is-abrindo'); }, T_CAPA);
      agendar(function () { folio.classList.add('is-virando'); }, T_GUARDA);
      agendar(function () { folio.classList.add('is-aberto'); }, T_LEGENDA);
      agendar(revelarEntrada, T_ENTRADA);
    } else {
      /* Sem abertura encenada: vai direto para a etapa 2 */
      if (folio) folio.hidden = true;
      revelarEntrada();
    }

    document.addEventListener('keydown', function (evento) {
      /* Durante a abertura, qualquer tecla de avanço pula o fólio */
      if (!pronta) {
        if (evento.key === 'Tab') {
          evento.preventDefault();
          revelarEntrada();
          if (btnEntrar) btnEntrar.focus({ preventScroll: true });
          return;
        }

        if (evento.key === 'Escape' || evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          revelarEntrada();
        }
        return;
      }

      /* Esc encerra a introdução */
      if (evento.key === 'Escape' && !saindo) {
        evento.preventDefault();
        sair();
        return;
      }

      /* Confinamento de foco: a entrada é modal, então o Tab não
         deve alcançar o conteúdo que está atrás dela. */
      if (evento.key === 'Tab' && !saindo) {
        var focaveis = [btnEntrar, btnPular].filter(function (elemento) {
          return elemento && !elemento.disabled;
        });
        if (!focaveis.length) return;

        var primeiro = focaveis[0];
        var ultimo = focaveis[focaveis.length - 1];
        var atual = document.activeElement;

        if (evento.shiftKey && (atual === primeiro || atual === entrada)) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && atual === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        } else if (atual !== primeiro && atual !== ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    });

    /* Foco inicial no diálogo: o leitor de tela anuncia o nome da
       tela de entrada sem transformar o botão em "foco de teclado". */
    entrada.setAttribute('tabindex', '-1');
    window.setTimeout(function () {
      entrada.focus({ preventScroll: true });
    }, 1200);
  } else {
    /* Sem tela de entrada (fallback): garante a página visível */
    liberarPagina();
  }

  /* ------------------------------------------------------------
     2. PARALAXE 3D DOS RETRATOS
     A posição do ponteiro vira um par de variáveis CSS (-1 a 1)
     lidas pelo CSS. Atualização limitada a um quadro por vez.
     ------------------------------------------------------------ */
  var palco = document.querySelector('.palco');
  var quadroPendente = false;
  var alvoX = 0;
  var alvoY = 0;
  var ativo = true;

  function aplicarParalaxe() {
    quadroPendente = false;
    if (!palco) return;
    palco.style.setProperty('--px', alvoX.toFixed(3));
    palco.style.setProperty('--py', alvoY.toFixed(3));
  }

  function aoMoverPonteiro(evento) {
    if (!ativo) return;
    alvoX = (evento.clientX / window.innerWidth - 0.5) * 2;
    alvoY = (evento.clientY / window.innerHeight - 0.5) * 2;

    if (!quadroPendente) {
      quadroPendente = true;
      window.requestAnimationFrame(aplicarParalaxe);
    }
  }

  function pararParalaxe() {
    ativo = false;
    window.removeEventListener('pointermove', aoMoverPonteiro);
  }

  var temPonteiro = window.matchMedia('(hover: hover) and (pointer: fine)');

  if (palco && !reduzirMovimento() && temPonteiro.matches) {
    window.addEventListener('pointermove', aoMoverPonteiro, { passive: true });
  }

  /* ------------------------------------------------------------
     3. UTILIDADES
     ------------------------------------------------------------ */
  /* Reavalia a preferência de movimento caso ela mude com a
     página aberta (ex.: usuário altera a configuração do sistema). */
  if (typeof SEM_MOVIMENTO.addEventListener === 'function') {
    SEM_MOVIMENTO.addEventListener('change', function (evento) {
      if (evento.matches) pararParalaxe();
    });
  }
})();
