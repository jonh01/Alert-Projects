import { api } from "../../fakeAPI.js";

// Carregamento inicial da página
document.addEventListener("DOMContentLoaded", function () {
  api
    .getUsuLogado()
    .then((res) => {
      if (!res.tipoUsuario.includes("ADM"))
        document.getElementById("redirectGestao").style.display = "none";

      console.log(res);
      document.getElementById("usuLogado").innerText = ` ${res.nome}`;

    })
    .catch((error) => {
      api.logout().finally(() => {
        console.warn("deu erro: ", error);
        window.location.href = "../login/index.html";
      });
    });
});

// ---------------- Sair ----------------

document.getElementById("botaoSair").addEventListener("click", () => {
  api.logout();
});