// Aponta para a porta correta do teu Python Local
const API_URL = "https://pikamon-ai.onrender.com";

document.getElementById("suggest-btn").addEventListener("click", async () => {
    const input = document.getElementById("opponent-input").value;
    const loading = document.getElementById("loading");
    const errorMsg = document.getElementById("error-message");
    const resultSection = document.getElementById("result-section");
    const teamContainer = document.getElementById("team-container");

    // Limpar estados anteriores
    errorMsg.classList.add("hidden");
    resultSection.classList.add("hidden");
    teamContainer.innerHTML = "";

    // Criar a lista de Pokémons separados por vírgula
    const opponentTeam = input.split(",").map(p => p.trim()).filter(p => p.length > 0);

    if (opponentTeam.length === 0) {
        errorMsg.innerText = "Por favor, introduz pelo menos um Pokémon adversário.";
        errorMsg.classList.remove("hidden");
        return;
    }

    loading.classList.remove("hidden");

    try {
        const response = await fetch(`${API_URL}/suggest-team`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opponent_team: opponentTeam })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Erro ao gerar equipa.");
        }

        // Mostrar os resultados da IA na tela
        loading.classList.add("hidden");
        resultSection.classList.remove("hidden");

        // Guardar a equipa atual numa variável global para podermos salvar depois
        window.equipaGeradaAtual = data.suggested_team;

        data.suggested_team.forEach(item => {
            // Transformar o nome num formato limpo para a API de imagens
            const pokemonNomeLimpo = item.pokemon.toLowerCase().trim().replace(" ", "-");
            
            // Link oficial da imagem
            const imagemUrl = `https://img.pokemondb.net/sprites/home/normal/${pokemonNomeLimpo}.png`;

            const card = document.createElement("div");
            card.className = "pokemon-card";
            card.innerHTML = `
                <img src="${imagemUrl}" alt="${item.pokemon}" style="width: 120px; height: 120px; object-fit: contain; display: block; margin: 0 auto 10px;" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';">
                <h3>🦖 ${item.pokemon}</h3>
                <p>${item.reason}</p>
            `;
            teamContainer.appendChild(card);
        });

        // 🛡️ CORRIGIDO: Verifica se o utilizador está autenticado (seja por token ou sessão local)
        const token = localStorage.getItem("token") || localStorage.getItem("utilizadorLogado");
        
        if (token) {
            // Remove botão antigo se existir para não duplicar
            const botaoAntigo = document.getElementById("save-team-btn");
            if (botaoAntigo) botaoAntigo.remove();

            const saveBtn = document.createElement("button");
            saveBtn.id = "save-team-btn";
            saveBtn.innerText = "💾 Guardar esta Equipa no meu Perfil";
            saveBtn.style.marginTop = "20px";
            saveBtn.style.backgroundColor = "#28a745";
            saveBtn.style.color = "white";
            saveBtn.style.padding = "10px 20px";
            saveBtn.style.border = "none";
            saveBtn.style.borderRadius = "5px";
            saveBtn.style.cursor = "pointer";
            saveBtn.style.fontWeight = "bold";
            
            async function tentarGuardarNoServidor(dados, tentativa = 1) {
                const jwtToken = localStorage.getItem("token");
                if (!jwtToken) return false;
                try {
                    const res = await fetch(`${API_URL}/guardar-equipa`, {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${jwtToken}` 
                        },
                        body: JSON.stringify({ equipa: JSON.stringify(dados) })
                    });
                    return res.ok;
                } catch (err) {
                    if (tentativa < 2) {
                        await new Promise(r => setTimeout(r, 3000));
                        return tentarGuardarNoServidor(dados, 2);
                    }
                    return false;
                }
            }

            saveBtn.addEventListener("click", async () => {
                const dadosParaGuardar = {
                    oponentes: input,
                    counters: window.equipaGeradaAtual,
                    data: new Date().toLocaleDateString('pt-PT')
                };

                // Tentar salvar no servidor (com retry se o Render estiver a dormir)
                const servidorOk = await tentarGuardarNoServidor(dadosParaGuardar);
                if (servidorOk) {
                    alert("Equipa guardada com sucesso no servidor!");
                    return;
                }

                // 🔄 FALLBACK LOCAL: Se falhar, salva no navegador
                let historicoLocal = JSON.parse(localStorage.getItem("historicoEquipas")) || [];
                historicoLocal.push(dadosParaGuardar);
                localStorage.setItem("historicoEquipas", JSON.stringify(historicoLocal));
                alert("Guardado no navegador — as tuas equipas ficam seguras mesmo depois de sair!");
            });

            resultSection.appendChild(saveBtn);
        }

    } catch (error) {
        loading.classList.add("hidden");
        errorMsg.innerText = error.message;
        errorMsg.classList.remove("hidden");
    } 
});