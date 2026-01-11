import { Projectile } from './objects.js'; 
import { Vec3 } from './utils.js';

export function handleGojoSkill(fighter, slot) {
    const Engine = window.Engine;
    const inDomain = Engine.domain.active && Engine.domain.owner === fighter;
    
    if (slot === 1) { 
        if (fighter.cds.s1 > 0) return true; 
        if (inDomain) {
            if (fighter.ce < 100) return true;
            fighter.ce -= 100; fighter.cds.s1 = 300; 
            Engine.projectiles.push(new Projectile(fighter.pos.x + fighter.facing*200, fighter.pos.y - 100, fighter.pos.z, fighter.facing, fighter, 'MAX_BLUE'));
            Engine.spawnParticle(fighter.pos, '#0088ff', 'text', 'MAXIMUM OUTPUT: BLUE');
            Engine.screenShake = 20;
        } else {
            if (fighter.ce < 40) return true;
            fighter.ce -= 40; fighter.cds.s1 = 100;
            Engine.projectiles.push(new Projectile(fighter.pos.x + fighter.facing*100, fighter.pos.y - 60, fighter.pos.z, fighter.facing, fighter, 'BLUE_ORB'));
            Engine.spawnParticle(fighter.pos, '#00ccff', 'text', 'LAPSE: BLUE');
        }
        return true;
    } 
    
    if (slot === 2) { 
        if (fighter.cds.s2 > 0 || fighter.ce < 50) return true;
        fighter.ce -= 50; fighter.cds.s2 = 150; fighter.state = 'ATTACK';
        Engine.spawnParticle(fighter.pos, '#ff0000', 'text', 'REVERSAL: RED');
        setTimeout(() => {
            if(fighter.state !== 'DEAD') {
                Engine.projectiles.push(new Projectile(fighter.pos.x + fighter.facing * 40, fighter.pos.y - 60, fighter.pos.z, fighter.facing, fighter, 'RED_BLAST'));
                Engine.screenShake = 10;
            }
            fighter.state = 'IDLE';
        }, 400); 
        return true;
    }

    if (slot === 3) { 
        if (fighter.cds.ult > 0) return true;
        if (inDomain) {
            if(fighter.ce < 400) return true; 
            fighter.ce -= 400; fighter.cds.ult = 999; fighter.state = 'CHARGING_P'; fighter.chargeTimer = 0;
            Engine.spawnParticle(fighter.pos, '#a855f7', 'text', '200% HOLLOW PURPLE');
            setTimeout(() => {
                 if(fighter.state === 'CHARGING_P') {
                     Engine.projectiles.push(new Projectile(fighter.pos.x + fighter.facing*50, fighter.pos.y - 80, fighter.pos.z, fighter.facing, fighter, 'PURPLE_200'));
                     Engine.screenShake = 60;
                     fighter.state = 'IDLE';
                 }
            }, 800);
        } else {
            if(fighter.ce < 200) return true;
            fighter.ce -= 200; fighter.cds.ult = 800; fighter.state = 'CHARGING_P'; fighter.chargeTimer = 0;
            Engine.spawnParticle(fighter.pos, '#a855f7', 'text', 'HOLLOW PURPLE');
            setTimeout(() => {
                 if(fighter.state === 'CHARGING_P') {
                     Engine.projectiles.push(new Projectile(fighter.pos.x + fighter.facing*50, fighter.pos.y - 80, fighter.pos.z, fighter.facing, fighter, 'PURPLE'));
                     Engine.screenShake = 40;
                     fighter.state = 'IDLE';
                 }
            }, 1000); 
        }
        return true;
    }

    if (slot === 4) {
        if (fighter.cds.p > 0 || fighter.ce < 60) return true;
        fighter.ce -= 60; fighter.cds.p = 300; fighter.state = 'RUSHING';
        Engine.spawnParticle(fighter.pos, '#fff', 'text', 'RUSH');
        return true;
    }
    return false;
}

export function triggerGojoCinematic(gojo) {
    const Engine = window.Engine;
    Engine.cutscene.active = true;
    Engine.cutscene.timer = 0;
    Engine.cutscene.stage = 0;
    Engine.cutscene.owner = gojo;
    Engine.camera.targetX = gojo.pos.x;
    Engine.camera.zoom = 1;
}

export function updateGojoCinematic(Engine) {
    const t = Engine.cutscene.timer++;
    const gojo = Engine.cutscene.owner;

    if(t < 60) {
        Engine.camera.x += (gojo.pos.x - Engine.camera.x) * 0.1;
        Engine.camera.y += ((gojo.pos.y - 100) - Engine.camera.y) * 0.1; 
        Engine.fov = 400 - (t * 2); 
    }
    if(t === 60) {
        Engine.spawnParticle(gojo.pos.add(new Vec3(0,-150,0)), '#fff', 'text', 'DOMAIN EXPANSION');
        Engine.spawnParticle(gojo.pos.add(new Vec3(0,-120,0)), '#00ccff', 'text', 'UNLIMITED VOID');
    }
    if(t === 100) {
         Engine.domain.active = true;
         Engine.domain.owner = gojo;
         gojo.domainGauge = 100;
         Engine.screenShake = 5;
    }
    if(t > 150) {
        Engine.cutscene.active = false;
        Engine.fov = 400; 
        Engine.camera.y = -200;
    }
}

export function drawGojoDomain(ctx, engine) {
    const w = engine.width;
    const h = engine.height;
    const t = Date.now();
    const cx = w / 2;
    const cy = h / 2;

    const bgGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, w);
    bgGrad.addColorStop(0, '#020005'); 
    bgGrad.addColorStop(0.4, '#0a0a2a'); 
    bgGrad.addColorStop(1, '#000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'blur(40px)'; 
    ctx.fillStyle = '#ffffff';
    
    for(let i=0; i<6; i++) {
        const angle = (i / 6) * Math.PI * 2 + (t * 0.0001);
        const dist = 300 + Math.sin(t * 0.002 + i) * 50;
        const size = 200 + Math.cos(t * 0.001 + i) * 80;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.filter = 'blur(60px)';
    ctx.fillStyle = '#eef';
    ctx.beginPath(); ctx.arc(0, 0, 500, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w, 0, 500, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, h, 500, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w, h, 500, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.0003);
    ctx.beginPath();
    const goldGrad = ctx.createLinearGradient(-200, 0, 200, 0);
    goldGrad.addColorStop(0, 'rgba(255, 200, 50, 0)');
    goldGrad.addColorStop(0.5, 'rgba(255, 180, 100, 0.6)');
    goldGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 60;
    ctx.arc(0, 0, 220, 0, Math.PI * 2);
    ctx.stroke();

    for(let i=0; i<3; i++) {
        ctx.rotate(t * 0.001 + i);
        const grad = ctx.createLinearGradient(-150, 0, 150, 0);
        grad.addColorStop(0, 'rgba(0, 200, 255, 0)');
        grad.addColorStop(0.5, 'rgba(200, 255, 255, 0.9)'); 
        grad.addColorStop(1, 'rgba(0, 200, 255, 0)');
        
        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 15 + Math.sin(t*0.005 + i)*10;
        ctx.ellipse(0, 0, 180, 160, i * 2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#fff';
    ctx.arc(0, 0, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, cy, 138, 0, Math.PI * 2); 
    ctx.fill();
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 2;
    for(let i=0; i<20; i++) {
        const speed = (i % 5 + 3) * 2.0;
        const xOffset = (t * speed * 5 + i * 500) % (w + 1000) - 500;
        const yPos = (i * 137) % h; 
        const colType = i % 3;
        ctx.strokeStyle = colType===0 ? '#ff00ff' : (colType===1 ? '#00ffff' : '#ffffff');
        ctx.shadowBlur = 15; ctx.shadowColor = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(xOffset, yPos);
        ctx.lineTo(xOffset + 400 + Math.random()*100, yPos); 
        ctx.stroke();
    }
    ctx.restore();
}