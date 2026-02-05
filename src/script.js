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

let gameSettings = {
    tankSpeed: 1.0,
    bulletSpeed: 2.5,
};

let keyboardModalState = {
    playerId: null,
    tempControls: null,
    selectingControl: null
};

const keyboardLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
    ['arrowup', 'arrowleft', 'arrowdown', 'arrowright']
];

const keyDisplayNames = {
    'arrowup': '↑',
    'arrowdown': '↓',
    'arrowleft': '←',
    'arrowright': '→'
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
    const settingsBtn = document.querySelector('.settings-btn');
    
    if (screenId === 'playerScreen') {
        backButton.classList.remove('show');
    } else {
        backButton.classList.add('show');
    }
    
    if (screenId === 'playerScreen' || screenId === 'difficultyScreen' || screenId === 'readyScreen') {
        settingsBtn.style.display = 'flex';
    } else {
        settingsBtn.style.display = 'none';
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
            trackOffset: 0,  
            lastX: spawns[i].x,  
            lastY: spawns[i].y,
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
        vx: Math.cos(angle) * gameSettings.bulletSpeed,
        vy: Math.sin(angle) * gameSettings.bulletSpeed,
        life: 1000,
        ownerId: player.playerId,
        wallbreaker: player.powerup === 'wallbreaker'
    });
    
    if (player.powerup === 'wallbreaker') {
        player.powerup = null;
    }
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

function lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false;
    
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
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
        if (gameState.keys[player.controls.up]) speed = 1.2 * gameSettings.tankSpeed;
        if (gameState.keys[player.controls.down]) speed = -0.7 * gameSettings.tankSpeed;
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

        if (!collideWall(player.x, newY) && !collideTank(player, player.x, newY) && !blockedByDead) {
            player.y = newY;
        }

        const movedDistance = Math.hypot(player.x - (player.lastX || player.x), player.y - (player.lastY || player.y));
        if (movedDistance > 0.1) {
            if (speed > 0) {
                player.trackOffset = (player.trackOffset || 0) + movedDistance * 0.5;
            } else if (speed < 0) {
                player.trackOffset = (player.trackOffset || 0) - movedDistance * 0.5;
            }
            while (player.trackOffset >= 4) player.trackOffset -= 4;
            while (player.trackOffset < 0) player.trackOffset += 4;
        }
        player.lastX = player.x;
        player.lastY = player.y;
    });
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
    
    let baseColor, lightColor, darkColor, shadowColor;
    
    if (!tank.alive) {
        baseColor = '#2a2a2a';
        lightColor = '#3a3a3a';
        darkColor = '#1a1a1a';
        shadowColor = '#0a0a0a';
    } else {
        if (tank.color === '#00ff00') {
            baseColor = '#00cc00';
            lightColor = '#00ff33';
            darkColor = '#008800';
            shadowColor = '#004400';
        } else if (tank.color === '#0080ff') {
            baseColor = '#0066cc';
            lightColor = '#3399ff';
            darkColor = '#004499';
            shadowColor = '#002266';
        } else if (tank.color === '#ff0000') {
            baseColor = '#cc0000';
            lightColor = '#ff3333';
            darkColor = '#880000';
            shadowColor = '#440000';
        }
    }
    
    const trackGradient = ctx.createLinearGradient(0, -12, 0, -9);
    trackGradient.addColorStop(0, '#0a0a0a');
    trackGradient.addColorStop(0.5, '#1a1a1a');
    trackGradient.addColorStop(1, '#2a2a2a');
    
    ctx.fillStyle = trackGradient;
    ctx.fillRect(-14, -12, 28, 3);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-14, -12, 28, 3);
    
    const offset = tank.trackOffset || 0;
    for (let i = -14; i < 16; i += 4) {
        const pos = i - offset;
        if (pos >= -14 && pos <= 14) {
            ctx.fillStyle = '#333';
            ctx.fillRect(pos, -12, 2, 3);
        }
    }
    
    ctx.fillStyle = trackGradient;
    ctx.fillRect(-14, 9, 28, 3);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-14, 9, 28, 3);
    
    for (let i = -14; i < 16; i += 4) {
        const pos = i - offset;
        if (pos >= -14 && pos <= 14) {
            ctx.fillStyle = '#333';
            ctx.fillRect(pos, 9, 2, 3);
        }
    }
    
    const bodyGradient = ctx.createLinearGradient(0, -9, 0, 9);
    bodyGradient.addColorStop(0, lightColor);
    bodyGradient.addColorStop(0.3, baseColor);
    bodyGradient.addColorStop(0.7, baseColor);
    bodyGradient.addColorStop(1, darkColor);
    
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(-14, -9, 28, 18);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, -9, 28, 18);
    
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-12, -7, 24, 2);
    ctx.fillRect(-12, 5, 24, 2);
    
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-12, -8, 24, 1);
    
    const turrentGradient = ctx.createRadialGradient(-1, -1, 2, 0, 0, 8);
    turrentGradient.addColorStop(0, lightColor);
    turrentGradient.addColorStop(0.4, baseColor);
    turrentGradient.addColorStop(0.7, darkColor);
    turrentGradient.addColorStop(1, shadowColor);
    
    ctx.fillStyle = turrentGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(1, 1, 6, Math.PI * 0.7, Math.PI * 1.3);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(-1.5, -1.5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, 5, Math.PI * 0.2, Math.PI * 0.8);
    ctx.fill();
    
    if (tank.controllingRocket) {
        const antennaGradient = ctx.createLinearGradient(-2, 0, 2, 0);
        antennaGradient.addColorStop(0, darkColor);
        antennaGradient.addColorStop(0.5, baseColor);
        antennaGradient.addColorStop(1, darkColor);
        
        ctx.fillStyle = antennaGradient;
        ctx.fillRect(-2, -10, 4, 20);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-2, -10, 4, 20);
        
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(8, -4);
        ctx.lineTo(8, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.arc(-5, -8, 2, 0, Math.PI * 2);
        ctx.arc(-5, 8, 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        const baseGradient = ctx.createLinearGradient(0, -3.5, 0, 3.5);
        baseGradient.addColorStop(0, shadowColor);
        baseGradient.addColorStop(0.2, darkColor);
        baseGradient.addColorStop(0.4, baseColor);
        baseGradient.addColorStop(0.6, baseColor);
        baseGradient.addColorStop(0.8, darkColor);
        baseGradient.addColorStop(1, shadowColor);
        
        ctx.fillStyle = baseGradient;
        ctx.fillRect(0, -3.5, 7.5, 7);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, -3.5, 7.5, 7);
        
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(1, -2.5, 5.5, 1);
        ctx.fillRect(1, 1.5, 5.5, 1);
        
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(1, -3, 5.5, 0.8);
        
        const barrelGradient = ctx.createLinearGradient(0, -2.5, 0, 2.5);
        barrelGradient.addColorStop(0, shadowColor);
        barrelGradient.addColorStop(0.3, darkColor);
        barrelGradient.addColorStop(0.5, baseColor);
        barrelGradient.addColorStop(0.7, darkColor);
        barrelGradient.addColorStop(1, shadowColor);
        
        ctx.fillStyle = barrelGradient;
        ctx.fillRect(7.5, -2.5, 13.5, 5);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.3;
        ctx.strokeRect(7.5, -2.5, 13.5, 5);
        
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(8.5, -1.7, 11.5, 1.2);
        
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(8.5, 0.5, 11.5, 1.2);
        
        const muzzleGradient = ctx.createLinearGradient(0, -3, 0, 3);
        muzzleGradient.addColorStop(0, shadowColor);
        muzzleGradient.addColorStop(0.5, '#1a1a1a');
        muzzleGradient.addColorStop(1, shadowColor);
        
        ctx.fillStyle = muzzleGradient;
        ctx.fillRect(20, -3, 2, 6);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(20, -3, 2, 6);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(21.5, -1.7, 1, 3.4);
    }
    
    if (tank.powerup && tank.alive && !tank.controllingRocket) {
        if (tank.powerup === 'rocket') {
            const rocketGrad = ctx.createLinearGradient(8, -6, 8, -3);
            rocketGrad.addColorStop(0, darkColor);
            rocketGrad.addColorStop(1, baseColor);
            ctx.fillStyle = rocketGrad;
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
            const mineGrad = ctx.createRadialGradient(-13, -1, 1, -12, 0, 5);
            mineGrad.addColorStop(0, lightColor);
            mineGrad.addColorStop(0.7, baseColor);
            mineGrad.addColorStop(1, darkColor);
            ctx.fillStyle = mineGrad;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(-12, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = shadowColor;
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
            const remoteGrad = ctx.createLinearGradient(14, -2, 14, 2);
            remoteGrad.addColorStop(0, lightColor);
            remoteGrad.addColorStop(0.5, baseColor);
            remoteGrad.addColorStop(1, darkColor);
            ctx.fillStyle = remoteGrad;
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
    document.addEventListener('keydown', handleKeyboardModalKeyPress);
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
    
    const arrowRow = document.createElement('div');
    arrowRow.className = 'arrow-row';
    
    const arrowGroup = document.createElement('div');
    arrowGroup.className = 'arrow-group';
    
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
        
        arrowGroup.appendChild(keyElement);
    });
    
    arrowRow.appendChild(arrowGroup);
    container.appendChild(arrowRow);
}

function handleKeyboardModalKeyPress(e) {
    if (!keyboardModalState.selectingControl) return;
    
    const key = e.key.toLowerCase();
    const arrowKey = key.startsWith('arrow') ? key : null;
    const pressedKey = arrowKey || key;
    
    const allowedKeys = keyboardLayout.flat();
    if (!allowedKeys.includes(pressedKey)) return;
    
    const occupiedKeys = getAllOccupiedKeys();
    const currentKey = keyboardModalState.tempControls[keyboardModalState.selectingControl];
    
    if (occupiedKeys.includes(pressedKey) && pressedKey !== currentKey) {
        return; 
    }
    
    assignKey(pressedKey);
}

function getAllOccupiedKeys() {
    const occupied = [];
    const numPlayers = gameState.mode === 1 ? 1 : gameState.mode;
    
    for (let i = 0; i < numPlayers; i++) {
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
    document.removeEventListener('keydown', handleKeyboardModalKeyPress);
    
    keyboardModalState = {
        playerId: null,
        tempControls: null,
        selectingControl: null
    };
}

function openSettingsModal() {
    document.getElementById('tankSpeedSlider').value = gameSettings.tankSpeed;
    document.getElementById('bulletSpeedSlider').value = gameSettings.bulletSpeed;
    
    updateSettingsDisplay();
    document.getElementById('settingsModal').classList.add('show');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('show');
}

function updateSettingsDisplay() {
    document.getElementById('tankSpeedValue').textContent = 
        document.getElementById('tankSpeedSlider').value + 'x';
    document.getElementById('bulletSpeedValue').textContent = 
        document.getElementById('bulletSpeedSlider').value + 'x';
}

function resetSettings() {
    document.getElementById('tankSpeedSlider').value = 1.0;
    document.getElementById('bulletSpeedSlider').value = 2.5;
    updateSettingsDisplay();
}

function applySettings() {
    gameSettings.tankSpeed = parseFloat(document.getElementById('tankSpeedSlider').value);
    gameSettings.bulletSpeed = parseFloat(document.getElementById('bulletSpeedSlider').value);
    closeSettingsModal();
}

document.getElementById('tankSpeedSlider').addEventListener('input', updateSettingsDisplay);
document.getElementById('bulletSpeedSlider').addEventListener('input', updateSettingsDisplay);