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
    playersReady: [],
    powerupsEnabled: true,
    selfDestructEnabled: false,  
    powerups: [],           
    mines: [],              
    rockets: [],
    lasers: []
};

let keyboardModalState = {
    playerId: null,
    tempControls: null,
    selectingControl: null
};

const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'backspace'],
    ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['capslock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shift'],
    ['ctrl', 'alt', 'space', 'alt', 'ctrl'],
    ['arrowup', 'arrowleft', 'arrowdown', 'arrowright']
];

const keyDisplayNames = {
    'space': 'SPACE',
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→',
    'backspace': '⌫',
    'tab': 'TAB',
    'capslock': 'CAPS',
    'enter': 'ENTER',
    'shift': 'SHIFT',
    'ctrl': 'CTRL',
    'alt': 'ALT',
    '\\': '\\'
};
let explosions = [];
let debris = [];
let animationId = null;
let currentMap = 'Classic';
let playerControls = [
    {up: 'w', down: 's', left: 'a', right: 'd', shoot: 'e'},
    {up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', shoot: 'm'},
    {up: 'y', down: 'h', left: 'g', right: 'j', shoot: 'u'}
];
let powerupSpawnTimer = 0;
const POWERUP_SPAWN_INTERVAL = 300; 
const powerupIcons = {
    laser: new Image(),
    remoteRocket: new Image(),
    mine: new Image(),
    rocket: new Image(),
    wallbreaker: new Image()
};

powerupIcons.laser.src = 'img/laser.png';
powerupIcons.remoteRocket.src = 'img/rocket1.png';
powerupIcons.mine.src = 'img/mine.png';
powerupIcons.rocket.src = 'img/rocket.png';
powerupIcons.wallbreaker.src = 'img/wallbreaker.png';

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
    document.removeEventListener('keydown', handleReadyKeyDown);
    
    const oldPowerupToggle = document.querySelector('.powerup-toggle');
    if (oldPowerupToggle) {
        oldPowerupToggle.remove();
    }
    
    const oldSelfDestructToggle = document.querySelector('.selfdestruct-toggle');
    if (oldSelfDestructToggle) {
        oldSelfDestructToggle.remove();
    }
    
    showScreen('readyScreen');
    
    const readyButtons = document.getElementById('readyButtons');
    readyButtons.innerHTML = '';
    
if (gameState.mode > 1) {
    const powerupToggle = document.createElement('div');
    powerupToggle.className = 'powerup-toggle';
    powerupToggle.innerHTML = `
        <label>
            <input type="checkbox" id="powerupCheckbox" ${gameState.powerupsEnabled ? 'checked' : ''}>
            Enable Power-ups
        </label>
    `;
    readyButtons.parentElement.insertBefore(powerupToggle, readyButtons);
    
    document.getElementById('powerupCheckbox').addEventListener('change', (e) => {
        gameState.powerupsEnabled = e.target.checked;
    });
}

const selfDestructToggle = document.createElement('div');
selfDestructToggle.className = 'selfdestruct-toggle';
selfDestructToggle.innerHTML = `
    <label>
        <input type="checkbox" id="selfDestructCheckbox" ${gameState.selfDestructEnabled ? 'checked' : ''}>
        Enable Self-Destruct
    </label>
`;
readyButtons.parentElement.insertBefore(selfDestructToggle, readyButtons);

document.getElementById('selfDestructCheckbox').addEventListener('change', (e) => {
    gameState.selfDestructEnabled = e.target.checked;
});

    
    const playerNames = ['Green', 'Blue', 'Red'];
    const playerColors = ['green', 'blue', 'red'];
    gameState.playersReady = [];
    const numControlsToShow = gameState.mode === 1 ? 1 : gameState.mode;
    for (let i = 0; i < numControlsToShow; i++) {
        gameState.playersReady.push(false);
    }
    
    for (let i = 0; i < numControlsToShow; i++) {
    const containerDiv = document.createElement('div');
    containerDiv.className = 'player-ready-container';
    const labelDiv = document.createElement('div');
    labelDiv.className = 'player-label';
    labelDiv.textContent = playerNames[i] + 'Player';
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'controls-display';
    const upKey = document.createElement('div');
    upKey.className = 'control-key control-up';
    upKey.textContent = (keyDisplayNames[playerControls[i].up] || playerControls[i].up.toUpperCase());
    const leftKey = document.createElement('div');
    leftKey.className = 'control-key control-left';
    leftKey.textContent = (keyDisplayNames[playerControls[i].left] || playerControls[i].left.toUpperCase());
    const downKey = document.createElement('div');
    downKey.className = 'control-key control-down';
    downKey.textContent = (keyDisplayNames[playerControls[i].down] || playerControls[i].down.toUpperCase());
    const rightKey = document.createElement('div');
    rightKey.className = 'control-key control-right';
    rightKey.textContent = (keyDisplayNames[playerControls[i].right] || playerControls[i].right.toUpperCase());
    const shootKey = document.createElement('div');
    shootKey.className = 'control-key control-shoot shoot-key';
    shootKey.id = 'ready-' + i;
    shootKey.textContent = (keyDisplayNames[playerControls[i].shoot] || playerControls[i].shoot.toUpperCase());
    controlsDiv.appendChild(upKey);
    controlsDiv.appendChild(leftKey);
    controlsDiv.appendChild(downKey);
    controlsDiv.appendChild(rightKey);
    controlsDiv.appendChild(shootKey);
    
   const keyboardBtn = document.createElement('button');
   keyboardBtn.className = 'keyboard-btn';
   keyboardBtn.innerHTML = '<img src="img/keyboard.png" alt="Configure">';
   keyboardBtn.onclick = () => openKeyboardModal(i);
    
    containerDiv.appendChild(labelDiv);
    containerDiv.appendChild(controlsDiv);
    containerDiv.appendChild(keyboardBtn);
    readyButtons.appendChild(containerDiv);
}
    document.removeEventListener('keydown', handleReadyKeyDown);
    document.addEventListener('keydown', handleReadyKeyDown);
}
function handleReadyKeyDown(e) {
    const key = e.key.toLowerCase();
    const arrowKey = key.startsWith('arrow') ? key : null;
    const numControlsToCheck = gameState.mode === 1 ? 1 : gameState.mode;

    for (let i = 0; i < numControlsToCheck; i++) {
        if ((key === playerControls[i].shoot || arrowKey === playerControls[i].shoot) && !gameState.playersReady[i]) {
            gameState.playersReady[i] = true;
            document.getElementById('ready-' + i).classList.add('ready');
            
            const allReady = gameState.mode === 1 ? 
            gameState.playersReady[0] : 
            gameState.playersReady.every(ready => ready);

            if (allReady) {
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
    gameState.walls = JSON.parse(JSON.stringify(randomMap.wallLines));
    gameState.keys = {};
    gameState.players = [];
    gameState.gameOver = false;
    gameState.powerups = [];
    gameState.mines = [];
    gameState.rockets = [];
    gameState.lasers = [];
    gameState.nextPowerupSpawn = 600 + Math.random() * 600;
    
    const spawns = randomMap.spawns;
    const colors = ['#00ff00', '#0080ff', '#ff0000'];
    const numPlayers = gameState.mode === 1 ? 2 : gameState.mode; 
    for (let i = 0; i < numPlayers; i++) {
    gameState.players.push({
        x: spawns[i].x,
        y: spawns[i].y,
        angle: 0,
        color: colors[i],
        lastShot: 0,
        controls: playerControls[i],
        alive: true,
        playerId: i,
        powerup: null,
        isBot: gameState.mode === 1 && i === 1,
        botState: gameState.mode === 1 && i === 1 ? {
            targetAngle: 0,
            moveTimer: 0,
            nextDecision: 0,
            dodging: false,
            dodgeTimer: 0,
            currentPath: [],
            pathIndex: 0,
            lastPathCalc: 0
        } : null
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
    const key = e.key.toLowerCase();
    const arrowKey = key.startsWith('arrow') ? key : null;
    
    gameState.keys[key] = true;
    if (arrowKey) {
        gameState.keys[arrowKey] = true;
    }
    
    gameState.players.forEach(player => {
        if (player.controllingRocket) return;
        if (key === player.controls.shoot || arrowKey === player.controls.shoot) {
            e.preventDefault();
            shootBullet(player);
        }
    });
}
function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    const arrowKey = key.startsWith('arrow') ? key : null;
    
    gameState.keys[key] = false;
    if (arrowKey) {
        gameState.keys[arrowKey] = false;
    }
}
function shootBullet(player) {
    if (!player.alive) return;
    if (player.powerup === 'mine') {
        placeMine(player);
        return;
    }
    if (player.powerup === 'rocket') {
        shootRocket(player);
        return;
    }
    if (player.powerup === 'laser') {
        shootLaser(player);
        return;
    }
    if (player.powerup === 'remoteRocket') {
        shootRemoteRocket(player);
        return;
    }
    
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
    
    if (crossesWall) return;
    
    gameState.bullets.push({
        x: barrelTipX,
        y: barrelTipY,
        vx: Math.cos(angle) * 2.5,
        vy: Math.sin(angle) * 2.5,
        life: 1000,
        ownerId: player.playerId,
        wallbreaker: player.powerup === 'wallbreaker'
    });
    
    if (player.powerup === 'wallbreaker') {
        player.powerup = null;
    }
}

function shootRemoteRocket(player) {
    const angle = player.angle;
    const barrelTipX = player.x + Math.cos(angle) * 20;
    const barrelTipY = player.y + Math.sin(angle) * 20;
    
    player.controllingRocket = true;
    player.originalControls = {...player.controls};
    
    gameState.rockets.push({
        x: barrelTipX,
        y: barrelTipY,
        angle: angle,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        ownerId: player.playerId,
        color: player.color,
        isRemoteControlled: true,
        controllerId: player.playerId,
        trail: []
    });
    
    player.powerup = null;
}

function shootLaser(player) {
    const now = Date.now();
    if (now - player.lastShot < 300) return;
    
    player.lastShot = now;
    const angle = player.angle;
    const barrelTipX = player.x + Math.cos(angle) * 20;
    const barrelTipY = player.y + Math.sin(angle) * 20;
    
    const laserLength = 2000;
    const endX = barrelTipX + Math.cos(angle) * laserLength;
    const endY = barrelTipY + Math.sin(angle) * laserLength;
    
    gameState.lasers.push({
        startX: barrelTipX,
        startY: barrelTipY,
        endX: endX,
        endY: endY,
        angle: angle,
        ownerId: player.playerId,
        alpha: 1,
        duration: 30
    });
    
    checkLaserHits(barrelTipX, barrelTipY, endX, endY, player.playerId);
    
    player.powerup = null;
}
function checkLaserHits(startX, startY, endX, endY, ownerId) {
    for (let player of gameState.players) {
        if (player.playerId === ownerId || !player.alive) continue;
        
        const dist = distanceToLineSegment(player.x, player.y, startX, startY, endX, endY);
        
        if (dist < 15) {
            player.alive = false;
            createExplosion(player.x, player.y);
            checkWinner();
        }
    }
}
function updateLasers() {
    for (let i = gameState.lasers.length - 1; i >= 0; i--) {
        const laser = gameState.lasers[i];
        
        laser.duration--;
        laser.alpha = laser.duration / 30; 
        
        if (laser.duration <= 0) {
            gameState.lasers.splice(i, 1);
        }
    }
}
function drawLasers() {
    gameState.lasers.forEach(laser => {
        ctx.save();
        ctx.globalAlpha = laser.alpha;
        ctx.strokeStyle = '#FF00FF';
        ctx.lineWidth = 12;
        ctx.shadowColor = '#FF00FF';
        ctx.shadowBlur = 20;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(laser.startX, laser.startY);
        ctx.lineTo(laser.endX, laser.endY);
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(laser.startX, laser.startY);
        ctx.lineTo(laser.endX, laser.endY);
        ctx.stroke();
        
        ctx.restore();
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
        if (player.isBot) {
            updateBot(player);
            return;
        }
        if (gameState.gameOver) return;
        if (!player.alive) return;
        if (player.controllingRocket) {
            return;
        }
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
                if (b.isLaser) {
                } else if (b.wallbreaker) {
                const isBoundaryWall = (
                    (hitWall.x1 === 10 && hitWall.x2 === 990 && hitWall.y1 === 10) ||
                    (hitWall.x1 === 990 && hitWall.y1 === 10 && hitWall.y2 === 640) ||
                    (hitWall.x1 === 990 && hitWall.x2 === 10 && hitWall.y1 === 640) ||
                    (hitWall.x1 === 10 && hitWall.y1 === 640 && hitWall.y2 === 10)
                );
                
                if (!isBoundaryWall) {
                    const wallIndex = gameState.walls.indexOf(hitWall);
                    if (wallIndex > -1) {
                        gameState.walls.splice(wallIndex, 1);
                    }
                }
                gameState.bullets.splice(i, 1);
                continue;
            }
            
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
            if (j === b.ownerId && !gameState.selfDestructEnabled) continue;
            
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
    if (tank.controllingRocket) {
        ctx.fillStyle = tank.color;
        ctx.fillRect(-2, -10, 4, 20);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-2, -10, 4, 20);
        ctx.fillStyle = '#cacacaff';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(8, -4);
        ctx.lineTo(8, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-5, -8, 2, 0, Math.PI * 2);
        ctx.arc(-5, 8, 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = tankColor;
        ctx.fillRect(0, -3, 16, 6);
        ctx.strokeRect(0, -3, 16, 6);
        ctx.fillStyle = '#222';
        ctx.fillRect(15, -2, 3, 4);
    }
    if (tank.powerup && tank.alive && !tank.controllingRocket) {
        if (tank.powerup === 'rocket') {
            ctx.fillStyle = tank.color;
            ctx.fillRect(8, -6, 8, 3);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(8, -6, 8, 3);
            ctx.beginPath();
            ctx.moveTo(16, -6);
            ctx.lineTo(18, -4.5);
            ctx.lineTo(16, -3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (tank.powerup === 'mine') {
            ctx.fillStyle = tank.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(-12, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-12, 0, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (tank.powerup === 'wallbreaker') {
            ctx.fillStyle = '#FFD700';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(18, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (tank.powerup === 'laser') {
            ctx.fillStyle = '#FF00FF';
            ctx.shadowColor = '#FF00FF';
            ctx.shadowBlur = 8;
            ctx.fillRect(12, -1.5, 6, 3);
            ctx.fillRect(15, -3, 1, 6);
            ctx.shadowBlur = 0;
        } else if (tank.powerup === 'remoteRocket') {
    ctx.fillStyle = tank.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.fillRect(14, -2, 8, 4);
    ctx.strokeRect(14, -2, 8, 4);
    ctx.beginPath();
    ctx.moveTo(22, -2);
    ctx.lineTo(24, 0);
    ctx.lineTo(22, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(14, -4, 3, 2);
    ctx.fillRect(14, 2, 3, 2);
}
    }
    
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

function spawnPowerup() {
    if (!gameState.powerupsEnabled || gameState.mode === 1) return;
    
    const types = ['mine', 'rocket', 'wallbreaker', 'laser', 'remoteRocket'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let x, y;
    let attempts = 0;
    let tooClose = false;
    
    do {
        x = 50 + Math.random() * 900;
        y = 50 + Math.random() * 550;
        tooClose = false;
        if (collideWall(x, y)) {
            tooClose = true;
        }
        
        for (let p of gameState.powerups) {
            const dist = Math.hypot(p.x - x, p.y - y);
            if (dist < 100) {
                tooClose = true;
                break;
            }
        }
        
        attempts++;
    } while (tooClose && attempts < 100);
    
    if (attempts < 100) {
        gameState.powerups.push({
            x: x,
            y: y,
            type: type,
            spawnTime: Date.now()
        });
    }
}

function updatePowerups() {
    if (gameState.gameOver) return;
    
    if (gameState.powerupsEnabled && gameState.mode > 1) {
        powerupSpawnTimer++;
        
        if (!gameState.nextPowerupSpawn) {
            gameState.nextPowerupSpawn = 600 + Math.random() * 600;
        }
        
        if (powerupSpawnTimer >= gameState.nextPowerupSpawn && gameState.powerups.length < 3) {
            spawnPowerup();
            powerupSpawnTimer = 0;
            gameState.nextPowerupSpawn = 600 + Math.random() * 600; 
        }
    }
    
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const p = gameState.powerups[i];
        for (let player of gameState.players) {
            if (!player.alive) continue;
            const dist = Math.hypot(player.x - p.x, player.y - p.y);
            if (dist < 20) {
                player.powerup = p.type;
                player.powerupColor = player.color;
                gameState.powerups.splice(i, 1);
                break;
            }
        }
    }
}

function placeMine(player) {
gameState.mines.push({
    x: player.x,
    y: player.y,
    ownerId: player.playerId,
    color: player.color,
    alpha: 1.0,
    fadeTimer: 120  
});
    player.powerup = null;
}

function shootRocket(player) {
    const angle = player.angle;
    const barrelTipX = player.x + Math.cos(angle) * 20;
    const barrelTipY = player.y + Math.sin(angle) * 20;
    
    gameState.rockets.push({
        x: barrelTipX,
        y: barrelTipY,
        angle: angle,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        ownerId: player.playerId,
        color: player.color,
        targetPlayer: null,
        phase: 'flying',
        flyTime: 90,
        trackTime: 1200,
        trail: []
    });
    player.powerup = null;
}

function updateMines() {
    for (let i = gameState.mines.length - 1; i >= 0; i--) {
        const mine = gameState.mines[i];
        
        if (mine.fadeTimer > 0) {
            mine.fadeTimer--;
            mine.alpha = mine.fadeTimer / 120;
        }
        
        for (let player of gameState.players) {
            if (!player.alive || player.playerId === mine.ownerId) continue;
            const dist = Math.hypot(player.x - mine.x, player.y - mine.y);
            if (dist < 20) {
                player.alive = false;
                createExplosion(player.x, player.y);
                gameState.mines.splice(i, 1);
                checkWinner();
                break;
            }
        }
    }
}

function updateRockets() {
    const TURN_SPEED = 0.09;
    const SPEED = 1.8;
    const WALL_AVOID_DIST = 30;
    const RECALC_PATH_INTERVAL = 60;
    
    for (let i = gameState.rockets.length - 1; i >= 0; i--) {
        const r = gameState.rockets[i];
        if (!r.trail) r.trail = [];
        if (!r.angle) r.angle = Math.atan2(r.vy, r.vx);
        for (let j = r.trail.length - 1; j >= 0; j--) {
            r.trail[j].x += r.trail[j].vx;
            r.trail[j].y += r.trail[j].vy;
            r.trail[j].alpha -= 0.012;
            r.trail[j].size -= 0.03;
            if (r.trail[j].alpha <= 0 || r.trail[j].size <= 0) {
                r.trail.splice(j, 1);
            }
        }
        
        if (r.isRemoteControlled) {
            const controller = gameState.players[r.controllerId];
            if (!r.lifeTimer) {
                r.lifeTimer = 700; 
            }
            
            r.lifeTimer--;
            
            if (r.lifeTimer <= 0 || !controller || !controller.alive) {
                if (controller) {
                    controller.controllingRocket = false;
                }
                gameState.rockets.splice(i, 1);
                continue;
            }
            
            const controls = controller.originalControls;
            
            if (gameState.keys[controls.left]) r.angle -= 0.06;
            if (gameState.keys[controls.right]) r.angle += 0.06;
            
            const REMOTE_SPEED = 1.0; 
            
            if (gameState.keys[controls.up]) {
                r.vx = Math.cos(r.angle) * REMOTE_SPEED;
                r.vy = Math.sin(r.angle) * REMOTE_SPEED;
            } else if (gameState.keys[controls.down]) {
                const REVERSE_SPEED = -0.8;
                r.vx = Math.cos(r.angle) * REVERSE_SPEED;
                r.vy = Math.sin(r.angle) * REVERSE_SPEED;
            } else {
                r.vx *= 0.95;
                r.vy *= 0.95;
            }
            
            if (Math.random() < 0.6) {
                const trailColor = r.color;
                const spread = (Math.random() - 0.5) * 6;
                r.trail.push({
                    x: r.x + spread,
                    y: r.y + spread,
                    size: 4 + Math.random() * 4,
                    alpha: 0.6 + Math.random() * 0.2,
                    color: trailColor,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5
                });
            }
            
        } else {
            if (!r.pathRecalcTimer) r.pathRecalcTimer = 0;
            if (!r.waypoints) r.waypoints = [];
            if (!r.currentWaypoint) r.currentWaypoint = 0;
            
            if (Math.random() < 0.6) {
                const trailColor = r.targetPlayer ? r.targetPlayer.color : '#888';
                const spread = (Math.random() - 0.5) * 6;
                r.trail.push({
                    x: r.x + spread,
                    y: r.y + spread,
                    size: 4 + Math.random() * 4,
                    alpha: 0.6 + Math.random() * 0.2,
                    color: trailColor,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5
                });
            }
            
            if (r.phase === 'flying') {
                r.flyTime--;
                if (r.flyTime <= 0) {
                    r.phase = 'tracking';
                }
            } else {
                r.trackTime--;
                if (r.trackTime <= 0) {
                    gameState.rockets.splice(i, 1);
                    continue;
                }
                
                let closestDist = Infinity;
                let closestPlayer = null;
                for (let player of gameState.players) {
                    if (!player.alive || player.playerId === r.ownerId) continue;
                    const dist = Math.hypot(player.x - r.x, player.y - r.y);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestPlayer = player;
                    }
                }
                
                r.targetPlayer = closestPlayer;
                
                r.pathRecalcTimer++;
                
                if (closestPlayer && (r.waypoints.length === 0 || r.pathRecalcTimer >= RECALC_PATH_INTERVAL)) {
                    r.waypoints = calculateRocketPath(r.x, r.y, closestPlayer.x, closestPlayer.y);
                    r.currentWaypoint = 0;
                    r.pathRecalcTimer = 0;
                }
                
                if (r.waypoints.length > 0 && r.currentWaypoint < r.waypoints.length) {
                    const waypoint = r.waypoints[r.currentWaypoint];
                    const distToWaypoint = Math.hypot(waypoint.x - r.x, waypoint.y - r.y);
                    
                    if (distToWaypoint < 30) {
                        r.currentWaypoint++;
                    }
                    
                    if (r.currentWaypoint < r.waypoints.length) {
                        const targetWaypoint = r.waypoints[r.currentWaypoint];
                        const targetAngle = Math.atan2(targetWaypoint.y - r.y, targetWaypoint.x - r.x);
                        
                        let angleDiff = targetAngle - r.angle;
                        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                        
                        angleDiff = Math.max(-TURN_SPEED, Math.min(TURN_SPEED, angleDiff));
                        r.angle += angleDiff;
                    }
                }
            }
            
            let nearestWallDist = Infinity;
            let avoidAngle = 0;
            
            for (let wall of gameState.walls) {
                const dist = distanceToLineSegment(r.x, r.y, wall.x1, wall.y1, wall.x2, wall.y2);
                
                if (dist < WALL_AVOID_DIST && dist < nearestWallDist) {
                    nearestWallDist = dist;
                    
                    const t = Math.max(0, Math.min(1, 
                        ((r.x - wall.x1) * (wall.x2 - wall.x1) + (r.y - wall.y1) * (wall.y2 - wall.y1)) /
                        (Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2))
                    ));
                    
                    const closestX = wall.x1 + t * (wall.x2 - wall.x1);
                    const closestY = wall.y1 + t * (wall.y2 - wall.y1);
                    
                    avoidAngle = Math.atan2(r.y - closestY, r.x - closestX);
                }
            }
            
            if (nearestWallDist < WALL_AVOID_DIST) {
                const threat = 1 - (nearestWallDist / WALL_AVOID_DIST);
                let avoidDiff = avoidAngle - r.angle;
                while (avoidDiff > Math.PI) avoidDiff -= 2 * Math.PI;
                while (avoidDiff < -Math.PI) avoidDiff += 2 * Math.PI;
                
                r.angle += avoidDiff * 0.25 * threat;
            }
            
            r.vx = Math.cos(r.angle) * SPEED;
            r.vy = Math.sin(r.angle) * SPEED;
        }
        
        const oldX = r.x;
        const oldY = r.y;
        const newX = r.x + r.vx;
        const newY = r.y + r.vy;
        
        let wallCollision = false;
        
        if (r.isRemoteControlled) {
            for (let wall of gameState.walls) {
                if (lineSegmentsIntersect(oldX, oldY, newX, newY, wall.x1, wall.y1, wall.x2, wall.y2)) {
                    wallCollision = true;
                    r.vx = 0;
                    r.vy = 0;
                    break;
                }
                
                const distToNew = distanceToLineSegment(newX, newY, wall.x1, wall.y1, wall.x2, wall.y2);
                if (distToNew < 3) {
                    wallCollision = true;
                    r.vx = 0;
                    r.vy = 0;
                    break;
                }
            }
        } else {
            for (let wall of gameState.walls) {
                if (lineSegmentsIntersect(oldX, oldY, newX, newY, wall.x1, wall.y1, wall.x2, wall.y2)) {
                    wallCollision = true;
                    
                    const dx = wall.x2 - wall.x1;
                    const dy = wall.y2 - wall.y1;
                    const len = Math.hypot(dx, dy);
                    const nx = -dy / len;
                    const ny = dx / len;
                    
                    const dot = r.vx * nx + r.vy * ny;
                    r.vx -= 2 * dot * nx;
                    r.vy -= 2 * dot * ny;
                    r.angle = Math.atan2(r.vy, r.vx);
                    
                    r.x = oldX + nx * 3;
                    r.y = oldY + ny * 3;
                    
                    r.pathRecalcTimer = RECALC_PATH_INTERVAL;
                    break;
                }
                
                const distToNew = distanceToLineSegment(newX, newY, wall.x1, wall.y1, wall.x2, wall.y2);
                if (distToNew < 3) {
                    wallCollision = true;
                    
                    const t = Math.max(0, Math.min(1, 
                        ((newX - wall.x1) * (wall.x2 - wall.x1) + (newY - wall.y1) * (wall.y2 - wall.y1)) /
                        (Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2))
                    ));
                    
                    const closestX = wall.x1 + t * (wall.x2 - wall.x1);
                    const closestY = wall.y1 + t * (wall.y2 - wall.y1);
                    
                    const dx = wall.x2 - wall.x1;
                    const dy = wall.y2 - wall.y1;
                    const len = Math.hypot(dx, dy);
                    const nx = -dy / len;
                    const ny = dx / len;
                    
                    const dot = r.vx * nx + r.vy * ny;
                    r.vx -= 2 * dot * nx;
                    r.vy -= 2 * dot * ny;
                    r.angle = Math.atan2(r.vy, r.vx);
                    
                    r.x = closestX + nx * 5;
                    r.y = closestY + ny * 5;
                    
                    r.pathRecalcTimer = RECALC_PATH_INTERVAL;
                    break;
                }
            }
        }
        
        if (!wallCollision) {
            r.x = newX;
            r.y = newY;
        }
        
        if (r.isRemoteControlled) {
            if (r.x < 20) {
                r.x = 20;
                r.vx = 0;
                r.vy = 0;
            }
            if (r.x > canvas.width - 20) {
                r.x = canvas.width - 20;
                r.vx = 0;
                r.vy = 0;
            }
            if (r.y < 20) {
                r.y = 20;
                r.vx = 0;
                r.vy = 0;
            }
            if (r.y > canvas.height - 20) {
                r.y = canvas.height - 20;
                r.vx = 0;
                r.vy = 0;
            }
        } else {
            if (r.x < 20) {
                r.x = 20;
                r.vx = Math.abs(r.vx);
                r.angle = Math.atan2(r.vy, r.vx);
            }
            if (r.x > canvas.width - 20) {
                r.x = canvas.width - 20;
                r.vx = -Math.abs(r.vx);
                r.angle = Math.atan2(r.vy, r.vx);
            }
            if (r.y < 20) {
                r.y = 20;
                r.vy = Math.abs(r.vy);
                r.angle = Math.atan2(r.vy, r.vx);
            }
            if (r.y > canvas.height - 20) {
                r.y = canvas.height - 20;
                r.vy = -Math.abs(r.vy);
                r.angle = Math.atan2(r.vy, r.vx);
            }
        }
        
        for (let player of gameState.players) {
            if (!player.alive || player.playerId === r.ownerId) continue;
            const dist = Math.hypot(player.x - r.x, player.y - r.y);
            if (dist < 15) {
                player.alive = false;
                createExplosion(player.x, player.y);
                if (r.isRemoteControlled) {
                    const controller = gameState.players[r.controllerId];
                    if (controller) {
                        controller.controllingRocket = false;
                    }
                }
                
                gameState.rockets.splice(i, 1);
                checkWinner();
                break;
            }
        }
    }
}

function calculateRocketPath(startX, startY, targetX, targetY) {
    const hasDirectPath = !checkPathBlocked(startX, startY, targetX, targetY);
    
    if (hasDirectPath) {
        return [{x: targetX, y: targetY}];
    }
    
    const testAngles = [];
    const numAngles = 16;
    const baseAngle = Math.atan2(targetY - startY, targetX - startX);
    
    for (let i = 0; i < numAngles; i++) {
        const angle = baseAngle + (i / numAngles) * Math.PI * 2;
        testAngles.push(angle);
    }
    
    let bestPath = null;
    let bestScore = -Infinity;
    
    for (let angle of testAngles) {
        const waypoint1Dist = 150;
        const waypoint1X = startX + Math.cos(angle) * waypoint1Dist;
        const waypoint1Y = startY + Math.sin(angle) * waypoint1Dist;
        
        if (waypoint1X < 30 || waypoint1X > canvas.width - 30 || 
            waypoint1Y < 30 || waypoint1Y > canvas.height - 30) {
            continue;
        }
        
        if (checkPathBlocked(startX, startY, waypoint1X, waypoint1Y)) {
            continue;
        }
        
        if (checkPathBlocked(waypoint1X, waypoint1Y, targetX, targetY)) {
            const angle2ToTarget = Math.atan2(targetY - waypoint1Y, targetX - waypoint1X);
            
            let bestWaypoint2 = null;
            let bestWaypoint2Score = -Infinity;
            
            for (let j = 0; j < 12; j++) {
                const angle2 = angle2ToTarget + ((j - 6) / 6) * Math.PI;
                const waypoint2X = waypoint1X + Math.cos(angle2) * 120;
                const waypoint2Y = waypoint1Y + Math.sin(angle2) * 120;
                
                if (waypoint2X < 30 || waypoint2X > canvas.width - 30 || 
                    waypoint2Y < 30 || waypoint2Y > canvas.height - 30) {
                    continue;
                }
                
                if (!checkPathBlocked(waypoint1X, waypoint1Y, waypoint2X, waypoint2Y) &&
                    !checkPathBlocked(waypoint2X, waypoint2Y, targetX, targetY)) {
                    
                    const totalDist = Math.hypot(waypoint1X - startX, waypoint1Y - startY) +
                                    Math.hypot(waypoint2X - waypoint1X, waypoint2Y - waypoint1Y) +
                                    Math.hypot(targetX - waypoint2X, targetY - waypoint2Y);
                    
                    const score = -totalDist;
                    
                    if (score > bestWaypoint2Score) {
                        bestWaypoint2Score = score;
                        bestWaypoint2 = {x: waypoint2X, y: waypoint2Y};
                    }
                }
            }
            
            if (bestWaypoint2) {
                const totalDist = Math.hypot(waypoint1X - startX, waypoint1Y - startY) +
                                Math.hypot(bestWaypoint2.x - waypoint1X, bestWaypoint2.y - waypoint1Y) +
                                Math.hypot(targetX - bestWaypoint2.x, targetY - bestWaypoint2.y);
                
                const score = -totalDist;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestPath = [
                        {x: waypoint1X, y: waypoint1Y},
                        {x: bestWaypoint2.x, y: bestWaypoint2.y},
                        {x: targetX, y: targetY}
                    ];
                }
            }
        } else {
            const totalDist = Math.hypot(waypoint1X - startX, waypoint1Y - startY) +
                            Math.hypot(targetX - waypoint1X, targetY - waypoint1Y);
            
            const score = -totalDist;
            
            if (score > bestScore) {
                bestScore = score;
                bestPath = [
                    {x: waypoint1X, y: waypoint1Y},
                    {x: targetX, y: targetY}
                ];
            }
        }
    }
    
    if (bestPath) {
        return bestPath;
    }
    
    return [{x: targetX, y: targetY}];
}

function checkPathBlocked(x1, y1, x2, y2) {
    for (let wall of gameState.walls) {
        if (lineSegmentsIntersect(x1, y1, x2, y2, wall.x1, wall.y1, wall.x2, wall.y2)) {
            return true;
        }
    }
    
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = x1 + (x2 - x1) * t;
        const checkY = y1 + (y2 - y1) * t;
        
        for (let wall of gameState.walls) {
            if (distanceToLineSegment(checkX, checkY, wall.x1, wall.y1, wall.x2, wall.y2) < 10) {
                return true;
            }
        }
    }
    
    return false;
}

function drawPowerups() {
    const now = Date.now();
    gameState.powerups.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        const fadeInDuration = 500;
        const timeSinceSpawn = now - p.spawnTime;
        const fadeProgress = Math.min(timeSinceSpawn / fadeInDuration, 1);
        
        ctx.globalAlpha = fadeProgress;
        const scale = 0.5 + (fadeProgress * 0.5); 
        ctx.scale(scale, scale);
        
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-12, -12, 24, 24);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-12, -12, 24, 24);
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(-11, -11, 22, 22);
        
        const iconImg = new Image();
        if (p.type === 'mine') {
            iconImg.src = 'img/mine.png';
        } else if (p.type === 'rocket') {
            iconImg.src = 'img/rocket.png';
        } else if (p.type === 'wallbreaker') {
            iconImg.src = 'img/wallbreaker.png';
        } else if (p.type === 'laser') {
            iconImg.src = 'img/laser.png';
        } else if (p.type === 'remoteRocket') {
            iconImg.src = 'img/rocket1.png';
        } 
        if (iconImg.complete) {
            ctx.filter = 'invert(1)';
            ctx.drawImage(iconImg, -10, -10, 20, 20);
            ctx.filter = 'none';
        }
        
        ctx.restore();
    });
}

function drawMines() {
    gameState.mines.forEach(mine => {
        ctx.save();
        ctx.globalAlpha = mine.alpha;
        
        ctx.fillStyle = mine.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    });
}

function drawRockets() {
    gameState.rockets.forEach(r => {
        if (r.trail) {
            r.trail.forEach((particle, idx) => {
                ctx.save();
                ctx.globalAlpha = particle.alpha;
                
                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size
                );
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(1, 'rgba(128, 128, 128, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
        
        ctx.save();
        const angle = Math.atan2(r.vy, r.vx);
        ctx.translate(r.x, r.y);
        ctx.rotate(angle);
        
        ctx.fillStyle = '#666';
        ctx.fillRect(-6, -2.5, 12, 5);
        
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.moveTo(6, -2.5);
        ctx.lineTo(10, 0);
        ctx.lineTo(6, 2.5);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(-6, -2.5);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-6, -4);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-6, 2.5);
        ctx.lineTo(-8, 4);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-6, -2.5, 12, 5);
        
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
    updatePowerups();
    updateMines();
    updateRockets();
    updateLasers();
    updateExplosions();
    ctx.fillStyle = '#555';
    gameState.bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
    
    drawPowerups();
    drawMines();
    drawRockets();
    drawLasers(); 

    gameState.players.forEach(player => drawTank(player));
    drawExplosions();
    animationId = requestAnimationFrame(gameLoop);
}
function updateScoreboard() {
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '';

    const playerNames = ['Green', 'Blue', 'Red'];
    const playerColors = ['#00ff00', '#0080ff', '#ff0000'];
    const numScoreboards = gameState.mode === 1 ? 2 : gameState.mode;     
        for (let i = 0; i < numScoreboards; i++) {
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
            
            if (gameState.mode === 1) {
                if (winner.isBot) {
                    victoryText.textContent = 'GAME OVER!';
                    victoryText.className = 'victory-text red';
                } else {
                    victoryText.textContent = 'YOU WIN!';
                    victoryText.className = 'victory-text green';
                }
            } else {
                victoryText.textContent = playerNames[winner.playerId] + ' WINS!';
                victoryText.className = 'victory-text ' + playerClasses[winner.playerId];
            }
            
            modal.classList.add('show');
        }, 2000);
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

function openKeyboardModal(playerId) {
    keyboardModalState.playerId = playerId;
    keyboardModalState.tempControls = {...playerControls[playerId]};
    keyboardModalState.selectingControl = null;
    
    const playerNames = ['Green', 'Blue', 'Red'];
    document.getElementById('keyboardTitle').textContent = `Configure ${playerNames[playerId]} Player Controls`;
    
    renderKeyboardControls();
    renderVirtualKeyboard();
    
    document.getElementById('keyboardModal').classList.add('show');
}

function renderKeyboardControls() {
    const container = document.getElementById('keyboardControls');
    container.innerHTML = '';
    
    const controlNames = {
        up: 'Move Up',
        down: 'Move Down',
        left: 'Move Left',
        right: 'Move Right',
        shoot: 'Shoot'
    };
    
    for (let [control, name] of Object.entries(controlNames)) {
        const row = document.createElement('div');
        row.className = 'control-row';
        
        const label = document.createElement('div');
        label.className = 'control-label';
        label.textContent = name + ':';
        
        const button = document.createElement('button');
        button.className = 'control-button';
        const key = keyboardModalState.tempControls[control];
        button.textContent = (keyDisplayNames[key] || key.toUpperCase());
        button.onclick = () => selectControl(control);
        
        if (keyboardModalState.selectingControl === control) {
            button.classList.add('selecting');
        }
        
        row.appendChild(label);
        row.appendChild(button);
        container.appendChild(row);
    }
}

function selectControl(control) {
    keyboardModalState.selectingControl = control;
    renderKeyboardControls();
    renderVirtualKeyboard();
}

function renderVirtualKeyboard() {
    const container = document.getElementById('virtualKeyboard');
    container.innerHTML = '';
    
    const occupiedKeys = getAllOccupiedKeys();
    
    for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        keyboardLayout[rowIndex].forEach(key => {
            const keyElement = document.createElement('div');
            keyElement.className = 'virtual-key';
            keyElement.setAttribute('data-key', key);
            keyElement.textContent = keyDisplayNames[key] || key.toUpperCase();
            
            const currentKey = keyboardModalState.tempControls[keyboardModalState.selectingControl];
            if (occupiedKeys.includes(key) && key !== currentKey) {
                keyElement.classList.add('occupied');
            } else {
                keyElement.onclick = () => assignKey(key);
            }
            
            rowDiv.appendChild(keyElement);
        });
        
        container.appendChild(rowDiv);
    }
    
    const bottomRow = document.createElement('div');
    bottomRow.className = 'keyboard-row';
    keyboardLayout[4].forEach(key => {
        const keyElement = document.createElement('div');
        keyElement.className = 'virtual-key';
        keyElement.setAttribute('data-key', key);
        keyElement.textContent = keyDisplayNames[key] || key.toUpperCase();
        
        const currentKey = keyboardModalState.tempControls[keyboardModalState.selectingControl];
        if (occupiedKeys.includes(key) && key !== currentKey) {
            keyElement.classList.add('occupied');
        } else {
            keyElement.onclick = () => assignKey(key);
        }
        
        bottomRow.appendChild(keyElement);
    });
    container.appendChild(bottomRow);
    
    const arrowRow = document.createElement('div');
    arrowRow.className = 'arrow-row';
    
    const arrowGroup = document.createElement('div');
    arrowGroup.className = 'arrow-group';
    
    keyboardLayout[5].forEach(key => {
        const keyElement = document.createElement('div');
        keyElement.className = 'virtual-key';
        keyElement.setAttribute('data-key', key);
        keyElement.textContent = keyDisplayNames[key] || key.toUpperCase();
        
        const currentKey = keyboardModalState.tempControls[keyboardModalState.selectingControl];
        if (occupiedKeys.includes(key) && key !== currentKey) {
            keyElement.classList.add('occupied');
        } else {
            keyElement.onclick = () => assignKey(key);
        }
        
        arrowGroup.appendChild(keyElement);
    });
    
    arrowRow.appendChild(arrowGroup);
    container.appendChild(arrowRow);
}
function getAllOccupiedKeys() {
    const occupied = [];
    
    for (let i = 0; i < playerControls.length; i++) {
        if (i === keyboardModalState.playerId) {
            for (let [control, key] of Object.entries(keyboardModalState.tempControls)) {
                if (control !== keyboardModalState.selectingControl) {
                    occupied.push(key);
                }
            }
        } else {
            for (let key of Object.values(playerControls[i])) {
                occupied.push(key);
            }
        }
    }
    
    return occupied;
}

function assignKey(key) {
    if (!keyboardModalState.selectingControl) return;
    
    keyboardModalState.tempControls[keyboardModalState.selectingControl] = key;
    keyboardModalState.selectingControl = null;
    
    renderKeyboardControls();
    renderVirtualKeyboard();
}

function applyKeyboardChanges() {
    playerControls[keyboardModalState.playerId] = {...keyboardModalState.tempControls};
    
    closeKeyboardModal();
    showReadyScreen();
}

function closeKeyboardModal() {
    document.getElementById('keyboardModal').classList.remove('show');
    keyboardModalState = {
        playerId: null,
        tempControls: null,
        selectingControl: null
    };
}