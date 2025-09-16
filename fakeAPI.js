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
                nome: 'NÚCLEO DE PRIMEIRO ATENDIMENTO',
                tipoOrgao: 'NUCLEO'
            },
            {
                id: 2,
                nome: '5 Vara Civel de Campo Grande',
                tipoOrgao: 'Vara'
            },
            {
                id: 3,
                nome: '2 Vara Criminal de Bangu',
                tipoOrgao: 'NUSPEN'
            }
        ]);
    }
    if (!localStorage.getItem("usuarios")) {
        save("usuarios", [
            {
                id: 1,
                nome: "DPGE_DEFENSOR",
                matricula: 'DPGE_DEFENSOR',
                senha: 123456,
                tipoUsuario: 'ADM'
            },
            {
                id: 1,
                nome: "jorginho Capivara",
                matricula: '0001',
                senha: 123456,
                tipoUsuario: 'USUARIO'
            }
        ]);
    }
    if (!localStorage.getItem("usuarioOrgaos")) save("usuarioOrgaos", [
        {
            id: 1,
            fk_usuario: 1,
            fk_orgao: 1
        },
        {
            id: 2,
            fk_usuario: 1,
            fk_orgao: 2
        },
        {
            id: 3,
            fk_usuario: 1,
            fk_orgao: 3
        },
        {
            id: 4,
            fk_usuario: 2,
            fk_orgao: 2
        }
    ]);
    if (!localStorage.getItem("alertas")) save("alertas", []);
    if (!localStorage.getItem("alertaOrgaos")) save("alertaOrgaos", []);
    if (!localStorage.getItem("logsVisualizacao")) save("logsVisualizacao", []);
};


export const api = {

    async getTipoOrgao() { 
        let orgaos = load('orgaos');
        let tiposUnicos = [...new Set(orgaos.map(o => o.tipoOrgao))];

        return tiposUnicos;

    },

    async getAlerts({ status, inicio, fim } = {}) {
        let alerts = load("alertas");

        if (status && status !== "TODOS") {
            alerts = alerts.filter(a => a.status === status);
        }

        if (inicio && fim) {
            const ini = new Date(inicio);
            const fi = new Date(fim);
            alerts = alerts.filter(a => {
                const dt = new Date(a.dataCriacao);
                return dt >= ini && dt <= fi;
            });
        }

        return alerts.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
    },


    async createAlert({ titulo, descricao, tipoAlerta, horarioDisparo, instantaneo, vigenciaFim, orgaoIds, status }) {
        const alerts = load("alertas");
        const alerta = {
            id: crypto.randomUUID(),
            titulo,
            descricao,
            tipoAlerta,
            horarioDisparo: horarioDisparo ? new Date(horarioDisparo).toISOString() : null,
            instantaneo: !!instantaneo,
            vigenciaFim: vigenciaFim ? new Date(vigenciaFim).toISOString() : null,
            status,
            dataCriacao: new Date().toISOString(),
        };
        alerts.push(alerta);
        save("alertas", alerts);

        if (Array.isArray(orgaoIds)) {
            const alertaOrgaos = load("alertaOrgaos");
            orgaoIds.forEach(orgaoId => {
                alertaOrgaos.push({
                    id: Date.now() + Math.random(),
                    alertaId: alerta.id,
                    orgaoId,
                });
            });
            save("alertaOrgaos", alertaOrgaos);
        }

        return alerta;
    },

    async finalizarAlert(id) {
        const alerts = load("alertas");
        const alerta = alerts.find(a => a.id === id);
        if (!alerta) throw new Error("Alerta não encontrado");
        alerta.status = "FINALIZADO";
        save("alertas", alerts);
        return alerta;
    },


    async checkAlert(alertaId, usuarioId) {
        const logs = load("logsVisualizacao");
        let log = logs.find(l => l.usuarioId === usuarioId && l.alertaId === alertaId);

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

        return usuarios.map(u => ({
            ...u,
            usuarioOrgaos: usuarioOrgaos
                .filter(uo => uo.usuarioId === u.id)
                .map(uo => ({
                    ...uo,
                    orgao: orgaos.find(o => o.id === uo.orgaoId),
                })),
        }));
    },

    async login({ matricula, senha }) {
        const usuarios = load("usuarios");
        console.log('teste1: \n', matricula, '\n', senha);
        let usu = usuarios.find(u => u.matricula == matricula);
        console.log('teste2: \n', usu);
        if (usu && senha == usu.senha) {
            return usu;
        }
        else
            throw new Error("Usuario ou senha incorretos!");
    },

    async logout() {

        // localStorage.removeItem("orgaos");
        // localStorage.removeItem("usuarios");
        // localStorage.removeItem("usuarioOrgaos");
        // localStorage.removeItem("alertas");
        // localStorage.removeItem("alertaOrgaos");
        // localStorage.removeItem("logsVisualizacao");

        // Redirecionando para login
        window.location.href = "../login/login.html";
    }
};
