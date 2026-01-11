import { Vec3 } from './utils.js';
import { Projectile } from './objects.js'; 

// --- QTE VISUALS ---
export function drawYujiQTE(ctx, fighter, project) {
    if(fighter.state !== 'BF_PREP') return;
    
    // Position fixed above head
    const p = project(fighter.pos.add(new Vec3(0, -80, 0))); 
    
    // 1. TOTAL FOCUS (Dim the world)
    ctx.fillStyle = `rgba(0,0,0,0.9)`; 
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 2. The Core (Target)
    const coreSize = 40;
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 20; ctx.shadowColor = '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, coreSize, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // 3. The Timing Ring (Shrinks 60->0)
    // Sweet spot is frame 10-25
    const ringRadius = fighter.qteTimer * 4; 
    const inWindow = (fighter.qteTimer > 10 && fighter.qteTimer < 25);
    
    ctx.strokeStyle = inWindow ? '#ff0055' : '#888';
    ctx.lineWidth = inWindow ? 8 : 4;
    ctx.shadowBlur = inWindow ? 30 : 0; ctx.shadowColor = '#ff0055';
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(coreSize, ringRadius), 0, Math.PI * 2);
    ctx.stroke();
    
    // 4. Text Feedback
    ctx.fillStyle = inWindow ? '#ff0055' : '#888';
    ctx.font = "italic 30px Impact";
    ctx.textAlign = "center";
    ctx.fillText(inWindow ? "PRESS U NOW!" : "WAIT...", p.x, p.y + 120);
    ctx.textAlign = "start";
}

// --- SKILL LOGIC ---
export function handleYujiSkill(fighter, slot) {
    const Engine = window.Engine;

    // SKILL 1: BLACK FLASH CHAIN (1 -> 2 -> 3 -> 4)
    if (slot === 1) {
        // STATE 1: EXECUTE QTE (Player pressed U inside the Zone)
        if (fighter.state === 'BF_PREP') {
            
            // DYNAMIC DIFFICULTY: Window shrinks as chain increases
            // Chain 0: ~15 frames width (Standard)
            // Chain 1: ~12 frames
            // Chain 2: ~9 frames
            // Chain 3: ~6 frames (Very Hard)
            const difficulty = fighter.bfChain * 3;
            const startFrame = 10 + difficulty; 
            const endFrame = 25 - (difficulty / 2); 

            if (fighter.qteTimer > startFrame && fighter.qteTimer < endFrame) {
                triggerBlackFlash(fighter); // SUCCESS
            } 
            else {
                // FAIL
                const reason = fighter.qteTimer >= endFrame ? "TOO EARLY" : "TOO LATE";
                Engine.spawnParticle(fighter.pos, '#888', 'text', reason);
                
                // PUNISHMENT: Break Chain & Apply Long CD
                fighter.state = 'IDLE'; 
                fighter.bfChance = 0; 
                fighter.bfChain = 0; 
                fighter.bfPose = 0;
                fighter.cds.s1 = 200; // <--- ADD THIS (3+ Seconds Penalty)
                Engine.screenShake = 5;
            }
            return true;
        }

        // STATE 2: TRIGGER ATTEMPT
        if (fighter.cds.s1 > 0) return true;

        // Auto-Trigger Zone if inside a Chain (Guaranteed connection if you hit the previous one)
        const isChainContinue = fighter.bfChain > 0 && fighter.bfChain < 4;
        
        // Roll calculation (First hit needs luck, subsequent hits are guaranteed if you have the skill)
        const roll = Math.random() * 100;
        const isBlackFlashOpp = roll < fighter.bfChance || isChainContinue;

        if (isBlackFlashOpp) {
            // ENTER ZONE
            fighter.state = 'BF_PREP';
            fighter.qteTimer = 60; 
            fighter.ce -= 10;
            
            // STUN ENEMY IMMEDIATELY so they can't run
            const t = Engine.fighters.find(f => f !== fighter && f.state !== 'DEAD');
            if(t && fighter.pos.dist(t.pos) < 300) {
                t.state = 'STUN';
                t.vel.x = 0; // Freeze them in place
            }

            const text = fighter.bfChain > 0 ? `CHAIN ${fighter.bfChain + 1}!` : "THE ZONE";
            Engine.spawnParticle(fighter.pos, '#fff', 'text', text);
            return true;
        } else {
            // NORMAL HIT (No Flash)
            fighter.ce -= 20; 
            fighter.cds.s1 = 20; 
            fighter.state = 'ATTACK'; 
            fighter.bfPose = 0; // Normal Punch
            
            // Visuals
            fighter.attack('HEAVY');
            Engine.spawnParticle(fighter.pos, '#0088ff', 'text', 'DIVERGENT FIST');
            Engine.spawnParticle(fighter.pos.add(new Vec3(fighter.facing * 40, -50, 0)), '#0088ff', 'burst');
            
            // Build Chance
            fighter.bfChance = Math.min(90, fighter.bfChance + 5); 
            const el = document.getElementById('bf-percent');
            if(el) {
                el.innerText = Math.floor(fighter.bfChance) + "%";
                el.style.color = fighter.bfChance > 20 ? '#ff0055' : '#fff';
            }
            return true;
        }
    }
    
    // ... (Keep Skills 2, 3, 4 unchanged - Copy them from previous code if needed, or leave as is) ...
    // SKILL 2: PIERCING BLOOD
    if (slot === 2) {
        if (fighter.cds.s2 > 0 || fighter.ce < 40) return true;
        fighter.ce -= 40; fighter.cds.s2 = fighter.maxCds.s2; fighter.state = 'CHARGING_PB'; fighter.chargeTimer = 0;
        Engine.spawnParticle(fighter.pos, '#b91c1c', 'text', 'CONVERGENCE');
        return true;
    }
    // SKILL 3: DISMANTLE
    if (slot === 3) {
        if (fighter.cds.ult > 0 || fighter.ce < 50) return true;
        fighter.ce -= 50; fighter.cds.ult = 60; fighter.state = 'ATTACK';
        Engine.spawnParticle(fighter.pos, '#fff', 'text', 'DISMANTLE'); Engine.screenShake = 5;
        setTimeout(() => {
            const t = Engine.fighters.find(f => f !== fighter);
            if (t && fighter.pos.dist(t.pos) < 120 && Math.abs(fighter.pos.z - t.pos.z) < 50) {
                 for(let i=0; i<3; i++) setTimeout(() => Engine.spawnParticle(t.pos.add(new Vec3((Math.random()-0.5)*40, (Math.random()-0.5)*60, 0)), '#fff', 'spark'), i*50);
                 t.takeDamage(90, fighter); Engine.spawnParticle(t.pos, '#ff0055', 'burst');
            } else Engine.spawnParticle(fighter.pos.add(new Vec3(fighter.facing*50, -50, 0)), '#888', 'text', 'MISS');
            fighter.state = 'IDLE';
        }, 200);
        return true;
    }
    // SKILL 4: MANJI KICK
    if (slot === 4) {
        if (fighter.cds.p > 0 || fighter.ce < 30) return true;
        fighter.ce -= 30; fighter.cds.p = fighter.maxCds.p; fighter.state = 'COUNTER_STANCE'; fighter.manjiCounterWindow = 40; 
        Engine.spawnParticle(fighter.pos, '#fff', 'text', 'STANCE');
        return true;
    }
    return false;
}

function triggerBlackFlash(fighter) {
    const Engine = window.Engine;
    fighter.state = 'ATTACK'; 
    fighter.bfChain++; // Increment Chain (1, 2, 3, 4)
    
    // SET POSE FOR ANIMATION
    // 1: Right, 2: Left, 3: Kick, 4: Finisher
    fighter.bfPose = fighter.bfChain; 

    // Visual Tear
    Engine.spawnParticle(fighter.pos.add(new Vec3(fighter.facing*30, -60, 0)), '#000', 'bf_spatial_rend');
    
    // Delayed Impact
    setTimeout(() => {
        const t = Engine.fighters.find(f => f !== fighter);
        const hit = t && fighter.pos.dist(t.pos) < 350; // Wide cinematic range
        
        // Invert Screen
        const cvs = document.getElementById('gameCanvas');
        if(cvs) {
            cvs.style.filter = 'invert(1) contrast(1.5)'; 
            setTimeout(() => cvs.style.filter = 'none', 100);
        }
        Engine.screenShake = 60 + (fighter.bfChain * 10);

        const impactPos = fighter.pos.add(new Vec3(fighter.facing*40, -50, 0));
        
        // Particles
        Engine.spawnParticle(impactPos, '#000', 'bf_core');
        Engine.spawnParticle(impactPos, '#000', 'bf_impact'); 
        Engine.spawnParticle(impactPos, '#fff', 'bf_light');

        // Residue
        let residues = 0;
        const resInt = setInterval(() => {
            Engine.spawnParticle(impactPos, '#b91c1c', 'bf_residue');
            residues++;
            if(residues > 10) clearInterval(resInt);
        }, 100);

         if (hit) {
            // SCALING DAMAGE
            let baseDmg = 120 + (fighter.bfChain * 30);
            if(fighter.bfChain === 4) baseDmg = 300; 

            t.takeDamage(baseDmg, fighter);
            
            // STUN TARGET
            t.state = 'STUN';
            t.cds.global = 60; 
            
            // COOLDOWN LOGIC (The Fix)
            if(fighter.bfChain === 4) {
                // FINISHER: Massive Knockback & LONG Cooldown
                t.vel.x = fighter.facing * 50; 
                t.vel.y = -20;
                Engine.spawnParticle(impactPos.add(new Vec3(0,-100,0)), '#b91c1c', 'text', 'CRITICAL FINISH');
                
                fighter.bfChain = 0; // Reset Chain
                fighter.bfChance = 0; // Reset Chance
                fighter.cds.s1 = 300; // <--- 5 SECOND COOLDOWN (Finished)
            } else {
                // CHAIN CONTINUES: No Knockback & NO Cooldown
                t.vel.x = fighter.facing * 2; // Keep them close
                Engine.spawnParticle(impactPos.add(new Vec3(0,-100,0)), '#b91c1c', 'text', 'BLACK FLASH x'+fighter.bfChain);
                
                fighter.cds.s1 = 0; // <--- INSTANT READY for next hit
            }
            
            fighter.domainGauge = Math.min(100, fighter.domainGauge + 20);
        } else if (fighter.bfChain === 4) {
            // WHIFF (Missed the enemy completely)
            Engine.spawnParticle(fighter.pos, '#888', 'text', 'WHIFF');
            fighter.bfChain = 0;
            fighter.bfChance = 0;
            fighter.cds.s1 = 150; // <--- PENALTY COOLDOWN
        } else {
            Engine.spawnParticle(fighter.pos, '#888', 'text', 'WHIFF');
        }

        // RESET CHAIN IF MAXED
        if(fighter.bfChain >= 4) {
            fighter.bfChain = 0;
            fighter.bfChance = 0; // Reset probability
        }

        const el = document.getElementById('bf-percent');
        if(el) el.innerText = Math.floor(fighter.bfChance) + "%";

        fighter.state = 'IDLE';
        fighter.qteTimer = 0;
    }, 100); 
}

// --- DOMAIN VISUAL ---
export function drawYujiDomain(ctx, engine) {
    const grad = ctx.createLinearGradient(0, 0, 0, engine.height);
    grad.addColorStop(0, '#88ccff');
    grad.addColorStop(1, '#ddeeff');
    ctx.fillStyle = grad; 
    ctx.fillRect(0, 0, engine.width, engine.height);
    ctx.fillStyle = '#fff';
    const floorY = engine.project(new Vec3(0, 300, 0)).y;
    ctx.fillRect(0, floorY, engine.width, engine.height - floorY);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 4;
    const p1 = engine.project(new Vec3(-2000, 300, 0));
    const p2 = engine.project(new Vec3(2000, 300, 0));
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
}