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
      {
        id:3,
        nome: "Rodrigol",
        matricula: "0002",
        senha: "123456",
        tipoUsuario: "USUARIO"
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
            {
        id: 5,
        fk_usuario: 3,
        fk_orgao: 3,
      },
      {
        id: 6,
        fk_usuario: 3,
        fk_orgao: 1,
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

  async getUsuTipoOrgao() {
    const usuarioLogado = await this.getUsuLogado();
    if (!usuarioLogado) return [];

    const tiposOrgaoDoUsuario = [
      ...new Set(usuarioLogado.usuarioOrgaos.map((uo) => uo.orgao.tipoOrgao)),
    ];

    return tiposOrgaoDoUsuario;
  },

  async getAlerts({ status, inicio, fim, tipoOrgao } = {}) {
    let alerts = load("alertas");
    const alertaTipoOrgao = load("alertaTipoOrgao");
    const usuarios = load("usuarios")

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
      const usu = usuarios.filter((u) => u.id === a.fk_usuario_criador).map((u) => u.nome);

      return {
        ...a,
        nome_usuario_criador: usu.toString(),
        alertasOrgaos: relacionados.length ? relacionados : [],
      };
    });

    // Define a ordem desejada
    const ordemStatus = {
      EM_ELABORACAO: 1,
      PROGRAMADO_PARA_ENVIO: 2,
      VIGENTE: 3,
      FINALIZADO: 4,
    };

    return enriched.sort((a, b) => {
      // 1º: compara pelo status
      const diffStatus = ordemStatus[a.status] - ordemStatus[b.status];
      if (diffStatus !== 0) return diffStatus;

      // 2º: se status for igual, compara pela data (mais recente primeiro)
      return new Date(b.dataCriacao) - new Date(a.dataCriacao);
    });
  },

  async getAlertsUsuario({ status, inicio, fim, tipoOrgao } = {}) {
    const usuarioLogado = await this.getUsuLogado();
    if (!usuarioLogado) return [];

    let alerts = load("alertas");
    const alertaTipoOrgao = load("alertaTipoOrgao");
    const logsVisualizacao = load("logsVisualizacao");

    // filtro por status
    if (status && status !== "TODOS") {
      alerts = alerts.filter(
        (a) => a.status === status && a.status !== "EM_ELABORACAO"
      );
    } else {
      alerts = alerts.filter((a) => a.status !== "EM_ELABORACAO");
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
    if (tipoOrgao) {
      let tipos = [];

      if (tipoOrgao === "TODOS") {
        tipos = await this.getUsuTipoOrgao();
        tipos.push("TODOS");
      } else {
        tipos = Array.isArray(tipoOrgao) ? tipoOrgao : [tipoOrgao];
      }

      alerts = alerts.filter((a) => {
        const rels = alertaTipoOrgao.filter((rel) => rel.alertaId === a.id);
        return rels.some((rel) => tipos.includes(rel.tipoOrgao));
      });
    }

    // enriquecer cada alerta com os órgãos relacionados
    alerts = alerts.map((a) => {
      const relacionados = alertaTipoOrgao
        .filter((o) => o.alertaId === a.id)
        .map((o) => o.tipoOrgao);
      return {
        ...a,
        alertasOrgaos: relacionados.length ? relacionados : [],
      };
    });

    alerts = alerts.map((a) => {
      const visualizado = logsVisualizacao.some(
        (lv) => lv.alertaId === a.id && lv.usuarioId === usuarioLogado.id
      );

      return {
        ...a,
        visualizado,
      };
    });

    // Define a ordem desejada
    const ordemStatus = {
      VIGENTE: 1,
      FINALIZADO: 2,
    };

    return alerts.sort((a, b) => {
      // 1º: compara pelo status
      const diffStatus = ordemStatus[a.status] - ordemStatus[b.status];
      if (diffStatus !== 0) return diffStatus;

      // 2º: se status for igual, compara pela data (mais recente primeiro)
      return new Date(b.dataCriacao) - new Date(a.dataCriacao);
    });
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
    id,
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
    const usuarios = load("usuarios");

    let alertaExistente = null;
    if (id) {
      alertaExistente = alerts.find((a) => a.id === id);

      if(alertaExistente.status === 'VIGENTE' || alertaExistente.status === 'FIALIZADO'){
        throw new Error("Alerta não pode ser alterado!");
      }
    }

    const alerta = {
      id: id || crypto.randomUUID(),
      titulo,
      descricao,
      tipoAlerta,
      dtDisparo: dtDisparo ? new Date(dtDisparo).toISOString() : null,
      instantaneo: !!instantaneo,
      vigenciaFim: vigenciaFim ? new Date(vigenciaFim).toISOString() : null,
      status,
      // mantém a data original se já existia, senão cria nova
      dataCriacao: alertaExistente
        ? alertaExistente.dataCriacao
        : new Date().toISOString(),
      fk_usuario_criador,
    };

    let alerO = [];

    if (alertaExistente) {
      // ---- UPDATE ----
      const index = alerts.findIndex((a) => a.id === id);
      alerts[index] = alerta;
    } else {
      // ---- INSERT ----
      alerts.push(alerta);
    }

    save("alertas", alerts);

    // ---- Relacionamento com tipos de órgãos ----
    if (Array.isArray(tipoOrgao)) {
      const alertaTipoOrgao = load("alertaTipoOrgao");

      // Remove vínculos antigos se for update
      const novos = alertaTipoOrgao.filter((ato) => ato.alertaId !== alerta.id);

      tipoOrgao.forEach((tpO) => {
        alerO.push(tpO);
        novos.push({
          id: crypto.randomUUID(),
          alertaId: alerta.id,
          tipoOrgao: tpO,
        });
      });

      save("alertaTipoOrgao", novos);
    }

    // LINHA ADICIONADA PARA O SSE SIMULADO
    // localStorage.setItem(
    //   "__sse_new_alert_event__",
    //   JSON.stringify({
    //     id: crypto.randomUUID(),
    //     idAlerta: alerta.id,
    //     timestamp: Date.now(),
    //   })
    // );

    const usu = usuarios.filter((u) => u.id === alerta.fk_usuario_criador).map((u) => u.nome);

    return { ...alerta, nome_usuario_criador: usu.toString(), alertasOrgaos: alerO };
  },

  async deleteAlert(id) {
    let alerts = load("alertas");
    alerts = alerts.filter((a) => a.id !== id);
    save("alertas", alerts);

    let alertaTipoOrgao = load("alertaTipoOrgao");
    alertaTipoOrgao = alertaTipoOrgao.filter((rel) => rel.alertaId !== id);
    save("alertaTipoOrgao", alertaTipoOrgao);

    return true;
  },

  async alterarAlert(id, newStatus) {
    const alerts = load("alertas");
    const alertaTipoOrgao = load("alertaTipoOrgao");
    const alerta = alerts.find((a) => a.id === id);

    if (!alerta) throw new Error("Alerta não encontrado");
    alerta.status = newStatus;
    save("alertas", alerts);

    const alerO = [
      ...new Set(
        alertaTipoOrgao
          .filter((ato) => ato.alertaId === alerta.id)
          .map((ato) => ato.tipoOrgao)
      ),
    ];

    console.log(`teste`, alerO[0]);

    return { ...alerta, alertasOrgaos: alerO };
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
