import { api } from "../../fakeAPI.js";
import {
  criaModalAlerta,
  dataFormatada,
  dataFormatadaInput,
  limitarPalavras,
} from "../../utils.js";

// utilitários bootstrap
const toast = (id) => new bootstrap.Toast(document.getElementById(id));

// iniciar quill

const quill = new Quill('#editor', {
  theme: 'snow',
  modules: {
    toolbar: '#toolbar'
  }
});

// Carregamento inicial da página
document.addEventListener("DOMContentLoaded", function () {
  api
    .getUsuLogado()
    .then((res) => {
      if (!res.tipoUsuario.includes("ADM"))
        window.location.href = "../meus-alertas/index.html";

      console.log(res);
      document.getElementById("usuLogado").innerText = ` ${res.nome}`;
    })
    .catch((error) => {
      api.logout().finally(() => {
        console.warn("deu erro: ", error);
        window.location.href = "../login/index.html";
      });
    });

  // add options de tipo órgão nos filtros

  addOptionsTipoOrgaoFiltro();

  //  evento para o tooltip

  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map((el) => new bootstrap.Tooltip(el));
});

// ---------------- Carregar tipo órgão - criar alertas ----------------
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

// ---------------- Carregar tipo órgão - filtros --------------------

async function addOptionsTipoOrgaoFiltro() {
  try {
    const res = await api.getTipoOrgao();
    const container = document.getElementById("fTipoOrgao");

    let html = container.innerHTML; // mantém o "Todos" que já existe

    res.forEach((tp) => {
      html += `<option value="${tp}">${tp}</option>`;
    });

    container.innerHTML = html;
  } catch (error) {
    console.warn("Erro ao carregar tipos de órgãos:", error);
  }
}

// ---------------- Sair ----------------

document.getElementById("botaoSair").addEventListener("click", () => {
  api.logout();
});

// ---------------- Abrir modal ----------------
document.getElementById("btnNovoAlerta").addEventListener("click", () => {
  bootstrap.Modal.getOrCreateInstance("#modalCriarAlerta").show();
});

// ---------------- Filtros básicos ----------------
document.getElementById("formFiltros").addEventListener("submit", (e) => {
  e.preventDefault();

  api
    .getAlerts({
      status: document.getElementById("fStatus").value || null,
      inicio: document.getElementById("fDataInicio").value || null,
      fim: document.getElementById("fDataFim").value || null,
      tipoOrgao: document.getElementById("fTipoOrgao").value || null,
    })
    .then((res) => {
      console.log("teste ", res);
      tbody.innerHTML = "";
      res.forEach((linha) => {
          const newRow = renderRow(linha);
          newRow.id = `row-${linha.id}`;
          tbody.append(newRow);
          addFuncaoBtnAviso(linha); // reanexa eventos
      });
    })
    .catch((error) => {
      console.warn("Erro ao buscar alertas: ", error);
    });
});

document.getElementById("btnLimparFiltros").addEventListener("click", () => {
  document.getElementById("formFiltros").reset();
});

// --------- TIPO DE ALERTA: controla vigência -----------
const radiosTipo = document.querySelectorAll('input[name="aTipo"]');
const inputVigencia = document.getElementById("aVigencia");

function updateVigenciaState() {
  const tipo = document.querySelector('input[name="aTipo"]:checked')?.value;
  const habilita = tipo === "MODAL" || tipo === "AMBOS";
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
    inputData.removeAttribute("required");
    document.getElementById("btnFinalizar").innerText = 'Publicar';
  } else {
    inputData.disabled = false;
    inputData.setAttribute("required", "true");
    document.getElementById("btnFinalizar").innerText = 'Programar';
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
const tbody = document.getElementById("tbodyAlert");

function renderRow(a) {
  const tr = document.createElement("tr");

  tr.id = `row-${a.id}`;
  tr.innerHTML = `
        <td>${dataFormatada(a.dataCriacao)}</td>
        <td class="fw-semibold">${a.titulo}</td>
        <td style="white-space: pre-wrap;">${limitarPalavras(a.descricao, 40)}</td>
        <td>${a.alertasOrgaos?a.alertasOrgaos.join(", "): ""}</td>
        <td>${a.nome_usuario_criador}</td>
        <td> 
          ${
            '<span class="badge rounded-pill badge-info">' +
                    a.tipoAlerta +
            '</span>'
          }
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
            <button type="button" id="btnEditarAlerta-${
              a.id
            }" class="btn btn-sm btn-outline-secondary m-1" title="Editar">
                <i class="bi bi-pencil-square"></i>
            </button>
            <button type="button" id="btnEncerrarAlerta-${
              a.id
            }" class="btn btn-sm btn-outline-warning m-1 btnEncerrar" title="Encerrar">
                <i class="bi bi-x-octagon"></i>
            </button>
            <button type="button" id="btnExcluirAlerta-${
              a.id
            }" class="btn btn-sm btn-outline-danger m-1 btnExcluir" title="Excluir">
                <i class="bi bi-trash"></i>
            </button>
            <button type="button" id="btnVisualizarAlerta-${
              a.id
            }" class="btn btn-sm btn-outline-primary m-1 btnVisualizar" title="Visualizar">
                <i class="bi bi-eye"></i>
            </button>
        </td>`;

  return tr;
}

function upsertRow(alerta) {
  let existingRow = document.querySelector(`#row-${alerta.id}`);
  const newRow = renderRow(alerta);
  newRow.id = `row-${alerta.id}`;

  if (existingRow) {
    existingRow.replaceWith(newRow); // substitui no lugar
  } else {
    tbody.prepend(newRow); // adiciona no topo
  }

  addFuncaoBtnAviso(alerta); // reanexa eventos
}

// --------- Chamada dos Botões dos Alertas ----------

function addFuncaoBtnAviso(a) {
  // === EDITAR ===

  document
    .getElementById(`btnEditarAlerta-${a.id}`)
    .addEventListener("click", () => {
      if (a.status === "VIGENTE" || a.status === 'FINALIZADO') {
        toast("toastErro").show();
        return;
      }
      document.getElementById("formAlerta").dataset.editId = a.id;

      // Preenche os campos do modal
      document.getElementById("aTitulo").value = a.titulo || "";
      quill.root.innerHTML = a.descricao || "<p><br></p>";

      if (a.tipoAlerta) {
        const radio = document.querySelector(
          `input[name="aTipo"][value="${a.tipoAlerta.toLowerCase()}"]`
        );
        if (radio) radio.checked = true;
      }

      document.getElementById("aData").value = dataFormatadaInput(a.dtDisparo) || "";
      document.getElementById("aInstantaneo").checked = !!a.instantaneo;
      document.getElementById("aVigencia").value = dataFormatadaInput(a.vigenciaFim) || "";

      // Órgãos
      document.querySelectorAll(".orgao-item").forEach((el) => {
        el.checked = false;
      });
      if (a.alertasOrgaos?.includes("TODOS")) {
        document.getElementById("orgao_todos").checked = true;
        document.querySelectorAll(".orgao-item").forEach((el) => {
          el.checked = true;
        });
      } else if (Array.isArray(a.alertasOrgaos)) {
        a.alertasOrgaos.forEach((tp) => {
          const cb = document.getElementById(tp);
          if (cb) cb.checked = true;
        });
      }

      updateVigenciaState();
      syncDisparo();
      refreshLabel();

      bootstrap.Modal.getOrCreateInstance(
        document.getElementById("modalCriarAlerta")
      ).show();
    });

  // === ENCERRAR ===
  document
    .getElementById(`btnEncerrarAlerta-${a.id}`)
    .addEventListener("click", () => {
      if (a.status !== "VIGENTE") {
        // regra de negócio: só encerra se estiver VIGENTE
        toast("toastErro").show();
        return;
      }

      api
        .alterarAlert(a.id, 'FINALIZADO')
        .then((updated) => {
          // Atualiza visual na tabela
          a.status = updated.status; // atualiza o objeto local
          upsertRow(updated); // re-renderiza a linha

          toast("toastEncerrado").show();
        })
        .catch((error) => {
          console.warn("Erro ao encerrar alerta:", error);
          toast("toastErro").show();
        });
    });

  // === EXCLUIR ===
  document
    .getElementById(`btnExcluirAlerta-${a.id}`)
    .addEventListener("click", () => {
      if (a.status === "VIGENTE" || a.status === 'FINALIZADO') {
        // regra de negócio
        toast("toastErro").show();
        return;
      }

      api
        .deleteAlert(a.id)
        .then(() => {
          // Remove a linha da tabela
          const row = document
            .getElementById(`btnExcluirAlerta-${a.id}`)
            .closest("tr");
          row.remove();

          toast("toastExcluido").show();
        })
        .catch((error) => {
          console.warn("Erro ao excluir alerta:", error);
          toast("toastErro").show();
        });
    });

  // === VISUALIZAR ===
  document
    .getElementById(`btnVisualizarAlerta-${a.id}`)
    .addEventListener("click", () => {
      // const toastContainer = document.querySelector(".toast-container"); // Para popups
      exibirModalAlerta(a);
    });
}

// ---------- Visualizações dos Alertas - Modal/popup -------------

function exibirModalAlerta(alerta) {
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

  // Desabilita o botão "Ciente" se necessário
  const btnCiente = modalEl.querySelector(".btn-ciente");
  if (btnCiente) {
    btnCiente.disabled = true; // ou false, dependendo da lógica
  }

  // Exibe o modal
  const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalInstance.show();
}

// --------- Salvar / Finalizar --------------
async function coletarAlerta(salvar) {
  const tipo = document.querySelector('input[name="aTipo"]:checked')?.value;
  const tipoOrgaos = [...document.querySelectorAll(".orgao-item")]
        .filter((i) => i.checked)
        .map((i) => i.value);

  try {
    let usuario = await api.getUsuLogado();
    const form = document.getElementById("formAlerta");

    let status = '';

    if(salvar === true)
      status = 'EM_ELABORACAO';
    else if(chkInstant.checked)
      status = 'VIGENTE';
    else
      status = 'PROGRAMADO_PARA_ENVIO';

    const html = quill.root.innerHTML;

    return {
      id: form.dataset.editId || null, // 👈 se tiver id, é edição
      titulo: document.getElementById("aTitulo").value.trim(),
      descricao: html,
      tipoAlerta: tipo,
      dtDisparo: inputData.value,
      instantaneo: chkInstant.checked,
      vigenciaFim: inputVigencia.value,
      tipoOrgao: tipoOrgaos,
      status: status,
      fk_usuario_criador: usuario.id,
    };
  } catch (error) {
    console.warn("erro ao salvar o alerta! ", error);
  }
}

// valida o tipo orgao que é diferente dos demais

function InvalidForm() {
    const quillContent = quill.root.innerHTML;
    let isInvalid = 0;
  if (
    !document.getElementById("aTitulo").value.trim() ||
    (!inputData.value && !chkInstant.checked)
  ) {
    document.getElementById("formAlerta").reportValidity();
    isInvalid++;
  }

  const orgaosSelecionados = [
    ...document.querySelectorAll(".orgao-item:checked"),
  ];

  // se "Todos" não estiver marcado e nenhum item individual estiver selecionado
  const todosMarcado = document.getElementById("orgao_todos").checked;

  if (!todosMarcado && orgaosSelecionados.length === 0) {
    // feedback visual
    const btnOrgaos = document.getElementById("btnOrgaos");
    btnOrgaos.classList.add("is-invalid");

    // mensagem customizada
    btnOrgaos.setCustomValidity("Selecione pelo menos um tipo de órgão");
    btnOrgaos.reportValidity();
    isInvalid++;
  } else {
    // limpa estado inválido se ok
    const btnOrgaos = document.getElementById("btnOrgaos");
    btnOrgaos.classList.remove("is-invalid");
    btnOrgaos.setCustomValidity("");
  }

  if (quillContent === '<p><br></p>' ){
    const editor = document.querySelector("#editor");

    // aplica estilos diretamente
    editor.style.border = "2px solid red";
    editor.style.borderRadius = "8px";
    editor.style.padding = "5px";
    isInvalid++;
  }
  else{
    // limpa estado inválido se ok
    const editor = document.querySelector("#editor");

    // aplica estilos diretamente
    editor.style.border = "1px solid #ced4da";
    editor.style.borderRadius = "0.375rem";
    editor.style.padding = "0px";
  }

  return isInvalid>0;
}

document.getElementById("btnSalvar").addEventListener("click", () => {
  if (InvalidForm()) return;

  coletarAlerta(true)
    .then((result) => {
      api
        .createAlert(result)
        .then((res) => {
          const modalElement = document.getElementById("modalCriarAlerta");
          const modal = bootstrap.Modal.getInstance(modalElement);

          if (modal) {
            // tira o foco de qualquer input/textarea antes de fechar
            if (document.activeElement) document.activeElement.blur();
            modal.hide();
          }

          upsertRow(res);

          toast("toastOK").show();
          delete document.getElementById("formAlerta").dataset.editId;
          limparForm();
        })
        .catch((error) => {
          console.warn("erro ao salvar o alerta! ", error);
          toast("toastErroSave").show();
        });
    })
    .catch((error) => {
      console.warn("erro ao salvar o alerta! ", error);
    });
});

document.getElementById("formAlerta").addEventListener("submit", (e) => {
  e.preventDefault();
  if (InvalidForm()) return;

  coletarAlerta(false)
    .then((result) => {
      api
        .createAlert(result)
        .then((res) => {
          upsertRow(res);
          bootstrap.Modal.getInstance(
            document.getElementById("modalCriarAlerta")
          ).hide();
          toast("toastFinalizado").show();
          delete document.getElementById("formAlerta").dataset.editId;
          limparForm();
        })
        .catch((error) => {
          console.warn("erro ao salvar o alerta! ", error);
          toast("toastErroSave").show();
        });
    })
    .catch((error) => {
      console.warn("erro ao salvar o alerta! ", error);
    });
});

// Quando o modal fechar de qualquer forma, limpa o formulário
document
  .getElementById("modalCriarAlerta")
  .addEventListener("hidden.bs.modal", () => {
    limparForm();
  });

document
  .getElementById("alertas-container")
  .addEventListener("hidden.bs.modal", () => {
    let modalEl = document.getElementById("alertas-container");
    modalEl.querySelectorAll("iframe").forEach((iframe) => {
      const src = iframe.src;
      iframe.src = "";
      iframe.src = src;
    });
  });

document.getElementById("btnCancelar").addEventListener("click", () => {
  limparForm();
});

function limparForm() {
  const quillContent = quill.root.innerHTML;

  if(quillContent !== '<p><br></p>' ){
    quill.root.innerHTML = "<p><br></p>";
  }

  document.getElementById("formAlerta").reset();
  delete document.getElementById("formAlerta").dataset.editId; // 👈 remove id salvo
  updateVigenciaState();
  syncDisparo();
  refreshLabel();
}
