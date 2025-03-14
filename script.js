class Game2048 {
    constructor() {
        this.gridSize = 4;
        this.gridContainer = document.getElementById('grid-container');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.gameOverMessage = document.getElementById('game-over');
        this.gameWonMessage = document.getElementById('game-won');
        
        // Stats elements
        this.gamesPlayedElement = document.getElementById('games-played');
        this.movesMadeElement = document.getElementById('moves-made');
        this.timePlayedElement = document.getElementById('time-played');
        this.avgScoreElement = document.getElementById('avg-score');
        this.finalScoreElement = document.getElementById('final-score');
        this.highestTileElement = document.getElementById('highest-tile');
        
        // Game state
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.gameOver = false;
        this.won = false;
        this.moveHistory = [];
        this.mergedTiles = new Set();
        
        // Stats
        this.gamesPlayed = parseInt(localStorage.getItem('gamesPlayed')) || 0;
        this.movesMade = 0;
        this.totalMoves = parseInt(localStorage.getItem('totalMoves')) || 0;
        this.totalScore = parseInt(localStorage.getItem('totalScore')) || 0;
        this.startTime = Date.now();
        this.totalTimePlayed = parseInt(localStorage.getItem('totalTimePlayed')) || 0;
        
        // Leaderboard
        this.leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
        
        // Initialize sounds
        this.sounds = {
            slide: new Audio('sounds/slide.mp3'),
            merge: new Audio('sounds/merge.wav'),
            buttonClick: new Audio('sounds/button_click.wav'),
            gameOver: new Audio('sounds/game_over.wav')
        };
        
        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3; // Set a comfortable default volume
        });
        
        // Sound state
        this.isSoundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        
        this.setupGame();
        this.setupEventListeners();
        this.updateStats();
        this.renderLeaderboard();
        this.startTimer();
    }

    setupGame() {
        // Create grid cells
        this.gridContainer.innerHTML = '';
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            this.gridContainer.appendChild(cell);
        }

        // Initialize grid array
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.updateScore();
        this.bestScoreElement.textContent = this.bestScore;

        // Add initial tiles
        this.addRandomTile();
        this.addRandomTile();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            
            let moved = false;
            switch(e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    moved = this.move('left');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    moved = this.move('right');
                    break;
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    moved = this.move('up');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    moved = this.move('down');
                    break;
                case 'z':
                case 'Z':
                    this.undo();
                    break;
                case 'r':
                case 'R':
                    this.resetGame();
                    break;
                case 'h':
                case 'H':
                    this.toggleHelp();
                    break;
                case 't':
                case 'T':
                    this.cycleTheme();
                    break;
            }

            if (moved) {
                this.movesMade++;
                this.totalMoves++;
                this.updateStats();
                this.afterMove();
            }
        });

        // Touch controls
        let touchStartX, touchStartY, touchStartTime;
        let isTouchMove = false;
        
        this.gridContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isTouchMove = false;
        }, { passive: false });

        this.gridContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            isTouchMove = true;
        }, { passive: false });

        this.gridContainer.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY || this.gameOver) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const deltaTime = touchEndTime - touchStartTime;
            
            // Minimum swipe distance and maximum swipe time
            const minSwipeDistance = 30;
            const maxSwipeTime = 500;
            
            if ((Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) && 
                deltaTime < maxSwipeTime && isTouchMove) {
                let moved = false;
                
                // Determine if horizontal or vertical swipe based on which delta is larger
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    moved = this.move(deltaX > 0 ? 'right' : 'left');
                } else {
                    moved = this.move(deltaY > 0 ? 'down' : 'up');
                }
                
                if (moved) {
                    e.preventDefault();
                    this.movesMade++;
                    this.totalMoves++;
                    this.updateStats();
                    this.afterMove();
                }
            }
            
            // Reset touch tracking
            touchStartX = null;
            touchStartY = null;
            isTouchMove = false;
        });

        // Button controls with sound
        document.getElementById('new-game').addEventListener('click', () => {
            this.playSound('buttonClick');
            this.resetGame();
        });
        document.getElementById('undo').addEventListener('click', () => {
            this.playSound('buttonClick');
            this.undo();
        });
        document.getElementById('try-again').addEventListener('click', () => {
            this.playSound('buttonClick');
            this.resetGame();
        });
        document.getElementById('keep-playing').addEventListener('click', () => {
            this.playSound('buttonClick');
            this.gameWonMessage.classList.remove('active');
        });
        document.getElementById('help-btn').addEventListener('click', () => {
            this.playSound('buttonClick');
            this.toggleHelp();
        });
        document.getElementById('close-help').addEventListener('click', () => {
            this.playSound('buttonClick');
            this.toggleHelp();
        });

        // Theme controls with sound
        document.getElementById('theme-btn').addEventListener('click', () => {
            this.playSound('buttonClick');
            this.cycleTheme();
        });
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                this.playSound('buttonClick');
                this.setTheme(option.dataset.theme);
            });
        });

        // Sound toggle
        const soundBtn = document.getElementById('sound-btn');
        const updateSoundIcon = () => {
            soundBtn.innerHTML = `<i class="fas fa-volume-${this.isSoundEnabled ? 'up' : 'mute'}"></i> Sound`;
        };
        updateSoundIcon(); // Set initial state

        soundBtn.addEventListener('click', () => {
            this.playSound('buttonClick');
            this.toggleSound();
            updateSoundIcon();
        });
    }

    addRandomTile() {
        const emptyCells = [];
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j] === 0) {
                    emptyCells.push({x: i, y: j});
                }
            }
        }

        if (emptyCells.length) {
            const {x, y} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[x][y] = Math.random() < 0.9 ? 2 : 4;
            this.renderTile(x, y, this.grid[x][y], true);
        }
    }

    renderTile(x, y, value, isNew = false) {
        const position = x * this.gridSize + y;
        const cell = this.gridContainer.children[position];
        
        // Remove existing tile if any
        const existingTile = cell.querySelector('.tile');
        if (existingTile) {
            cell.removeChild(existingTile);
        }

        if (value) {
            const tile = document.createElement('div');
            tile.className = `tile tile-${value}${isNew ? ' tile-new' : ''}`;
            
            // Add transition for smooth movement
            tile.style.transition = 'all 0.15s ease-in-out';
            
            const span = document.createElement('span');
            span.textContent = value.toLocaleString();
            tile.appendChild(span);
            cell.appendChild(tile);

            // Trigger animations
            requestAnimationFrame(() => {
                if (isNew) {
                    tile.classList.add('tile-new');
                    setTimeout(() => tile.classList.remove('tile-new'), 200);
                } else if (this.mergedTiles.has(`${x},${y}`)) {
                    tile.classList.add('tile-merged');
                    setTimeout(() => tile.classList.remove('tile-merged'), 200);
                }
            });
        }
    }

    move(direction) {
        if (this.gameOver) return false;
        
        // Save current state for undo
        this.moveHistory.push({
            grid: JSON.parse(JSON.stringify(this.grid)),
            score: this.score
        });

        let moved = false;
        let hasMerged = false;
        const vector = this.getVector(direction);
        const traversals = this.buildTraversals(vector);

        // Clear merged flags
        this.mergedTiles = new Set();

        // Process the grid in the correct order based on direction
        traversals.x.forEach(x => {
            traversals.y.forEach(y => {
                const cell = {x, y};
                const tile = this.grid[x][y];

                if (tile) {
                    const positions = this.findFarthestPosition(cell, vector);
                    const next = positions.next;

                    // Only try to merge if we found a next position
                    if (this.withinBounds(next) && this.grid[next.x][next.y] === tile) {
                        const mergeKey = `${next.x},${next.y}`;
                        if (!this.mergedTiles.has(mergeKey)) {
                            // Merge tiles
                            const merged = tile * 2;
                            this.grid[next.x][next.y] = merged;
                            this.grid[x][y] = 0;
                            
                            // Mark as merged
                            this.mergedTiles.add(mergeKey);
                            hasMerged = true;
                            
                            // Update score
                            this.score += merged;
                            
                            // Check for win
                            if (merged === 2048 && !this.won) {
                                this.won = true;
                                this.gameWonMessage.classList.add('active');
                            }
                            
                            moved = true;
                        }
                    } else if (positions.farthest.x !== x || positions.farthest.y !== y) {
                        // Move tile to farthest position
                        this.grid[positions.farthest.x][positions.farthest.y] = tile;
                        this.grid[x][y] = 0;
                        moved = true;
                    }
                }
            });
        });

        if (moved) {
            // Play appropriate sound
            if (hasMerged) {
                this.playSound('merge');
            } else {
                this.playSound('slide');
            }
            
            this.updateScore();
            this.renderGrid();
            return true;
        }

        // If no move was made, remove the saved state
        this.moveHistory.pop();
        return false;
    }

    getVector(direction) {
        const vectors = {
            'up': {x: -1, y: 0},
            'right': {x: 0, y: 1},
            'down': {x: 1, y: 0},
            'left': {x: 0, y: -1}
        };
        return vectors[direction];
    }

    buildTraversals(vector) {
        const traversals = {x: [], y: []};
        
        for (let i = 0; i < this.gridSize; i++) {
            traversals.x.push(i);
            traversals.y.push(i);
        }

        // Process tiles in the correct order based on movement direction
        // For 'right' and 'down', we need to process tiles from the opposite edge
        if (vector.x === 1) traversals.x.reverse();
        if (vector.y === 1) traversals.y.reverse();

        return traversals;
    }

    findFarthestPosition(cell, vector) {
        let previous;
        let current = {...cell};

        // Keep moving in the vector direction until we hit a boundary or a non-empty cell
        do {
            previous = {...current};
            current = {
                x: current.x + vector.x,
                y: current.y + vector.y
            };
        } while (
            this.withinBounds(current) && 
            this.grid[current.x][current.y] === 0
        );

        return {
            farthest: previous,
            next: current
        };
    }

    withinBounds(position) {
        return position.x >= 0 && position.x < this.gridSize &&
               position.y >= 0 && position.y < this.gridSize;
    }

    renderGrid() {
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                this.renderTile(i, j, this.grid[i][j]);
            }
        }
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreElement.textContent = this.bestScore;
            localStorage.setItem('bestScore', this.bestScore);
        }
    }

    afterMove() {
        this.addRandomTile();
        if (!this.movesAvailable()) {
            this.gameOver = true;
            this.gameOverMessage.classList.add('active');
            this.playSound('gameOver');
            this.gamesPlayed++;
            this.totalScore += this.score;
            this.updateLeaderboard();
            this.updateStats();
            
            // Update final stats
            this.finalScoreElement.textContent = this.score;
            this.highestTileElement.textContent = Math.max(...this.grid.flat());
            
            // Save final score if it's a new best
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                localStorage.setItem('bestScore', this.bestScore);
                this.bestScoreElement.textContent = this.bestScore;
            }
        }
    }

    movesAvailable() {
        // Check for empty cells
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j] === 0) return true;
            }
        }

        // Check for possible merges in all directions
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const current = this.grid[i][j];
                // Check all four directions
                const directions = [
                    {x: 0, y: 1},  // right
                    {x: 1, y: 0},  // down
                    {x: 0, y: -1}, // left
                    {x: -1, y: 0}  // up
                ];
                
                for (let direction of directions) {
                    const newX = i + direction.x;
                    const newY = j + direction.y;
                    
                    if (this.withinBounds({x: newX, y: newY})) {
                        if (this.grid[newX][newY] === current) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    undo() {
        if (this.moveHistory.length > 0) {
            const previousState = this.moveHistory.pop();
            this.grid = previousState.grid;
            this.score = previousState.score;
            this.updateScore();
            this.renderGrid();
            this.gameOver = false;
            this.gameOverMessage.classList.remove('active');
        }
    }

    resetGame() {
        if (!this.gameOver) {
            this.gamesPlayed++;
            this.totalScore += this.score;
        }
        
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.movesMade = 0;
        this.gameOver = false;
        this.won = false;
        this.moveHistory = [];
        this.startTime = Date.now();
        this.gameOverMessage.classList.remove('active');
        this.gameWonMessage.classList.remove('active');
        this.updateScore();
        this.updateStats();
        this.addRandomTile();
        this.addRandomTile();
        this.renderGrid();
    }

    updateStats() {
        this.movesMadeElement.textContent = this.movesMade;
        this.gamesPlayedElement.textContent = this.gamesPlayed;
        this.avgScoreElement.textContent = this.gamesPlayed ? 
            Math.round(this.totalScore / this.gamesPlayed) : 0;
        
        localStorage.setItem('totalMoves', this.totalMoves);
        localStorage.setItem('gamesPlayed', this.gamesPlayed);
        localStorage.setItem('totalScore', this.totalScore);
    }

    startTimer() {
        setInterval(() => {
            const totalSeconds = Math.floor((Date.now() - this.startTime) / 1000) + this.totalTimePlayed;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            this.timePlayedElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            localStorage.setItem('totalTimePlayed', totalSeconds);
        }, 1000);
    }

    toggleHelp() {
        const helpOverlay = document.getElementById('help-overlay');
        helpOverlay.style.display = helpOverlay.style.display === 'flex' ? 'none' : 'flex';
    }

    setTheme(theme) {
        document.body.className = `theme-${theme}`;
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });
        localStorage.setItem('theme', theme);
    }

    cycleTheme() {
        const themes = ['dark', 'light', 'neon'];
        const currentTheme = document.body.className.replace('theme-', '');
        const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
        this.setTheme(nextTheme);
    }

    updateLeaderboard() {
        this.leaderboard.push({
            score: this.score,
            date: new Date().toLocaleDateString(),
            moves: this.movesMade,
            highestTile: Math.max(...this.grid.flat())
        });
        
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, 5); // Keep top 5 scores
        
        localStorage.setItem('leaderboard', JSON.stringify(this.leaderboard));
        this.renderLeaderboard();
    }

    renderLeaderboard() {
        const container = document.getElementById('leaderboard-entries');
        container.innerHTML = this.leaderboard.map((entry, index) => `
            <div class="leaderboard-entry">
                <span>#${index + 1} ${entry.score}</span>
                <span>${entry.date}</span>
            </div>
        `).join('');
    }

    // Add sound helper methods
    playSound(soundName) {
        if (this.isSoundEnabled && this.sounds[soundName]) {
            // Clone and play the sound to allow overlapping
            const sound = this.sounds[soundName].cloneNode();
            sound.play().catch(e => console.log('Sound play prevented:', e));
        }
    }

    toggleSound() {
        this.isSoundEnabled = !this.isSoundEnabled;
        localStorage.setItem('soundEnabled', this.isSoundEnabled);
        return this.isSoundEnabled;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    const game = new Game2048();
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    game.setTheme(savedTheme);
}); 