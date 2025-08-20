(() => {
  const cells = Array.from(document.querySelectorAll('.cell'));
  const statusText = document.getElementById('statusText');
  const vsCpuToggle = document.getElementById('vsCpu');
  const newGameBtn = document.getElementById('newGameBtn');
  const undoBtn = document.getElementById('undoBtn');
  const hintBtn = document.getElementById('hintBtn');
  const resetScoresBtn = document.getElementById('resetScoresBtn');
  const xScoreEl = document.getElementById('xScore');
  const oScoreEl = document.getElementById('oScore');
  const drawsEl = document.getElementById('draws');

  const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const state = {
    board: Array(9).fill(null),
    xIsNext: true,
    moveHistory: [],
    scores: { X: 0, O: 0, D: 0 },
    vsCpu: false,
    gameOver: false,
  };

  let hintTimeout = null;

  function saveScores() {
    try {
      localStorage.setItem('ttt:scores', JSON.stringify(state.scores));
    } catch (err) {}
  }

  function loadScores() {
    try {
      const raw = localStorage.getItem('ttt:scores');
      if (raw) state.scores = JSON.parse(raw);
    } catch (err) {}
    xScoreEl.textContent = state.scores.X;
    oScoreEl.textContent = state.scores.O;
    drawsEl.textContent = state.scores.D;
  }

  function setStatus(text) {
    statusText.textContent = text;
  }

  function renderBoard() {
    state.board.forEach((value, idx) => {
      const cell = cells[idx];
      cell.textContent = value ? value : '';
      cell.classList.remove('x', 'o');
      if (value === 'X') cell.classList.add('x');
      if (value === 'O') cell.classList.add('o');
      cell.disabled = Boolean(value) || state.gameOver;
    });
  }

  function startNewGame() {
    state.board = Array(9).fill(null);
    state.xIsNext = true;
    state.moveHistory = [];
    state.gameOver = false;
    if (hintTimeout) clearTimeout(hintTimeout);
    cells.forEach(c => c.classList.remove('win', 'hint'));
    renderBoard();
    setStatus("X's turn");
  }

  function handleWin(winner, line) {
    state.gameOver = true;
    if (line) line.forEach(i => cells[i].classList.add('win'));
    if (winner === 'X') state.scores.X += 1;
    if (winner === 'O') state.scores.O += 1;
    xScoreEl.textContent = state.scores.X;
    oScoreEl.textContent = state.scores.O;
    saveScores();
    setStatus(`${winner} wins!`);
    cells.forEach(c => (c.disabled = true));
  }

  function handleDraw() {
    state.gameOver = true;
    state.scores.D += 1;
    drawsEl.textContent = state.scores.D;
    saveScores();
    setStatus('It\'s a draw.');
    cells.forEach(c => (c.disabled = true));
  }

  function getWinner(board) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    return { winner: null, line: null };
  }

  function isBoardFull(board) {
    return board.every(Boolean);
  }

  function makeMove(index) {
    if (state.gameOver || state.board[index]) return;
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      hintTimeout = null;
    }
    cells.forEach(c => c.classList.remove('hint'));
    const player = state.xIsNext ? 'X' : 'O';
    state.board[index] = player;
    state.moveHistory.push(index);
    renderBoard();

    const { winner, line } = getWinner(state.board);
    if (winner) return handleWin(winner, line);
    if (isBoardFull(state.board)) return handleDraw();

    state.xIsNext = !state.xIsNext;
    setStatus(`${state.xIsNext ? 'X' : 'O'}'s turn`);

    if (state.vsCpu && !state.xIsNext && !state.gameOver) {
      window.setTimeout(cpuMove, 280);
    }
  }

  function undoLastMove() {
    if (state.moveHistory.length === 0 || state.gameOver) return;
    const last = state.moveHistory.pop();
    state.board[last] = null;
    if (state.vsCpu) {
      if (state.moveHistory.length > 0) {
        const cpuLast = state.moveHistory.pop();
        state.board[cpuLast] = null;
      }
    }
    state.gameOver = false;
    cells.forEach(c => c.classList.remove('win', 'hint'));
    state.xIsNext = true;
    if (state.moveHistory.length % 2 === 1) state.xIsNext = false;
    renderBoard();
    setStatus(`${state.xIsNext ? 'X' : 'O'}'s turn`);
  }

  function showHint() {
    if (state.gameOver) return;
    const player = state.xIsNext ? 'X' : 'O';
    const best = findBestMove(state.board, player);
    if (best.index === -1 || state.board[best.index]) return;
    if (hintTimeout) clearTimeout(hintTimeout);
    cells.forEach(c => c.classList.remove('hint'));
    const cell = cells[best.index];
    cell.classList.add('hint');
    hintTimeout = setTimeout(() => {
      cell.classList.remove('hint');
      hintTimeout = null;
    }, 1500);
  }

  // Minimax AI (unbeatable)
  function cpuMove() {
    const best = findBestMove(state.board, 'O');
    if (best.index !== -1) {
      makeMove(best.index);
    }
  }

  function findBestMove(board, aiPlayer) {
    const human = aiPlayer === 'X' ? 'O' : 'X';

    function minimax(tempBoard, currentPlayer, depth) {
      const { winner } = getWinner(tempBoard);
      if (winner === aiPlayer) return { score: 10 - depth };
      if (winner === human) return { score: depth - 10 };
      if (isBoardFull(tempBoard)) return { score: 0 };

      const moves = [];
      for (let i = 0; i < 9; i++) {
        if (!tempBoard[i]) {
          tempBoard[i] = currentPlayer;
          const result = minimax(tempBoard, currentPlayer === 'X' ? 'O' : 'X', depth + 1);
          moves.push({ index: i, score: result.score });
          tempBoard[i] = null;
        }
      }

      let bestMove;
      if (currentPlayer === aiPlayer) {
        let bestScore = -Infinity;
        for (const m of moves) {
          if (m.score > bestScore) {
            bestScore = m.score;
            bestMove = m;
          }
        }
      } else {
        let bestScore = Infinity;
        for (const m of moves) {
          if (m.score < bestScore) {
            bestScore = m.score;
            bestMove = m;
          }
        }
      }
      return bestMove || { index: -1, score: 0 };
    }

    const move = minimax([...board], aiPlayer, 0);
    return move;
  }

  // Event listeners
  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      const idx = Number(cell.dataset.index);
      makeMove(idx);
    });
  });

  newGameBtn.addEventListener('click', startNewGame);
  undoBtn.addEventListener('click', undoLastMove);
  hintBtn.addEventListener('click', showHint);
  resetScoresBtn.addEventListener('click', () => {
    state.scores = { X: 0, O: 0, D: 0 };
    xScoreEl.textContent = 0;
    oScoreEl.textContent = 0;
    drawsEl.textContent = 0;
    saveScores();
  });

  vsCpuToggle.addEventListener('change', (e) => {
    state.vsCpu = e.target.checked;
    startNewGame();
  });

  // init
  loadScores();
  startNewGame();
})();

