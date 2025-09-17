import { api } from "./fakeAPI.js";

// Envolvemos nosso código em uma IIFE para não poluir o escopo global
(function () {
  const alertasContainer = document.getElementById("alertas-container"); // Para modais
  const toastContainer = document.querySelector(".toast-container"); // Para popups

  let filaDeModais = [];
  let modalAtual = null;

  // --- Função para marcar alerta como lido ---
  async function handleCheckAlert(alertaId, instance) {
    try {
      const usuario = await api.getUsuLogado();
      await api.checkAlert(alertaId, usuario.id);
      if (instance) instance.hide();
      localStorage.setItem(`alerta_shown_${alertaId}`, "1"); // marca como exibido
    } catch (error) {
      console.error("Erro ao marcar alerta:", error);
      if (instance) instance.hide();
    }
  }

  // --- Renderizar Modal ---
  function renderizarModal(alerta) {
    const modalEl = document.createElement("div");
    modalEl.className = "modal fade";
    modalEl.id = `alerta-${alerta.id}`;
    modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${alerta.titulo}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            <p>${alerta.descricao}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary btn-ciente">Ciente</button>
          </div>
        </div>
      </div>`;
    alertasContainer.appendChild(modalEl);

    const modalInstance = new bootstrap.Modal(modalEl);
    modalEl.querySelector(".btn-ciente").onclick = () =>
      handleCheckAlert(alerta.id, modalInstance);

    modalEl.addEventListener("hidden.bs.modal", () => {
      modalEl.remove();
      modalAtual = null;
      processarFilaDeModais(); // chama o próximo da fila
    });

    modalInstance.show();
    modalAtual = modalInstance;
  }

  // --- Renderizar Toast ---
  function renderizarToast(alerta) {
    const toastEl = document.createElement("div");
    toastEl.className = "toast";
    toastEl.id = `alerta-${alerta.id}`;
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "polite");
    toastEl.innerHTML = `
      <div class="toast-header">
        <strong class="me-auto">${alerta.titulo}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Fechar"></button>
      </div>
      <div class="toast-body">
        ${alerta.descricao}
        <div class="mt-2 pt-2 border-top">
          <button type="button" class="btn btn-primary btn-sm btn-ciente">Ciente</button>
        </div>
      </div>`;
    toastContainer.appendChild(toastEl);

    // Aqui criamos o toast e desabilitamos o autohide
    const toastInstance = new bootstrap.Toast(toastEl, { autohide: false });

    // Quando clicar em "Ciente", marca como lido e fecha
    toastEl.querySelector(".btn-ciente").onclick = () =>
      handleCheckAlert(alerta.id, toastInstance);

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
    if (localStorage.getItem(`alerta_shown_${alerta.id}`)) return; // já mostrado

    if (alerta.tipoAlerta.toLowerCase() === "modal") {
      filaDeModais.push(alerta);
      processarFilaDeModais();
    } else {
      renderizarToast(alerta);
    }
  }

  // --- Buscar novos alertas ---
  async function verificarNovosAlertas() {
    try {
      const alertas = await api.getAlertsParaUsuario();
      alertas.forEach(renderizarAlerta);
    } catch (error) {
      console.error("Erro ao buscar alertas:", error);
    }
  }

  // --- Ouvir storage (SSE fake) ---
  function handleStorageChange(event) {
    if (event.key === "__sse_new_alert_event__" && event.newValue) {
      verificarNovosAlertas();
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
    window.addEventListener("storage", handleStorageChange); // SSE fake
    iniciarVerificacaoPeriodica(); // verifica alertas futuros
  });
})();
