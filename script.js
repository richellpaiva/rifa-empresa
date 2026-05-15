// Configurações do Supabase (SUBSTITUA PELOS SEUS DADOS)
const SUPABASE_URL = 'https://wrofweogvhgkoc evlvdf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyb2Znd2VvZ3ZoZ2tvY2V2bHZkZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4ODAzODE5LCJleHAiOjIwOTQzNzk4MTl9.LUrdkF9P-yWGFGwdV5dDm63UwvdbcQPpXqpZ5I3xu98';

// Inicializa o Supabase (usa o objeto global carregado pelo HTML)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let adminLogado = false;
let config = {};
let todosNumeros = [];

// ----- Funções de carregamento -----
async function carregarConfig() {
  const { data, error } = await supabase.from('config').select('*').eq('id', 1).single();
  if (error) return;
  config = data;
  
  document.getElementById('titulo').textContent = config.titulo || 'Rifa da Empresa';
  document.getElementById('texto-explicativo').textContent = config.texto_explicativo || '';
  document.getElementById('chave-pix-texto').textContent = config.chave_pix || '';
  document.getElementById('chave-pix-area').style.display = config.chave_pix ? 'block' : 'none';
  
  if (config.foto_url) {
    const img = document.getElementById('foto-brinde');
    img.src = config.foto_url;
    img.style.display = 'block';
  }
  
  // Atualiza campos do admin
  document.getElementById('total-numeros-input').value = config.total_numeros || 100;
  document.getElementById('chave-pix-input').value = config.chave_pix || '';
  document.getElementById('texto-explicativo-input').value = config.texto_explicativo || '';
  if (config.data_sorteio) {
    document.getElementById('data-sorteio-input').value = config.data_sorteio.slice(0,16);
  }
  document.getElementById('texto-compartilhamento-input').value = config.texto_compartilhamento || 'Participe da rifa!';
  
  // Contador regressivo
  atualizarContador();
  setInterval(atualizarContador, 1000);
}

async function carregarNumeros() {
  const { data, error } = await supabase.from('numeros').select('*');
  if (error) return;
  todosNumeros = data.sort((a,b) => a.numero - b.numero);
  renderizarNumeros();
}

function renderizarNumeros() {
  const grid = document.getElementById('grid-numeros');
  const encerrada = config.rifa_encerrada || false;
  
  // Se rifa encerrada e tem ganhador, mostra resultado
  if (encerrada && config.ganhador_nome) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 30px; background: #4caf50; color: white; border-radius: 8px;">
        <h2 style="font-size: 24px;">🎉 PARABÉNS, ${config.ganhador_nome}! 🎉</h2>
        <p style="font-size: 18px;">Número sorteado: <strong>${config.ganhador_numero}</strong></p>
      </div>
    `;
    return;
  }
  
  // Se rifa encerrada sem ganhador
  if (encerrada && !config.ganhador_nome) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 30px; background: #ff9800; color: white; border-radius: 8px;">
        <h2>Rifa encerrada</h2>
        <p>Aguardando definição do ganhador...</p>
      </div>
    `;
    return;
  }
  
  // Mostra grade normal
  grid.innerHTML = '';
  const total = config.total_numeros || 100;
  for (let i = 1; i <= total; i++) {
    const dado = todosNumeros.find(n => n.numero === i);
    const div = document.createElement('div');
    div.className = 'numero';
    if (dado && dado.nome_comprador) {
      div.classList.add('ocupado');
      div.textContent = i;
      div.onclick = () => alert(`Número ${i} comprado por: ${dado.nome_comprador}`);
    } else {
      div.classList.add('disponivel');
      div.textContent = i;
      div.onclick = () => alert('Número disponível!');
    }
    grid.appendChild(div);
  }
}

function atualizarContador() {
  const el = document.getElementById('contador');
  if (!config.data_sorteio) {
    el.textContent = '';
    return;
  }
  const agora = new Date();
  const sorteio = new Date(config.data_sorteio);
  const diff = sorteio - agora;
  if (diff <= 0) {
    el.textContent = '⏰ Sorteio já realizado!';
    return;
  }
  const dias = Math.floor(diff / (1000*60*60*24));
  const horas = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
  const minutos = Math.floor((diff % (1000*60*60)) / (1000*60));
  const segundos = Math.floor((diff % (1000*60)) / 1000);
  el.textContent = `⏳ Sorteio em: ${dias}d ${horas}h ${minutos}m ${segundos}s`;
}

// ----- Admin -----
document.getElementById('btn-admin').onclick = () => {
  document.getElementById('modal-admin').classList.remove('hidden');
};

document.getElementById('btn-login').onclick = async () => {
  const email = document.getElementById('admin-email').value;
  const senha = document.getElementById('admin-senha').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, senha });
  if (error) return alert('Login falhou: ' + error.message);
  adminLogado = true;
  document.getElementById('area-admin').classList.remove('hidden');
  document.getElementById('btn-login').classList.add('hidden');
  document.getElementById('admin-email').style.display = 'none';
  document.getElementById('admin-senha').style.display = 'none';
  alert('Login bem-sucedido!');
};

document.getElementById('btn-adicionar').onclick = async () => {
  const numero = parseInt(document.getElementById('numero-input').value);
  const nome = document.getElementById('nome-input').value.trim();
  if (!numero || !nome) return alert('Preencha número e nome');
  
  if (!confirm(`Confirmar número ${numero} para ${nome}?`)) return;
  
  const { error } = await supabase.from('numeros').update({ nome_comprador: nome }).eq('numero', numero);
  if (error) return alert('Erro: ' + error.message);
  alert('Número adicionado!');
  carregarNumeros();
};

document.getElementById('btn-atualizar-total').onclick = async () => {
  const total = parseInt(document.getElementById('total-numeros-input').value);
  if (total < 1) return alert('Total inválido');
  
  await supabase.from('config').update({ total_numeros: total }).eq('id', 1);
  
  const { data: existentes } = await supabase.from('numeros').select('numero');
  const maxAtual = existentes.reduce((m, n) => Math.max(m, n.numero), 0);
  if (total > maxAtual) {
    const novos = [];
    for (let i = maxAtual + 1; i <= total; i++) {
      novos.push({ numero: i, nome_comprador: null });
    }
    await supabase.from('numeros').insert(novos);
  }
  
  alert('Total atualizado!');
  carregarNumeros();
  carregarConfig();
};

document.getElementById('btn-salvar-chave').onclick = async () => {
  const chave = document.getElementById('chave-pix-input').value;
  await supabase.from('config').update({ chave_pix: chave }).eq('id', 1);
  alert('Chave salva!');
  carregarConfig();
};

document.getElementById('btn-salvar-texto').onclick = async () => {
  const texto = document.getElementById('texto-explicativo-input').value;
  await supabase.from('config').update({ texto_explicativo: texto }).eq('id', 1);
  alert('Texto salvo!');
  carregarConfig();
};

document.getElementById('btn-salvar-data').onclick = async () => {
  const data = document.getElementById('data-sorteio-input').value;
  if (!data) return alert('Selecione uma data');
  await supabase.from('config').update({ data_sorteio: new Date(data).toISOString() }).eq('id', 1);
  alert('Data salva!');
  carregarConfig();
};

document.getElementById('btn-salvar-compartilhamento').onclick = async () => {
  const texto = document.getElementById('texto-compartilhamento-input').value;
  await supabase.from('config').update({ texto_compartilhamento: texto }).eq('id', 1);
  alert('Texto de compartilhamento salvo!');
  carregarConfig();
};

document.getElementById('btn-upload-foto').onclick = async () => {
  const file = document.getElementById('foto-input').files[0];
  if (!file) return alert('Selecione uma foto');
  
  const fileName = `brinde_${Date.now()}.jpg`;
  const { data, error } = await supabase.storage.from('brindes').upload(fileName, file);
  if (error) return alert('Erro ao enviar: ' + error.message);
  
  const { data: urlData } = supabase.storage.from('brindes').getPublicUrl(fileName);
  await supabase.from('config').update({ foto_url: urlData.publicUrl }).eq('id', 1);
  alert('Foto enviada!');
  carregarConfig();
};

document.getElementById('btn-salvar-ganhador').onclick = async () => {
  const numero = parseInt(document.getElementById('ganhador-numero-input').value);
  const nome = document.getElementById('ganhador-nome-input').value.trim();
  if (!numero || !nome) return alert('Preencha número e nome do ganhador');
  
  await supabase.from('config').update({ ganhador_numero: numero, ganhador_nome: nome }).eq('id', 1);
  alert('Ganhador salvo!');
  carregarConfig();
  carregarNumeros();
};

document.getElementById('btn-encerrar-rifa').onclick = async () => {
  if (!confirm('Tem certeza que deseja encerrar a rifa?')) return;
  await supabase.from('config').update({ rifa_encerrada: true }).eq('id', 1);
  alert('Rifa encerrada!');
  carregarConfig();
  carregarNumeros();
};

document.getElementById('btn-gerar-pdf').onclick = async () => {
  alert('Funcionalidade de PDF será implementada em breve.');
};

document.getElementById('btn-logout').onclick = async () => {
  await supabase.auth.signOut();
  adminLogado = false;
  document.getElementById('area-admin').classList.add('hidden');
  document.getElementById('btn-login').classList.remove('hidden');
  document.getElementById('admin-email').style.display = 'block';
  document.getElementById('admin-senha').style.display = 'block';
  document.getElementById('modal-admin').classList.add('hidden');
};

// ----- Compartilhamento WhatsApp -----
document.getElementById('btn-compartilhar-whatsapp').onclick = () => {
  const texto = config.texto_compartilhamento || 'Participe da rifa!';
  const url = window.location.href;
  window.open(`https://wa.me/?text=${encodeURIComponent(texto + ' ' + url)}`, '_blank');
};

// ----- Buscar meus números -----
document.getElementById('btn-buscar-numeros').onclick = () => {
  const nome = document.getElementById('busca-nome').value.trim().toLowerCase();
  if (!nome) return alert('Digite seu nome');
  
  const meus = todosNumeros.filter(n => n.nome_comprador && n.nome_comprador.toLowerCase().includes(nome));
  const div = document.getElementById('resultado-busca');
  if (meus.length === 0) {
    div.innerHTML = '<p style="color:#666;">Nenhum número encontrado para este nome.</p>';
    return;
  }
  div.innerHTML = `<p><strong>Você comprou os números:</strong> ${meus.map(n => n.numero).join(', ')}</p>`;
};

// ----- Inicialização -----
carregarConfig();
carregarNumeros();
setInterval(carregarNumeros, 5000);
