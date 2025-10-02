import { api, initDB } from "../../fakeAPI.js";

function logar(event) {
    // Impede o comportamento padrão do formulário de recarregar a página
    event.preventDefault(); 

    const toastElemento = document.getElementById('toastLogin');
    const meuToast = new bootstrap.Toast(toastElemento);

    const matricula = document.getElementById("matriculaInput").value;
    const senha = document.getElementById("passwordInput").value;

    api.login({matricula, senha}).then(res => {

        console.log('Login bem-sucedido!', res);
        window.location.href = "../pauta-do-dia/index.html";
    }).catch((error) => {
        document.getElementById("toastLoginConteudo").innerText = error.message;
        meuToast.show();
    });
}

window.addEventListener("DOMContentLoaded", () => {
    // Inicia o "banco de dados" fake
    initDB(); 
    
    // Pega o formulário pelo id
    const form = document.getElementById("loginForm");
    
    // Adiciona o ouvinte para o evento 'submit' e chama a função logar
    form.addEventListener("submit", logar);
});