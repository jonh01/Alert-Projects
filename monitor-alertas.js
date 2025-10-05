import { api } from "./fakeAPI.js";
import { criaModalAlerta, criaToastAlerta } from "./utils.js";

const toast = (id) => new bootstrap.Toast(document.getElementById(id));

// Envolvemos nosso código em uma IIFE para não poluir o escopo global
(function () {
  let filaDeModais = [];
  let modalAtual = null;

  // --- Renderizar Modal ---
  function renderizarModal(alerta) {
    let modalEl = document.getElementById("alerta-modal-visu");

    // Se não existe ainda, cria e adiciona ao DOM
    if (!modalEl) {
      modalEl = criaModalAlerta(alerta);
      document.getElementById("alertas-container").appendChild(modalEl);
    } else {
      // Atualiza o conteúdo
      modalEl.querySelector(".modal-title").textContent = alerta.titulo;
      modalEl.querySelector(".modal-body").innerHTML = alerta.descricao;
    }

    // Busca o botão dentro do modal
    const btnCiente = modalEl.querySelector(".btn-ciente");

    if (btnCiente) {
      btnCiente.id = `btnCiente-${alerta.id}`;
      // Desabilita se já visualizado
      btnCiente.disabled = !!alerta.visualizado;
      btnCiente.onclick = () => {
        api
          .getUsuLogado()
          .then((res) => {
            api
              .checkAlert(alerta.id, res.id)
              .then(() => {
                const toastAberto = document.getElementById(
                  `alerta-${alerta.id}`
                );
                if (toastAberto) {
                  toastAberto.remove();
                }
                toast("toastOK").show();
                btnCiente.disabled = true;
                // Fecha o modal aqui
                const modalIn =
                  bootstrap.Modal.getInstance(modalEl) ||
                  new bootstrap.Modal(modalEl);
                modalIn.hide();
              })
              .catch((error) => {
                console.log(`erro no toast ${alerta.id}: `, error);
                toast("toastErro").show();
              });
          })
          .catch((error) => {
            api.logout().finally(() => {
              console.warn("deu erro: ", error);
              window.location.href = "../login/index.html";
            });
          });
      };
    }
    // Exibe o modal
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInstance.show();
    modalAtual = modalInstance;

    // Quando fechar, libera e chama próximo
    modalEl.addEventListener(
      "hidden.bs.modal",
      () => {
        modalEl.querySelectorAll("iframe").forEach((iframe) => {
          const src = iframe.src;
          iframe.src = "";
          iframe.src = src;
        });
        modalAtual = null;
        processarFilaDeModais();
      },
      { once: true }
    );
  }

  // --- Renderizar Toast ---
  function renderizarToast(alerta) {
    const toastEl = criaToastAlerta(alerta);

    // adiciona no container
    document.querySelector("#toast-container").appendChild(toastEl);

    // Aqui criamos o toast e desabilitamos o autohide
    const toastInstance = new bootstrap.Toast(toastEl, { autohide: false });

    // Quando clicar em "ler mais"
    toastEl.querySelector(".btn-primary").onclick = () =>
      (window.location.href = `/pages/meus-alertas/index.html?renderiza-modal=${alerta.id}`);

    // O X do toast ainda funciona normalmente
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());

    toastInstance.show();
  }

  // --- Gerenciar Fila de Modais ---
  function processarFilaDeModais() {
    if (modalAtual || filaDeModais.length === 0) return;
    const alerta = filaDeModais.shift();
    renderizarModal(alerta);
  }

  // --- Dispatcher ---
  function renderizarAlerta(alerta) {
    if (document.getElementById(`alerta-${alerta.id}`)) return; // evita duplicados

    const origem = document.referrer;

    if (alerta.tipoAlerta.toLowerCase() === "popup") renderizarToast(alerta);
    else if (alerta.tipoAlerta.toLowerCase() === "modal") {
      if (origem?.includes("/login/index.html")) {
        console.log("abriu modal");
        filaDeModais.push(alerta);
      }
    } else if (alerta.tipoAlerta.toLowerCase() === "ambos") {
      if (origem?.includes("/login/index.html")) {
        console.log("abriu modal ambos");
        filaDeModais.push(alerta);
      } else {
        renderizarToast(alerta);
      }
    }
  }

  // --- Buscar novos alertas ---
  async function verificarNovosAlertas() {
    const origem = document.referrer;
    try {
      await api.atualizaStatusProgramado();
      const alertas = await api.getAlertsParaUsuario();
      alertas.forEach(renderizarAlerta);

      if (origem?.includes("/login/index.html") && !sessionStorage.getItem("filaProcessada")) {
        processarFilaDeModais();
        sessionStorage.setItem("filaProcessada", "true");
      }
    } catch (error) {
      console.error("Erro ao buscar alertas:", error);
    }
  }

  // --- Verificar alertas futuros periodicamente ---
  function iniciarVerificacaoPeriodica() {
    setInterval(() => {
      verificarNovosAlertas(); // já filtra por dtDisparo e vigência
    }, 60 * 1000); // verifica a cada 60 segundos
  }

  // --- Ponto de entrada ---
  document.addEventListener("DOMContentLoaded", () => {
    verificarNovosAlertas(); // inicial
    iniciarVerificacaoPeriodica(); // verifica alertas futuros
  });
})();
