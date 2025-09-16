// utilitários bootstrap
const toast = (id) => new bootstrap.Toast(document.getElementById(id));

// evento para o tooltip
document.addEventListener("DOMContentLoaded", function () {
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map((el) => new bootstrap.Tooltip(el));
});

// abrir modal pelo botão da página
document
  .getElementById("btnNovoAlerta")
  .addEventListener("click", () =>
    bootstrap.Modal.getOrCreateInstance("#modalCriarAlerta").show()
  );

// filtros básicos (somente protótipo)
document.getElementById("formFiltros").addEventListener("submit", (e) => {
  e.preventDefault();
  // no protótipo não há backend; apenas feedback visual
  document.getElementById("tabelaAlertas").classList.add("table-striped");
  setTimeout(
    () =>
      document
        .getElementById("tabelaAlertas")
        .classList.remove("table-striped"),
    800
  );
});
document.getElementById("btnLimparFiltros").addEventListener("click", () => {
  document.getElementById("formFiltros").reset();
});

// --------- TIPO DE ALERTA: controla vigência -----------
const radiosTipo = document.querySelectorAll('input[name="aTipo"]');
const inputVigencia = document.getElementById("aVigencia");

function updateVigenciaState() {
  const tipo = document.querySelector('input[name="aTipo"]:checked')?.value;
  const habilita = tipo === "modal" || tipo === "ambos";
  inputVigencia.disabled = !habilita;
  if (!habilita) {
    inputVigencia.value = "";
  }
}
radiosTipo.forEach((r) => r.addEventListener("change", updateVigenciaState));
updateVigenciaState();

// --------- INSTANTÂNEO x DATA (excludentes) ------------
const chkInstant = document.getElementById("aInstantaneo");
const inputData = document.getElementById("aData");
function syncDisparo() {
  if (chkInstant.checked) {
    inputData.value = "";
    inputData.disabled = true;
  } else {
    inputData.disabled = false;
  }
}
chkInstant.addEventListener("change", syncDisparo);
inputData.addEventListener("input", () => {
  if (inputData.value) chkInstant.checked = false;
  syncDisparo();
});
syncDisparo();

// --------- Dropdown de órgãos com checkboxes -----------
const btnOrgaos = document.getElementById("btnOrgaos");
const cbTodos = document.getElementById("orgao_todos");
const itens = document.querySelectorAll(".orgao-item");

function refreshLabel() {
  const selecionados = [...itens].filter((i) => i.checked).map((i) => i.value);
  if (selecionados.length === itens.length) {
    cbTodos.checked = true;
    btnOrgaos.textContent = "Todos";
  } else {
    cbTodos.checked = false;
    btnOrgaos.textContent = selecionados.length
      ? selecionados.join(", ")
      : "Nenhum selecionado";
  }
}
cbTodos.addEventListener("change", () => {
  itens.forEach((i) => (i.checked = cbTodos.checked));
  refreshLabel();
});
itens.forEach((i) => i.addEventListener("change", refreshLabel));
refreshLabel();

// --------- Tabela demo / ações -------------------------
const tbody = document.querySelector("#tabelaAlertas tbody");

const seed = [
  {
    data: "2025-03-23 14:40",
    titulo: "Emissor de Ressalva",
    desc: "Alerta de ressava, recepcionista, atendente.",
    resp: "NÚCLEO DE PRIMEIRO ATENDIMENTO",
    status: true,
  },
  {
    data: "2025-03-24 09:10",
    titulo: "Plantão Diurno",
    desc: "Ajustes de atendimento em Resende/Barra Mansa/Itatiaia.",
    resp: "PLANTÃO DIURNO",
    status: true,
  },
  {
    data: "2025-03-20 18:05",
    titulo: "Ação Social 3",
    desc: "Comunicado de rotina.",
    resp: "AÇÃO SOCIAL 3",
    status: false,
  },
];
function renderRow(a) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
        <td>${a.data}</td>
        <td class="fw-semibold">${a.titulo}</td>
        <td>${a.desc}</td>
        <td>${a.resp}</td>
        <td>
          ${
            a.status == "FINALIZADO"
              ? '<span class="badge rounded-pill badge-inativo">' +
                a.status +
                "</span>"
              : '<span class="badge rounded-pill badge-ativo">' +
                a.status +
                "</span>"
          }
        </td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-outline-secondary m-1" title="Editar">
                <i class="bi bi-pencil-square"></i>
            </button>

            <button type="button" class="btn btn-sm btn-outline-warning m-1 btnEncerrar" title="Encerrar">
                <i class="bi bi-x-octagon"></i>
            </button>

            <button type="button" class="btn btn-sm btn-outline-danger m-1 btnExcluir" title="Excluir">
                <i class="bi bi-trash"></i>
            </button>

            <button type="button" class="btn btn-sm btn-outline-primary m-1 btnVisualizar" title="Visualizar">
                <i class="bi bi-eye"></i>
            </button>
        </td>`;
  // ação encerrar (só protótipo: alterna o badge)
//   tr.querySelector(".btnEncerrar").addEventListener("click", () => {
//     a.status = false;
//     tr.querySelector("td:nth-child(5)").innerHTML =
//       '<span class="badge rounded-pill badge-inativo">NÃO</span>';
//   });
  tbody.prepend(tr);
}
seed.forEach(renderRow);

// --------- Salvar / Finalizar (protótipo) --------------
function coletarAlerta(salvar) {
  const tipo = document.querySelector('input[name="aTipo"]:checked')?.value;
  const orgaos = cbTodos.checked
    ? "TODOS"
    : [...itens]
        .filter((i) => i.checked)
        .map((i) => i.value)
        .join(", ");
  return {
    titulo: document.getElementById("aTitulo").value.trim(),
    desc: document.getElementById("aDescricao").value.trim(),
    tipo,
    resp: orgaos,
    instantaneo: chkInstant.checked,
    quando: inputData.value,
    vigencia: inputVigencia.value,
    status: salvar === true ? "EM_ELABORACAO" : "VIGENTE", // para demo, entra como status
    data: new Date().toLocaleString(),
  };
}

document.getElementById("btnSalvar").addEventListener("click", () => {
  const alerta = coletarAlerta(true);
  renderRow(alerta);
  toast("toastOK").show();
});

document.getElementById("formAlerta").addEventListener("submit", (e) => {
  e.preventDefault();
  // validações simples
  if (
    !document.getElementById("aTitulo").value.trim() ||
    !document.getElementById("aDescricao").value.trim()
  ) {
    document.getElementById("formAlerta").reportValidity();
    return;
  }
  const alerta = coletarAlerta(false);
  renderRow(alerta);
  bootstrap.Modal.getInstance(
    document.getElementById("modalCriarAlerta")
  ).hide();
  toast("toastFinalizado").show();
  limparForm();
});

document.getElementById("btnCancelar").addEventListener("click", () => {
  limparForm();
});

function limparForm() {
  document.getElementById("formAlerta").reset();
  // manter estados coerentes
  updateVigenciaState();
  syncDisparo();
  refreshLabel();
}
