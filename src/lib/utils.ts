import { differenceInDays, subDays, startOfDay } from "date-fns";

export function calcularTituloAscend(xp: number): string {
  const titulos = [
    { xp: 0, nome: "Despertar I" },
    { xp: 250, nome: "Despertar II" },
    { xp: 500, nome: "Despertar III" },
    { xp: 1000, nome: "Persistente I" },
    { xp: 1750, nome: "Persistente II" },
    { xp: 2500, nome: "Persistente III" },
    { xp: 4000, nome: "Executor I" },
    { xp: 6000, nome: "Executor II" },
    { xp: 8500, nome: "Executor III" },
    { xp: 12000, nome: "Arquiteto I" },
    { xp: 16000, nome: "Arquiteto II" },
    { xp: 21000, nome: "Arquiteto III" },
    { xp: 30000, nome: "Estrategista I" },
    { xp: 40000, nome: "Estrategista II" },
    { xp: 50000, nome: "Estrategista III" },
    { xp: 65000, nome: "Visionário I" },
    { xp: 80000, nome: "Visionário II" },
    { xp: 100000, nome: "Visionário III" },
  ];

  let titulo = "Despertar I";
  for (const t of titulos) {
    if (xp >= t.xp) {
      titulo = t.nome;
    } else {
      break;
    }
  }
  return titulo;
}

export function calcularAvatarFrame(xp: number): string {
  const titulo = calcularTituloAscend(xp);
  if (titulo.startsWith("Visionário")) return "frame-visionario";
  if (titulo.startsWith("Estrategista")) return "frame-estrategista";
  if (titulo.startsWith("Arquiteto")) return "frame-arquiteto";
  if (titulo.startsWith("Executor")) return "frame-executor";
  if (titulo.startsWith("Persistente")) return "frame-persistente";
  return "frame-despertar";
}

export interface TitleProgression {
  titulo_atual: string;
  proximo_titulo: string;
  xp_atual: number;
  xp_proximo: number;
  xp_restante: number;
  progresso_proximo: number;
  grupos: Record<string, any[]>;
}

export function obterProgressaoTitulos(xp: number): TitleProgression {
  const titulos = [
    { xp: 0, nome: "Despertar I", categoria: "Despertar" },
    { xp: 250, nome: "Despertar II", categoria: "Despertar" },
    { xp: 500, nome: "Despertar III", categoria: "Despertar" },
    { xp: 1000, nome: "Persistente I", categoria: "Persistente" },
    { xp: 1750, nome: "Persistente II", categoria: "Persistente" },
    { xp: 2500, nome: "Persistente III", categoria: "Persistente" },
    { xp: 4000, nome: "Executor I", categoria: "Executor" },
    { xp: 6000, nome: "Executor II", categoria: "Executor" },
    { xp: 8500, nome: "Executor III", categoria: "Executor" },
    { xp: 12000, nome: "Arquiteto I", categoria: "Arquiteto" },
    { xp: 16000, nome: "Arquiteto II", categoria: "Arquiteto" },
    { xp: 21000, nome: "Arquiteto III", categoria: "Arquiteto" },
    { xp: 30000, nome: "Estrategista I", categoria: "Estrategista" },
    { xp: 40000, nome: "Estrategista II", categoria: "Estrategista" },
    { xp: 50000, nome: "Estrategista III", categoria: "Estrategista" },
    { xp: 65000, nome: "Visionário I", categoria: "Visionário" },
    { xp: 80000, nome: "Visionário II", categoria: "Visionário" },
    { xp: 100000, nome: "Visionário III", categoria: "Visionário" },
  ];

  let titulo_atual = titulos[0];
  let proximo_titulo: typeof titulos[0] | null = null;

  for (let i = 0; i < titulos.length; i++) {
    const t = titulos[i];
    if (xp >= t.xp) {
      titulo_atual = t;
      if (i + 1 < titulos.length) {
        proximo_titulo = titulos[i + 1];
      }
    } else {
      break;
    }
  }

  let progresso_proximo = 100;
  let xp_restante = 0;

  if (proximo_titulo) {
    const xp_base = titulo_atual.xp;
    const xp_proximo = proximo_titulo.xp;
    const xp_intervalo = xp_proximo - xp_base;
    const xp_no_intervalo = xp - xp_base;

    progresso_proximo = Math.min(100, Math.round((xp_no_intervalo / xp_intervalo) * 100));
    xp_restante = xp_proximo - xp;
  }

  const grupos: Record<string, any[]> = {};
  for (const t of titulos) {
    if (!grupos[t.categoria]) {
      grupos[t.categoria] = [];
    }
    const existente = grupos[t.categoria].some((item) => item.nome === t.nome);
    if (!existente) {
      grupos[t.categoria].push({
        nome: t.nome,
        xp_minimo: t.xp,
        desbloqueado: xp >= t.xp,
        atual: t.nome === titulo_atual.nome,
      });
    }
  }

  return {
    titulo_atual: titulo_atual.nome,
    proximo_titulo: proximo_titulo ? proximo_titulo.nome : "Título máximo",
    xp_atual: xp,
    xp_proximo: proximo_titulo ? proximo_titulo.xp : xp,
    xp_restante,
    progresso_proximo,
    grupos,
  };
}

export interface DomainAscension {
  nome: string;
  icone: string;
  progresso: number;
  titulo: string;
  proximo_titulo: string;
  progresso_restante: number | null;
  marcos: any[];
}

export function obterDominiosAscensao(metas: any[]): DomainAscension[] {
  const categorias: Record<string, { icone: string; titulos: [number, string][] }> = {
    Carreira: {
      icone: "bi-briefcase",
      titulos: [
        [0, "Estagiário I"],
        [10, "Estagiário II"],
        [20, "Aprendiz I"],
        [30, "Aprendiz II"],
        [40, "Assistente I"],
        [50, "Profissional I"],
        [60, "Profissional II"],
        [70, "Especialista I"],
        [80, "Especialista II"],
        [90, "Referência I"],
        [100, "Líder Lendário"],
      ],
    },
    Estudos: {
      icone: "bi-book",
      titulos: [
        [0, "Curioso I"],
        [10, "Iniciado I"],
        [20, "Iniciado II"],
        [30, "Estudioso I"],
        [40, "Estudioso II"],
        [50, "Disciplinado I"],
        [60, "Disciplinado II"],
        [70, "Acadêmico I"],
        [80, "Acadêmico II"],
        [90, "Mestre I"],
        [100, "Sábio Supremo"],
      ],
    },
    Saúde: {
      icone: "bi-heart-pulse",
      titulos: [
        [0, "Base I"],
        [10, "Base II"],
        [20, "Iniciante I"],
        [30, "Iniciante II"],
        [40, "Constante I"],
        [50, "Constante II"],
        [60, "Forte I"],
        [70, "Forte II"],
        [80, "Atleta I"],
        [90, "Titã I"],
        [100, "Divindade Física"],
      ],
    },
    Projetos: {
      icone: "bi-lightbulb",
      titulos: [
        [0, "Sonhador I"],
        [10, "Sonhador II"],
        [20, "Criador I"],
        [30, "Criador II"],
        [40, "Desenvolvedor I"],
        [50, "Construtor I"],
        [60, "Construtor II"],
        [70, "Arquiteto I"],
        [80, "Arquiteto II"],
        [90, "Fundador I"],
        [100, "Pioneiro Visionário"],
      ],
    },
    Finanças: {
      icone: "bi-cash-stack",
      titulos: [
        [0, "Poupador I"],
        [10, "Organizado I"],
        [20, "Organizado II"],
        [30, "Controlador I"],
        [40, "Controlador II"],
        [50, "Acumulador I"],
        [60, "Investidor I"],
        [70, "Investidor II"],
        [80, "Próspero I"],
        [90, "Patrimônio I"],
        [100, "Magnata Financeiro"],
      ],
    },
    Pessoal: {
      icone: "bi-person",
      titulos: [
        [0, "Observador I"],
        [10, "Autoconhecimento I"],
        [20, "Autoconhecimento II"],
        [30, "Equilíbrio I"],
        [40, "Equilíbrio II"],
        [50, "Focado I"],
        [60, "Domínio I"],
        [70, "Domínio II"],
        [80, "Evoluído I"],
        [90, "Legado I"],
        [100, "Iluminado"],
      ],
    },
  };

  const dominios: DomainAscension[] = [];

  for (const [categoria, config] of Object.entries(categorias)) {
    const metasCategoria = metas.filter((m) => m.categoria === categoria);
    let progresso = 0;

    if (metasCategoria.length > 0) {
      progresso = parseFloat(
        (metasCategoria.reduce((acc, m) => acc + (m.progresso || 0), 0) / metasCategoria.length).toFixed(1)
      );
    }

    let titulo_atual = config.titulos[0][1];
    let proximo_titulo_nome = "Título máximo";
    let percentual_proximo: number | null = null;

    for (const [percentual, titulo] of config.titulos) {
      if (progresso >= percentual) {
        titulo_atual = titulo;
      } else {
        proximo_titulo_nome = titulo;
        percentual_proximo = percentual;
        break;
      }
    }

    let progresso_restante: number | null = null;
    if (percentual_proximo !== null) {
      progresso_restante = parseFloat(Math.max(0, percentual_proximo - progresso).toFixed(1));
    }

    const marcos = config.titulos.map(([percentual, titulo]) => ({
      titulo,
      percentual,
      desbloqueado: progresso >= percentual,
      atual: titulo === titulo_atual,
    }));

    dominios.push({
      nome: categoria,
      icone: config.icone,
      progresso,
      titulo: titulo_atual,
      proximo_titulo: proximo_titulo_nome,
      progresso_restante,
      marcos,
    });
  }

  return dominios;
}

export function calcularClasseEvolucao(metas: any[]) {
  const dominios = obterDominiosAscensao(metas);

  if (dominios.length === 0) {
    return {
      classe: "Iniciado",
      subtitulo: "Primeiros Passos",
      icone: "bi-stars",
      descricao: "Sua jornada está apenas começando.",
      dominio: "Geral",
      tema: "iniciado",
    };
  }

  const dominio_principal = dominios.reduce((prev, current) =>
    prev.progresso > current.progresso ? prev : current
  );

  const classes: Record<string, any> = {
    Estudos: {
      classe: "Acadêmico",
      subtitulo: "Mestre do Saber",
      icone: "bi-mortarboard-fill",
      descricao: "Sua evolução está focada em aprendizado, conhecimento e domínio intelectual.",
      dominio: "Estudos",
      tema: "academico",
    },
    Carreira: {
      classe: "Profissional",
      subtitulo: "Executor de Valor",
      icone: "bi-briefcase-fill",
      descricao: "Sua energia está direcionada ao crescimento profissional.",
      dominio: "Carreira",
      tema: "profissional",
    },
    Saúde: {
      classe: "Atleta",
      subtitulo: "Força e Constância",
      icone: "bi-heart-pulse-fill",
      descricao: "Disciplina física, vitalidade e performance definem sua evolução.",
      dominio: "Saúde",
      tema: "atleta",
    },
    Projetos: {
      classe: "Construtor",
      subtitulo: "Criador de Estruturas",
      icone: "bi-tools",
      descricao: "Você transforma ideias em resultados concretos.",
      dominio: "Projetos",
      tema: "construtor",
    },
    Finanças: {
      classe: "Estrategista",
      subtitulo: "Mente Patrimonial",
      icone: "bi-bank",
      descricao: "Seu foco está na construção de patrimônio e autonomia.",
      dominio: "Finanças",
      tema: "estrategista",
    },
    Pessoal: {
      classe: "Interior",
      subtitulo: "Domínio de Si",
      icone: "bi-person-badge-fill",
      descricao: "Autoconhecimento e desenvolvimento pessoal conduzem sua jornada.",
      dominio: "Pessoal",
      tema: "interior",
    },
  };

  return (
    classes[dominio_principal.nome] || {
      classe: "Ascendente",
      subtitulo: "Evolução Equilibrada",
      icone: "bi-stars",
      descricao: "Você evolui de forma equilibrada entre diferentes áreas da vida.",
      dominio: dominio_principal.nome,
      tema: "ascendente",
    }
  );
}

export interface HeatmapItem {
  data: string;
  ativo: boolean;
  hoje: boolean;
}

export function gerarHeatmapConsistencia(events: any[], dias = 35): HeatmapItem[] {
  const hoje = startOfDay(new Date());
  
  const diasAtivos = new Set(
    events
      .filter((e) => e.criado_em)
      .map((e) => startOfDay(new Date(e.criado_em)).toDateString())
  );

  const heatmap: HeatmapItem[] = [];

  for (let i = 0; i < dias; i++) {
    const dataRef = subDays(hoje, dias - 1 - i);
    const dateStr = dataRef.toDateString();
    
    // Formatar data como YYYY-MM-DD
    const yyyy = dataRef.getFullYear();
    const mm = String(dataRef.getMonth() + 1).padStart(2, "0");
    const dd = String(dataRef.getDate()).padStart(2, "0");
    
    heatmap.push({
      data: `${yyyy}-${mm}-${dd}`,
      ativo: diasAtivos.has(dateStr),
      hoje: dateStr === hoje.toDateString(),
    });
  }

  return heatmap;
}
