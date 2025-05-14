document.addEventListener('DOMContentLoaded', () => {
    // Elementos da UI
    const iframeElement = document.querySelector('#soundcloud-player');
    const widget = SC.Widget(iframeElement);
    
    // Elementos para informações da música e controles
    const albumArtImg = document.getElementById('album-art');
    const trackTitleEl = document.getElementById('track-title');
    const trackArtistEl = document.getElementById('track-artist');
    const playPauseBtn = document.getElementById('play-pause');
    const prevTrackBtn = document.getElementById('prev-track');
    const nextTrackBtn = document.getElementById('next-track');
    const currentYearEl = document.getElementById('current-year');

    // Elementos para a NOVA exibição de letras (janela de 3 linhas)
    const lyricPrevEl = document.getElementById('lyric-prev');
    const lyricCurrentEl = document.getElementById('lyric-current');
    const lyricNextEl = document.getElementById('lyric-next');

    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }

    const placeholderAlbumArt = 'placeholder-album-art.png'; 

    const playlistData = [
        {
            soundCloudTrackTitle: "Chupa Vinicius (Yara Alho na Frente)",
            lrcFile: "lyrics/chupa_vinicius_yara_alho_na_frente.lrc",
            // Adicionar trackUrl para Parte 2 (seleção de músicas)
            // trackUrl: "URL_DA_FAIXA_INDIVIDUAL_NO_SOUNDCLOUD", 
            // artworkUrl: "URL_DA_IMAGEM_DE_CAPA.jpg" 
        },
        {
            soundCloudTrackTitle: "Luta dos Bits",
            lrcFile: "lyrics/luta_dos_bits.lrc",
        },
        {
            soundCloudTrackTitle: "O Rei dos Animes",
            lrcFile: "lyrics/o_rei_dos_animes.lrc",
        },
        {
            soundCloudTrackTitle: "A Lenda Cenoltz",
            lrcFile: "lyrics/a_lenda_cenoltz.lrc",
        },
        {
            soundCloudTrackTitle: "O Jedi Remanescente",
            lrcFile: "lyrics/o_jedi_remanescente.lrc",
        },
        {
            soundCloudTrackTitle: "AzGame Infernal",
            lrcFile: "lyrics/azgame_infernal.lrc",
        },
        {
            soundCloudTrackTitle: "O Novo John Helldiver",
            lrcFile: "lyrics/o_novo_john_helldiver.lrc",
        },
        {
            soundCloudTrackTitle: "AZGame (Fui lá Responder)",
            lrcFile: "lyrics/azgame.lrc",
        },
        {
            soundCloudTrackTitle: "O Lado Enzo da Força",
            lrcFile: "lyrics/o_lado_enzo_da_forca.lrc",
        },
        {
            soundCloudTrackTitle: "Chupa Vinicius (Deixa de Mancada)",
            lrcFile: "lyrics/chupa_vinicius_versao_pagode.lrc",
        },
        {
            soundCloudTrackTitle: "Chupa Vinicius (Acorda!)",
            lrcFile: "lyrics/chupa_vinicius_evanescense_version.lrc",
        },
        {
            soundCloudTrackTitle: "O Último Suspiro de Astora",
            lrcFile: "lyrics/o_ultimo_suspiro_de_astora.lrc",
        },
        {
            soundCloudTrackTitle: "Vocês vão ver só!",
            lrcFile: "lyrics/voces_vao_ver_so.lrc",
        },
        {
            soundCloudTrackTitle: "Platinou!",
            lrcFile: "lyrics/platinou.lrc",
        },
        {
            soundCloudTrackTitle: "Denner: Social Link Broken",
            lrcFile: "lyrics/denner_social_link_broken.lrc",
        },
        {
            soundCloudTrackTitle: "Olha quem chegou!",
            lrcFile: "lyrics/olha_quem_chegou.lrc",
        },
        {
            soundCloudTrackTitle: "Yara Alho",
            lrcFile: "lyrics/yara_alho.lrc",
        }
    ];

    let currentLyrics = [];
    let currentSongData = null;
    let lastPlayedTime = 0;
    let currentSoundInfo = null;
    let isPlaying = false;
    let lastActiveLineIndex = -2; // Para detectar mudança na linha ativa

    async function fetchLRC(filePath) {
        console.log(`[DEBUG] fetchLRC: Tentando buscar arquivo em ${filePath}`);
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Erro ao carregar LRC: ${response.statusText} (${filePath})`);
            }
            const lrcContent = await response.text();
            const parsedLyrics = parseLRC(lrcContent);
            return parsedLyrics;
        } catch (error) {
            console.error(`[DEBUG] fetchLRC: Erro dentro do catch para ${filePath}:`, error);
            if (lyricCurrentEl) {
                lyricCurrentEl.innerHTML = `<span class="error-message">Erro ao carregar: ${filePath.split('/').pop()}</span>`;
            }
            if (lyricPrevEl) lyricPrevEl.innerHTML = '&nbsp;';
            if (lyricNextEl) lyricNextEl.innerHTML = '&nbsp;';
            return [];
        }
    }

    function parseLRC(lrcContent) {
        const lines = lrcContent.trim().split('\n');
        const lyrics = [];
        const timeRegex = /\[(\d{2}):(\d{2}):(\d{2})\]/; 

        lines.forEach((line) => {
            const match = line.match(timeRegex);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
                const time = (minutes * 60 + seconds + milliseconds / 1000);
                const text = line.substring(match[0].length).trim();
                if (text) {
                    lyrics.push({ time, text }); // Não precisamos mais do ID para GSAP em todas as linhas
                }
            }
        });
        console.log("[DEBUG] parseLRC: Array de letras final (primeiras 5):", lyrics.slice(0,5));
        return lyrics.sort((a, b) => a.time - b.time);
    }

    async function loadLyricsAndInfo(soundCloudTitle) {
        console.log(`[DEBUG] loadLyricsAndInfo: Carregando informações para SoundCloud Title: "${soundCloudTitle}"`);
        lastActiveLineIndex = -2; // Reseta o índice da última linha ativa
        const songData = playlistData.find(song => {
            const formatStr = (str) => str ? str.toLowerCase().replace(/\s+/g, ' ').trim() : "";
            const songTitleFromData = song.soundCloudTrackTitle ? song.soundCloudTrackTitle.toLowerCase().replace(/\s+/g, ' ').trim() : "";
            return songTitleFromData === formatStr(soundCloudTitle);
        });
        console.log("[DEBUG] loadLyricsAndInfo: songData encontrado em playlistData:", songData);

        // Limpa as letras atuais antes de carregar novas
        if (lyricCurrentEl) lyricCurrentEl.innerHTML = '<p class="lyric-line status-message">Carregando letras...</p>';
        if (lyricPrevEl) lyricPrevEl.innerHTML = '&nbsp;';
        if (lyricNextEl) lyricNextEl.innerHTML = '&nbsp;';
        
        currentLyrics = []; // Limpa letras antigas

        if (songData) {
            currentSongData = songData;
            currentLyrics = await fetchLRC(songData.lrcFile);
            console.log(`[DEBUG] loadLyricsAndInfo: currentLyrics após fetchLRC (Total de ${currentLyrics.length} linhas). Primeiras 5:`, currentLyrics.slice(0,5));

            if (currentLyrics.length > 0) {
                displayLyrics(0, true); // Chama com currentTime = 0. O 'true' é para o estado inicial.
            } else if (lyricCurrentEl && !lyricCurrentEl.querySelector('.error-message')) {
                lyricCurrentEl.innerHTML = '<p class="lyric-line status-message">Letras não disponíveis ou vazias.</p>';
            }
        } else {
            currentSongData = null; // Garante que não haja dados de música anterior
            if (lyricCurrentEl) lyricCurrentEl.innerHTML = `<p class="lyric-line status-message">Letras para "${soundCloudTitle}" não encontradas.</p>`;
        }

        if (currentSoundInfo) {
            trackTitleEl.textContent = currentSoundInfo.title || "Título Desconhecido";
            trackArtistEl.textContent = currentSoundInfo.user?.username || "Artista Desconhecido";
            albumArtImg.src = currentSoundInfo.artwork_url?.replace('-large.jpg', '-t500x500.jpg') || placeholderAlbumArt;
            gsap.fromTo([albumArtImg, trackTitleEl, trackArtistEl],
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: "power2.out" }
            );
        } else {
            trackTitleEl.textContent = "Aguardando música...";
            trackArtistEl.textContent = "";
            albumArtImg.src = placeholderAlbumArt;
        }
    }

    function displayLyrics(currentTime, forceInitialSetup = false) { // Renomeado forceRedraw para clareza
        // console.log(`[DEBUG] displayLyrics: INÍCIO. currentTime = ${currentTime.toFixed(3)}s, forceInitialSetup = ${forceInitialSetup}, currentLyrics.length = ${currentLyrics.length}`);
        if (!lyricCurrentEl) return; // Sai se os elementos da UI não existirem

        if (!currentLyrics.length) {
            if (forceInitialSetup) { // Apenas limpa se for a configuração inicial de uma música sem letras
                lyricPrevEl.innerHTML = '&nbsp;';
                lyricCurrentEl.innerHTML = '<p class="lyric-line status-message">Sem letras para exibir.</p>';
                lyricNextEl.innerHTML = '&nbsp;';
            }
            return;
        }

        let activeLineIndex = -1;
        for (let i = currentLyrics.length - 1; i >= 0; i--) {
            if (currentTime >= currentLyrics[i].time) {
                activeLineIndex = i;
                break;
            }
        }
        
        // Evita processamento desnecessário se a linha ativa não mudou
        if (!forceInitialSetup && activeLineIndex === lastActiveLineIndex) {
            return;
        }
        lastActiveLineIndex = activeLineIndex; // Atualiza a última linha ativa processada


        // console.log(`[DEBUG] displayLyrics: activeLineIndex determinado: ${activeLineIndex}`);

        if (activeLineIndex !== -1 && currentLyrics[activeLineIndex]) {
            // Linha Atual
            const currentText = currentLyrics[activeLineIndex].text;
            if (lyricCurrentEl.textContent !== currentText) {
                 // console.log(`[DEBUG] displayLyrics: Atualizando linha ATUAL para idx ${activeLineIndex}: "${currentText.substring(0,30)}"`);
                gsap.to(lyricCurrentEl, {opacity: 0, duration: 0.15, ease: "power1.in", onComplete: () => {
                    lyricCurrentEl.textContent = currentText;
                    gsap.to(lyricCurrentEl, {opacity: 1, duration: 0.25, ease: "power1.out"});
                }});
            }

            // Linha Anterior
            if (lyricPrevEl) {
                const prevText = (activeLineIndex > 0 && currentLyrics[activeLineIndex - 1]) ? currentLyrics[activeLineIndex - 1].text : '&nbsp;';
                if (lyricPrevEl.innerHTML !== prevText) { // innerHTML por causa do &nbsp;
                    // console.log(`[DEBUG] displayLyrics: Atualizando linha ANTERIOR: "${prevText.substring(0,30)}"`);
                    gsap.to(lyricPrevEl, {opacity: 0, duration: 0.15, ease: "power1.in", onComplete: () => {
                        lyricPrevEl.innerHTML = prevText; // Usar innerHTML para &nbsp;
                        gsap.to(lyricPrevEl, {opacity: 0.6, duration: 0.25, ease: "power1.out"}); // Opacidade de contexto
                    }});
                }
            }

            // Próxima Linha
            if (lyricNextEl) {
                const nextText = (activeLineIndex < currentLyrics.length - 1 && currentLyrics[activeLineIndex + 1]) ? currentLyrics[activeLineIndex + 1].text : '&nbsp;';
                if (lyricNextEl.innerHTML !== nextText) {
                    // console.log(`[DEBUG] displayLyrics: Atualizando linha PRÓXIMA: "${nextText.substring(0,30)}"`);
                     gsap.to(lyricNextEl, {opacity: 0, duration: 0.15, ease: "power1.in", onComplete: () => {
                        lyricNextEl.innerHTML = nextText; // Usar innerHTML para &nbsp;
                        gsap.to(lyricNextEl, {opacity: 0.6, duration: 0.25, ease: "power1.out"}); // Opacidade de contexto
                    }});
                }
            }
        } else { // Nenhuma linha ativa (antes da primeira letra)
            // console.log("[DEBUG] displayLyrics: Nenhuma linha ativa (ou índice inválido). Configurando estado inicial/prévia.");
            const initialCurrentText = currentLyrics.length > 0 ? currentLyrics[0].text : 'Letras carregadas';
            const initialNextText = currentLyrics.length > 1 ? currentLyrics[1].text : '&nbsp;';

            if (lyricCurrentEl.textContent !== initialCurrentText) lyricCurrentEl.textContent = initialCurrentText;
            if (lyricPrevEl) lyricPrevEl.innerHTML = '&nbsp;';
            if (lyricNextEl && lyricNextEl.innerHTML !== initialNextText) lyricNextEl.innerHTML = initialNextText;
            
            gsap.set(lyricCurrentEl, {opacity: 0.7}); // Menos destaque para prévia
            if (lyricPrevEl) gsap.set(lyricPrevEl, {opacity: 0.6});
            if (lyricNextEl) gsap.set(lyricNextEl, {opacity: 0.6});
        }
        // console.log(`[DEBUG] displayLyrics: FIM. currentTime = ${currentTime.toFixed(3)}s`);
    }

    function updatePlayPauseButton(playing) {
        isPlaying = playing;
        if (playing) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playPauseBtn.setAttribute('aria-label', 'Pausar');
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            playPauseBtn.setAttribute('aria-label', 'Tocar');
        }
    }

    widget.bind(SC.Widget.Events.READY, () => {
        console.log('SoundCloud Widget Pronto!');
        widget.getVolume((volume) => console.log('Volume inicial:', volume));

        widget.isPaused((paused) => {
            updatePlayPauseButton(!paused);
        });
        widget.getCurrentSound((sound) => {
            if (sound) {
                currentSoundInfo = sound;
                console.log(`[DEBUG] Evento READY: Título da música do SoundCloud: "${sound.title}"`);
                loadLyricsAndInfo(sound.title);
            } else {
                trackTitleEl.textContent = "Nenhuma música carregada";
                trackArtistEl.textContent = "Playlist vazia ou erro";
                albumArtImg.src = placeholderAlbumArt;
                if (lyricCurrentEl) lyricCurrentEl.textContent = "Playlist vazia ou erro no player.";
            }
        });
    });

    widget.bind(SC.Widget.Events.PLAY, (eventData) => {
        updatePlayPauseButton(true);
        widget.getCurrentSound((sound) => { 
            if (sound) {
                currentSoundInfo = sound; 
                console.log(`[DEBUG] Evento PLAY: Título da música do SoundCloud: "${sound.title}"`);
                const playTime = eventData?.currentPosition / 1000 || 0;

                if (!currentSongData || currentSongData.soundCloudTrackTitle.toLowerCase().trim() !== sound.title.toLowerCase().trim()) {
                    console.log(`[DEBUG] Evento PLAY: Título mudou. Chamando loadLyricsAndInfo.`);
                    loadLyricsAndInfo(sound.title);
                } else {
                    console.log("[DEBUG] Evento PLAY: Mesma música. Sincronizando com playTime:", playTime.toFixed(3));
                    displayLyrics(playTime, false); // Apenas atualiza a linha ativa, não redesenha tudo
                }
            }
        });
    });
    
    widget.bind(SC.Widget.Events.PAUSE, () => {
        updatePlayPauseButton(false);
    });

    widget.bind(SC.Widget.Events.PLAY_PROGRESS, (eventData) => {
        const currentTime = eventData.currentPosition / 1000;
        // Descomente para log MUITO verboso:
        // console.log(`[DEBUG] PLAY_PROGRESS: currentTime = ${currentTime.toFixed(3)}s`); 
        if (Math.abs(currentTime - lastPlayedTime) > 0.15) { // Intervalo um pouco menor para mais responsividade
            displayLyrics(currentTime, false);
            lastPlayedTime = currentTime;
        }
    });

    widget.bind(SC.Widget.Events.FINISH, () => { 
        console.log('Música terminou.');
        updatePlayPauseButton(false);
        if (lyricCurrentEl) lyricCurrentEl.textContent = "A música terminou.";
        if (lyricPrevEl) lyricPrevEl.innerHTML = '&nbsp;';
        if (lyricNextEl) lyricNextEl.innerHTML = '&nbsp;';
    });

    widget.bind(SC.Widget.Events.ERROR, (error) => { 
        console.error('Erro no SoundCloud Widget:', error);
        if (lyricCurrentEl) lyricCurrentEl.textContent = "Erro no player.";
        if (lyricPrevEl) lyricPrevEl.innerHTML = '&nbsp;';
        if (lyricNextEl) lyricNextEl.innerHTML = '&nbsp;';
        trackTitleEl.textContent = "Erro";
        trackArtistEl.textContent = "Não foi possível carregar";
        albumArtImg.src = placeholderAlbumArt;
        updatePlayPauseButton(false);
    });

    playPauseBtn.addEventListener('click', () => { 
        widget.toggle();
    });
    prevTrackBtn.addEventListener('click', () => { 
        widget.prev();
    });
    nextTrackBtn.addEventListener('click', () => { 
        widget.next();
    });

    // Animações de entrada iniciais para o cabeçalho
    gsap.from("header h1", { duration: 1, y: -50, opacity: 0, ease: "bounce.out" });
    gsap.from("header p", { duration: 1, y: -30, opacity: 0, ease: "power2.out", delay: 0.3 });

    // TODO: Parte 2 - Lógica para renderizar e interagir com a lista de músicas (tracklist-section)
});