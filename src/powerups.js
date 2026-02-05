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

const POWERUP_SPAWN_INTERVAL = 300;
let powerupSpawnTimer = 0;

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
        flyTime: 300,
        trackTime: 1200,
        trail: []
    });
    player.powerup = null;
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

function updateRockets() {
    const TURN_SPEED = 0.09;
    const SPEED = 1.6;
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
            
            const REMOTE_SPEED = 1.7;
            
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