/* ============================================================
   SOBRE ETNIAS — comportamento
   ------------------------------------------------------------
   1. Entrada em duas etapas
      1a. o fólio se abre em duas folhas
      1b. a tela de entrar aparece e espera o clique
   2. Paralaxe 3D dos retratos
   3. Cabeçalho, voltar ao topo e navegação ativa
   4. Filtros de personalidades
   5. Abas de cultura
   6. Glossário pesquisável
   7. Quiz educativo
   8. Revelação ao rolar e brilho de ponteiro
   9. Utilidades
   ============================================================ */

(function () {
  'use strict';

  var SEM_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TEM_PONTEIRO = window.matchMedia('(hover: hover) and (pointer: fine)');

  function reduzirMovimento() {
    return SEM_MOVIMENTO.matches;
  }

  function lista(seletor, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(seletor));
  }

  /* Remove acentos e caixa para uma busca mais tolerante */
  function normalizar(texto) {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }

  /* ------------------------------------------------------------
     1. ENTRADA EM DUAS ETAPAS
     ------------------------------------------------------------ */
  var entrada     = document.getElementById('entrada');
  var folio       = document.getElementById('folio');
  var pagina      = document.getElementById('pagina');
  var btnEntrar   = document.getElementById('btn-entrar');
  var btnPular    = document.getElementById('btn-pular');
  var tituloHeroi = document.getElementById('titulo-inicio');

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

  if (palco && !reduzirMovimento() && TEM_PONTEIRO.matches) {
    window.addEventListener('pointermove', aoMoverPonteiro, { passive: true });
  }

  /* ------------------------------------------------------------
     3. CABEÇALHO, VOLTAR AO TOPO E NAVEGAÇÃO ATIVA
     ------------------------------------------------------------ */
  var cabecalho = document.querySelector('.cabecalho');
  var botaoTopo = null;

  function criarBotaoTopo() {
    var botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'voltar-topo';
    botao.setAttribute('aria-label', 'Voltar ao topo da página');
    botao.title = 'Voltar ao topo';
    botao.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
        '<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
    botao.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduzirMovimento() ? 'auto' : 'smooth' });
    });
    document.body.appendChild(botao);
    return botao;
  }

  function conferirRolagem() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (cabecalho) cabecalho.classList.toggle('is-rolado', y > 8);
    if (botaoTopo) botaoTopo.classList.toggle('is-visivel', y > 620);
  }

  var rolagemPendente = false;
  function aoRolar() {
    if (rolagemPendente) return;
    rolagemPendente = true;
    window.requestAnimationFrame(function () {
      rolagemPendente = false;
      conferirRolagem();
    });
  }

  botaoTopo = criarBotaoTopo();
  window.addEventListener('scroll', aoRolar, { passive: true });
  conferirRolagem();

  /* Garante o estado ativo mesmo se o HTML não trouxer aria-current */
  var menuPrincipal = document.querySelector('.menu-principal');
  if (menuPrincipal) {
    if (!menuPrincipal.querySelector('[aria-current="page"]')) {
      var arquivoAtual = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      if (!arquivoAtual || arquivoAtual.indexOf('.') === -1) arquivoAtual = 'index.html';
      lista('.menu-principal__link', menuPrincipal).forEach(function (link) {
        var href = (link.getAttribute('href') || '').toLowerCase();
        if (href === arquivoAtual) link.setAttribute('aria-current', 'page');
      });
    }

    /* Destaque de âncoras internas (quando existirem) */
    var linksAncora = lista('.menu-principal__link', menuPrincipal).filter(function (link) {
      return (link.getAttribute('href') || '').charAt(0) === '#';
    });
    if (linksAncora.length && 'IntersectionObserver' in window) {
      var observadorSecoes = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (item) {
          if (!item.isIntersecting) return;
          linksAncora.forEach(function (link) {
            var atual = link.getAttribute('href') === '#' + item.target.id;
            link.classList.toggle('is-ativo', atual);
            if (atual) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });

      linksAncora.forEach(function (link) {
        var secao = document.querySelector(link.getAttribute('href'));
        if (secao) observadorSecoes.observe(secao);
      });
    }
  }

  /* ------------------------------------------------------------
     4. FILTROS DE PERSONALIDADES
     ------------------------------------------------------------ */
  var botoesFiltro = lista('[data-person-filter]');
  var cartoesPersonagem = lista('.cartao-personagem');
  var contagemPersonalidades = document.getElementById('contagem-personalidades');
  var gradeCartoes = document.getElementById('personalidades');

  function aplicarFiltro(filtro, botaoAtivo) {
    botoesFiltro.forEach(function (item) {
      var ativo = item === botaoAtivo;
      item.classList.toggle('is-selecionado', ativo);
      item.setAttribute('aria-pressed', String(ativo));
    });

    var visiveis = 0;
    cartoesPersonagem.forEach(function (cartao) {
      var mostrar = filtro === 'todas' || cartao.getAttribute('data-grupo') === filtro;
      cartao.hidden = !mostrar;
      if (mostrar) {
        cartao.style.setProperty('--ordem', String(visiveis));
        visiveis++;
      }
    });

    if (contagemPersonalidades) {
      contagemPersonalidades.textContent =
        visiveis + (visiveis === 1 ? ' personalidade no acervo' : ' personalidades no acervo');
    }

    /* Reanima a grade a cada troca de filtro */
    if (gradeCartoes && !reduzirMovimento()) {
      gradeCartoes.classList.remove('is-filtrando');
      void gradeCartoes.offsetWidth;
      gradeCartoes.classList.add('is-filtrando');
    }
  }

  if (botoesFiltro.length && cartoesPersonagem.length) {
    botoesFiltro.forEach(function (botao) {
      botao.addEventListener('click', function () {
        aplicarFiltro(botao.getAttribute('data-person-filter'), botao);
      });
    });
  }

  /* ------------------------------------------------------------
     5. ABAS DE CULTURA
     ------------------------------------------------------------ */
  var conteudosCultura = {
    oralidade: {
      titulo: 'Oralidade e literatura',
      texto: 'Em diferentes sociedades africanas e comunidades afro-brasileiras, a transmissão oral preserva memórias, narrativas, conhecimentos e línguas. A literatura escrita também registra experiências, denuncia desigualdades e cria mundos possíveis — de Maria Firmina dos Reis a autores contemporâneos.',
      fonte: 'Para pesquisar: Fundação Cultural Palmares; Biblioteca Nacional; acervos literários e pesquisas acadêmicas.'
    },
    ciencia: {
      titulo: 'Ciência e tecnologia',
      texto: 'Povos africanos e afrodescendentes contribuíram historicamente para diferentes campos do conhecimento. No Brasil, pesquisadores e profissionais negros atuam hoje em áreas como saúde, engenharia, educação e tecnologia. Conhecimentos devem ser reconhecidos com autoria, contexto e evidências.',
      fonte: 'Para pesquisar: CNPq — ações de diversidade; universidades públicas e repositórios científicos.'
    },
    territorio: {
      titulo: 'Território e natureza',
      texto: 'Povos indígenas mantêm conhecimentos diversos sobre territórios, ciclos naturais, plantas, águas e biodiversidade. Esses saberes são produzidos em contextos específicos e estão ligados à continuidade dos povos, aos direitos territoriais e ao cuidado com a vida.',
      fonte: 'Para pesquisar: Instituto Socioambiental — Povos Indígenas no Brasil; FUNAI.'
    },
    artes: {
      titulo: 'Artes e expressões',
      texto: 'Música, dança, artes visuais, festas e outras expressões afro-brasileiras e indígenas são formas de criação, memória, afirmação e transformação. Cada manifestação tem história própria e deve ser compreendida a partir das comunidades que a mantêm e reinventam.',
      fonte: 'Para pesquisar: IPHAN — patrimônio cultural; Museu Afro Brasil; instituições culturais indígenas.'
    }
  };

  var painelCultura = document.getElementById('painel-cultura');
  var abasCultura = lista('[data-cultura]');
  var tablistCultura = document.querySelector('.abas-cultura');

  function selecionarCultura(botao, focar) {
    if (!botao || !painelCultura) return;
    var chave = botao.getAttribute('data-cultura');
    var item = conteudosCultura[chave];
    if (!item) return;

    abasCultura.forEach(function (aba) {
      var ativo = aba === botao;
      aba.classList.toggle('is-ativa', ativo);
      aba.setAttribute('aria-selected', String(ativo));
      aba.tabIndex = ativo ? 0 : -1;
    });

    painelCultura.innerHTML = '';

    var selo = document.createElement('p');
    selo.className = 'painel-cultura__selo';
    selo.textContent = 'CAMPO DE CONHECIMENTO';

    var titulo = document.createElement('h3');
    titulo.textContent = item.titulo;

    var texto = document.createElement('p');
    texto.textContent = item.texto;

    var fonte = document.createElement('p');
    fonte.className = 'fonte';
    fonte.textContent = item.fonte;

    painelCultura.appendChild(selo);
    painelCultura.appendChild(titulo);
    painelCultura.appendChild(texto);
    painelCultura.appendChild(fonte);

    if (botao.id) painelCultura.setAttribute('aria-labelledby', botao.id);

    painelCultura.classList.remove('is-trocando');
    void painelCultura.offsetWidth;
    painelCultura.classList.add('is-trocando');

    if (focar) botao.focus();
  }

  abasCultura.forEach(function (botao) {
    botao.addEventListener('click', function () { selecionarCultura(botao, false); });
  });

  if (tablistCultura && abasCultura.length) {
    tablistCultura.addEventListener('keydown', function (evento) {
      var indice = abasCultura.indexOf(document.activeElement);
      if (indice === -1) return;

      var novo = null;
      if (evento.key === 'ArrowRight') novo = (indice + 1) % abasCultura.length;
      else if (evento.key === 'ArrowLeft') novo = (indice - 1 + abasCultura.length) % abasCultura.length;
      else if (evento.key === 'Home') novo = 0;
      else if (evento.key === 'End') novo = abasCultura.length - 1;
      else return;

      evento.preventDefault();
      selecionarCultura(abasCultura[novo], true);
    });
  }

  /* ------------------------------------------------------------
     6. GLOSSÁRIO PESQUISÁVEL
     ------------------------------------------------------------ */
  var buscaGlossario = document.getElementById('busca-glossario');
  var limparBusca = document.getElementById('limpar-busca');
  var limparVazio = document.getElementById('limpar-busca-vazio');
  var verbetes = lista('.verbete');
  var resultadoBusca = document.getElementById('resultado-busca');
  var semResultados = document.getElementById('sem-resultados');
  var htmlOriginal = new Map();

  verbetes.forEach(function (verbete) {
    htmlOriginal.set(verbete, verbete.innerHTML);
  });

  /* Realça o termo apenas nos textos visíveis, sem tocar na fonte */
  function marcarTermo(raiz, termo) {
    if (!termo) return;
    var alvo = termo.toLocaleLowerCase('pt-BR');

    lista('h3, p:not(.fonte)', raiz).forEach(function (bloco) {
      var caminhante = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT, null);
      var textos = [];
      while (caminhante.nextNode()) textos.push(caminhante.currentNode);

      textos.forEach(function (no) {
        var conteudo = no.nodeValue;
        var posicao = conteudo.toLocaleLowerCase('pt-BR').indexOf(alvo);
        if (posicao === -1) return;

        var fragmento = document.createDocumentFragment();
        var resto = conteudo;
        var encontrado = resto.toLocaleLowerCase('pt-BR').indexOf(alvo);

        while (encontrado !== -1) {
          fragmento.appendChild(document.createTextNode(resto.slice(0, encontrado)));
          var marca = document.createElement('mark');
          marca.textContent = resto.slice(encontrado, encontrado + termo.length);
          fragmento.appendChild(marca);
          resto = resto.slice(encontrado + termo.length);
          encontrado = resto.toLocaleLowerCase('pt-BR').indexOf(alvo);
        }

        fragmento.appendChild(document.createTextNode(resto));
        no.parentNode.replaceChild(fragmento, no);
      });
    });
  }

  function filtrarGlossario() {
    var termo = (buscaGlossario ? buscaGlossario.value : '').trim();
    var termoNormalizado = normalizar(termo);
    var encontrados = 0;

    /* Restaura o conteúdo original antes de cada filtragem */
    verbetes.forEach(function (verbete) {
      var original = htmlOriginal.get(verbete);
      if (typeof original === 'string') verbete.innerHTML = original;
    });

    verbetes.forEach(function (verbete) {
      var corresponde = !termoNormalizado ||
        normalizar(verbete.textContent).indexOf(termoNormalizado) !== -1;

      verbete.hidden = !corresponde;

      if (corresponde) {
        encontrados++;
        if (termoNormalizado) marcarTermo(verbete, termo);
      }
    });

    if (resultadoBusca) {
      if (termoNormalizado) {
        resultadoBusca.textContent = encontrados +
          (encontrados === 1 ? ' conceito encontrado' : ' conceitos encontrados');
      } else {
        resultadoBusca.textContent = encontrados +
          (encontrados === 1 ? ' conceito no glossário' : ' conceitos no glossário');
      }
    }

    if (semResultados) semResultados.hidden = encontrados !== 0;
    if (limparBusca) limparBusca.disabled = !termo.length;
  }

  function limparPesquisa() {
    if (!buscaGlossario) return;
    buscaGlossario.value = '';
    filtrarGlossario();
    buscaGlossario.focus();
  }

  if (buscaGlossario) {
    buscaGlossario.addEventListener('input', filtrarGlossario);

    buscaGlossario.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && buscaGlossario.value) {
        evento.preventDefault();
        limparPesquisa();
      }
    });

    /* Atalho "/" leva ao campo de busca, como em bibliotecas digitais */
    document.addEventListener('keydown', function (evento) {
      if (evento.key !== '/' || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      var alvo = evento.target;
      var digitando = alvo && (
        alvo.tagName === 'INPUT' ||
        alvo.tagName === 'TEXTAREA' ||
        alvo.tagName === 'SELECT' ||
        alvo.isContentEditable
      );
      if (digitando) return;
      evento.preventDefault();
      buscaGlossario.focus();
      buscaGlossario.select();
    });

    /* Normaliza o estado inicial (contagem e botão limpar) */
    if (limparBusca) limparBusca.disabled = true;
    filtrarGlossario();
  }

  if (limparBusca) limparBusca.addEventListener('click', limparPesquisa);
  if (limparVazio) limparVazio.addEventListener('click', limparPesquisa);

  /* ------------------------------------------------------------
     7. QUIZ EDUCATIVO
     ------------------------------------------------------------ */
  var perguntasQuiz = [
    {
      categoria: 'HISTÓRIA E LITERATURA',
      pergunta: 'Qual escritora publicou o romance Úrsula em 1859?',
      opcoes: ['Carolina Maria de Jesus', 'Maria Firmina dos Reis', 'Lélia Gonzalez', 'Conceição Evaristo'],
      correta: 1,
      explicacao: 'Maria Firmina dos Reis publicou Úrsula em 1859. A obra é reconhecida como marco da literatura abolicionista brasileira.'
    },
    {
      categoria: 'DIREITOS E CIDADANIA',
      pergunta: 'O que caracteriza o racismo estrutural?',
      opcoes: ['Apenas ofensas individuais', 'Um conflito isolado entre pessoas', 'Desigualdades reproduzidas por estruturas e instituições', 'Uma diferença cultural sem efeitos sociais'],
      correta: 2,
      explicacao: 'O racismo estrutural se manifesta no funcionamento de instituições, práticas e relações sociais, reproduzindo desigualdades raciais.'
    },
    {
      categoria: 'POVOS ORIGINÁRIOS',
      pergunta: 'Qual afirmação respeita a diversidade dos povos indígenas?',
      opcoes: ['Todos possuem a mesma língua', 'São povos diversos, com línguas e histórias próprias', 'Vivem todos da mesma maneira', 'Pertencem a uma única cultura'],
      correta: 1,
      explicacao: 'Existem muitos povos indígenas, com diferentes línguas, organizações, territórios, histórias e modos de vida.'
    },
    {
      categoria: 'PENSAMENTO',
      pergunta: 'Quem é Ailton Krenak?',
      opcoes: ['Escritor e liderança indígena do povo Krenak', 'Compositor do século XIX', 'Primeiro presidente da ABL', 'Cientista português'],
      correta: 0,
      explicacao: 'Ailton Krenak é escritor, pensador e liderança indígena. Sua produção aborda direitos dos povos originários e relações com a natureza.'
    },
    {
      categoria: 'EDUCAÇÃO ANTIRRACISTA',
      pergunta: 'Qual é uma atitude antirracista no ambiente escolar?',
      opcoes: ['Ignorar relatos de discriminação', 'Tratar culturas como se fossem todas iguais', 'Evitar estudar a história africana', 'Rever práticas excludentes e valorizar diferentes referências'],
      correta: 3,
      explicacao: 'Uma educação antirracista identifica e enfrenta discriminações, revisa práticas e amplia a presença de histórias e conhecimentos diversos.'
    }
  ];

  var quizCaixa = document.getElementById('quiz-caixa');
  var quizPergunta = null;
  var quizCategoria = null;
  var quizOpcoes = null;
  var quizFeedback = null;
  var quizProximo = null;
  var quizProgresso = null;
  var quizPontosEl = null;
  var quizBarra = null;
  var quizBarraCaixa = null;
  var quizIndice = 0;
  var quizPontos = 0;
  var quizRespondido = false;
  var htmlInicialQuiz = quizCaixa ? quizCaixa.innerHTML : '';

  function letraOpcao(indice) {
    return 'ABCDEFGH'[indice] || String(indice + 1);
  }

  function atualizarProgresso() {
    var total = perguntasQuiz.length;
    var percentual = Math.round((quizIndice + 1) / total * 100);

    if (quizProgresso) quizProgresso.textContent = 'Pergunta ' + (quizIndice + 1) + ' de ' + total;
    if (quizPontosEl) quizPontosEl.textContent = quizPontos + (quizPontos === 1 ? ' ponto' : ' pontos');
    if (quizBarra) quizBarra.style.width = percentual + '%';
    if (quizBarraCaixa) quizBarraCaixa.setAttribute('aria-valuenow', String(percentual));
  }

  function renderizarPergunta(focar) {
    if (!quizCaixa || !quizPergunta || !quizOpcoes) return;

    var pergunta = perguntasQuiz[quizIndice];
    quizRespondido = false;

    if (quizCategoria) quizCategoria.textContent = pergunta.categoria;
    quizPergunta.textContent = pergunta.pergunta;

    atualizarProgresso();

    quizOpcoes.innerHTML = '';
    pergunta.opcoes.forEach(function (texto, indice) {
      var botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'quiz-opcao';

      var letra = document.createElement('span');
      letra.className = 'quiz-opcao__letra';
      letra.setAttribute('aria-hidden', 'true');
      letra.textContent = letraOpcao(indice);

      var rotulo = document.createElement('span');
      rotulo.className = 'quiz-opcao__texto';
      rotulo.textContent = texto;

      botao.appendChild(letra);
      botao.appendChild(rotulo);
      botao.addEventListener('click', function () { responderQuiz(indice); });
      quizOpcoes.appendChild(botao);
    });

    if (quizFeedback) {
      quizFeedback.hidden = true;
      quizFeedback.textContent = '';
    }

    if (quizProximo) {
      quizProximo.disabled = true;
      quizProximo.textContent = quizIndice === perguntasQuiz.length - 1
        ? 'Ver resultado →'
        : 'Próxima pergunta →';
    }

    if (focar) {
      quizPergunta.focus({ preventScroll: true });
    }
  }

  function responderQuiz(escolha) {
    if (quizRespondido || !quizCaixa) return;
    quizRespondido = true;

    var pergunta = perguntasQuiz[quizIndice];
    var acertou = escolha === pergunta.correta;
    if (acertou) quizPontos++;

    if (quizOpcoes) {
      lista('.quiz-opcao', quizOpcoes).forEach(function (botao, indice) {
        botao.disabled = true;
        if (indice === pergunta.correta) botao.classList.add('correta');
        else if (indice === escolha) botao.classList.add('incorreta');
      });
    }

    if (quizFeedback) {
      quizFeedback.innerHTML = '';
      var forte = document.createElement('strong');
      forte.textContent = acertou ? 'Resposta correta!' : 'Vamos aprender com essa questão.';
      quizFeedback.appendChild(forte);
      quizFeedback.appendChild(document.createTextNode(' ' + pergunta.explicacao));
      quizFeedback.hidden = false;
    }

    if (quizPontosEl) quizPontosEl.textContent = quizPontos + (quizPontos === 1 ? ' ponto' : ' pontos');
    if (quizProximo) quizProximo.disabled = false;
  }

  function finalizarQuiz() {
    if (!quizCaixa) return;

    var total = perguntasQuiz.length;
    var percentual = Math.round(quizPontos / total * 100);

    quizCaixa.innerHTML =
      '<div class="quiz-final">' +
        '<p class="quiz-categoria">JORNADA CONCLUÍDA</p>' +
        '<div class="quiz-final__anel" style="--pct:' + percentual + '">' +
          '<span class="quiz-final__miolo">' +
            '<span class="quiz-final__nota">' + quizPontos + '/' + total + '</span>' +
            '<span class="quiz-final__rotulo">acertos</span>' +
          '</span>' +
        '</div>' +
        '<h3 tabindex="-1">Seu resultado</h3>' +
        '<p>Você acertou ' + percentual + '% das perguntas. Continue explorando o acervo e revisite os conceitos do glossário.</p>' +
        '<button class="botao-quiz" id="quiz-reiniciar" type="button">Refazer quiz ↻</button>' +
      '</div>';

    var reiniciar = document.getElementById('quiz-reiniciar');
    if (reiniciar) {
      reiniciar.addEventListener('click', function () {
        quizCaixa.innerHTML = htmlInicialQuiz;
        iniciarQuiz();
      });
    }

    var tituloResultado = quizCaixa.querySelector('h3');
    if (tituloResultado) tituloResultado.focus({ preventScroll: true });
  }

  function avancarQuiz() {
    if (!quizRespondido) return;
    if (quizIndice < perguntasQuiz.length - 1) {
      quizIndice++;
      renderizarPergunta(true);
    } else {
      finalizarQuiz();
    }
  }

  function iniciarQuiz() {
    quizPergunta = document.getElementById('quiz-pergunta');
    quizCategoria = document.getElementById('quiz-categoria');
    quizOpcoes = document.getElementById('quiz-opcoes');
    quizFeedback = document.getElementById('quiz-feedback');
    quizProximo = document.getElementById('quiz-proximo');
    quizProgresso = document.getElementById('quiz-progresso');
    quizPontosEl = document.getElementById('quiz-pontos');
    quizBarra = document.getElementById('quiz-barra-progresso');
    quizBarraCaixa = document.getElementById('quiz-barra');

    quizIndice = 0;
    quizPontos = 0;

    if (quizProximo) {
      quizProximo.addEventListener('click', avancarQuiz);
    }

    renderizarPergunta(false);
  }

  iniciarQuiz();

  /* ------------------------------------------------------------
     8. REVELAÇÃO AO ROLAR E BRILHO DE PONTEIRO
     ------------------------------------------------------------ */
  var alvosRevelar = lista([
    '.secao-cabecalho',
    '.filtros',
    '.filtros__contagem',
    '.grade-cartoes > *',
    '.abas-cultura',
    '.painel-cultura',
    '.destaque-cultura',
    '.busca-rotulo',
    '.busca-glossario',
    '.resultado-busca',
    '.grade-glossario > *',
    '.quiz-caixa',
    '.navegacao-paginas',
    '.rodape__bloco'
  ].join(', '));

  if (!reduzirMovimento() && 'IntersectionObserver' in window) {
    alvosRevelar.forEach(function (alvo, indice) {
      alvo.classList.add('revelar');
      alvo.style.setProperty('--ordem', String(indice % 6));
    });

    var observadorRevelar = new IntersectionObserver(function (entradas, observador) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('is-visivel');
        observador.unobserve(entrada.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .1 });

    alvosRevelar.forEach(function (alvo) { observadorRevelar.observe(alvo); });
  } else {
    alvosRevelar.forEach(function (alvo) { alvo.classList.add('is-visivel'); });
  }

  if (TEM_PONTEIRO.matches && !reduzirMovimento()) {
    lista('.cartao-personagem, .verbete, .quiz-caixa').forEach(function (alvo) {
      var pendente = false;
      var ultimoEvento = null;

      alvo.addEventListener('pointermove', function (evento) {
        ultimoEvento = evento;
        if (pendente) return;
        pendente = true;

        window.requestAnimationFrame(function () {
          pendente = false;
          if (!ultimoEvento) return;
          var caixa = alvo.getBoundingClientRect();
          if (!caixa.width || !caixa.height) return;
          var x = (ultimoEvento.clientX - caixa.left) / caixa.width * 100;
          var y = (ultimoEvento.clientY - caixa.top) / caixa.height * 100;
          alvo.style.setProperty('--mx', x.toFixed(1) + '%');
          alvo.style.setProperty('--my', y.toFixed(1) + '%');
        });
      }, { passive: true });

      alvo.addEventListener('pointerleave', function () {
        ultimoEvento = null;
        alvo.style.removeProperty('--mx');
        alvo.style.removeProperty('--my');
      }, { passive: true });
    });
  }

  /* ------------------------------------------------------------
     9. UTILIDADES
     ------------------------------------------------------------ */
  /* Reavalia a preferência de movimento caso ela mude com a
     página aberta (ex.: usuário altera a configuração do sistema). */
  if (typeof SEM_MOVIMENTO.addEventListener === 'function') {
    SEM_MOVIMENTO.addEventListener('change', function (evento) {
      if (evento.matches) pararParalaxe();
    });
  }
})();
