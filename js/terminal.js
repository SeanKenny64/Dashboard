    /* ---------- TERMINAL - ONLY NEW JAVASCRIPT ---------- */
    const terminalOutput = document.getElementById('terminal-output');
    const terminalInput = document.getElementById('terminal-input');
    const terminalHistory = [];
    let historyIndex = -1;

    // Function to refresh arena iframe
    function refreshArena() {
      const arenaIframe = document.getElementById('arena-iframe');
      if (arenaIframe) {
        arenaIframe.src = arenaIframe.src;
      }
    }

    // Attach refresh button handler
    document.getElementById('refresh-arena-btn').addEventListener('click', refreshArena);

    function addTerminalLine(text, className = '') {
      const line = document.createElement('div');
      line.className = 'terminal-line ' + className;
      line.textContent = text;
      terminalOutput.appendChild(line);
      terminalOutput.scrollTop = terminalOutput.scrollHeight;

      // Keep only last 50 lines
      while (terminalOutput.children.length > 50) {
        terminalOutput.removeChild(terminalOutput.firstChild);
      }
    }

    async function executeTerminalCommand(cmd) {
      if (!cmd.trim()) return;

      addTerminalLine('> ' + cmd, 'terminal-prompt');
      terminalHistory.push(cmd);
      historyIndex = terminalHistory.length;

      try {
        const response = await fetch('cgi-bin/terminal_exec.py', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'command=' + encodeURIComponent(cmd)
        });

        const data = await response.json();

        if (data.error) {
          addTerminalLine(data.error, 'terminal-error');
        } else {
          const output = data.stdout || data.stderr || '';
          if (output) {
            output.split('\n').forEach(line => {
              if (line.trim()) {
                addTerminalLine(line, data.stderr ? 'terminal-error' : 'terminal-success');
              }
            });
          }
          
          // Auto-refresh arena after task commands
          if (cmd.startsWith('td ') || cmd.startsWith('ta ') || cmd.startsWith('t ') || cmd.startsWith('task ') || cmd.startsWith('tm ') || cmd.startsWith('arena')) {
            refreshArena();
          }
        }
      } catch (error) {
        addTerminalLine('Error: ' + error.message, 'terminal-error');
      }
    }

    terminalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeTerminalCommand(terminalInput.value);
        terminalInput.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          terminalInput.value = terminalHistory[historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < terminalHistory.length - 1) {
          historyIndex++;
          terminalInput.value = terminalHistory[historyIndex];
        } else {
          historyIndex = terminalHistory.length;
          terminalInput.value = '';
        }
      }
    });

