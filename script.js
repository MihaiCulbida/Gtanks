window.addEventListener('load', function() {
    let progress = 0;
    let dotCount = 0;
    const loadingBar = document.getElementById('loadingBar');
    const loadingText = document.getElementById('loadingText');
    const loadingScreen = document.getElementById('loadingScreen');
    
    const dotInterval = setInterval(() => {
        const dots = '.'.repeat(dotCount);
        loadingText.textContent = 'Loading' + dots;
        dotCount = (dotCount + 1) % 4;
    }, 500);
    
    const loadingInterval = setInterval(() => {
        progress += 1;
        
        loadingBar.style.width = progress + '%';
        
        if (progress >= 100) {
            clearInterval(loadingInterval);
            clearInterval(dotInterval);
            
            loadingText.textContent = 'Loading...';
            
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 500);
        }
    }, 30);
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameState = {
    mode: 1,
    difficulty: 'easy',
    player: null,
    bullets: [],
    currentMap: 'map1',
    keys: {},
    scores: [0, 0, 0],
    gameOver: false,
    playersReady: []
};

let explosions = [];
let debris = [];
let animationId = null;
let currentMap = 'Classic';

function selectMode(mode) {
    gameState.mode = mode;
    if (mode === 1) {
        showScreen('difficultyScreen');
    } else {
        showReadyScreen();
    }
}
function selectDifficulty(diff) {
    gameState.difficulty = diff;
    document.querySelectorAll('.difficulty-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.target.classList.add('selected');
}
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    const backButton = document.getElementById('backButton');
    
    if (screenId === 'playerScreen') {
        backButton.classList.remove('show');
    } else {
        backButton.classList.add('show');
    }
}
function handleBackClick() {
    const currentScreen = document.querySelector('.screen.active').id;
    
    if (currentScreen === 'difficultyScreen') {
        showScreen('playerScreen');
    } else if (currentScreen === 'readyScreen') {
        document.removeEventListener('keydown', handleReadyKeyDown);
        if (gameState.mode === 1) {
            showScreen('difficultyScreen');
        } else {
            showScreen('playerScreen');
        }
    } else if (currentScreen === 'gameScreen') {
        document.getElementById('confirmModal').classList.add('show');
    }
}
function confirmExit() {
    document.getElementById('confirmModal').classList.remove('show');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameState.gameOver = true;
    gameState.bullets = [];
    gameState.players = [];
    gameState.scores = [0, 0, 0];
    
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    showScreen('playerScreen');
    updateScoreboard();
}
function cancelExit() {
    document.getElementById('confirmModal').classList.remove('show');
}
function startGame() {
    showReadyScreen();
}
function showReadyScreen() {
    showScreen('readyScreen');
    
    const readyButtons = document.getElementById('readyButtons');
    readyButtons.innerHTML = '';
    const playerNames = ['Green', 'Blue', 'Red'];
    const playerColors = ['green', 'blue', 'red'];
    const controls = [
        {up: 'w', down: 's', left: 'a', right: 'd', shoot: 'e'},
        {up: '↑', down: '↓', left: '←', right: '→', shoot: 'm'},
        {up: 'y', down: 'h', left: 'g', right: 'j', shoot: 'u'}
    ];
    
    gameState.playersReady = [];
    
    for (let i = 0; i < gameState.mode; i++) {
        const containerDiv = document.createElement('div');
        containerDiv.className = 'player-ready-container';
        const labelDiv = document.createElement('div');
        labelDiv.className = 'player-label';
        labelDiv.textContent = playerNames[i] + ' Player';
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'controls-display';
        const upKey = document.createElement('div');
        upKey.className = 'control-key control-up';
        upKey.textContent = controls[i].up.toUpperCase();
        const leftKey = document.createElement('div');
        leftKey.className = 'control-key control-left';
        leftKey.textContent = controls[i].left.toUpperCase();
        const downKey = document.createElement('div');
        downKey.className = 'control-key control-down';
        downKey.textContent = controls[i].down.toUpperCase();
        const rightKey = document.createElement('div');
        rightKey.className = 'control-key control-right';
        rightKey.textContent = controls[i].right.toUpperCase();
        const shootKey = document.createElement('div');
        shootKey.className = 'control-key control-shoot shoot-key';
        shootKey.id = 'ready-' + i;
        shootKey.textContent = controls[i].shoot.toUpperCase();
        controlsDiv.appendChild(upKey);
        controlsDiv.appendChild(leftKey);
        controlsDiv.appendChild(downKey);
        controlsDiv.appendChild(rightKey);
        controlsDiv.appendChild(shootKey);
        containerDiv.appendChild(labelDiv);
        containerDiv.appendChild(controlsDiv);
        readyButtons.appendChild(containerDiv);
        gameState.playersReady.push(false);
    }
    document.removeEventListener('keydown', handleReadyKeyDown);
    document.addEventListener('keydown', handleReadyKeyDown);
}

function handleReadyKeyDown(e) {
    const key = e.key.toLowerCase();
    const controls = [
        {shoot: 'e'},
        {shoot: 'm'},
        {shoot: 'u'}
    ];
    
    for (let i = 0; i < gameState.mode; i++) {
        if (key === controls[i].shoot && !gameState.playersReady[i]) {
            gameState.playersReady[i] = true;
            document.getElementById('ready-' + i).classList.add('ready');
            
            if (gameState.playersReady.every(ready => ready)) {
                setTimeout(() => {
                    document.removeEventListener('keydown', handleReadyKeyDown);
                    showScreen('gameScreen');
                    initGame();
                }, 2000);
            }
        }
    }
}
function initGame() {
    if (animationId) {
    cancelAnimationFrame(animationId);
}
    const randomMap = getRandomMap();
    gameState.bullets = [];
    explosions = [];
    gameState.walls = randomMap.wallLines;
    gameState.keys = {};
    gameState.players = [];
    gameState.gameOver = false;
    const spawns = randomMap.spawns;
    const colors = ['#00ff00', '#0080ff', '#ff0000'];
    const controls = [
        {up: 'w', down: 's', left: 'a', right: 'd', shoot: 'e'},
        {up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', shoot: 'm'},
        {up: 'y', down: 'h', left: 'g', right: 'j', shoot: 'u'}
    ];
    for (let i = 0; i < gameState.mode; i++) {
        gameState.players.push({
            x: spawns[i].x,
            y: spawns[i].y,
            angle: 0,
            color: colors[i],
            lastShot: 0,
            controls: controls[i],
            alive: true,
            playerId: i
        });
    }
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    gameLoop();
    updateScoreboard();
}
function handleKeyDown(e) {
    gameState.keys[e.key.toLowerCase()] = true;
    
    gameState.players.forEach(player => {
        if (e.key.toLowerCase() === player.controls.shoot) {
            e.preventDefault();
            shootBullet(player);
        }
    });
}
function handleKeyUp(e) {
    gameState.keys[e.key.toLowerCase()] = false;
}
function shootBullet(player) {
    if (!player.alive) return;
    const now = Date.now();
    if (now - player.lastShot < 300) return;
    const playerBullets = gameState.bullets.filter(b => b.ownerId === player.playerId);
    if (playerBullets.length >= 10) return; 
    player.lastShot = now;
    const angle = player.angle;
    const barrelTipX = player.x + Math.cos(angle) * 20;
    const barrelTipY = player.y + Math.sin(angle) * 20;
    let crossesWall = false;
    for (let wall of gameState.walls) {
        if (lineSegmentsIntersect(player.x, player.y, barrelTipX, barrelTipY, wall.x1, wall.y1, wall.x2, wall.y2)) {
            crossesWall = true;
            break;
        }
        if (distanceToLineSegment(barrelTipX, barrelTipY, wall.x1, wall.y1, wall.x2, wall.y2) < 3) {
            crossesWall = true;
            break;
        }
    }
    if (crossesWall) {
        return;
    }
    gameState.bullets.push({
        x: barrelTipX,
        y: barrelTipY,
        vx: Math.cos(angle) * 2.5,
        vy: Math.sin(angle) * 2.5,
        life: 1000,
        ownerId: player.playerId
    });
}
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.hypot(px - projX, py - projY);
}
function collideWall(x, y) {
    for (let wall of gameState.walls) {
        if (distanceToLineSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2) < 15) {
            return true;
        }
    }
    return false;
}
function collideTank(currentTank, x, y) {
    for (let tank of gameState.players) {
        if (tank === currentTank) continue;
        if (!tank.alive) continue;
        
        const dx = x - tank.x;
        const dy = y - tank.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 30) {
            const pushX = (dx / dist) * 0.5;
            const pushY = (dy / dist) * 0.5;
            const newTankX = tank.x - pushX;
            const newTankY = tank.y - pushY;
            
            if (!collideWall(newTankX, tank.y)) {
                tank.x = newTankX;
            }
            if (!collideWall(tank.x, newTankY)) {
                tank.y = newTankY;
            }
            return true;
        }
    }
    return false;
}
function updatePlayers() {
    gameState.players.forEach(player => {
        if (gameState.gameOver) return;
        if (!player.alive) return;
        let speed = 0;
        let rot = 0;
        if (gameState.keys[player.controls.up]) speed = 1.2;
        if (gameState.keys[player.controls.down]) speed = -0.7;
        if (gameState.keys[player.controls.left]) rot = -0.05;
        if (gameState.keys[player.controls.right]) rot = 0.05;
        player.angle += rot;

    gameState.players.forEach(deadTank => {
    if (deadTank.alive || deadTank === player) return;
    
    const dx = deadTank.x - player.x;
    const dy = deadTank.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 30 && dist > 0) {
        const pushForce = 0.8;
        const newDeadX = deadTank.x + (dx / dist) * pushForce;
        const newDeadY = deadTank.y + (dy / dist) * pushForce;
        
        if (!collideWall(newDeadX, deadTank.y)) {
            deadTank.x = newDeadX;
        }
        if (!collideWall(deadTank.x, newDeadY)) {
            deadTank.y = newDeadY;
        }
    }
});
let pushingDeadTank = false;
gameState.players.forEach(tank => {
    if (tank === player || tank.alive) return;
    const dist = Math.hypot(tank.x - player.x, tank.y - player.y);
    if (dist < 30) pushingDeadTank = true;
});

if (pushingDeadTank) speed *= 0.1;
const newX = player.x + Math.cos(player.angle) * speed;
const newY = player.y + Math.sin(player.angle) * speed;
let blockedByDead = false;
gameState.players.forEach(tank => {
    if (tank === player || tank.alive) return;
    const distToNew = Math.hypot(tank.x - newX, tank.y - newY);
    if (distToNew < 25) blockedByDead = true;
});
if (!collideWall(newX, player.y) && !collideTank(player, newX, player.y) && !blockedByDead) {
    player.x = newX;
}
if (!collideWall(player.x, newY) && !collideTank(player, player.x, newY) && !blockedByDead) {
    player.y = newY;
}
});
}

function lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
    
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
function updateBullets() {
    if (gameState.gameOver) return;
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const b = gameState.bullets[i];
        
        b.life--;
        
        if (b.life <= 0) {
            gameState.bullets.splice(i, 1);
            continue;
        }
        const oldX = b.x;
        const oldY = b.y;
        const newX = b.x + b.vx;
        const newY = b.y + b.vy;
        let wallHit = false;
        let hitWall = null;
        
        for (let wall of gameState.walls) {
            if (lineSegmentsIntersect(oldX, oldY, newX, newY, wall.x1, wall.y1, wall.x2, wall.y2)) {
                wallHit = true;
                hitWall = wall;
                break;
            }
            if (distanceToLineSegment(newX, newY, wall.x1, wall.y1, wall.x2, wall.y2) < 2) {
                wallHit = true;
                hitWall = wall;
                break;
            }
        }
        if (wallHit && hitWall) {
            const dx = hitWall.x2 - hitWall.x1;
            const dy = hitWall.y2 - hitWall.y1;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len;
            const ny = dx / len;
            const dot = b.vx * nx + b.vy * ny;
            b.vx -= 2 * dot * nx;
            b.vy -= 2 * dot * ny;
        } else {
            b.x = newX;
            b.y = newY;
        }
        let tankHit = false;
        for (let j = 0; j < gameState.players.length; j++) {
            const tank = gameState.players[j];
            if (j === b.ownerId) continue;
            
            const dx = b.x - tank.x;
            const dy = b.y - tank.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 15) {
                if (tank.alive) {
                    tank.alive = false;
                    createExplosion(tank.x, tank.y);
                    checkWinner();
                    gameState.bullets.splice(i, 1);
                    tankHit = true;
                    break;
                } else {
                    const angle = Math.atan2(dy, dx);
                    const speed = Math.hypot(b.vx, b.vy);
                    b.vx = Math.cos(angle) * speed * -1;
                    b.vy = Math.sin(angle) * speed * -1;
                    b.x += b.vx * 2;
                    b.y += b.vy * 2;
                    break;
                }
            }
        }
        if (tankHit) continue;
        if (i >= 0 && i < gameState.bullets.length) {
            if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
                gameState.bullets.splice(i, 1);
            }
        }
    }
}
function drawTank(tank) {
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);
    const tankColor = tank.alive ? tank.color : '#2a2a2a';
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-14, -12, 28, 3);  
    for (let i = -12; i < 14; i += 4) {
        ctx.fillStyle = '#333';
        ctx.fillRect(i, -12, 2, 3);
    }
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-14, 9, 28, 3);  
    for (let i = -12; i < 14; i += 4) {
        ctx.fillStyle = '#333';
        ctx.fillRect(i, 9, 2, 3);
    }
    ctx.fillStyle = tankColor;
    ctx.fillRect(-14, -9, 28, 18);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, -9, 28, 18);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-12, -7, 24, 3);
    ctx.fillRect(-12, 4, 24, 3);
    ctx.fillStyle = tankColor;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = tankColor;
    ctx.fillRect(0, -3, 16, 6);
    ctx.strokeRect(0, -3, 16, 6);
    ctx.fillStyle = '#222';
    ctx.fillRect(15, -2, 3, 4);
    ctx.restore();
}

function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        radius: 5,
        maxRadius: 40,
        alpha: 1
    });
}
function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.radius += 3;
        exp.alpha -= 0.05;
        
        if (exp.alpha <= 0) {
            explosions.splice(i, 1);
        }
    }
}
function drawExplosions() {
    explosions.forEach(exp => {
        ctx.save();
        ctx.globalAlpha = exp.alpha;
        
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}
function gameLoop() {
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    gameState.walls.forEach(wall => {
        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();
    });
    
    updatePlayers();
    updateBullets();
    updateExplosions();
    ctx.fillStyle = '#555';
    gameState.bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
    
    gameState.players.forEach(player => drawTank(player));
    drawExplosions();
    animationId = requestAnimationFrame(gameLoop);
}
function updateScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '';

    const playerNames = ['Green', 'Blue', 'Red'];
    const playerColors = ['#00ff00', '#0080ff', '#ff0000'];

    for (let i = 0; i < gameState.mode; i++) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-score';
        
        const tankIcons = ['img/green-tank.png', 'img/blue-tank.png', 'img/red-tank.png'];
        const tankIcon = document.createElement('img');
        tankIcon.className = 'tank-icon';
        tankIcon.src = tankIcons[i];
        tankIcon.alt = playerNames[i] + ' Tank';
        
        const scoreNum = document.createElement('div');
        scoreNum.className = 'score-number';
        scoreNum.textContent = gameState.scores[i];
        
        playerDiv.appendChild(tankIcon);
        playerDiv.appendChild(scoreNum);
        scoreboard.appendChild(playerDiv);
    }
}
function checkWinner() {
    const alivePlayers = gameState.players.filter(p => p.alive);
    
    if (alivePlayers.length === 1) {
        gameState.gameOver = true;
        const winner = alivePlayers[0];
        gameState.scores[winner.playerId]++;
        updateScoreboard();
        
        const playerNames = ['Green', 'Blue', 'Red'];
        const playerClasses = ['green', 'blue', 'red'];
        
        setTimeout(() => {
            const modal = document.getElementById('victoryModal');
            const victoryText = document.getElementById('victoryText');
            victoryText.textContent = playerNames[winner.playerId] + ' WINS!';
            victoryText.className = 'victory-text ' + playerClasses[winner.playerId];
            modal.classList.add('show');
        }, 500);
    }
}
function playAgain() {
    document.getElementById('victoryModal').classList.remove('show');
    initGame();
}
document.addEventListener('keydown', function(e) {
    if (e.key.toLowerCase() === 'p') {
        const victoryModal = document.getElementById('victoryModal');
        if (victoryModal.classList.contains('show')) {
            playAgain();
        }
    }
});