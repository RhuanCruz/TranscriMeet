let reconhecimento = new webkitSpeechRecognition();
reconhecimento.continuous = true;
reconhecimento.interimResults = true;
reconhecimento.lang = 'pt-BR';

let transcricao = '';

reconhecimento.onresult = function(evento) {
  for (let i = evento.resultIndex; i < evento.results.length; ++i) {
    if (evento.results[i].isFinal) {
      transcricao += evento.results[i][0].transcript + ' ';
    }
  }
  console.log('Transcrição:', transcricao);
};

function iniciarTranscricao() {
  reconhecimento.start();
  console.log('Transcrição iniciada');
}

function pararTranscricao() {
  reconhecimento.stop();
  console.log('Transcrição parada');
}

async function finalizarEResumir() {
  reconhecimento.stop();
  console.log('Transcrição finalizada');
  
  try {
    // Recuperar a chave de API armazenada
    const data = await new Promise((resolve) => chrome.storage.sync.get('apiKey', resolve));
    const API_KEY = data.apiKey;
    
    if (!API_KEY) {
      throw new Error('Chave de API não configurada');
    }

    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    
    const resposta = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Você é um especialista em resumir transcrições de reuniões. Crie um resumo conciso e bem estruturado, destacando os pontos principais e ações a serem tomadas da seguinte transcrição: ${transcricao}`
          }]
        }]
      })
    });

    const dados = await resposta.json();
    if (dados.candidates && dados.candidates[0] && dados.candidates[0].content) {
      const resumo = dados.candidates[0].content.parts[0].text;
      console.log('Resumo:', resumo);
      // Enviar o resumo de volta para o popup
      chrome.runtime.sendMessage({acao: 'salvarResumo', resumo: resumo});
    } else {
      throw new Error('Resposta da API não contém o resumo esperado');
    }
  } catch (erro) {
    console.error('Erro ao gerar resumo:', erro);
    chrome.runtime.sendMessage({acao: 'erro', mensagem: erro.message});
  }
}

// Escute mensagens do popup.js
chrome.runtime.onMessage.addListener((mensagem, remetente, resposta) => {
  console.log("Mensagem recebida no content script:", mensagem);
  if (mensagem.acao === 'iniciar') {
    iniciarTranscricao();
    resposta({status: "Transcrição iniciada"});
  } else if (mensagem.acao === 'parar') {
    pararTranscricao();
    resposta({status: "Transcrição parada"});
  } else if (mensagem.acao === 'finalizar') {
    finalizarEResumir();
    resposta({status: "Transcrição finalizada e resumo solicitado"});
  }
  return true; // Indica que a resposta será enviada assincronamente
});

console.log("Content script carregado");
