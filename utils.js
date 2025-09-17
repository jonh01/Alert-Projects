export const dataFormatada = (data) => new Date(data).toLocaleString("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const limitarPalavras = (texto, maxPalavras) => {
  const palavras = texto.split(" "); // divide em palavras
  if (palavras.length <= maxPalavras) {
    return texto; // se menor ou igual, retorna tudo
  }
  return palavras.slice(0, maxPalavras).join(" ") + "..."; // senão, corta e adiciona "..."
}