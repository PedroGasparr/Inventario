import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getDatabase, ref, set, get, remove, onValue, update } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCkd5Pa3ZOZm21toVESWotKb-IwqFZngYI",
    authDomain: "invetario-cd.firebaseapp.com",
    projectId: "invetario-cd",
    storageBucket: "invetario-cd.firebasestorage.app",
    messagingSenderId: "481050355912",
    appId: "1:481050355912:web:0fa7a08f89af2bf76d5dfd",
    measurementId: "G-67G43MRSMZ"
  };

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Constantes
const maxFamiliasPorPalete = 8;
const maxItensPorPalete = 100;
const posicoesPorBloco = 6;
const alturasPorPosicao = 3;

// Elementos DOM
const btnAdicionar = document.getElementById('btnAdicionar');
const btnRemover = document.getElementById('btnRemover');
const btnConsultar = document.getElementById('btnConsultar');
const btnBlocos = document.getElementById('btnBlocos');
const adicionarSection = document.getElementById('adicionarPalete');
const removerSection = document.getElementById('removerPalete');
const consultarSection = document.getElementById('consultarPalete');
const blocosSection = document.getElementById('visualizarBlocos');
const btnSalvar = document.getElementById('btnSalvar');
const btnRemoverPalete = document.getElementById('btnRemoverPalete');
const btnConsultarPalete = document.getElementById('btnConsultarPalete');
const codigoBarrasInput = document.getElementById('codigoBarras');
const blocoSelect = document.getElementById('bloco');
const posicaoSelect = document.getElementById('posicao');
const alturaSelect = document.getElementById('altura');
const familiasContainer = document.getElementById('familiasContainer');
const btnAddFamilia = document.getElementById('btnAddFamilia');
const codigoBarrasRemover = document.getElementById('codigoBarrasRemover');
const codigoBarrasConsultar = document.getElementById('codigoBarrasConsultar');
const mensagemDiv = document.getElementById('mensagem');
const mensagemRemoverDiv = document.getElementById('mensagemRemover');
const infoPaleteDiv = document.getElementById('infoPalete');
const infoConsultaDiv = document.getElementById('infoConsulta');
const blocosContainer = document.getElementById('blocosContainer');
const themeToggle = document.getElementById('themeToggle');

// Event Listeners
btnAdicionar.addEventListener('click', () => switchSection('adicionar'));
btnRemover.addEventListener('click', () => switchSection('remover'));
btnConsultar.addEventListener('click', () => switchSection('consultar'));
btnBlocos.addEventListener('click', () => {
    switchSection('blocos');
    carregarVisaoBlocos();
});

blocoSelect.addEventListener('change', carregarPosicoes);
posicaoSelect.addEventListener('change', () => {
    alturaSelect.disabled = !posicaoSelect.value;
});
btnAddFamilia.addEventListener('click', adicionarCampoFamilia);
btnSalvar.addEventListener('click', salvarPalete);
btnRemoverPalete.addEventListener('click', removerPalete);
btnConsultarPalete.addEventListener('click', consultarPalete);
themeToggle.addEventListener('click', alternarTema);

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    adicionarCampoFamilia();
});

// Funções de navegação
function switchSection(section) {
    btnAdicionar.classList.toggle('active', section === 'adicionar');
    btnRemover.classList.toggle('active', section === 'remover');
    btnConsultar.classList.toggle('active', section === 'consultar');
    btnBlocos.classList.toggle('active', section === 'blocos');
    
    adicionarSection.classList.toggle('hidden', section !== 'adicionar');
    removerSection.classList.toggle('hidden', section !== 'remover');
    consultarSection.classList.toggle('hidden', section !== 'consultar');
    blocosSection.classList.toggle('hidden', section !== 'blocos');
}

// Funções para o tema
function alternarTema() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Funções para adicionar palete
function carregarPosicoes() {
    const bloco = blocoSelect.value;
    if (!bloco) return;

    posicaoSelect.disabled = false;
    posicaoSelect.innerHTML = '<option value="">Selecione a posição (1-6)</option>';
    
    for (let p = 1; p <= posicoesPorBloco; p++) {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = `Posição ${p}`;
        posicaoSelect.appendChild(option);
    }
}

function adicionarCampoFamilia() {
    if (familiasContainer.children.length >= maxFamiliasPorPalete) {
        showMessage(mensagemDiv, `Máximo de ${maxFamiliasPorPalete} famílias por palete`, 'error');
        return;
    }
    
    const div = document.createElement('div');
    div.className = 'familia-item';
    div.innerHTML = `
        <div class="form-group">
            <label>Família:</label>
            <input type="text" class="familia" placeholder="Nome da família">
        </div>
        <div class="form-group">
            <label>Quantidade:</label>
            <input type="number" class="quantidade" placeholder="Qtd" min="1" max="100">
        </div>
        <button class="btn-remove-familia">×</button>
    `;
    
    div.querySelector('.btn-remove-familia').addEventListener('click', () => {
        div.remove();
    });
    
    familiasContainer.appendChild(div);
}

async function salvarPalete() {
    const codigo = codigoBarrasInput.value.trim();
    const bloco = blocoSelect.value;
    const posicao = posicaoSelect.value;
    const altura = alturaSelect.value;
    
    if (!codigo || !bloco || !posicao || !altura) {
        showMessage(mensagemDiv, 'Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    // Coletar famílias e quantidades
    const familias = {};
    let totalItens = 0;
    let camposValidos = true;
    
    const familiaInputs = document.querySelectorAll('.familia-item');
    familiaInputs.forEach(item => {
        const familia = item.querySelector('.familia').value.trim();
        const quantidade = parseInt(item.querySelector('.quantidade').value) || 0;
        
        if (!familia || quantidade < 1) {
            camposValidos = false;
            return;
        }
        
        familias[familia] = (familias[familia] || 0) + quantidade;
        totalItens += quantidade;
    });
    
    if (!camposValidos || Object.keys(familias).length === 0) {
        showMessage(mensagemDiv, 'Preencha todas as famílias corretamente', 'error');
        return;
    }
    
    if (totalItens > maxItensPorPalete) {
        showMessage(mensagemDiv, `Máximo de ${maxItensPorPalete} itens por palete`, 'error');
        return;
    }
    
    // Verificar se posição/altura está disponível
    const posicaoRef = ref(database, `blocos/${bloco}/posicoes/${posicao}/altura${altura}`);
    const snapshot = await get(posicaoRef);
    
    if (snapshot.exists()) {
        showMessage(mensagemDiv, `Já existe um palete na posição ${posicao}-${altura}`, 'error');
        return;
    }
    
    try {
        // Verificar se palete já existe
        const paleteRef = ref(database, `paletes/${codigo}`);
        const paleteSnapshot = await get(paleteRef);
        
        if (paleteSnapshot.exists()) {
            showMessage(mensagemDiv, 'Este código de palete já está em uso', 'error');
            return;
        }
        
        // Criar objeto do palete
        const paleteData = {
            codigo,
            bloco,
            posicao,
            altura,
            familias,
            totalItens,
            dataRegistro: new Date().toISOString()
        };
        
        // Salvar em várias referências
        await Promise.all([
            set(ref(database, `paletes/${codigo}`), paleteData),
            set(posicaoRef, {
                codigo,
                familias,
                totalItens
            }),
            atualizarResumoBloco(bloco, familias, 'adicionar'),
            set(ref(database, `historico/${Date.now()}`), {
                acao: "entrada",
                codigo,
                bloco,
                posicao,
                altura,
                data: new Date().toISOString()
            })
        ]);
        
        showMessage(mensagemDiv, `Palete ${codigo} salvo com sucesso em ${bloco}-${posicao}-${altura}`, 'success');
        limparFormularioAdicionar();
    } catch (error) {
        showMessage(mensagemDiv, `Erro ao salvar palete: ${error.message}`, 'error');
    }
}

async function atualizarResumoBloco(bloco, familias, operacao) {
    const resumoRef = ref(database, `blocos/${bloco}/resumo`);
    const snapshot = await get(resumoRef);
    let resumoAtual = snapshot.exists() ? snapshot.val() : {};
    
    // Atualizar contagem para cada família
    Object.entries(familias).forEach(([familia, quantidade]) => {
        if (operacao === 'adicionar') {
            resumoAtual[familia] = (resumoAtual[familia] || 0) + quantidade;
        } else {
            resumoAtual[familia] = (resumoAtual[familia] || 0) - quantidade;
            if (resumoAtual[familia] <= 0) {
                delete resumoAtual[familia];
            }
        }
    });
    
    await set(resumoRef, resumoAtual);
}

function limparFormularioAdicionar() {
    codigoBarrasInput.value = '';
    blocoSelect.value = '';
    posicaoSelect.value = '';
    posicaoSelect.disabled = true;
    alturaSelect.value = '';
    alturaSelect.disabled = true;
    familiasContainer.innerHTML = '';
    adicionarCampoFamilia();
}

// Funções para remover palete
async function removerPalete() {
    const codigo = codigoBarrasRemover.value.trim();
    
    if (!codigo) {
        showMessage(mensagemRemoverDiv, 'Escaneie o código de barras', 'error');
        return;
    }
    
    try {
        // Buscar palete
        const paleteRef = ref(database, `paletes/${codigo}`);
        const snapshot = await get(paleteRef);
        
        if (!snapshot.exists()) {
            showMessage(mensagemRemoverDiv, 'Palete não encontrado', 'error');
            infoPaleteDiv.innerHTML = '';
            return;
        }
        
        const paleteData = snapshot.val();
        
        // Mostrar informações
        infoPaleteDiv.innerHTML = `
            <h3>Informações do Palete</h3>
            <p><strong>Código:</strong> ${paleteData.codigo}</p>
            <p><strong>Localização:</strong> ${paleteData.bloco}-${paleteData.posicao}-${paleteData.altura}</p>
            <p><strong>Total de Itens:</strong> ${paleteData.totalItens}</p>
            <h4>Famílias:</h4>
            <ul>
                ${Object.entries(paleteData.familias).map(([familia, qtd]) => 
                    `<li>${familia}: ${qtd} itens</li>`).join('')}
            </ul>
            <button id="confirmarRemocao" class="btn-danger">Confirmar Remoção</button>
        `;
        
        document.getElementById('confirmarRemocao').addEventListener('click', async () => {
            try {
                // Remover de todas as referências
                await Promise.all([
                    remove(paleteRef),
                    remove(ref(database, `blocos/${paleteData.bloco}/posicoes/${paleteData.posicao}/altura${paleteData.altura}`)),
                    atualizarResumoBloco(paleteData.bloco, paleteData.familias, 'remover'),
                    set(ref(database, `historico/${Date.now()}`), {
                        acao: "saida",
                        codigo: paleteData.codigo,
                        bloco: paleteData.bloco,
                        posicao: paleteData.posicao,
                        altura: paleteData.altura,
                        data: new Date().toISOString()
                    })
                ]);
                
                showMessage(mensagemRemoverDiv, `Palete ${codigo} removido com sucesso`, 'success');
                infoPaleteDiv.innerHTML = '';
                codigoBarrasRemover.value = '';
            } catch (error) {
                showMessage(mensagemRemoverDiv, `Erro ao remover palete: ${error.message}`, 'error');
            }
        });
    } catch (error) {
        showMessage(mensagemRemoverDiv, `Erro ao buscar palete: ${error.message}`, 'error');
    }
}

// Funções para consultar palete
async function consultarPalete() {
    const codigo = codigoBarrasConsultar.value.trim();
    
    if (!codigo) {
        infoConsultaDiv.innerHTML = '<p class="error">Escaneie o código de barras</p>';
        return;
    }
    
    try {
        const paleteRef = ref(database, `paletes/${codigo}`);
        const snapshot = await get(paleteRef);
        
        if (!snapshot.exists()) {
            infoConsultaDiv.innerHTML = '<p class="error">Palete não encontrado</p>';
            return;
        }
        
        const paleteData = snapshot.val();
        
        infoConsultaDiv.innerHTML = `
            <h3>Informações do Palete</h3>
            <p><strong>Código:</strong> ${paleteData.codigo}</p>
            <p><strong>Localização:</strong> ${paleteData.bloco}-${paleteData.posicao}-${paleteData.altura}</p>
            <p><strong>Total de Itens:</strong> ${paleteData.totalItens}</p>
            <p><strong>Data de Registro:</strong> ${new Date(paleteData.dataRegistro).toLocaleString()}</p>
            <h4>Famílias:</h4>
            <ul>
                ${Object.entries(paleteData.familias).map(([familia, qtd]) => 
                    `<li>${familia}: ${qtd} itens</li>`).join('')}
            </ul>
        `;
    } catch (error) {
        infoConsultaDiv.innerHTML = `<p class="error">Erro ao buscar palete: ${error.message}</p>`;
    }
}

// Funções para visualizar blocos
async function carregarVisaoBlocos() {
    try {
        blocosContainer.innerHTML = '<p>Carregando informações dos blocos...</p>';
        
        const blocosRef = ref(database, 'blocos');
        const snapshot = await get(blocosRef);
        
        if (!snapshot.exists()) {
            blocosContainer.innerHTML = '<p>Nenhum bloco encontrado</p>';
            return;
        }
        
        const blocosData = snapshot.val();
        let html = '';
        
        // Gerar cards para cada bloco
        for (let i = 1; i <= 9; i++) {
            const bloco = `b${i}`;
            const blocoData = blocosData[bloco] || {};
            const resumo = blocoData.resumo || {};
            const posicoes = blocoData.posicoes || {};
            
            // Calcular ocupação
            let posicoesOcupadas = 0;
            Object.values(posicoes).forEach(posicao => {
                Object.values(posicao).forEach(altura => {
                    if (altura !== null) posicoesOcupadas++;
                });
            });
            
            const ocupacaoPercentual = Math.round((posicoesOcupadas / (posicoesPorBloco * alturasPorPosicao)) * 100);
            
            // Gerar visualização das posições
            let posicoesHTML = '';
            for (let p = 1; p <= posicoesPorBloco; p++) {
                posicoesHTML += `
                    <div class="posicao-item">
                        <strong>Posição ${p}:</strong>
                        ${[1, 2, 3].map(a => {
                            const ocupada = posicoes[p] && posicoes[p][`altura${a}`];
                            return `<span class="altura-status ${ocupada ? 'ocupada' : 'disponivel'}">${a}</span>`;
                        }).join(' ')}
                    </div>
                `;
            }
            
            html += `
                <div class="bloco-card">
                    <h3>Bloco ${bloco.toUpperCase()}</h3>
                    <div class="bloco-info">
                        <p><strong>Ocupação:</strong> ${posicoesOcupadas}/${posicoesPorBloco * alturasPorPosicao} (${ocupacaoPercentual}%)</p>
                        <div class="posicoes-container">
                            ${posicoesHTML}
                        </div>
                    </div>
                    <h4>Famílias no Bloco:</h4>
                    ${Object.keys(resumo).length > 0 ? 
                        Object.entries(resumo).map(([familia, qtd]) => 
                            `<p>${familia}: ${qtd} itens</p>`).join('') :
                        '<p>Nenhuma família registrada</p>'}
                </div>
            `;
        }
        
        blocosContainer.innerHTML = html;
    } catch (error) {
        blocosContainer.innerHTML = `<p class="error">Erro ao carregar blocos: ${error.message}</p>`;
    }
}

// Função auxiliar para mostrar mensagens
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = 'mensagem ' + type;
    setTimeout(() => {
        element.textContent = '';
        element.className = 'mensagem';
    }, 5000);
}

// Simular leitor de código de barras (para teste)
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text' && e.key === 'Enter') {
        if (!e.target.value) {
            e.target.value = 'PAL' + Math.floor(1000 + Math.random() * 9000);
        }
    }
});