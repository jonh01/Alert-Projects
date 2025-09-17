import { api } from "../../fakeAPI.js";

// utilitários bootstrap
const toast = (id) => new bootstrap.Toast(document.getElementById(id));

// evento para o tooltip
document.addEventListener("DOMContentLoaded", function () {
  api.getUsuLogado().then(res => {

    if(!res.tipoUsuario.includes("ADM"))
            window.location.href = "../meus-alertas/index.html";
    
    console.log(res);
    document.getElementById('usuLogado').innerText = ` ${res.nome}`
  }).catch(error => {
    api.logout().finally(() =>{
      console.warn('deu erro: ', error)
      window.location.href = "../login/index.html";
    })
  });
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map((el) => new bootstrap.Tooltip(el));
});

// ---------------- Carregar tipo órgão ----------------
async function addOptionsTipoOrgao() {
  try {
    const res = await api.getTipoOrgao();
    const container = document.getElementById("tipoOrgaoDinamico");

    let html = container.innerHTML; // mantém o "Todos" que já existe

    res.forEach((tp) => {
      html += `
        <div class="form-check ms-1">
          <input class="form-check-input orgao-item" type="checkbox" value="${tp}" id="${tp}" checked>
          <label class="form-check-label" for="${tp}">${tp}</label>
        </div>`;
    });

    container.innerHTML = html;
  } catch (error) {
    console.warn("Erro ao carregar tipos de órgãos:", error);
  }
}

// ---------------- Sair ----------------

document.getElementById("botaoSair").addEventListener("click", () => {
  api.logout().finally(() =>{
      window.location.href = "../login/index.html";
    })
});

// ---------------- Abrir modal ----------------
document.getElementById("btnNovoAlerta").addEventListener("click", () => {
  bootstrap.Modal.getOrCreateInstance("#modalCriarAlerta").show();
});

// ---------------- Filtros básicos ----------------
document.getElementById("formFiltros").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("tabelaAlertas").classList.add("table-striped");
  setTimeout(
    () => document.getElementById("tabelaAlertas").classList.remove("table-striped"),
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
  if (!habilita) inputVigencia.value = "";
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

function refreshLabel() {
  const cbTodos = document.getElementById("orgao_todos");
  const btnOrgaos = document.getElementById("btnOrgaos");
  const itens = document.querySelectorAll(".orgao-item");

  const selecionados = [...itens].filter((i) => i.checked).map((i) => i.value);

  if (selecionados.length === itens.length && itens.length > 0) {
    cbTodos.checked = true;
    btnOrgaos.textContent = "Todos";
  } else {
    cbTodos.checked = false;
    btnOrgaos.textContent = selecionados.length
      ? selecionados.join(", ")
      : "Nenhum tipo selecionado";
  }
}

function initDropdownOrgaos() {
  const cbTodos = document.getElementById("orgao_todos");

  // quando mudar "Todos"
  cbTodos.addEventListener("change", () => {
    document.querySelectorAll(".orgao-item").forEach((i) => {
      i.checked = cbTodos.checked;
    });
    refreshLabel();
  });

  // quando mudar cada item individual
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("orgao-item")) {
      refreshLabel();
    }
  });

  refreshLabel(); // inicializa label
}

// Chama após montar checkboxes
addOptionsTipoOrgao().then(() => initDropdownOrgaos());

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
              ? '<span class="badge rounded-pill badge-inativo">' + a.status + "</span>"
              : '<span class="badge rounded-pill badge-ativo">' + a.status + "</span>"
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
  tbody.prepend(tr);
}
seed.forEach(renderRow);

// --------- Salvar / Finalizar (protótipo) --------------
function coletarAlerta(salvar) {
  const tipo = document.querySelector('input[name="aTipo"]:checked')?.value;
  const tipoOrgaos = document.getElementById("orgao_todos").checked
    ? "TODOS"
    : [...document.querySelectorAll(".orgao-item")]
        .filter((i) => i.checked)
        .map((i) => i.value)
        .join(", ");

  return {
    titulo: document.getElementById("aTitulo").value.trim(),
    desc: document.getElementById("aDescricao").value.trim(),
    tipo,
    resp: tipoOrgaos,
    instantaneo: chkInstant.checked,
    quando: inputData.value,
    vigencia: inputVigencia.value,
    status: salvar === true ? "EM_ELABORACAO" : "VIGENTE",
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
  if (
    !document.getElementById("aTitulo").value.trim() ||
    !document.getElementById("aDescricao").value.trim()
  ) {
    document.getElementById("formAlerta").reportValidity();
    return;
  }
  const alerta = coletarAlerta(false);
  renderRow(alerta);
  bootstrap.Modal.getInstance(document.getElementById("modalCriarAlerta")).hide();
  toast("toastFinalizado").show();
  limparForm();
});

document.getElementById("btnCancelar").addEventListener("click", () => {
  limparForm();
});

function limparForm() {
  document.getElementById("formAlerta").reset();
  updateVigenciaState();
  syncDisparo();
  refreshLabel();
}
