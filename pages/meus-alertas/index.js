import { api } from "../../fakeAPI.js";
import {
  criaModalAlerta,
  dataFormatada,
  limitarPalavras,
} from "../../utils.js";

// utilitários bootstrap
const toast = (id) => new bootstrap.Toast(document.getElementById(id));

const tbody = document.querySelector("#tabelaAlertas tbody");

// Carregamento inicial da página
document.addEventListener("DOMContentLoaded", function () {
  api
    .getUsuLogado()
    .then((res) => {
      if (!res.tipoUsuario.includes("ADM"))
        document.getElementById("redirectGestao").style.display = "none";

      console.log(res);
      document.getElementById("usuLogado").innerText = ` ${res.nome}`;
      buscar();

      const params = new URLSearchParams(window.location.search);
      const renderiza = params.get("renderiza-modal");

      if (renderiza) {
        api
          .getAlert(renderiza)
          .then((res) => {
            exibirModalAlerta(res);
          })
          .catch(() => {
            toast("toastErro").show();
          });
      }
    })
    .catch((error) => {
      api.logout().finally(() => {
        console.warn("deu erro: ", error);
        window.location.href = "../login/index.html";
      });
    });

  // add options de tipo órgão nos filtros

  addOptionsTipoOrgaoFiltro();
});

// Carregamento para modal pós login

// window.onload = () => {
//   const origem = document.referrer;

//   if (origem && origem.includes("/login/index.html")) {
//   } else {
//     console.log("Usuário acessou diretamente ou origem está oculta.");
//   }
// };

async function addOptionsTipoOrgaoFiltro() {
  try {
    const res = await api.getUsuTipoOrgao();
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

// ====== Renderiza Alerta na Tabela ==========

function renderRow(a) {
  const tr = document.createElement("tr");
  tr.id = `row-${a.id}`;
  tr.innerHTML = `
        <td>${
          a.instantaneo
            ? dataFormatada(a.dataCriacao)
            : dataFormatada(a.dtDisparo)
        }</td>
        <td class="fw-semibold">${a.titulo}</td>
        <td style="white-space: pre-wrap;">${limitarPalavras(
          a.descricao,
          40
        )}</td>
        <td>${a.alertasOrgaos.join(", ")}</td>
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
        <td>
          ${
            a.visualizado
              ? '<i class="bi bi-check2-circle text-success"></i> Estou Ciente'
              : `<button class="btn btn-sm btn-outline-success btnCiente" id="btnMarcarCiencia-${a.id}"><i class="bi bi-check2"></i> Estou Ciente</button>`
          }
        </td>
         <td class="text-center">
            <button type="button" id="btnVisualizarAlerta-${
              a.id
            }" class="btn btn-sm btn-outline-success m-1 btnVisualizar" title="Visualizar">
                <i class="bi bi-eye"></i>
            </button>
        </td>
        `;

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
  // === VISUALIZAR ===
  document
    .getElementById(`btnVisualizarAlerta-${a.id}`)
    .addEventListener("click", () => {
      exibirModalAlerta(a);
    });

  //  === ação "Estou Ciente" ===

  const btn = document.getElementById(`btnMarcarCiencia-${a.id}`);
  if (btn) {
    btn.addEventListener("click", () => {
      api
        .getUsuLogado()
        .then((res) => {
          api
            .checkAlert(a.id, res.id)
            .then(() => {
              let alerta = a;
              alerta.visualizado = true;
              upsertRow(alerta);
              const toastAberto = document.getElementById(
                `alerta-${alerta.id}`
              );
              if (toastAberto) {
                toastAberto.remove();
              }
              toast("toastOK").show();
            })
            .catch(() => {
              toast("toastErro").show();
            });
        })
        .catch((error) => {
          api.logout().finally(() => {
            console.warn("deu erro: ", error);
            window.location.href = "../login/index.html";
          });
        });
    });
  }
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
    modalEl.querySelector(".modal-body").textContent = alerta.descricao;
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
              let a = alerta;
              a.visualizado = true;
              upsertRow(a);

              const toastAberto = document.getElementById(
                `alerta-${alerta.id}`
              );
              if (toastAberto) {
                toastAberto.remove();
              }
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );
              toast("toastOK").show();
            })
            .catch((error) => {
              console.log(`erro no toast ${alerta.id}: `, error);
              toast("toastErro").show();
            });
          btnCiente.disabled = true;
        })
        .catch((error) => {
          api.logout().finally(() => {
            console.warn("deu erro: ", error);
            window.location.href = "../login/index.html";
          });
        });
    };
  }

  document
    .getElementById("alerta-modal-visu")
    .addEventListener("hidden.bs.modal", () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    });

  // Exibe o modal
  const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalInstance.show();
}

function buscar() {
  api
    .getAlertsUsuario({
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
}

// Filtros (demo)
document.getElementById("formFiltros").addEventListener("submit", (e) => {
  e.preventDefault();
  buscar();
});

document.getElementById("btnLimparFiltros").addEventListener("click", () => {
  document.getElementById("formFiltros").reset();
});

// ---------------- Sair ----------------

document.getElementById("botaoSair").addEventListener("click", () => {
  api.logout();
});
