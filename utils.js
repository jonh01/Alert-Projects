export const dataFormatada = (data) =>
  new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const dataFormatadaInput = (dataUTC) => {
  // Converte para objeto Date
  const dateObj = new Date(dataUTC);

  // Formata para YYYY-MM-DDTHH:MM no horário local
  const localISO = dateObj.toISOString().slice(0, 16); // ainda está em UTC

  // Ajusta para horário local corretamente
  const pad = (n) => String(n).padStart(2, "0");
  const localValue = `${dateObj.getFullYear()}-${pad(
    dateObj.getMonth() + 1
  )}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(
    dateObj.getMinutes()
  )}`;

  return localValue;
};

export const limitarPalavras = (texto, maxPalavras) => {
  if (!texto) return ""; // 🔑 protege contra null/undefined
  const palavras = texto.split(" "); // divide em palavras
  if (palavras.length <= maxPalavras) {
    return texto; // se menor ou igual, retorna tudo
  }
  return palavras.slice(0, maxPalavras).join(" ") + "..."; // senão, corta e adiciona "..."
};

export const criaModalAlerta = (alerta) => {
  const modalEl = document.createElement("div");
  modalEl.className = "modal";
  modalEl.id = `alerta-modal-visu`;
  modalEl.tabIndex = -1; // boa prática para acessibilidade
  modalEl.ariaHidden = true;
  modalEl.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${alerta.titulo}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body" style="white-space: pre-wrap;">
            <p>${alerta.descricao}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-success btn-ciente" id="btnCiente-${alerta.id}">Ciente</button>
          </div>
        </div>
      </div>`;

  return modalEl;
};
