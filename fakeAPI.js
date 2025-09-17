function load(key, fallback = []) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback; // senão, retorna vetor vazio
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Inicialização do banco simulado
export function initDB() {
  if (!localStorage.getItem("orgaos")) {
    save("orgaos", [
      {
        id: 1,
        nome: "NÚCLEO DE PRIMEIRO ATENDIMENTO",
        tipoOrgao: "NUCLEO",
      },
      {
        id: 2,
        nome: "5 Vara Civel de Campo Grande",
        tipoOrgao: "VARA",
      },
      {
        id: 3,
        nome: "2 Vara Criminal de Bangu",
        tipoOrgao: "NUSPEN",
      },
    ]);
  }
  if (!localStorage.getItem("usuarios")) {
    save("usuarios", [
      {
        id: 1,
        nome: "DPGE_DEFENSOR",
        matricula: "DPGE_DEFENSOR",
        senha: 123456,
        tipoUsuario: "ADM",
      },
      {
        id: 2,
        nome: "jorginho Capivara",
        matricula: "0001",
        senha: 123456,
        tipoUsuario: "USUARIO",
      },
    ]);
  }
  if (!localStorage.getItem("usuarioOrgaos"))
    save("usuarioOrgaos", [
      {
        id: 1,
        fk_usuario: 1,
        fk_orgao: 1,
      },
      {
        id: 2,
        fk_usuario: 1,
        fk_orgao: 2,
      },
      {
        id: 3,
        fk_usuario: 1,
        fk_orgao: 3,
      },
      {
        id: 4,
        fk_usuario: 2,
        fk_orgao: 2,
      },
    ]);
  if (!localStorage.getItem("alertas")) save("alertas", []);
  if (!localStorage.getItem("alertaTipoOrgao")) save("alertaTipoOrgao", []);
  if (!localStorage.getItem("logsVisualizacao")) save("logsVisualizacao", []);
}

export const api = {
  async getUsuLogado() {
    const res = localStorage.getItem("usuarioLogado");
    const usu = res ? JSON.parse(res) : null;

    if (usu) return usu;
    else throw new Error("Nenhum usuário logado!");
  },

  async getTipoOrgao() {
    let orgaos = load("orgaos");
    let tiposUnicos = [...new Set(orgaos.map((o) => o.tipoOrgao))];

    return tiposUnicos;
  },

  async getAlerts({ status, inicio, fim, tipoOrgao } = {}) {
    let alerts = load("alertas");
    const alertaTipoOrgao = load("alertaTipoOrgao");

    // filtro por status
    if (status && status !== "TODOS") {
      alerts = alerts.filter((a) => a.status === status);
    }

    // filtro por intervalo de datas
    if (inicio && fim) {
      const ini = new Date(inicio);
      const fi = new Date(fim);
      alerts = alerts.filter((a) => {
        const dt = new Date(a.dataCriacao);
        return dt >= ini && dt <= fi;
      });
    }

    // filtro por órgão (se passado)
    if (tipoOrgao && tipoOrgao !== "TODOS") {
      // garante que sempre trabalha com array
      const tipos = Array.isArray(tipoOrgao) ? tipoOrgao : [tipoOrgao];

      alerts = alerts.filter((a) => {
        const rels = alertaTipoOrgao.filter((rel) => rel.alertaId === a.id);
        return rels.some((rel) => tipos.includes(rel.tipoOrgao));
      });
    }

    // enriquecer cada alerta com os órgãos relacionados
    const enriched = alerts.map((a) => {
      const relacionados = alertaTipoOrgao
        .filter((o) => o.alertaId === a.id)
        .map((o) => o.tipoOrgao);
      return {
        ...a,
        alertasOrgaos: relacionados.length ? relacionados : [],
      };
    });

    // ordenar por data
    return enriched.sort(
      (a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao)
    );
  },

  async getAlertsParaUsuario() {
    const usuarioLogado = await this.getUsuLogado();
    if (!usuarioLogado) return [];

    const tiposOrgaoDoUsuario = usuarioLogado.usuarioOrgaos.map(
      (uo) => uo.orgao.tipoOrgao
    );

    const todosAlertas = load("alertas");
    const alertasTipoOrgao = load("alertaTipoOrgao");
    const logsVisualizacao = load("logsVisualizacao");

    const idsAlertasVistos = logsVisualizacao
      .filter((log) => log.usuarioId === usuarioLogado.id)
      .map((log) => log.alertaId);

    const alertasNaoVistos = todosAlertas.filter(
      (alerta) => !idsAlertasVistos.includes(alerta.id)
    );

    const agora = new Date();
    const alertasFiltrados = alertasNaoVistos.filter((alerta) => {
      if (alerta.status !== "VIGENTE") return false;
      const fimVigencia = alerta.vigenciaFim
        ? new Date(alerta.vigenciaFim)
        : null;
      if (fimVigencia && fimVigencia < agora) return false;
      const inicioDisparo = alerta.dtDisparo
        ? new Date(alerta.dtDisparo)
        : null;
      if (inicioDisparo && inicioDisparo > agora) return false;

      const tiposOrgaoDoAlerta = alertasTipoOrgao
        .filter((ato) => ato.alertaId === alerta.id)
        .map((ato) => ato.tipoOrgao);

      if (tiposOrgaoDoAlerta.length === 0) return true;
      return tiposOrgaoDoAlerta.some((tipo) =>
        tiposOrgaoDoUsuario.includes(tipo)
      );
    });

    return alertasFiltrados;
  },

  async createAlert({
    titulo,
    descricao,
    tipoAlerta,
    dtDisparo,
    instantaneo,
    vigenciaFim,
    tipoOrgao,
    status,
    fk_usuario_criador,
  }) {
    const alerts = load("alertas");
    const alerta = {
      id: crypto.randomUUID(),
      titulo,
      descricao,
      tipoAlerta,
      dtDisparo: dtDisparo ? new Date(dtDisparo).toISOString() : null,
      instantaneo: !!instantaneo,
      vigenciaFim: vigenciaFim ? new Date(vigenciaFim).toISOString() : null,
      status,
      dataCriacao: new Date().toISOString(),
      fk_usuario_criador,
    };
    alerts.push(alerta);
    save("alertas", alerts);

    let alerO = [];

    if (Array.isArray(tipoOrgao)) {
      const alertaTipoOrgao = load("alertaTipoOrgao");
      tipoOrgao.forEach((tpO) => {
        alerO.push(tpO);
        alertaTipoOrgao.push({
          id: crypto.randomUUID(),
          alertaId: alerta.id,
          tipoOrgao: tpO,
        });
      });
      save("alertaTipoOrgao", alertaTipoOrgao);
    }

    // LINHA ADICIONADA PARA O SSE SIMULADO
    localStorage.setItem(
        "__sse_new_alert_event__",
        JSON.stringify({
            id: crypto.randomUUID(),
            idAlerta: alerta.id,
            timestamp: Date.now(),
        })
    );

    return { ...alerta, alertasOrgaos: alerO };
  },

  async finalizarAlert(id) {
    const alerts = load("alertas");
    const alerta = alerts.find((a) => a.id === id);
    if (!alerta) throw new Error("Alerta não encontrado");
    alerta.status = "FINALIZADO";
    save("alertas", alerts);
    return alerta;
  },

  async checkAlert(alertaId, usuarioId) {
    const logs = load("logsVisualizacao");
    let log = logs.find(
      (l) => l.usuarioId === usuarioId && l.alertaId === alertaId
    );

    if (!log) {
      log = {
        id: crypto.randomUUID(),
        usuarioId,
        alertaId,
        dataVisualizacao: new Date().toISOString(),
      };
      logs.push(log);
      save("logsVisualizacao", logs);
      return log;
    } else {
      throw new Error("Confirmação já realizada!");
    }
  },

  /* GET /users */
  async getUsers() {
    const usuarios = load("usuarios");
    const usuarioOrgaos = load("usuarioOrgaos");
    const orgaos = load("orgaos");

    return usuarios.map((u) => ({
      ...u,
      usuarioOrgaos: usuarioOrgaos
        .filter((uo) => uo.fk_usuario === u.id)
        .map((uo) => ({
          ...uo,
          orgao: orgaos.find((o) => o.id === uo.fk_orgao),
        })),
    }));
  },

  async login({ matricula, senha }) {
    const usuarios = load("usuarios");
    const usuarioOrgaos = load("usuarioOrgaos");
    const orgaos = load("orgaos");

    let usu = usuarios.find((u) => u.matricula == matricula);

    if (usu && senha == usu.senha) {
      const usuCompleto = {
        ...usu,
        usuarioOrgaos: usuarioOrgaos
          .filter((uo) => uo.fk_usuario === usu.id)
          .map((uo) => ({
            ...uo,
            orgao: orgaos.find((o) => o.id === uo.fk_orgao),
          })),
      };

      save("usuarioLogado", usuCompleto);
      return usuCompleto;
    } else throw new Error("Usuario ou senha incorretos!");
  },

  async logout() {
    // localStorage.removeItem("orgaos");
    // localStorage.removeItem("usuarios");
    localStorage.removeItem("usuarioLogado");
    // localStorage.removeItem("usuarioOrgaos");
    // localStorage.removeItem("alertas");
    // localStorage.removeItem("alertaTipoOrgao");
    // localStorage.removeItem("logsVisualizacao");
  },
};
