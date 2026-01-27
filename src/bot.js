const botConfig = {
    easy: {
        reactionTime: 700,
        aimAccuracy: 0.55,
        moveSpeed: 0.75,
        shootDelay: 550,
        dodgeChance: 0.5,
        ricochetChance: 0.1,
        pathRecalcInterval: 30,
        predictionFrames: 12,
        wallAvoidDistance: 60,
        shootPredictionMultiplier: 0.9,
        maxShootDistance: 400,
        retreatThreshold: 150,
        tacticalRetreatChance: 0.3,
        strafingChance: 0.4
    },
    hard: {
        reactionTime: 400,
        aimAccuracy: 0.75,
        moveSpeed: 0.95,
        shootDelay: 380,
        dodgeChance: 0.7,
        ricochetChance: 0.35,
        pathRecalcInterval: 15,
        predictionFrames: 22,
        wallAvoidDistance: 70,
        shootPredictionMultiplier: 1.1,
        maxShootDistance: 500,
        retreatThreshold: 180,
        tacticalRetreatChance: 0.5,
        strafingChance: 0.6
    },
    extreme: {
        reactionTime: 30,
        aimAccuracy: 0.98,
        moveSpeed: 1.0,
        shootDelay: 200,
        dodgeChance: 0.99,
        ricochetChance: 0.99,
        pathRecalcInterval: 5,
        predictionFrames: 45,
        wallAvoidDistance: 85,
        shootPredictionMultiplier: 2.5,
        maxShootDistance: 700,
        retreatThreshold: 300,
        tacticalRetreatChance: 0.9,
        strafingChance: 0.95
    }
};

function updateBot(bot) {
    if (!bot.alive || !bot.isBot) return;
    
    const config = botConfig[gameState.difficulty];
    const now = Date.now();
    
    const humanPlayer = gameState.players.find(p => !p.isBot && p.alive);
    if (!humanPlayer) return;
    
    if (!bot.botState.tacticalMode) {
        bot.botState.tacticalMode = 'aggressive';
        bot.botState.lastModeChange = now;
        bot.botState.coverPosition = null;
        bot.botState.retreatTimer = 0;
        bot.botState.strafingDirection = 0;
        bot.botState.strafingTimer = 0;
        bot.botState.lastDangerCheck = 0;
        bot.botState.targetAngle = bot.angle;
        bot.botState.smoothAngle = bot.angle;
    }
    if (!bot.botState.currentPath) {
        bot.botState.currentPath = [];
        bot.botState.pathIndex = 0;
        bot.botState.lastPathCalc = 0; 
    }
    const tacticalAnalysis = analyzeTacticalSituation(bot, humanPlayer, config);

    if (shouldHuntAggressively(bot, humanPlayer, config, tacticalAnalysis)) {
        tacticalAnalysis.recommendedMode = 'aggressive';
        bot.botState.tacticalMode = 'aggressive';
    }
    updateTacticalMode(bot, tacticalAnalysis, config, now);
    
    const dodgeResult = checkAdvancedDodge(bot, config, tacticalAnalysis);
    
    if (dodgeResult.shouldDodge) {
        bot.botState.dodging = true;
        bot.botState.dodgeTimer = dodgeResult.duration || 40;
        bot.botState.dodgeAngle = dodgeResult.angle;
        bot.botState.dodgeType = dodgeResult.type;
        bot.botState.dodgeSpeed = dodgeResult.speed || 1.3;
    }
    
    if (bot.botState.dodging) {
        if (bot.botState.dodgeTimer > 0) {
            bot.botState.dodgeTimer--;
            executeAdvancedDodge(bot, config, tacticalAnalysis);
            return;
        } else {
            bot.botState.dodging = false;
        }
    }
    
    if (!bot.botState.lastPos) {
        bot.botState.lastPos = {x: bot.x, y: bot.y};
        bot.botState.stuckFrames = 0;
        bot.botState.wallCollisions = 0;
    }
    
    const movedDist = Math.hypot(bot.x - bot.botState.lastPos.x, bot.y - bot.botState.lastPos.y);
    if (movedDist < 0.3) {
        bot.botState.stuckFrames++;
    } else {
        bot.botState.stuckFrames = 0;
    }
    
    if (isNearWall(bot.x, bot.y, 25)) {
        bot.botState.wallCollisions = (bot.botState.wallCollisions || 0) + 1;
    } else {
        bot.botState.wallCollisions = 0;
    }
    
    bot.botState.lastPos = {x: bot.x, y: bot.y};
    
const shouldRecalc = !bot.botState.lastPathCalc || 
        now - bot.botState.lastPathCalc > config.pathRecalcInterval * 8 ||
        bot.botState.currentPath.length === 0 ||
        bot.botState.pathIndex >= bot.botState.currentPath.length ||
        bot.botState.stuckFrames > 10 ||
        bot.botState.wallCollisions > 6 ||
        tacticalAnalysis.modeChanged;
    
    if (shouldRecalc) {
        calculateTacticalPath(bot, humanPlayer, tacticalAnalysis, config);
        bot.botState.lastPathCalc = now;
        bot.botState.stuckFrames = 0;
        bot.botState.wallCollisions = 0;
    }
    
    executeTacticalMovement(bot, config, humanPlayer, tacticalAnalysis);
    
    if (now - bot.lastShot > config.shootDelay) {
        attemptBotShoot(bot, humanPlayer, config);
    }
}

function shouldHuntAggressively(bot, target, config, analysis) {
    const distToTarget = analysis.distToTarget;
    
    if (analysis.immediateDanger && analysis.dangerLevel > 600) return false;
    
    return true;
}

function analyzeTacticalSituation(bot, target, config) {
    const distToTarget = Math.hypot(target.x - bot.x, target.y - bot.y);
    
    let dangerLevel = 0;
    let threatBullets = [];
    let immediateDanger = false;
    
    for (let bullet of gameState.bullets) {
        
        const distToBullet = Math.hypot(bullet.x - bot.x, bullet.y - bot.y);
        if (distToBullet < 250) {
            const futureFrames = 30;
            const futureBulletX = bullet.x + bullet.vx * futureFrames;
            const futureBulletY = bullet.y + bullet.vy * futureFrames;
            
            const closestDist = distanceToLineSegment(
                bot.x, bot.y,
                bullet.x, bullet.y,
                futureBulletX, futureBulletY
            );
            
            if (closestDist < 55) { 
                const threatScore = (250 - distToBullet) * (55 - closestDist) / 55;
                dangerLevel += threatScore;
                threatBullets.push({
                    bullet, 
                    dist: distToBullet, 
                    closestDist,
                    angle: Math.atan2(bullet.vy, bullet.vx)
                });
                
                if (closestDist < 45 && distToBullet < 150) {  
                    immediateDanger = true;
                }
            }
        }
    }
    
    const hasLineOfSight = !checkPathBlocked(bot.x, bot.y, target.x, target.y);
    const targetHasLineOfSight = !checkPathBlocked(target.x, target.y, bot.x, bot.y);
    
    const coverPositions = findCoverPositions(bot, target, config);
    const hasCoverNearby = coverPositions.length > 0;
    
    const optimalDistance = config.maxShootDistance * 0.65;
    const distanceScore = Math.abs(distToTarget - optimalDistance) / optimalDistance;
    
    let recommendedMode = 'aggressive'; 

    if (immediateDanger && dangerLevel > 700) {
        recommendedMode = 'retreat';
    } else if (dangerLevel > 500 && hasCoverNearby && distToTarget < 100) { 
        recommendedMode = 'cover';
    } else {
        recommendedMode = 'aggressive'; 
    }
    
    return {
        distToTarget,
        dangerLevel,
        threatBullets,
        immediateDanger,
        hasLineOfSight,
        targetHasLineOfSight,
        coverPositions,
        hasCoverNearby,
        distanceScore,
        recommendedMode,
        optimalDistance
    };
}

function updateTacticalMode(bot, analysis, config, now) {
    const timeSinceChange = now - bot.botState.lastModeChange;
    const modeStickiness = 150;

    if (analysis.distToTarget > 150 && !analysis.immediateDanger) {
        bot.botState.tacticalMode = 'aggressive';
        bot.botState.lastModeChange = now;
        analysis.modeChanged = true;
        return;
    }

    if (analysis.immediateDanger && analysis.dangerLevel > 700) {
        bot.botState.tacticalMode = 'retreat';
        bot.botState.lastModeChange = now;
        analysis.modeChanged = true;
        return;
    }
    
    if (analysis.recommendedMode !== bot.botState.tacticalMode && timeSinceChange > modeStickiness) {
        if (analysis.recommendedMode === 'retreat' && analysis.dangerLevel > 600) {
            bot.botState.tacticalMode = analysis.recommendedMode;
            bot.botState.lastModeChange = now;
            analysis.modeChanged = true;
        } else {
            bot.botState.tacticalMode = 'aggressive';
            bot.botState.lastModeChange = now;
            analysis.modeChanged = true;
        }
    } else {
        analysis.modeChanged = false;
    }
}

function findCoverPositions(bot, target, config) {
    const coverPositions = [];
    const searchRadius = 180;
    const angleSteps = 12;
    
    for (let i = 0; i < angleSteps; i++) {
        const angle = (i / angleSteps) * Math.PI * 2;
        const testX = bot.x + Math.cos(angle) * searchRadius;
        const testY = bot.y + Math.sin(angle) * searchRadius;
        
        if (testX < 60 || testX > canvas.width - 60 || testY < 60 || testY > canvas.height - 60) {
            continue;
        }
        
        if (collideWall(testX, testY)) continue;
        
        const pathBlocked = checkPathBlocked(testX, testY, target.x, target.y);
        
        if (pathBlocked) {
            const distToTarget = Math.hypot(testX - target.x, testY - target.y);
            const distFromBot = Math.hypot(testX - bot.x, testY - bot.y);
            
            let minWallDist = Infinity;
            for (let wall of gameState.walls) {
                const dist = distanceToLineSegment(testX, testY, wall.x1, wall.y1, wall.x2, wall.y2);
                minWallDist = Math.min(minWallDist, dist);
            }
            
            if (minWallDist > 35) {
                coverPositions.push({
                    x: testX,
                    y: testY,
                    score: distToTarget * 0.5 - distFromBot,
                    distToTarget,
                    distFromBot
                });
            }
        }
    }
    
    return coverPositions.sort((a, b) => b.score - a.score);
}

function checkAdvancedDodge(bot, config, analysis) {
    let closestThreat = null;
    let minThreatDist = Infinity;
    let multipleBullets = [];
    
    for (let bullet of gameState.bullets) {
        
        const dist = Math.hypot(bullet.x - bot.x, bullet.y - bot.y);
        if (dist > 250) continue;
        
        const futureFrames = 35;
        const futureBulletX = bullet.x + bullet.vx * futureFrames;
        const futureBulletY = bullet.y + bullet.vy * futureFrames;
        
        const closestDist = distanceToLineSegment(
            bot.x, bot.y,
            bullet.x, bullet.y,
            futureBulletX, futureBulletY
        );
        
        if (closestDist < 25) {
            const bulletAngle = Math.atan2(bullet.vy, bullet.vx);
            multipleBullets.push({bullet, dist, bulletAngle, closestDist});
            
            if (dist < minThreatDist) {
                minThreatDist = dist;
                closestThreat = {bullet, dist, bulletAngle, closestDist};
            }
        }
    }
    
    if (closestThreat && Math.random() < config.dodgeChance) {
        const bulletAngle = closestThreat.bulletAngle;
        const bulletSpeed = Math.hypot(closestThreat.bullet.vx, closestThreat.bullet.vy);
        
        let dodgeAngles = [
            bulletAngle + Math.PI/2,
            bulletAngle - Math.PI/2
        ];
        
        if (closestThreat.dist < 100) {
            dodgeAngles.unshift(bulletAngle + Math.PI);
            dodgeAngles.unshift(bulletAngle + Math.PI * 0.75);
            dodgeAngles.unshift(bulletAngle - Math.PI * 0.75);
        }
        
        if (multipleBullets.length > 1) {
            const avgBulletAngle = multipleBullets.reduce((sum, b) => sum + b.bulletAngle, 0) / multipleBullets.length;
            dodgeAngles.push(avgBulletAngle + Math.PI);
        }
        
        let bestAngle = dodgeAngles[0];
        let bestScore = -Infinity;
        let bestType = 'perpendicular';
        
        for (let angle of dodgeAngles) {
            const testDist = 70;
            const testX = bot.x + Math.cos(angle) * testDist;
            const testY = bot.y + Math.sin(angle) * testDist;
            
            if (testX < 40 || testX > canvas.width - 40 || testY < 40 || testY > canvas.height - 40) {
                continue;
            }
            
            if (collideWall(testX, testY)) continue;
            
            let minWallDist = Infinity;
            for (let wall of gameState.walls) {
                const wallDist = distanceToLineSegment(testX, testY, wall.x1, wall.y1, wall.x2, wall.y2);
                minWallDist = Math.min(minWallDist, wallDist);
            }
            
            if (minWallDist < 25) continue;
            
            let bulletSafetyScore = 0;
            for (let threat of multipleBullets) {
                const futureX = threat.bullet.x + threat.bullet.vx * 40;
                const futureY = threat.bullet.y + threat.bullet.vy * 40;
                const distToPath = distanceToLineSegment(testX, testY, threat.bullet.x, threat.bullet.y, futureX, futureY);
                bulletSafetyScore += distToPath;
            }
            
            const score = minWallDist * 0.6 + bulletSafetyScore * 3;
            
            if (score > bestScore) {
                bestScore = score;
                bestAngle = angle;
                
                const angleDiff = Math.abs(angle - bulletAngle);
                const normalizedDiff = angleDiff > Math.PI ? 2 * Math.PI - angleDiff : angleDiff;
                if (normalizedDiff > Math.PI * 0.7) {
                    bestType = 'retreat';
                } else {
                    bestType = 'perpendicular';
                }
            }
        }
        
        if (bestScore > 30) {
            const urgency = closestThreat.dist < 80 ? 1.15 : 1.05;
            return {
                shouldDodge: true,
                angle: bestAngle,
                type: bestType,
                duration: Math.floor(closestThreat.dist < 80 ? 35 : 28),
                speed: urgency
            };
        }
    }
    
    return {shouldDodge: false};
}

function executeAdvancedDodge(bot, config, analysis) {
    const dodgeAngle = bot.botState.dodgeAngle;
    const dodgeType = bot.botState.dodgeType || 'perpendicular';
    const dodgeSpeed = bot.botState.dodgeSpeed || 1.3;
    
    let angleDiff = dodgeAngle - bot.angle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    const turnSpeed = 0.08;
    
    if (Math.abs(angleDiff) > turnSpeed) {
        bot.angle += Math.sign(angleDiff) * turnSpeed;
    } else {
        bot.angle = dodgeAngle;
    }
    
    const speed = Math.min(dodgeSpeed, 1.15) * config.moveSpeed;
    const moveAngle = bot.angle;
    
    let newX = bot.x + Math.cos(moveAngle) * speed;
    let newY = bot.y + Math.sin(moveAngle) * speed;
    
    const wallCheckDist = 30;
    const frontX = bot.x + Math.cos(moveAngle) * wallCheckDist;
    const frontY = bot.y + Math.sin(moveAngle) * wallCheckDist;
    
    if (isNearWall(frontX, frontY, 20) || collideWall(frontX, frontY)) {
        bot.botState.dodging = false;
        bot.botState.dodgeTimer = 0;
        return;
    }
    
    if (!collideWall(newX, newY) && !collideTank(bot, newX, newY)) {
        bot.x = newX;
        bot.y = newY;
    }
}

function calculateTacticalPath(bot, target, analysis, config) {
    const mode = bot.botState.tacticalMode;
    
    let destinationX, destinationY;
    
    if (mode === 'retreat') {
        const retreatPos = findRetreatPosition(bot, target, config);
        destinationX = retreatPos.x;
        destinationY = retreatPos.y;
    } else if (mode === 'cover' && analysis.coverPositions.length > 0) {
        const bestCover = analysis.coverPositions[0];
        destinationX = bestCover.x;
        destinationY = bestCover.y;
    } else if (mode === 'strafe') {
        const strafePos = findStrafePosition(bot, target, config);
        destinationX = strafePos.x;
        destinationY = strafePos.y;
    } else {
        const approachPos = findApproachPosition(bot, target, config, analysis.optimalDistance);
        destinationX = approachPos.x;
        destinationY = approachPos.y;
    }
    
    const hasDirectPath = !checkPathBlocked(bot.x, bot.y, destinationX, destinationY);
    
    if (hasDirectPath) {
        bot.botState.currentPath = [{x: destinationX, y: destinationY}];
        bot.botState.pathIndex = 0;
        return;
    }
    
    const path = findPathAStar(bot, {x: destinationX, y: destinationY});
    
    if (path && path.length > 0) {
        bot.botState.currentPath = path;
        bot.botState.pathIndex = 0;
    } else {
        const escapePos = findEscapePosition(bot, target);
        bot.botState.currentPath = [escapePos];
        bot.botState.pathIndex = 0;
    }
}

function findRetreatPosition(bot, target, config) {
    const angleFromTarget = Math.atan2(bot.y - target.y, bot.x - target.x);
    const retreatDistance = 220;
    
    const testAngles = [
        angleFromTarget,
        angleFromTarget + Math.PI/8,
        angleFromTarget - Math.PI/8,
        angleFromTarget + Math.PI/5,
        angleFromTarget - Math.PI/5
    ];
    
    let bestPos = {x: bot.x, y: bot.y};
    let bestScore = -Infinity;
    
    for (let angle of testAngles) {
        const testX = bot.x + Math.cos(angle) * retreatDistance;
        const testY = bot.y + Math.sin(angle) * retreatDistance;
        
        if (testX < 60 || testX > canvas.width - 60 || testY < 60 || testY > canvas.height - 60) {
            continue;
        }
        
        if (collideWall(testX, testY)) continue;
        
        const distToTarget = Math.hypot(testX - target.x, testY - target.y);
        const hasLOS = !checkPathBlocked(testX, testY, target.x, target.y);
        
        let minWallDist = Infinity;
        for (let wall of gameState.walls) {
            const dist = distanceToLineSegment(testX, testY, wall.x1, wall.y1, wall.x2, wall.y2);
            minWallDist = Math.min(minWallDist, dist);
        }
        
        if (minWallDist < 35) continue;
        
        const score = distToTarget * 2.5 + minWallDist + (hasLOS ? 0 : 120);
        
        if (score > bestScore) {
            bestScore = score;
            bestPos = {x: testX, y: testY};
        }
    }
    
    return bestPos;
}

function findStrafePosition(bot, target, config) {
    const angleToTarget = Math.atan2(target.y - bot.y, target.x - bot.x);
    const currentDist = Math.hypot(target.x - bot.x, target.y - bot.y);
    
    if (bot.botState.strafingTimer <= 0 || Math.random() < 0.03) {
        bot.botState.strafingDirection = Math.random() < 0.5 ? 1 : -1;
        bot.botState.strafingTimer = 50 + Math.random() * 50;
    }
    
    bot.botState.strafingTimer--;
    
    const strafeAngle = angleToTarget + (Math.PI/2 * bot.botState.strafingDirection);
    const strafeDistance = 120;
    
    const testX = bot.x + Math.cos(strafeAngle) * strafeDistance;
    const testY = bot.y + Math.sin(strafeAngle) * strafeDistance;
    
    if (testX > 60 && testX < canvas.width - 60 && testY > 60 && testY < canvas.height - 60 &&
        !collideWall(testX, testY) && !isNearWall(testX, testY, 35)) {
        return {x: testX, y: testY};
    }
    
    bot.botState.strafingDirection *= -1;
    const altAngle = angleToTarget + (Math.PI/2 * bot.botState.strafingDirection);
    const altX = bot.x + Math.cos(altAngle) * strafeDistance;
    const altY = bot.y + Math.sin(altAngle) * strafeDistance;
    
    if (altX > 60 && altX < canvas.width - 60 && altY > 60 && altY < canvas.height - 60 &&
        !collideWall(altX, altY) && !isNearWall(altX, altY, 35)) {
        return {x: altX, y: altY};
    }
    
    return {x: bot.x, y: bot.y};
}

function findApproachPosition(bot, target, config, optimalDistance) {
    const angleToTarget = Math.atan2(target.y - bot.y, target.x - bot.x);
    const currentDist = Math.hypot(target.x - bot.x, target.y - bot.y);
    
    const targetDist = Math.max(currentDist - 40, 30);
    
    const testAngles = [
        angleToTarget,
        angleToTarget + Math.PI/12,  
        angleToTarget - Math.PI/12,
        angleToTarget + Math.PI/8,
        angleToTarget - Math.PI/8,
        angleToTarget + Math.PI/6,   
        angleToTarget - Math.PI/6    
    ];
    
    let bestPos = {x: bot.x, y: bot.y};
    let bestScore = -Infinity;
    
    for (let angle of testAngles) {
        const testX = target.x - Math.cos(angle) * targetDist;
        const testY = target.y - Math.sin(angle) * targetDist;
        
        if (testX < 60 || testX > canvas.width - 60 || testY < 60 || testY > canvas.height - 60) {
            continue;
        }
        
        if (collideWall(testX, testY)) continue;
        
        const hasLOS = !checkPathBlocked(testX, testY, target.x, target.y);
        
        let minWallDist = Infinity;
        for (let wall of gameState.walls) {
            const dist = distanceToLineSegment(testX, testY, wall.x1, wall.y1, wall.x2, wall.y2);
            minWallDist = Math.min(minWallDist, dist);
        }
        
        if (minWallDist < 35) continue;
        
        const distFromBot = Math.hypot(testX - bot.x, testY - bot.y);
        const score = minWallDist * 0.8 + (hasLOS ? 150 : 0) - distFromBot * 0.2;
        
        if (score > bestScore) {
            bestScore = score;
            bestPos = {x: testX, y: testY};
        }
    }
    
    return bestPos;
}

function executeTacticalMovement(bot, config, target, analysis) {
    if (bot.botState.currentPath && bot.botState.currentPath.length > 0) {
        const waypoint = bot.botState.currentPath[bot.botState.pathIndex || 0];
        const angleToWaypoint = Math.atan2(waypoint.y - bot.y, waypoint.x - bot.x);
        
        let angleDiff = angleToWaypoint - bot.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        bot.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 0.08);
        
        const speed = config.moveSpeed * 1.0;
        let newX = bot.x + Math.cos(bot.angle) * speed;
        let newY = bot.y + Math.sin(bot.angle) * speed;
        
        const isBlocked = collideWall(newX, newY) || collideTank(bot, newX, newY);
        
        if (isBlocked) {
            const escapeAngle = findBestEscapeAngle(bot, waypoint, config);
            if (escapeAngle !== null) {
                bot.angle = escapeAngle;
                newX = bot.x + Math.cos(bot.angle) * speed;
                newY = bot.y + Math.sin(bot.angle) * speed;
            }
        }
        
        if (!collideWall(newX, newY) && !collideTank(bot, newX, newY)) {
            bot.x = newX;
            bot.y = newY;
            
            if (Math.hypot(waypoint.x - bot.x, waypoint.y - bot.y) < 20) {
                bot.botState.pathIndex = (bot.botState.pathIndex || 0) + 1;
            }
        }
    }
}

function findBestEscapeAngle(bot, targetWaypoint, config) {
    const testAngles = 16; 
    const testDistances = [40, 60, 80];
    
    let bestAngle = null;
    let bestScore = -Infinity;
    
    const idealAngle = Math.atan2(targetWaypoint.y - bot.y, targetWaypoint.x - bot.x);
    
    for (let i = 0; i < testAngles; i++) {
        const angle = (i / testAngles) * Math.PI * 2;
        
        let angleClear = true;
        let minClearDist = 0;
        
        for (let dist of testDistances) {
            const testX = bot.x + Math.cos(angle) * dist;
            const testY = bot.y + Math.sin(angle) * dist;
            
            if (testX < 50 || testX > canvas.width - 50 || 
                testY < 50 || testY > canvas.height - 50) {
                angleClear = false;
                break;
            }
            
            if (collideWall(testX, testY)) {
                angleClear = false;
                break;
            }
            
            let minWallDist = Infinity;
            for (let wall of gameState.walls) {
                const wallDist = distanceToLineSegment(testX, testY, wall.x1, wall.y1, wall.x2, wall.y2);
                minWallDist = Math.min(minWallDist, wallDist);
            }
            
            if (minWallDist < 25) {
                angleClear = false;
                break;
            }
            
            minClearDist = dist;
        }
        
        if (angleClear && minClearDist > 0) {
            let angleDiff = Math.abs(angle - idealAngle);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
            const alignmentScore = (Math.PI - angleDiff) / Math.PI; 
            const clearScore = minClearDist / testDistances[testDistances.length - 1];  
            const score = alignmentScore * 0.7 + clearScore * 0.3;
            
            if (score > bestScore) {
                bestScore = score;
                bestAngle = angle;
            }
        }
    }
    
    return bestAngle;
}

function findPathAStar(bot, target) {
    const gridSize = 30;
    const gridWidth = Math.ceil(canvas.width / gridSize);
    const gridHeight = Math.ceil(canvas.height / gridSize);
    
    const startX = Math.floor(bot.x / gridSize);
    const startY = Math.floor(bot.y / gridSize);
    const endX = Math.floor(target.x / gridSize);
    const endY = Math.floor(target.y / gridSize);
    
    if (startX < 0 || startX >= gridWidth || startY < 0 || startY >= gridHeight) return null;
    if (endX < 0 || endX >= gridWidth || endY < 0 || endY >= gridHeight) return null;
    
    const openSet = [];
    const closedSet = new Set();
    const gScore = {};
    const fScore = {};
    const cameFrom = {};
    
    const startKey = `${startX},${startY}`;
    const endKey = `${endX},${endY}`;
    
    gScore[startKey] = 0;
    fScore[startKey] = heuristic(startX, startY, endX, endY);
    openSet.push({x: startX, y: startY, f: fScore[startKey]});
    
    let iterations = 0;
    const maxIterations = 2000;
    
    while (openSet.length > 0 && iterations < maxIterations) {
        iterations++;
        
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const currentKey = `${current.x},${current.y}`;
        
        if (current.x === endX && current.y === endY) {
            return reconstructPath(cameFrom, current, gridSize);
        }
        
        closedSet.add(currentKey);
        
        const neighbors = getNeighbors(current.x, current.y, gridWidth, gridHeight);
        
        for (let neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            if (closedSet.has(neighborKey)) continue;
            
            const worldX = neighbor.x * gridSize + gridSize / 2;
            const worldY = neighbor.y * gridSize + gridSize / 2;
            
            if (collideWall(worldX, worldY)) continue;
            
            let safe = true;
            for (let dx = -8; dx <= 8; dx += 8) {
                for (let dy = -8; dy <= 8; dy += 8) {
                    if (collideWall(worldX + dx, worldY + dy)) {
                        safe = false;
                        break;
                    }
                }
                if (!safe) break;
            }
            if (!safe) continue;
            
            const tentativeG = gScore[currentKey] + neighbor.cost;
            const wallPenalty = isNearWall(worldX, worldY, 35) ? 5 : 0;
            
            if (gScore[neighborKey] === undefined || tentativeG + wallPenalty < gScore[neighborKey]) {
                cameFrom[neighborKey] = current;
                gScore[neighborKey] = tentativeG + wallPenalty;
                fScore[neighborKey] = tentativeG + wallPenalty + heuristic(neighbor.x, neighbor.y, endX, endY);
                
                const inOpenSet = openSet.some(n => n.x === neighbor.x && n.y === neighbor.y);
                if (!inOpenSet) {
                    openSet.push({x: neighbor.x, y: neighbor.y, f: fScore[neighborKey]});
                }
            }
        }
    }
    
    return null;
}

function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function getNeighbors(x, y, gridWidth, gridHeight) {
    const neighbors = [];
    
    const directions = [
        {dx: 1, dy: 0, cost: 1},
        {dx: -1, dy: 0, cost: 1},
        {dx: 0, dy: 1, cost: 1},
        {dx: 0, dy: -1, cost: 1},
        {dx: 1, dy: 1, cost: 1.414},
        {dx: -1, dy: -1, cost: 1.414},
        {dx: 1, dy: -1, cost: 1.414},
        {dx: -1, dy: 1, cost: 1.414}
    ];
    
    for (let dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        
        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
            neighbors.push({x: nx, y: ny, cost: dir.cost});
        }
    }
    
    return neighbors;
}

function reconstructPath(cameFrom, current, gridSize) {
    const path = [];
    let node = current;
    
    while (true) {
        path.unshift({
            x: node.x * gridSize + gridSize / 2,
            y: node.y * gridSize + gridSize / 2
        });
        
        const nodeKey = `${node.x},${node.y}`;
        if (!cameFrom[nodeKey]) break;
        node = cameFrom[nodeKey];
    }
    
    return optimizePath(path);
}

function optimizePath(path) {
    if (path.length <= 2) return path;
    
    const optimized = [path[0]];
    let currentIndex = 0;
    
    while (currentIndex < path.length - 1) {
        let farthestIndex = currentIndex + 1;
        
        for (let i = path.length - 1; i > currentIndex; i--) {
            if (!checkPathBlocked(path[currentIndex].x, path[currentIndex].y, path[i].x, path[i].y)) {
                farthestIndex = i;
                break;
            }
        }
        
        if (farthestIndex > currentIndex + 1) {
            optimized.push(path[farthestIndex]);
            currentIndex = farthestIndex;
        } else {
            optimized.push(path[currentIndex + 1]);
            currentIndex++;
        }
    }
    
    return optimized;
}

function findEscapePosition(bot, target) {
    const testAngles = 16;
    let bestPos = {x: bot.x, y: bot.y};
    let bestScore = -Infinity;
    
    const angleToTarget = Math.atan2(target.y - bot.y, target.x - bot.x);
    const escapeAngle = angleToTarget + Math.PI;
    
    for (let i = 0; i < testAngles; i++) {
        const angleOffset = (i / testAngles) * Math.PI * 2;
        const angle = escapeAngle + (angleOffset - Math.PI);
        const testDist = 120;
        const testX = bot.x + Math.cos(angle) * testDist;
        const testY = bot.y + Math.sin(angle) * testDist;
        
        if (testX < 60 || testX > canvas.width - 60 || testY < 60 || testY > canvas.height - 60) {
            continue;
        }
        
        if (collideWall(testX, testY)) continue;
        
        let minWallDist = Infinity;
        for (let wall of gameState.walls) {
            const dist = distanceToLineSegment(testX, testY, wall.x1, wall.y1, wall.x2, wall.y2);
            minWallDist = Math.min(minWallDist, dist);
        }
        
        if (minWallDist < 35) continue;
        
        const distFromTarget = Math.hypot(testX - target.x, testY - target.y);
        
        let angleDiff = Math.abs(angle - escapeAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        const escapeAlignment = 1 - (angleDiff / Math.PI);
        
        const score = minWallDist * 0.5 + distFromTarget * 1.2 + escapeAlignment * 100;
        
        if (score > bestScore) {
            bestScore = score;
            bestPos = {x: testX, y: testY};
        }
    }
    
    return bestPos;
}

function isNearWall(x, y, minDist) {
    for (let wall of gameState.walls) {
        const dist = distanceToLineSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2);
        if (dist < minDist) {
            return true;
        }
    }
    return false;
}

function findWallAvoidanceAngle(bot, currentAngle) {
    const testAngles = [
        currentAngle + Math.PI/4,
        currentAngle - Math.PI/4,
        currentAngle + Math.PI/2,
        currentAngle - Math.PI/2,
        currentAngle + Math.PI * 3/4,
        currentAngle - Math.PI * 3/4,
        currentAngle + Math.PI,
        currentAngle + Math.PI/6,
        currentAngle - Math.PI/6,
        currentAngle + Math.PI * 5/6,
        currentAngle - Math.PI * 5/6
    ];
    
    for (let angle of testAngles) {
        const testDist = 40;
        const testX = bot.x + Math.cos(angle) * testDist;
        const testY = bot.y + Math.sin(angle) * testDist;
        
        if (collideWall(testX, testY)) continue;
        
        let safeFromAllWalls = true;
        let minWallDist = Infinity;
        
        for (let wall of gameState.walls) {
            const dist = distanceToLineSegment(testX, testY, wall.x1, wall.y1, wall.x2, wall.y2);
            minWallDist = Math.min(minWallDist, dist);
            if (dist < 20) {
                safeFromAllWalls = false;
                break;
            }
        }
        
        if (safeFromAllWalls && minWallDist > 20) {
            return angle;
        }
    }
    
    return null;
}

function attemptBotShoot(bot, target, config) {
    const distToTarget = Math.hypot(target.x - bot.x, target.y - bot.y);
    
    const velocity = {
        vx: (gameState.keys[target.controls.right] ? 1 : 0) - (gameState.keys[target.controls.left] ? 1 : 0),
        vy: (gameState.keys[target.controls.down] ? 1 : 0) - (gameState.keys[target.controls.up] ? 1 : 0)
    };
    
    const isMoving = Math.hypot(velocity.vx, velocity.vy) > 0.1;
    
    if (isMoving) {
        const predictedTarget = calculateBulletInterception(bot, target, velocity, config);
        
        if (predictedTarget) {
            const directShot = calculateDirectShot(bot, predictedTarget, config);
            if (directShot) {
                executeBotShot(bot, directShot.angle);
                return;
            }
        }
    }
    
    const simplePredict = {
        x: target.x + velocity.vx * config.predictionFrames,
        y: target.y + velocity.vy * config.predictionFrames
    };
    
    const simpleShot = calculateDirectShot(bot, simplePredict, config);
    if (simpleShot && Math.random() < config.aimAccuracy) {
        executeBotShot(bot, simpleShot.angle);
        return;
    }
    
    if (distToTarget < 600 && Math.random() < config.ricochetChance) {
    const ricochetShot = calculateRicochetShot(bot, target, config);
    if (ricochetShot && isRicochetSafe(bot, ricochetShot.angle, ricochetShot.wallPoint)) {
        executeBotShot(bot, ricochetShot.angle);
        return;
    }
}
}

function calculateBulletInterception(bot, target, velocity, config) {
    const bulletSpeed = 2.5;
    const targetSpeed = 1.2;
    
    const targetVx = velocity.vx * targetSpeed;
    const targetVy = velocity.vy * targetSpeed;
    
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    
    const a = targetVx * targetVx + targetVy * targetVy - bulletSpeed * bulletSpeed;
    const b = 2 * (dx * targetVx + dy * targetVy);
    const c = dx * dx + dy * dy;
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) {
        return null;
    }
    
    const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    
    const t = Math.min(t1 > 0 ? t1 : Infinity, t2 > 0 ? t2 : Infinity);
    
    if (t === Infinity || t > 80) {
        return null;
    }
    
    return {
        x: target.x + targetVx * t * config.shootPredictionMultiplier,
        y: target.y + targetVy * t * config.shootPredictionMultiplier
    };
}

function calculateDirectShot(bot, target, config) {
    const angleToTarget = Math.atan2(target.y - bot.y, target.x - bot.x);
    
    const inaccuracy = (1 - config.aimAccuracy) * 0.2;
    const finalAngle = angleToTarget + (Math.random() - 0.5) * inaccuracy;
    
    const barrelTipX = bot.x + Math.cos(finalAngle) * 20;
    const barrelTipY = bot.y + Math.sin(finalAngle) * 20;
    
    if (checkPathBlocked(barrelTipX, barrelTipY, target.x, target.y)) {
        return null;
    }
    
    return { angle: finalAngle };
}

function calculateRicochetShot(bot, target, config) {
    const validWalls = gameState.walls.filter(wall => {
        const isBoundary = (
            (wall.x1 === 10 && wall.x2 === 990 && wall.y1 === 10) ||
            (wall.x1 === 990 && wall.y1 === 10 && wall.y2 === 640) ||
            (wall.x1 === 990 && wall.x2 === 10 && wall.y2 === 640 && wall.y1 === 640) ||
            (wall.x1 === 10 && wall.y1 === 640 && wall.y2 === 10)
        );
        return !isBoundary;
    });
    
    let bestShot = null;
    let bestScore = -Infinity;
    
    for (let wall of validWalls) {
        const segments = 12;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const wallX = wall.x1 + (wall.x2 - wall.x1) * t;
            const wallY = wall.y1 + (wall.y2 - wall.y1) * t;
            
            const distToWall = Math.hypot(wallX - bot.x, wallY - bot.y);
            if (distToWall < 40 || distToWall > 800) continue;
            
            if (checkPathBlocked(bot.x, bot.y, wallX, wallY)) continue;
            
            const dx = wall.x2 - wall.x1;
            const dy = wall.y2 - wall.y1;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len;
            const ny = dx / len;
            
            const incomingX = wallX - bot.x;
            const incomingY = wallY - bot.y;
            const incomingLen = Math.hypot(incomingX, incomingY);
            const incomingNormX = incomingX / incomingLen;
            const incomingNormY = incomingY / incomingLen;
            
            const dot = incomingNormX * nx + incomingNormY * ny;
            const reflectX = incomingNormX - 2 * dot * nx;
            const reflectY = incomingNormY - 2 * dot * ny;
            
            const reflectEndX = wallX + reflectX * 1000;
            const reflectEndY = wallY + reflectY * 1000;
            
            const distToTarget = distanceToLineSegment(target.x, target.y, wallX, wallY, reflectEndX, reflectEndY);
            const distFromWallToTarget = Math.hypot(target.x - wallX, target.y - wallY);
            
            if (distToTarget < 60 && distFromWallToTarget < 500) {
                const score = (60 - distToTarget) + (500 - distFromWallToTarget) * 0.5;
                if (score > bestScore) {
                    bestScore = score;
                    const shootAngle = Math.atan2(wallY - bot.y, wallX - bot.x);
                    bestShot = { 
                        angle: shootAngle,
                        wallPoint: { x: wallX, y: wallY, wall: wall }  
                    };
                }
            }
        }
    }
    
    return bestShot;
}

function isRicochetSafe(bot, shootAngle, wallPoint) {
    if (!wallPoint) return false;
    const bulletSpeed = 2.5;
    let simX = bot.x + Math.cos(shootAngle) * 20;
    let simY = bot.y + Math.sin(shootAngle) * 20;
    let simVx = Math.cos(shootAngle) * bulletSpeed;
    let simVy = Math.sin(shootAngle) * bulletSpeed;
    
    for (let step = 0; step < 200; step++) {
        simX += simVx;
        simY += simVy;
        
        const distToWall = Math.hypot(simX - wallPoint.x, simY - wallPoint.y);
        if (distToWall < 15) {
            const wall = wallPoint.wall;
            const dx = wall.x2 - wall.x1;
            const dy = wall.y2 - wall.y1;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len;
            const ny = dx / len;
            
            const dot = simVx * nx + simVy * ny;
            simVx = simVx - 2 * dot * nx;
            simVy = simVy - 2 * dot * ny;
            
            for (let i = 0; i < 150; i++) {
                simX += simVx;
                simY += simVy;
                
                const distToBot = Math.hypot(simX - bot.x, simY - bot.y);
                if (distToBot < 30) {
                    return false;
                }
                
                if (collideWall(simX, simY)) break;
            }
            break;
        }
        
        if (collideWall(simX, simY)) break;
    }
    
    return true;
}

function executeBotShot(bot, angle) {
    const oldAngle = bot.angle;
    bot.angle = angle;
    
    setTimeout(() => {
        if (bot.alive) {
            shootBullet(bot);
            bot.angle = oldAngle;
        }
    }, botConfig[gameState.difficulty].reactionTime);
}