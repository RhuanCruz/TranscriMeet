function salvarConfiguracoes() {
  const apiKey = document.getElementById('apiKeyInput').value;
  const whatsapp = document.getElementById('whatsappInput').value;
  chrome.storage.sync.set({apiKey: apiKey, whatsapp: whatsapp}, function() {
    console.log('Configurações salvas');
    alert('Configurações salvas com sucesso!');
  });
}

function enviarMensagem(acao) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const tab = tabs[0];
    if (tab && tab.url && tab.url.includes("meet.google.com")) {
      chrome.tabs.sendMessage(tab.id, {acao: acao}, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Erro ao enviar mensagem:", chrome.runtime.lastError.message);
          if (chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
            console.log("Content script não está carregado. Tentando injetar...");
            chrome.scripting.executeScript({
              target: {tabId: tab.id},
              files: ['content.js']
            }, function() {
              if (chrome.runtime.lastError) {
                console.error("Erro ao injetar content script:", chrome.runtime.lastError.message);
              } else {
                console.log("Content script injetado com sucesso. Tentando enviar mensagem novamente...");
                setTimeout(() => enviarMensagem(acao), 100);
              }
            });
          }
        } else {
          console.log("Mensagem enviada com sucesso:", acao);
          if (response && response.status) {
            console.log("Resposta recebida:", response.status);
          }
        }
      });
    } else {
      console.log("Esta extensão só funciona em páginas do Google Meet.");
    }
  });
}

async function enviarParaWebhook(resumo) {
  try {
    const data = await new Promise((resolve) => chrome.storage.sync.get('whatsapp', resolve));
    const whatsapp = data.whatsapp;
    
    if (!whatsapp) {
      throw new Error('Número de WhatsApp não configurado');
    }

    const webhookUrl = 'https://n8n.gualbank.com/webhook-test/meet';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumo: resumo,
        data: new Date().toISOString(),
        whatsapp: whatsapp
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar dados para o webhook');
    }

    console.log('Dados enviados com sucesso para o webhook');
    alert('Resumo enviado com sucesso!');
  } catch (erro) {
    console.error('Erro ao enviar dados para o webhook:', erro);
    alert('Erro ao enviar resumo: ' + erro.message);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Carregar as configurações salvas
  chrome.storage.sync.get(['apiKey', 'whatsapp'], function(data) {
    if (data.apiKey) {
      document.getElementById('apiKeyInput').value = data.apiKey;
    }
    if (data.whatsapp) {
      document.getElementById('whatsappInput').value = data.whatsapp;
    }
  });

  document.getElementById('salvarConfigBtn').addEventListener('click', salvarConfiguracoes);

  document.getElementById('iniciarBtn').addEventListener('click', () => {
    console.log("Botão 'Iniciar Transcrição' clicado");
    enviarMensagem('iniciar');
  });

  document.getElementById('pararBtn').addEventListener('click', () => {
    console.log("Botão 'Parar Transcrição' clicado");
    enviarMensagem('parar');
  });

  document.getElementById('finalizarBtn').addEventListener('click', () => {
    console.log("Botão 'Finalizar e Resumir' clicado");
    enviarMensagem('finalizar');
  });

  console.log("Popup script carregado");
});

// Adicione este listener para receber mensagens do content script
chrome.runtime.onMessage.addListener((mensagem, remetente, resposta) => {
  if (mensagem.acao === 'salvarResumo') {
    enviarParaWebhook(mensagem.resumo);
  } else if (mensagem.acao === 'erro') {
    alert('Erro ao gerar resumo: ' + mensagem.mensagem);
  }
});
