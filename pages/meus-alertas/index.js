import { api } from "../../fakeAPI.js";
const tbody = document.querySelector("#tabelaAlertas tbody");

// Carregamento inicial da página
document.addEventListener("DOMContentLoaded", function () {
  api.getUsuLogado().then(res => {

    if(!res.tipoUsuario.includes("ADM"))
            document.getElementById("redirectGestao").style.display = 'none';
    
    console.log(res);
    document.getElementById('usuLogado').innerText = ` ${res.nome}`
  }).catch(error => {
    api.logout().finally(() =>{
      console.warn('deu erro: ', error)
      window.location.href = "../login/index.html";
    })
  });
});

// Mock de alertas
const seed = [
  {
    data: "2025-03-23 14:40",
    titulo: "Ressalva de Atendimento",
    desc: "Alerta para recepção e triagem.",
    vigente: true,
    ciencia: false,
  },
  {
    data: "2025-03-24 09:10",
    titulo: "Plantão Diurno",
    desc: "Ajustes de atendimento em Resende/Barra Mansa.",
    vigente: true,
    ciencia: true,
  },
  {
    data: "2025-03-20 18:05",
    titulo: "Ação Social 3",
    desc: "Comunicado de rotina.",
    vigente: false,
    ciencia: true,
  },
];

function renderRow(a) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
        <td>${a.data}</td>
        <td class="fw-semibold">${a.titulo}</td>
        <td>${a.desc}</td>
        <td>${
          a.vigente
            ? '<span class="badge rounded-pill badge-ativo">SIM</span>'
            : '<span class="badge rounded-pill badge-inativo">NÃO</span>'
        }
        </td>
        <td>
          ${
            a.ciencia
              ? '<i class="bi bi-check2-circle text-success"></i> Estou Ciente'
              : '<button class="btn btn-sm btn-outline-success btnCiente"><i class="bi bi-check2"></i> Estou Ciente</button>'
          }
        </td>`;

  // ação "Estou Ciente"
  const btn = tr.querySelector(".btnCiente");
  if (btn) {
    btn.addEventListener("click", () => {
      a.ciencia = true;
      tr.querySelector("td:last-child").innerHTML =
        '<i class="bi bi-check2-circle text-success"></i> Estou Ciente';
    });
  }
  tbody.appendChild(tr);
}
seed.forEach(renderRow);

// Filtros (demo)
document.getElementById("formFiltros").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Filtro aplicado (protótipo)");
});
document.getElementById("btnLimparFiltros").addEventListener("click", () => {
  document.getElementById("formFiltros").reset();
});

// ---------------- Sair ----------------

document.getElementById("botaoSair").addEventListener("click", () => {
  api.logout();
});