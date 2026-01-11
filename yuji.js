import { Vec3 } from './utils.js';

// Helper to draw the QTE Ring
export function drawYujiQTE(ctx, fighter, project) {
    if(fighter.state !== 'BF_PREP') return;
    
    // Position fixed above head
    const p = project(fighter.pos.add(new Vec3(0, -80, 0))); 
    
    // 1. TOTAL FOCUS (Black out the world)
    ctx.fillStyle = `rgba(0,0,0,0.9)`; 
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 2. The Core (Target)
    const coreSize = 40;
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 20; ctx.shadowColor = '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, coreSize, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // 3. The Timing Ring
    const ringRadius = fighter.qteTimer * 4; 
    const inWindow = (fighter.qteTimer > 10 && fighter.qteTimer < 25);
    
    ctx.strokeStyle = inWindow ? '#ff0055' : '#888';
    ctx.lineWidth = inWindow ? 8 : 4;
    ctx.shadowBlur = inWindow ? 30 : 0; ctx.shadowColor = '#ff0055';
    
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(coreSize, ringRadius), 0, Math.PI * 2);
    ctx.stroke();
    
    // 4. Instructions
    ctx.fillStyle = '#ff0055';
    ctx.font = "italic 30px Impact";
    ctx.textAlign = "center";
    
    if(inWindow) {
        ctx.fillText("PRESS U NOW!", p.x, p.y + 120);
        ctx.fillStyle = '#fff'; ctx.font = "15px monospace";
        ctx.fillText("PERFECT SYNC", p.x, p.y + 140);
    } else if(fighter.qteTimer > 25) {
        ctx.fillStyle = '#888'; ctx.font = "20px monospace";
        ctx.fillText("WAIT...", p.x, p.y + 120);
    }
    
    ctx.textAlign = "start";
}

export function handleYujiSkill(fighter, slot) {
    const Engine = window.Engine;

    // SKILL 1: DIVERGENT FIST -> BLACK FLASH SYSTEM
    if (slot === 1) {
        // STATE 1: EXECUTE
        if (fighter.state === 'BF_PREP') {
            if (fighter.qteTimer > 10 && fighter.qteTimer < 25) {
                triggerBlackFlash(fighter); // SUCCESS
            } else {
                const reason = fighter.qteTimer >= 25 ? "TOO EARLY" : "TOO LATE";
                Engine.spawnParticle(fighter.pos, '#888', 'text', reason);
                fighter.state = 'IDLE'; 
                fighter.bfChance = 0; 
                fighter.bfChain = 0; 
                Engine.screenShake = 5;
            }
            return true;
        }

        // STATE 2: NORMAL ACTIVATION
        if (fighter.cds.s1 > 0) return true;

        const roll = Math.random() * 100;
        const isBlackFlashOpp = roll < fighter.bfChance;

        if (isBlackFlashOpp) {
            fighter.state = 'BF_PREP';
            fighter.qteTimer = 60; 
            fighter.ce -= 10;
            Engine.spawnParticle(fighter.pos, '#fff', 'text', 'THE ZONE');
            return true;
        } else {
            fighter.ce -= 20; 
            fighter.cds.s1 = 20; 
            fighter.state = 'ATTACK'; 
            fighter.attack('HEAVY');
            Engine.spawnParticle(fighter.pos, '#0088ff', 'text', 'DIVERGENT FIST');
            Engine.spawnParticle(fighter.pos.add(new Vec3(fighter.facing * 40, -50, 0)), '#0088ff', 'burst');
            fighter.bfChance = Math.min(90, fighter.bfChance + 5); 
            
            const el = document.getElementById('bf-percent');
            if(el) {
                el.innerText = Math.floor(fighter.bfChance) + "%";
                el.style.color = fighter.bfChance > 20 ? '#ff0055' : '#fff';
            }
            return true;
        }
    }
    
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
    fighter.bfChain++;
    
    // 1. Initial Tear
    Engine.spawnParticle(fighter.pos.add(new Vec3(fighter.facing*30, -60, 0)), '#000', 'bf_spatial_rend');
    
    // 2. Delayed Impact
    setTimeout(() => {
        const t = Engine.fighters.find(f => f !== fighter);
        const hit = t && fighter.pos.dist(t.pos) < 300; 
        
        // Screen Inversion
        const cvs = document.getElementById('gameCanvas');
        if(cvs) {
            cvs.style.filter = 'invert(1) contrast(1.5)'; 
            setTimeout(() => cvs.style.filter = 'none', 100);
        }
        Engine.screenShake = 60;

        const impactPos = fighter.pos.add(new Vec3(fighter.facing*40, -50, 0));
        
        // --- VISUAL ENHANCEMENT: LONG LASTING EFFECTS ---
        // Spawn particles that last 90 frames (1.5s)
        Engine.spawnParticle(impactPos, '#000', 'bf_core');
        Engine.spawnParticle(impactPos, '#000', 'bf_impact'); 
        Engine.spawnParticle(impactPos, '#fff', 'bf_light');

        // Loop for Residual Sparks (Lasts 1 second)
        let residues = 0;
        const resInt = setInterval(() => {
            Engine.spawnParticle(impactPos, '#b91c1c', 'bf_residue');
            residues++;
            if(residues > 10) clearInterval(resInt);
        }, 100);

        if (hit) {
            let dmg = 150 + (fighter.bfChain * 30); 
            t.takeDamage(dmg, fighter);
            t.vel.x = fighter.facing * 40; 
            t.vel.y = -15;
            
            fighter.domainGauge = Math.min(100, fighter.domainGauge + 30);
            fighter.bfChance = Math.min(100, fighter.bfChance + 10); 
            
            Engine.spawnParticle(impactPos.add(new Vec3(0,-100,0)), '#b91c1c', 'text', 'BLACK FLASH');
        } else {
            Engine.spawnParticle(fighter.pos, '#888', 'text', 'WHIFF');
        }

        const el = document.getElementById('bf-percent');
        if(el) el.innerText = Math.floor(fighter.bfChance) + "%";

        fighter.state = 'IDLE';
        fighter.qteTimer = 0;
    }, 100); 
}

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