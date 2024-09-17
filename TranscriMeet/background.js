chrome.runtime.onInstalled.addListener(() => {
  console.log("Extensão instalada");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mensagem recebida no background script:", message);
  if (message.status === "Content script carregado") {
    console.log("Content script carregado com sucesso");
    sendResponse({received: true});
  }
  return true; // Indica que a resposta será enviada assincronamente
});

console.log("Background script carregado");
