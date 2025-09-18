import { api } from "../../fakeAPI.js";
import { dataFormatada, limitarPalavras } from "../../utils.js";

// utilitários bootstrap
const toast = (id) => new bootstrap.Toast(document.getElementById(id));

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
        tbody.prepend(renderRow(linha));
        addFuncaoBtnAviso(linha);
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
    inputData.removeAttribute("required");
  } else {
    inputData.disabled = false;
    inputData.setAttribute("required", "true");
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
  tr.innerHTML = `
        <td>${dataFormatada(a.dataCriacao)}</td>
        <td class="fw-semibold">${a.titulo}</td>
        <td>${limitarPalavras(a.descricao, 60)}</td>
        <td>${a.alertasOrgaos.join(", ")}</td>
        <td>
          ${a.status == "FINALIZADO"
      ? '<span class="badge rounded-pill badge-inativo">' +
      a.status +
      "</span>"
      : '<span class="badge rounded-pill badge-ativo">' +
      a.status +
      "</span>"
    }
        </td>
        <td class="text-center">
            <button type="button" id="btnEditarAlerta-${a.id}" class="btn btn-sm btn-outline-secondary m-1" title="Editar">
                <i class="bi bi-pencil-square"></i>
            </button>
            <button type="button" id="btnEncerrarAlerta-${a.id}" class="btn btn-sm btn-outline-warning m-1 btnEncerrar" title="Encerrar">
                <i class="bi bi-x-octagon"></i>
            </button>
            <button type="button" id="btnExcluirAlerta-${a.id}" class="btn btn-sm btn-outline-danger m-1 btnExcluir" title="Excluir">
                <i class="bi bi-trash"></i>
            </button>
            <button type="button" id="btnVisualizarAlerta-${a.id}" class="btn btn-sm btn-outline-primary m-1 btnVisualizar" title="Visualizar">
                <i class="bi bi-eye"></i>
            </button>
        </td>`;

  return tr;

}

// --------- Chamada dos Botões dos Alertas ----------

function addFuncaoBtnAviso(a) {
  // === EDITAR ===
  document
    .getElementById(`btnEditarAlerta-${a.id}`)
    .addEventListener("click", () => {
      // Preenche os campos do modal
      document.getElementById("aTitulo").value = a.titulo || "";
      document.getElementById("aDescricao").value = a.descricao || "";

      // Tipo de alerta (radio buttons)
      if (a.tipoAlerta) {
        const radio = document.querySelector(
          `input[name="aTipo"][value="${a.tipoAlerta.toLowerCase()}"]`
        );
        if (radio) radio.checked = true;
      }

      // Data/hora do disparo
      document.getElementById("aData").value = a.dtDisparo || "";

      // Instantâneo
      document.getElementById("aInstantaneo").checked = !!a.instantaneo;

      // Vigência
      document.getElementById("aVigencia").value = a.vigenciaFim || "";

      // Tipo de Órgão (checkboxes)
      if (Array.isArray(a.alertasOrgaos) && a.alertasOrgaos.length > 0) {
        // desmarca todos primeiro
        document.querySelectorAll(".orgao-item").forEach((el) => {
          el.checked = false;
        });

        if (a.alertasOrgaos.includes("TODOS")) {
          document.getElementById("orgao_todos").checked = true;
          document.querySelectorAll(".orgao-item").forEach((el) => {
            el.checked = true;
          });
        } else {
          a.alertasOrgaos.forEach((tp) => {
            const cb = document.getElementById(tp);
            if (cb) cb.checked = true;
          });
        }
      }

      // === Regras de negócio (mantém consistência visual) ===
      updateVigenciaState(); // habilita/desabilita vigência
      syncDisparo();         // ajusta instantâneo/data
      refreshLabel();        // atualiza label do dropdown

      // Exibe o modal
      bootstrap.Modal.getOrCreateInstance(
        document.getElementById("modalCriarAlerta")
      ).show();
    });

  // === ENCERRAR ===
  document
    .getElementById(`btnEncerrarAlerta-${a.id}`)
    .addEventListener("click", () => {
      console.log("Encerrar alerta", a.id);
    });

  // === EXCLUIR ===
  document
    .getElementById(`btnExcluirAlerta-${a.id}`)
    .addEventListener("click", () => {
      console.log("Excluir alerta", a.id);
    });

  // === VISUALIZAR ===
  document
    .getElementById(`btnVisualizarAlerta-${a.id}`)
    .addEventListener("click", () => {
      console.log("Visualizar alerta", a.id);
    });
}

// --------- Salvar / Finalizar --------------
async function coletarAlerta(salvar) {
  const tipo = document.querySelector('input[name="aTipo"]:checked')?.value;
  const tipoOrgaos = document.getElementById("orgao_todos").checked
    ? ["TODOS"]
    : [...document.querySelectorAll(".orgao-item")]
      .filter((i) => i.checked)
      .map((i) => i.value);

  try {
    let usuario = await api.getUsuLogado();

    console.log(tipoOrgaos);

    return {
      titulo: document.getElementById("aTitulo").value.trim(),
      descricao: document.getElementById("aDescricao").value.trim(),
      tipoAlerta: tipo,
      dtDisparo: inputData.value,
      instantaneo: chkInstant.checked,
      vigenciaFim: inputVigencia.value,
      tipoOrgao: tipoOrgaos,
      status: salvar === true ? "EM_ELABORACAO" : "VIGENTE",
      fk_usuario_criador: usuario.id,
    };
  } catch (error) {
    console.warn("erro ao salvar o alerta! ", error);
  }
}

// valida o tipo orgao que é diferente dos demais

function InvalidForm() {
  if (
    !document.getElementById("aTitulo").value.trim() ||
    !document.getElementById("aDescricao").value.trim() ||
    (!inputData.value && !chkInstant.checked)
  ) {
    document.getElementById("formAlerta").reportValidity();
    return true;
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
    return true;
  } else {
    // limpa estado inválido se ok
    const btnOrgaos = document.getElementById("btnOrgaos");
    btnOrgaos.classList.remove("is-invalid");
    btnOrgaos.setCustomValidity("");
  }
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

          tbody.prepend(renderRow(res));
          addFuncaoBtnAviso(res);

          toast("toastOK").show();

          limparForm();
        })
        .catch((error) => {
          console.warn("erro ao salvar o alerta! ", error);
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
          tbody.prepend(renderRow(res));
          addFuncaoBtnAviso(res);
          bootstrap.Modal.getInstance(
            document.getElementById("modalCriarAlerta")
          ).hide();
          toast("toastFinalizado").show();
          limparForm();
        })
        .catch((error) => {
          console.warn("erro ao salvar o alerta! ", error);
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

document.getElementById("btnCancelar").addEventListener("click", () => {
  limparForm();
});

function limparForm() {
  document.getElementById("formAlerta").reset();
  updateVigenciaState();
  syncDisparo();
  refreshLabel();
}
