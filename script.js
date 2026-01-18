const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = {
    mode: 1,
    difficulty: 'easy',
    player: null,
    bullets: [],
    walls: [],
    keys: {},
    scores: [0, 0, 0],
    gameOver: false,
        playersReady: []
};

let animationId = null;

const wallLines = [
    {x1: 10, y1: 10, x2: 990, y2: 10},
    {x1: 990, y1: 10, x2: 990, y2: 640},
    {x1: 990, y1: 640, x2: 10, y2: 640},
    {x1: 10, y1: 640, x2: 10, y2: 10},
    {x1: 170, y1: 120, x2: 330, y2: 120},
    {x1: 450, y1: 120, x2: 620, y2: 120},
    {x1: 740, y1: 120, x2: 870, y2: 120},
    {x1: 125, y1: 50, x2: 125, y2: 170},
    {x1: 330, y1: 120, x2: 330, y2: 210},
    {x1: 540, y1: 80, x2: 540, y2: 250},
    {x1: 740, y1: 120, x2: 740, y2: 250},
    {x1: 170, y1: 250, x2: 420, y2: 250},
    {x1: 540, y1: 290, x2: 790, y2: 290},
    {x1: 85, y1: 370, x2: 290, y2: 370},
    {x1: 420, y1: 370, x2: 660, y2: 370},
    {x1: 210, y1: 170, x2: 210, y2: 330},
    {x1: 420, y1: 250, x2: 420, y2: 420},
    {x1: 660, y1: 290, x2: 660, y2: 460},
    {x1: 870, y1: 210, x2: 870, y2: 370},
    {x1: 125, y1: 500, x2: 330, y2: 500},
    {x1: 450, y1: 500, x2: 700, y2: 500},
    {x1: 790, y1: 460, x2: 910, y2: 460},
    {x1: 250, y1: 420, x2: 250, y2: 600},
    {x1: 450, y1: 500, x2: 450, y2: 600},
    {x1: 580, y1: 370, x2: 580, y2: 540},
    {x1: 790, y1: 460, x2: 790, y2: 580}
];
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
    gameState.bullets = [];
    gameState.walls = wallLines;
    gameState.keys = {};
    gameState.players = [];
    gameState.gameOver = false;
const spawns = [
    {x: 70, y: 90},   
    {x: 870, y: 540},  
    {x: 150, y: 540}    
];
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
    
    player.lastShot = now;
    const angle = player.angle;
    gameState.bullets.push({
        x: player.x + Math.cos(angle) * 20,
        y: player.y + Math.sin(angle) * 20,
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
function updateBullets() {
    if (gameState.gameOver) return;
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const b = gameState.bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        if (b.life <= 0) {
            gameState.bullets.splice(i, 1);
            continue;
        }
        for (let j = 0; j < gameState.players.length; j++) {
            const tank = gameState.players[j];
            if (j === b.ownerId) continue;
            
            const dx = b.x - tank.x;
            const dy = b.y - tank.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 15) {
                if (tank.alive) {
                    tank.alive = false;
                    checkWinner();
                    gameState.bullets.splice(i, 1);
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
        
        if (i < 0 || i >= gameState.bullets.length) continue;
        for (let wall of gameState.walls) {
            if (distanceToLineSegment(b.x, b.y, wall.x1, wall.y1, wall.x2, wall.y2) < 5) {
                const dx = wall.x2 - wall.x1;
                const dy = wall.y2 - wall.y1;
                const len = Math.hypot(dx, dy);
                const nx = -dy / len;
                const ny = dx / len;
                const dot = b.vx * nx + b.vy * ny;
                b.vx -= 2 * dot * nx;
                b.vy -= 2 * dot * ny;
                break;
            }
        }
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            gameState.bullets.splice(i, 1);
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
    
    ctx.fillStyle = '#555';
    gameState.bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
    
    gameState.players.forEach(player => drawTank(player));
    
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
        
const tankIcons = ['img/green-tank.png', 'img/blue_tank.png', 'img/red-tank.png'];
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