const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = {
    mode: 1,
    difficulty: 'easy',
    player: null,
    bullets: [],
    walls: [],
    keys: {}
};
const wallLines = [
    {x1: 50, y1: 50, x2: 1150, y2: 50},
    {x1: 1150, y1: 50, x2: 1150, y2: 750},
    {x1: 1150, y1: 750, x2: 50, y2: 750},
    {x1: 50, y1: 750, x2: 50, y2: 50},
    {x1: 200, y1: 150, x2: 400, y2: 150},
    {x1: 550, y1: 150, x2: 750, y2: 150},
    {x1: 900, y1: 150, x2: 1050, y2: 150},
    {x1: 150, y1: 50, x2: 150, y2: 200},
    {x1: 400, y1: 150, x2: 400, y2: 250},
    {x1: 650, y1: 100, x2: 650, y2: 300},
    {x1: 900, y1: 150, x2: 900, y2: 300},
    {x1: 200, y1: 300, x2: 500, y2: 300},
    {x1: 650, y1: 350, x2: 950, y2: 350},
    {x1: 100, y1: 450, x2: 350, y2: 450},
    {x1: 500, y1: 450, x2: 800, y2: 450},
    {x1: 250, y1: 200, x2: 250, y2: 400},
    {x1: 500, y1: 300, x2: 500, y2: 500},
    {x1: 800, y1: 350, x2: 800, y2: 550},
    {x1: 1050, y1: 250, x2: 1050, y2: 450},
    {x1: 150, y1: 600, x2: 400, y2: 600},
    {x1: 550, y1: 600, x2: 850, y2: 600},
    {x1: 950, y1: 550, x2: 1100, y2: 550},
    {x1: 300, y1: 500, x2: 300, y2: 750},
    {x1: 550, y1: 600, x2: 550, y2: 750},
    {x1: 700, y1: 450, x2: 700, y2: 650},
    {x1: 950, y1: 550, x2: 950, y2: 700}
];
function selectMode(mode) {
    gameState.mode = mode;
    if (mode === 1) {
        showScreen('difficultyScreen');
    } else {
        startGame(); 
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
    showScreen('gameScreen');
    initGame();
}
function initGame() {
    gameState.bullets = [];
    gameState.walls = wallLines;
    gameState.keys = {};
    gameState.players = [];
    const spawns = [
        {x: 100, y: 150},   
        {x: 1050, y: 650},  
        {x: 1060, y: 120}    
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
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    gameLoop();
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
    
    requestAnimationFrame(gameLoop);
}