(() => {
    const storage = window.localStorage;
    const app = document.getElementById('workView');
    let activeNav = 'home';
    let recognition = null;
    let artworkUrl = null;
    let jarvisInstance = null;
    let quizIndex = 0;
    let quizScore = 0;
    const quizQuestions = [
        { question: 'Which planet is known as the Red Planet?', answers: ['Venus', 'Mars', 'Jupiter'], correct: 1 },
        { question: 'What does HTML describe?', answers: ['Web page structure', 'A database', 'An operating system'], correct: 0 },
        { question: 'How many sides does a hexagon have?', answers: ['Five', 'Six', 'Eight'], correct: 1 }
    ];

    const readList = (key) => {
        try {
            const value = JSON.parse(storage.getItem(key) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.error(`Could not read ${key} from local storage`, error);
            return [];
        }
    };

    const saveList = (key, value) => {
        try {
            storage.setItem(key, JSON.stringify(value));
        } catch (error) {
            alert(`Could not save your data in this browser: ${error.message}`);
        }
    };

    function initializeJarvis() {
        updateDateTime();
        updateSystemStats();
        try {
            jarvisInstance = window.Jarvis ? window.Jarvis.init({ autoLearning: true }) : null;
        } catch (error) {
            console.error('JARVIS brain could not initialize', error);
            document.getElementById('statusText').textContent = 'Brain unavailable';
        }
        updateConnectionStatus();
        updateGreeting();
        updateFeatureStatuses();
        startAnimations();
        switchNav(document.querySelector('.nav-item.active'), 'home');
    }

    function updateDateTime() {
        const now = new Date();
        document.getElementById('dateDisplay').textContent = now.toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        document.getElementById('timeDisplay').textContent = now.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function updateGreeting() {
        const greeting = document.querySelector('.header-left span');
        const name = storage.getItem('jarvisDisplayName') || 'Sankar';
        greeting.replaceChildren(document.createTextNode(`"Hello ${name}, I'm JARVIS.`), document.createElement('br'), document.createTextNode('How can I help you today?"'));
    }

    function updateConnectionStatus() {
        const online = navigator.onLine;
        document.getElementById('statusText').textContent = online ? 'Online · offline assistant' : 'Offline';
        const indicator = document.querySelector('.status-indicator');
        indicator.style.background = online ? 'var(--accent-green)' : '#ffb347';
        indicator.style.boxShadow = online ? '0 0 10px var(--accent-green)' : '0 0 10px #ffb347';
    }

    function updateSystemStats() {
        const memory = navigator.deviceMemory;
        document.getElementById('cpuValue').textContent = 'Unavailable';
        document.getElementById('cpuBar').style.width = '0%';
        document.getElementById('ramValue').textContent = memory ? `Device: ${memory} GB` : 'Unavailable';
        document.getElementById('ramBar').style.width = memory ? `${Math.min(100, memory * 8)}%` : '0%';
        document.getElementById('storageValue').textContent = 'Checking…';
        document.querySelector('.network-status span').textContent = navigator.onLine ? 'Online' : 'Offline';
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then((estimate) => {
                if (estimate.quota && estimate.usage !== undefined) {
                    const percentage = Math.min(100, Math.round(estimate.usage / estimate.quota * 100));
                    document.getElementById('storageValue').textContent = `${percentage}% browser storage`;
                    document.getElementById('storageBar').style.width = `${percentage}%`;
                } else {
                    document.getElementById('storageValue').textContent = 'Unavailable';
                    document.getElementById('storageBar').style.width = '0%';
                }
            }).catch((error) => {
                console.warn('Browser storage estimate unavailable', error);
                document.getElementById('storageValue').textContent = 'Unavailable';
            });
        } else {
            document.getElementById('storageValue').textContent = 'Unavailable';
        }
    }

    function updateBrainActivity() {
        const stats = jarvisInstance && jarvisInstance.brain.getBrainStats();
        const training = stats ? stats.trainingDataSize : 0;
        const memoryCount = stats ? stats.longTermMemorySize : 0;
        const noteCount = readList('jarvisNotes').length;
        const openTasks = readList('jarvisTasks').filter((task) => !task.done).length;
        const values = [
            ['brainExamples', 'brainExamplesBar', training],
            ['brainMemories', 'brainMemoriesBar', memoryCount],
            ['brainNotes', 'brainNotesBar', noteCount],
            ['brainTasks', 'brainTasksBar', openTasks]
        ];
        values.forEach(([labelId, barId, value]) => {
            const label = document.getElementById(labelId);
            const bar = document.getElementById(barId);
            if (label) label.textContent = String(value);
            if (bar) bar.style.width = `${Math.min(100, value * 10)}%`;
        });
        const amount = Math.min(99, training * 10);
        ['bar1', 'bar2', 'bar3', 'bar4', 'bar5'].forEach((id, index) => {
            document.getElementById(id).style.height = `${Math.max(4, amount - index * 2)}%`;
        });
    }

    function updateFeatureStatuses() {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        document.getElementById('voiceFeatureStatus').textContent = Recognition ? 'Supported' : 'Unavailable';
    }

    function startAnimations() {
        updateBrainActivity();
    }

    function setResult(id, message) {
        const output = document.getElementById(id);
        if (output) output.textContent = message;
    }

    function titleFor(nav) {
        return ({
            chat: 'AI Chat',
            voice: 'Voice Control',
            'ai-tools': 'AI Tools',
            files: 'Files & System',
            code: 'Code Assistant',
            learning: 'Learning',
            studio: 'Creative Studio',
            entertainment: 'Entertainment',
            settings: 'Settings'
        })[nav] || 'JARVIS';
    }

    function renderView(nav) {
        const intro = `<div class="view-stack"><div><h2>${titleFor(nav)}</h2><p>Runs locally in your browser. External AI and device integrations are not configured.</p></div>`;
        const views = {
            chat: `${intro}<div id="chatMessages" class="result-box" aria-live="polite"></div><form data-form="chat" class="view-row"><input name="message" aria-label="Message" placeholder="Ask a question or type help…" required><button>Send</button></form><p class="muted">Offline commands: help, time, calculate 2+2, remember …, recall, system info, search for …</p></div>`,
            voice: `${intro}<div class="view-row"><button data-action="voice-start">Start listening</button><button data-action="voice-stop">Stop listening</button><button data-action="voice-speak">Speak a test phrase</button></div><p id="voiceStatus" class="result-box">Speech recognition depends on browser support and microphone permission.</p></div>`,
            'ai-tools': `${intro}<h3>Calculator</h3><form data-form="calculate" class="view-row"><input name="expression" placeholder="Example: (12 + 8) / 4" aria-label="Math expression" required><button>Calculate</button></form><pre id="calculatorResult" class="result-box"></pre><h3>System information</h3><button data-action="system-info">Read browser and device information</button><pre id="systemResult" class="result-box"></pre></div>`,
            files: `${intro}<p>Choose files to inspect their names, types, and sizes. Files stay on your device; this page does not upload them.</p><input id="filePicker" type="file" multiple><div id="fileList" class="result-box">No files selected.</div><button data-action="file-clear" class="danger">Clear selection</button></div>`,
            code: `${intro}<p>Paste a snippet for a lightweight offline review. Code is inspected as text and is never executed.</p><textarea id="codeInput" aria-label="Code snippet" placeholder="Paste code here…"></textarea><div class="view-row"><button data-action="code-review">Review snippet</button><button data-action="code-clear" class="danger">Clear</button></div><pre id="codeResult" class="result-box"></pre></div>`,
            learning: `${intro}<h3>Private notes</h3><form data-form="note" class="view-row"><input name="note" placeholder="Add a learning note…" aria-label="Learning note" required><button>Save note</button></form><div id="notesList"></div><h3>Study flashcards</h3><form data-form="card" class="view-stack"><input name="question" placeholder="Question" required><input name="answer" placeholder="Answer" required><button>Save flashcard</button></form><div id="cardsList"></div><h3>Life planner</h3><form data-form="task" class="view-row"><input name="task" placeholder="Add a goal or task…" required><button>Add task</button></form><div id="tasksList"></div></div>`,
            studio: `${intro}<p>Create a simple poster locally on a canvas, then download it as a PNG.</p><form data-form="art" class="view-stack"><input name="title" placeholder="Poster title" aria-label="Poster title" required><input name="subtitle" placeholder="Subtitle (optional)" aria-label="Poster subtitle"><button>Create poster</button></form><canvas id="artCanvas" width="900" height="520" aria-label="Poster preview"></canvas><div><button data-action="art-download">Download PNG</button></div></div>`,
            entertainment: `${intro}<p>A short offline quiz. Your score stays in this page and is not uploaded.</p><h3 id="quizQuestion"></h3><div id="quizAnswers" class="view-stack"></div><p id="quizResult" class="result-box" aria-live="polite"></p><button data-action="quiz-next">Next question</button></div>`,
            settings: `${intro}<label>Display name<input id="displayName" maxlength="40" placeholder="Your name"></label><button data-action="settings-save">Save display name</button><p class="muted">Brain, notes, tasks, and settings are stored in this browser profile.</p><div class="view-row"><button data-action="brain-export">Export brain backup</button><label class="work-button">Import brain backup<input id="brainImport" type="file" accept="application/json" hidden></label></div><button data-action="data-clear" class="danger">Clear JARVIS browser data</button><pre id="settingsResult" class="result-box"></pre></div>`
        };
        if (nav === 'home') {
            app.classList.remove('active');
            document.querySelector('.content').style.display = '';
            document.querySelector('.bottom-actions').style.display = '';
            return;
        }
        document.querySelector('.content').style.display = 'none';
        document.querySelector('.bottom-actions').style.display = 'none';
        app.innerHTML = views[nav] || `${intro}<p>This section is not available.</p></div>`;
        app.classList.add('active');
        if (nav === 'chat') renderChatHistory();
        if (nav === 'learning') {
            updateNotes();
            renderCards();
            renderTasks();
        }
        if (nav === 'entertainment') {
            quizIndex = 0;
            quizScore = 0;
            renderQuiz();
        }
        if (nav === 'settings') document.getElementById('displayName').value = storage.getItem('jarvisDisplayName') || '';
    }

    function switchNav(element, nav) {
        activeNav = nav;
        document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item === element));
        renderView(nav);
        if (nav !== 'home') addActivity(`Opened ${titleFor(nav)}`, 'jarvis');
    }

    function openSettings() {
        const settingsNav = Array.from(document.querySelectorAll('.nav-item')).find((item) => item.textContent.includes('Settings'));
        switchNav(settingsNav, 'settings');
    }

    function renderChatHistory() {
        const output = document.getElementById('chatMessages');
        if (!output) return;
        output.replaceChildren();
        const history = readList('jarvisChat').slice(-30);
        if (!history.length) {
            output.textContent = 'JARVIS is ready. This is an offline assistant; no language-model API is connected.';
            return;
        }
        history.forEach((entry) => {
            const line = document.createElement('p');
            line.textContent = `${entry.role === 'user' ? 'You' : 'JARVIS'}: ${entry.text}`;
            output.appendChild(line);
        });
        output.scrollTop = output.scrollHeight;
    }

    function evaluateMath(expression) {
        const tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/%]/g);
        if (!tokens || tokens.join('') !== expression.replace(/\s+/g, '')) throw new Error('Use numbers and +, -, *, /, %, and parentheses only.');
        const values = [];
        const operators = [];
        const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, 'u-': 3 };
        let previous = 'start';
        const apply = () => {
            const operator = operators.pop();
            if (operator === '(') throw new Error('Check your parentheses.');
            if (operator === 'u-') {
                if (!values.length) throw new Error('Incomplete expression.');
                values.push(-values.pop());
                return;
            }
            const right = values.pop();
            const left = values.pop();
            if (left === undefined || right === undefined) throw new Error('Incomplete expression.');
            values.push(operator === '+' ? left + right : operator === '-' ? left - right :
                operator === '*' ? left * right : operator === '/' ? left / right : left % right);
        };
        tokens.forEach((token) => {
            if (/^\d/.test(token)) {
                values.push(Number(token));
                previous = 'number';
            } else if (token === '(') {
                operators.push(token);
                previous = '(';
            } else if (token === ')') {
                while (operators.length && operators[operators.length - 1] !== '(') apply();
                if (operators.pop() !== '(') throw new Error('Check your parentheses.');
                previous = ')';
            } else {
                const operator = token === '-' && (previous === 'start' || previous === 'operator' || previous === '(') ? 'u-' : token;
                while (operators.length && operators[operators.length - 1] !== '(' &&
                    precedence[operators[operators.length - 1]] >= precedence[operator]) apply();
                operators.push(operator);
                previous = 'operator';
            }
        });
        while (operators.length) apply();
        if (values.length !== 1 || !Number.isFinite(values[0])) throw new Error('Expression has no finite result.');
        return values[0];
    }

    function systemSummary() {
        return [
            `Platform: ${navigator.platform || 'not reported by browser'}`,
            `Browser language: ${navigator.language || 'unknown'}`,
            `Online: ${navigator.onLine ? 'yes' : 'no'}`,
            `Logical processors: ${navigator.hardwareConcurrency || 'not exposed'}`,
            `Approximate device memory: ${navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'not exposed'}`,
            'CPU load, full RAM usage, disk usage, and installed apps are restricted by the browser.'
        ].join('\n');
    }

    function respondOffline(message) {
        const text = message.trim();
        const lower = text.toLowerCase();
        if (/^(help|what can you do)\??$/.test(lower)) {
            return 'I can tell the time/date, calculate arithmetic, save and recall notes, show browser system information, and open web searches. Full generative AI requires connecting a model service.';
        }
        if (/\b(time|date)\b/.test(lower)) return `It is ${new Date().toLocaleString()}.`;
        const calculation = lower.match(/^(?:calculate|compute|what is|solve)\s+(.+?)\??$/);
        if (calculation) {
            try { return `${calculation[1]} = ${evaluateMath(calculation[1])}`; }
            catch (error) { return error.message; }
        }
        const remember = text.match(/^remember\s+(.+)/i);
        if (remember) {
            const notes = readList('jarvisNotes');
            notes.push({ text: remember[1], created: new Date().toISOString() });
            saveList('jarvisNotes', notes);
            return 'Saved that note in this browser. Say “recall” to review your saved notes.';
        }
        if (/\b(recall|remembered|saved notes)\b/.test(lower)) {
            const notes = readList('jarvisNotes');
            return notes.length ? `Your recent notes:\n${notes.slice(-5).map((note) => `• ${note.text}`).join('\n')}` : 'You do not have any saved notes yet. Try “remember …”.';
        }
        if (/\b(system info|system information|device info)\b/.test(lower)) return systemSummary();
        const search = text.match(/^(?:search(?: the web)? for|look up)\s+(.+)/i);
        if (search) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(search[1])}`, '_blank', 'noopener,noreferrer');
            return `Opened a web search for “${search[1]}”.`;
        }
        if (/\bwho are you\b/.test(lower)) return 'I am JARVIS, your local browser assistant. I can run the built-in offline tools, but a connected AI model is needed for open-ended answers.';
        return 'I can’t answer open-ended questions without an AI model connection. Try “help” to see the offline commands available.';
    }

    function sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        if (!message) return;
        input.value = '';
        const reply = respondOffline(message);
        addActivity(`You: ${message}`, 'user');
        addActivity(`JARVIS: ${reply}`, 'jarvis');
        const history = readList('jarvisChat');
        history.push({ role: 'user', text: message }, { role: 'assistant', text: reply });
        saveList('jarvisChat', history.slice(-100));
        if (jarvisInstance) {
            jarvisInstance.brain.train(message, null, 'user_input');
            jarvisInstance.brain.saveOfflineBrain();
        }
        updateBrainActivity();
        if (activeNav === 'chat') renderChatHistory();
    }

    function addActivity(text, type) {
        const list = document.getElementById('activityList');
        if (!list) return;
        const empty = document.getElementById('emptyActivity');
        if (empty) empty.remove();
        const item = document.createElement('div');
        item.className = 'activity-item';
        const icon = document.createElement('div');
        icon.className = 'activity-icon';
        icon.textContent = type === 'user' ? 'U' : 'J';
        const content = document.createElement('div');
        content.className = 'activity-content';
        const title = document.createElement('div');
        title.className = 'activity-title';
        title.textContent = text;
        const time = document.createElement('div');
        time.className = 'activity-time';
        time.textContent = 'just now';
        content.append(title, time);
        item.append(icon, content);
        list.insertBefore(item, list.firstChild);
        while (list.children.length > 5) list.lastChild.remove();
        updateBrainActivity();
    }

    function toggleVoice() {
        if (recognition) {
            recognition.stop();
            return;
        }
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) {
            alert('Speech recognition is not supported in this browser. Try a supported Chromium browser or use text chat.');
            return;
        }
        recognition = new Recognition();
        recognition.lang = (jarvisInstance && jarvisInstance.brain.language) || 'en-US';
        recognition.interimResults = false;
        recognition.onstart = () => {
            document.getElementById('voiceBtn').classList.add('active');
            document.getElementById('listeningText').textContent = 'Listening…';
            document.getElementById('waveform').style.display = 'flex';
            setResult('voiceStatus', 'Listening. Speak a command.');
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('messageInput').value = transcript;
            const reply = respondOffline(transcript);
            sendMessage();
            setResult('voiceStatus', `You: ${transcript}\nJARVIS: ${reply}`);
            if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
        };
        recognition.onerror = (event) => setResult('voiceStatus', `Speech recognition error: ${event.error}. Check microphone permission and browser support.`);
        recognition.onend = () => {
            recognition = null;
            document.getElementById('voiceBtn').classList.remove('active');
            document.getElementById('listeningText').textContent = 'Ready';
            document.getElementById('waveform').style.display = 'none';
        };
        try { recognition.start(); }
        catch (error) { recognition = null; setResult('voiceStatus', `Could not start speech recognition: ${error.message}`); }
    }

    function updateNotes() {
        const list = document.getElementById('notesList');
        if (!list) return;
        list.replaceChildren();
        const notes = readList('jarvisNotes');
        if (!notes.length) {
            list.textContent = 'No notes saved yet.';
            return;
        }
        notes.forEach((note, index) => {
            const row = document.createElement('div');
            row.className = 'task-row';
            const text = document.createElement('span');
            text.textContent = note.text;
            const remove = document.createElement('button');
            remove.className = 'danger';
            remove.textContent = 'Delete';
            remove.dataset.action = 'note-delete';
            remove.dataset.index = index;
            row.append(text, remove);
            list.appendChild(row);
        });
    }

    function renderCards() {
        const list = document.getElementById('cardsList');
        if (!list) return;
        list.replaceChildren();
        readList('jarvisCards').forEach((card, index) => {
            const row = document.createElement('div');
            row.className = 'task-row';
            const question = document.createElement('span');
            question.textContent = card.question;
            const answer = document.createElement('span');
            answer.textContent = card.revealed ? card.answer : 'Answer hidden';
            const toggle = document.createElement('button');
            toggle.textContent = card.revealed ? 'Hide answer' : 'Show answer';
            toggle.dataset.action = 'card-toggle';
            toggle.dataset.index = index;
            const remove = document.createElement('button');
            remove.className = 'danger';
            remove.textContent = 'Delete';
            remove.dataset.action = 'card-delete';
            remove.dataset.index = index;
            row.append(question, answer, toggle, remove);
            list.appendChild(row);
        });
        if (!list.children.length) list.textContent = 'No flashcards yet.';
    }

    function renderTasks() {
        const list = document.getElementById('tasksList');
        if (!list) return;
        list.replaceChildren();
        readList('jarvisTasks').forEach((task, index) => {
            const row = document.createElement('div');
            row.className = `task-row${task.done ? ' done' : ''}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = Boolean(task.done);
            checkbox.setAttribute('aria-label', `Mark ${task.text} complete`);
            checkbox.dataset.action = 'task-toggle';
            checkbox.dataset.index = index;
            const text = document.createElement('span');
            text.textContent = task.text;
            const remove = document.createElement('button');
            remove.className = 'danger';
            remove.textContent = 'Delete';
            remove.dataset.action = 'task-delete';
            remove.dataset.index = index;
            row.append(checkbox, text, remove);
            list.appendChild(row);
        });
        if (!list.children.length) list.textContent = 'No tasks yet.';
    }

    function renderQuiz() {
        const question = quizQuestions[quizIndex];
        if (!question) {
            document.getElementById('quizQuestion').textContent = 'Quiz complete!';
            document.getElementById('quizAnswers').replaceChildren();
            setResult('quizResult', `Final score: ${quizScore} / ${quizQuestions.length}`);
            return;
        }
        document.getElementById('quizQuestion').textContent = question.question;
        document.getElementById('quizResult').textContent = `Score: ${quizScore} / ${quizQuestions.length}`;
        const answers = document.getElementById('quizAnswers');
        answers.replaceChildren();
        question.answers.forEach((answer, index) => {
            const button = document.createElement('button');
            button.textContent = answer;
            button.dataset.action = 'quiz-answer';
            button.dataset.option = index;
            answers.appendChild(button);
        });
    }

    function renderFiles(files) {
        const output = document.getElementById('fileList');
        if (!output) return;
        output.replaceChildren();
        if (!files.length) {
            output.textContent = 'No files selected.';
            return;
        }
        Array.from(files).forEach((file) => {
            const line = document.createElement('p');
            line.textContent = `${file.name} · ${file.type || 'unknown type'} · ${(file.size / 1024).toFixed(1)} KB`;
            output.appendChild(line);
        });
    }

    function reviewCode() {
        const code = document.getElementById('codeInput').value;
        if (!code.trim()) return setResult('codeResult', 'Paste some code first.');
        const findings = [];
        if ((code.match(/\(/g) || []).length !== (code.match(/\)/g) || []).length) findings.push('Parenthesis counts differ; check grouping.');
        if ((code.match(/\{/g) || []).length !== (code.match(/\}/g) || []).length) findings.push('Brace counts differ; check block structure.');
        if (/console\.log\(/.test(code)) findings.push('Found console.log; remove or gate debug logging before production.');
        if (/eval\s*\(/.test(code)) findings.push('Found eval(); avoid executing dynamic strings.');
        if (/TODO|FIXME/.test(code)) findings.push('There are TODO/FIXME markers to review.');
        setResult('codeResult', findings.length ? findings.join('\n') : 'Basic text checks passed. This is not a compiler, linter, or AI code review; select a project tool for deeper checks.');
    }

    function createPoster(form) {
        const canvas = document.getElementById('artCanvas');
        const context = canvas.getContext('2d');
        const title = form.elements.title.value.trim();
        const subtitle = form.elements.subtitle.value.trim();
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#07182c');
        gradient.addColorStop(1, '#07526b');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#00d4ff';
        context.lineWidth = 3;
        context.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);
        context.textAlign = 'center';
        context.fillStyle = '#e8faff';
        context.font = 'bold 54px Segoe UI, sans-serif';
        context.fillText(title.slice(0, 36), canvas.width / 2, 235, canvas.width - 110);
        context.fillStyle = '#71dff4';
        context.font = '24px Segoe UI, sans-serif';
        context.fillText(subtitle.slice(0, 70), canvas.width / 2, 285, canvas.width - 110);
        artworkUrl = canvas.toDataURL('image/png');
    }

    function runQuickAction(action) {
        switch (action) {
            case 'ai-chat':
                switchNav(document.querySelector('.nav-item[onclick*="chat"]'), 'chat');
                document.querySelector('#workView input[name="message"]').focus();
                break;
            case 'voice-assistant':
                switchNav(document.querySelector('.nav-item[onclick*="voice"]'), 'voice');
                break;
            case 'code-assistant':
                switchNav(document.querySelector('.nav-item[onclick*="code"]'), 'code');
                break;
            case 'creative-studio':
                switchNav(document.querySelector('.nav-item[onclick*="studio"]'), 'studio');
                break;
            case 'study-helper':
            case 'life-planner':
                switchNav(document.querySelector('.nav-item[onclick*="learning"]'), 'learning');
                break;
            case 'entertainment':
                document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
                activeNav = 'entertainment';
                renderView('entertainment');
                break;
            case 'open-browser':
                window.open('https://www.google.com/', '_blank', 'noopener,noreferrer');
                addActivity('Opened a browser tab', 'jarvis');
                break;
            case 'play-music':
                window.open('https://music.youtube.com/', '_blank', 'noopener,noreferrer');
                addActivity('Opened YouTube Music in a new tab', 'jarvis');
                break;
            case 'open-vscode':
                window.open('vscode://', '_blank', 'noopener,noreferrer');
                addActivity('Requested VS Code launch; browser support may vary', 'jarvis');
                break;
            case 'screenshot':
                captureScreen();
                break;
            case 'system-info':
                alert(systemSummary());
                break;
            case 'shutdown':
                alert('A browser page cannot shut down your computer. Use your operating system power menu.');
                break;
            default:
                addActivity(`Unknown action: ${action}`, 'jarvis');
        }
    }

    async function captureScreen() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            alert('Screen capture is not supported in this browser.');
            return;
        }
        let stream;
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            const link = document.createElement('a');
            link.download = `jarvis-screenshot-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            addActivity('Screenshot captured and downloaded', 'jarvis');
        } catch (error) {
            if (error.name !== 'NotAllowedError') alert(`Could not capture screen: ${error.message}`);
        } finally {
            if (stream) stream.getTracks().forEach((track) => track.stop());
        }
    }

    function downloadJson(filename, data) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function executeAction(action) {
        runQuickAction(action);
    }

    function handleClick(event) {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        if (action === 'voice-start') toggleVoice();
        if (action === 'voice-stop' && recognition) recognition.stop();
        if (action === 'voice-speak') {
            if (!window.speechSynthesis) return setResult('voiceStatus', 'Speech synthesis is not supported in this browser.');
            window.speechSynthesis.speak(new SpeechSynthesisUtterance('JARVIS voice output is ready.'));
            setResult('voiceStatus', 'Speaking a test phrase.');
        }
        if (action === 'system-info') setResult('systemResult', systemSummary());
        if (action === 'file-clear') {
            document.getElementById('filePicker').value = '';
            renderFiles([]);
        }
        if (action === 'code-review') reviewCode();
        if (action === 'code-clear') {
            document.getElementById('codeInput').value = '';
            setResult('codeResult', '');
        }
        if (action === 'note-delete') {
            const notes = readList('jarvisNotes');
            notes.splice(Number(button.dataset.index), 1);
            saveList('jarvisNotes', notes);
            updateNotes();
            updateBrainActivity();
        }
        if (action === 'card-toggle' || action === 'card-delete') {
            const cards = readList('jarvisCards');
            const index = Number(button.dataset.index);
            if (action === 'card-toggle') cards[index].revealed = !cards[index].revealed;
            else cards.splice(index, 1);
            saveList('jarvisCards', cards);
            renderCards();
        }
        if (action === 'task-delete') {
            const tasks = readList('jarvisTasks');
            tasks.splice(Number(button.dataset.index), 1);
            saveList('jarvisTasks', tasks);
            renderTasks();
            updateBrainActivity();
        }
        if (action === 'quiz-answer') {
            const question = quizQuestions[quizIndex];
            const correct = Number(button.dataset.option) === question.correct;
            if (correct) quizScore++;
            Array.from(document.getElementById('quizAnswers').children).forEach((answer) => {
                answer.disabled = true;
            });
            setResult('quizResult', `${correct ? 'Correct!' : `Not quite. The answer is ${question.answers[question.correct]}.`} Score: ${quizScore} / ${quizQuestions.length}`);
        }
        if (action === 'quiz-next') {
            quizIndex++;
            renderQuiz();
        }
        if (action === 'art-download' && artworkUrl) {
            const link = document.createElement('a');
            link.href = artworkUrl;
            link.download = 'jarvis-poster.png';
            link.click();
        } else if (action === 'art-download') {
            alert('Create a poster before downloading it.');
        }
        if (action === 'settings-save') {
            const name = document.getElementById('displayName').value.trim();
            storage.setItem('jarvisDisplayName', name);
            updateGreeting();
            setResult('settingsResult', 'Display name saved.');
        }
        if (action === 'brain-export') {
            if (!jarvisInstance) return setResult('settingsResult', 'Brain is unavailable; reload the page and try again.');
            downloadJson('jarvis-brain-backup.json', jarvisInstance.exportBrain());
            setResult('settingsResult', 'Brain backup downloaded.');
        }
        if (action === 'data-clear' && window.confirm('Clear saved JARVIS data from this browser? This cannot be undone.')) {
            ['jarvisBrain', 'jarvisChat', 'jarvisNotes', 'jarvisTasks', 'jarvisDisplayName'].forEach((key) => storage.removeItem(key));
            updateGreeting();
            updateBrainActivity();
            setResult('settingsResult', 'JARVIS browser data cleared.');
        }
    }

    function handleSubmit(event) {
        const form = event.target.closest('form[data-form]');
        if (!form) return;
        event.preventDefault();
        if (form.dataset.form === 'chat') {
            const message = form.elements.message.value.trim();
            const reply = respondOffline(message);
            const history = readList('jarvisChat');
            history.push({ role: 'user', text: message }, { role: 'assistant', text: reply });
            saveList('jarvisChat', history.slice(-100));
            if (jarvisInstance) {
                jarvisInstance.brain.train(message, null, 'user_input');
                jarvisInstance.brain.saveOfflineBrain();
            }
            updateBrainActivity();
            renderChatHistory();
        }
        if (form.dataset.form === 'calculate') {
            try { setResult('calculatorResult', String(evaluateMath(form.elements.expression.value))); }
            catch (error) { setResult('calculatorResult', error.message); }
        }
        if (form.dataset.form === 'note') {
            const notes = readList('jarvisNotes');
            notes.push({ text: form.elements.note.value.trim(), created: new Date().toISOString() });
            saveList('jarvisNotes', notes);
            form.reset();
            updateNotes();
            updateBrainActivity();
        }
        if (form.dataset.form === 'card') {
            const cards = readList('jarvisCards');
            cards.push({
                question: form.elements.question.value.trim(),
                answer: form.elements.answer.value.trim(),
                revealed: false
            });
            saveList('jarvisCards', cards);
            form.reset();
            renderCards();
        }
        if (form.dataset.form === 'task') {
            const tasks = readList('jarvisTasks');
            tasks.push({ text: form.elements.task.value.trim(), done: false });
            saveList('jarvisTasks', tasks);
            form.reset();
            renderTasks();
            updateBrainActivity();
        }
        if (form.dataset.form === 'art') createPoster(form);
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('change', (event) => {
        if (event.target.id === 'filePicker') renderFiles(event.target.files);
        if (event.target.matches('[data-action="task-toggle"]')) {
            const tasks = readList('jarvisTasks');
            tasks[Number(event.target.dataset.index)].done = event.target.checked;
            saveList('jarvisTasks', tasks);
            renderTasks();
            updateBrainActivity();
        }
        if (event.target.id === 'brainImport' && event.target.files[0]) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!jarvisInstance || !jarvisInstance.importBrain(data)) throw new Error('The selected file is not a valid JARVIS brain backup.');
                    jarvisInstance.brain.saveOfflineBrain();
                    setResult('settingsResult', 'Brain backup imported.');
                } catch (error) {
                    setResult('settingsResult', `Import failed: ${error.message}`);
                }
            };
            reader.onerror = () => setResult('settingsResult', 'Could not read the selected backup file.');
            reader.readAsText(event.target.files[0]);
        }
    });

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    window.addEventListener('load', initializeJarvis);
    window.setInterval(updateDateTime, 30000);
    window.addEventListener('beforeunload', () => {
        if (jarvisInstance) jarvisInstance.brain.saveOfflineBrain();
    });

    Object.assign(window, {
        initializeJarvis,
        updateSystemStats,
        updateBrainActivity,
        startAnimations,
        switchNav,
        openSettings,
        sendMessage,
        toggleVoice,
        executeAction
    });
})();
