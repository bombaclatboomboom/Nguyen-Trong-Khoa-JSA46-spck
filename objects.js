import { Vec3, CFG } from './utils.js';
const getEngine = () => window.Engine; 

export class Obstacle {
    constructor(x, z, w, h, d, type) {
        this.pos = new Vec3(x, CFG.GROUND, z);
        this.w = w; this.h = h; this.d = d;
        this.type = type; 
        this.hp = (type==='build') ? 400 : (type==='tree' ? 80 : 9999);
        this.solid = (type !== 'lake');
    }
    takeDamage(amt) {
        if(this.type === 'lake') return;
        this.hp -= amt;
        const Engine = getEngine();
        if(this.hp <= 0) {
            Engine.spawnDebris(this.pos, this.w, this.h);
            Engine.screenShake = 5;
        } else if(this.type === 'build') {
            Engine.screenShake = 2;
        }
    }
    draw(ctx, project) {
        if(this.hp <= 0) return;
        const p = project(this.pos); const s = p.s;
        
        if(this.type === 'house') {
            const w = this.w * s; const h = this.h * s;
            ctx.fillStyle = '#eec'; ctx.fillRect(p.x - w/2, p.y - h, w, h);
            ctx.fillStyle = '#a52a2a'; 
            ctx.beginPath();
            ctx.moveTo(p.x - w/2 - 20*s, p.y - h);
            ctx.lineTo(p.x + w/2 + 20*s, p.y - h);
            ctx.lineTo(p.x, p.y - h - 60*s);
            ctx.fill();
            ctx.fillStyle = '#642'; ctx.fillRect(p.x - 20*s, p.y - 60*s, 40*s, 60*s);
            return;
        }
        
        if(this.type === 'lake') {
            ctx.fillStyle = 'rgba(30, 58, 138, 0.8)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, this.w*s, this.d*s*0.3, 0, 0, Math.PI*2); ctx.fill();
        } else if(this.type === 'tree') {
            ctx.fillStyle = '#3e2723'; ctx.fillRect(p.x - 10*s, p.y - this.h*s, 20*s, this.h*s);
            ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.arc(p.x, p.y - this.h*s, 40*s, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillStyle = '#333'; ctx.fillRect(p.x-(this.w/2)*s, p.y-this.h*s, this.w*s, this.h*s);
            ctx.fillStyle = '#111'; ctx.fillRect(p.x-(this.w/2)*s+10*s, p.y-this.h*s+10*s, (this.w-20)*s, (this.h-20)*s);
        }
    }
}

export class Projectile {
    constructor(x,y,z,d,o, type) { 
        this.pos=new Vec3(x,y,z); this.owner=o; this.life=50; this.type=type||'NRM'; this.facing = d;
        this.isProjectile = true;
        
        if(type==='PB_ARROW') { 
            this.vel=new Vec3(d*90, 0, 0); 
            this.life=30; 
            this.color='#b91c1c'; 
            this.scale=2.0; 
        }
        else if(type==='BLUE_ORB') { this.vel=new Vec3(d*15, 0, 0); this.life=100; this.color='#00ccff'; }
        else if(type==='MAX_BLUE') { this.vel=new Vec3(d*5, 0, 0); this.life=150; this.color='#0044aa'; this.scale=3.0; }
        else if(type==='RED_BLAST') { this.vel=new Vec3(d*40, 0, 0); this.life=30; this.color='#ff0000'; }
        else if(type==='PURPLE') { this.vel=new Vec3(d*25, 0, 0); this.life=120; this.color='#a855f7'; this.scale=8.0; }
        else if(type==='PURPLE_200') { this.vel=new Vec3(d*35, 0, 0); this.life=150; this.color='#8800ff'; this.scale=20.0; }
        else { this.vel=new Vec3(d*35,0,0); this.color = (o.skin && o.skin.aura) ? o.skin.aura : '#fff'; }
    }

    update() {
        this.life--; this.pos = this.pos.add(this.vel);
        const Engine = getEngine();

        if(this.type === 'PB_ARROW') {
            const t = Engine.fighters.find(f => f !== this.owner);
            if(t && this.pos.dist(t.pos) < 80 && Math.abs(this.pos.z - t.pos.z) < 50) {
                t.takeDamage(130, this.owner); 
                Engine.spawnParticle(t.pos, '#b91c1c', 'burst');
                Engine.spawnParticle(t.pos, '#b91c1c', 'blood');
                this.life = 0;
            }
            Engine.obstacles.forEach(o => { if(this.pos.dist(o.pos)<50) { this.life=0; Engine.spawnDebris(this.pos,10,10); } });
            return;
        }

        if(this.type === 'BLUE_ORB') {
            const t = Engine.fighters.find(f => f !== this.owner);
            if(t && this.pos.dist(t.pos) < 300) {
                t.pos.x += (this.pos.x - t.pos.x) * 0.05;
                if(this.life % 5 === 0) t.takeDamage(1, this.owner);
            }
            return;
        }
        if(this.type === 'MAX_BLUE') {
            const t = Engine.fighters.find(f => f !== this.owner);
            if(t && this.pos.dist(t.pos) < 500) {
                t.pos.x += (this.pos.x - t.pos.x) * 0.15; 
                t.pos.y += (this.pos.y - t.pos.y) * 0.1;
                if(Math.random() < 0.2) Engine.spawnDebris(t.pos, 10, 10);
                if(this.life % 3 === 0) { t.takeDamage(5, this.owner); Engine.screenShake = 5; }
            }
            Engine.obstacles.forEach(o => { if(this.pos.dist(o.pos)<300) o.takeDamage(10); });
            return;
        }
        if(this.type === 'PURPLE' || this.type === 'PURPLE_200') {
            const t = Engine.fighters.find(f => f !== this.owner);
            const range = 150 * (this.scale/8.0);
            if(t && this.pos.dist(t.pos) < range) {
                const dmg = (this.type === 'PURPLE_200') ? 40 : 10;
                t.takeDamage(dmg, this.owner); t.vel.x = this.facing * 15; Engine.screenShake = (this.type === 'PURPLE_200') ? 20 : 5;
            }
            Engine.obstacles.forEach(o => { if(this.pos.dist(o.pos)<range*1.5) o.takeDamage(999); });
            return;
        }
        const t = Engine.fighters.find(f=>f!==this.owner);
        if(t && this.pos.dist(t.pos)<80 && Math.abs(t.pos.z-this.pos.z)<60) {
            let dmg = 40;
            if(this.type === 'RED_BLAST') { dmg = 80; t.vel.x = this.facing * 40; t.vel.y = -10; Engine.screenShake = 15; }
            t.takeDamage(dmg, this.owner);
            this.life=0; Engine.spawnParticle(this.pos, this.color, 'burst');
        }
    }

    draw(ctx, project) {
        const p = project(this.pos); const s = p.s;
        ctx.save();
        
        if(this.type === 'PB_ARROW') {
            const tailLen = 600 * s;
            const startX = p.x - (tailLen * this.facing);
            const endX = p.x;
            if (isFinite(startX) && isFinite(endX)) {
                const grad = ctx.createLinearGradient(startX, p.y, endX, p.y);
                grad.addColorStop(0, 'rgba(100, 0, 0, 0)');
                grad.addColorStop(0.5, 'rgba(180, 0, 0, 0.8)');
                grad.addColorStop(1, '#ff0000');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(endX, p.y); 
                ctx.lineTo(startX, p.y - 15*s); 
                ctx.lineTo(startX, p.y + 15*s); 
                ctx.fill();
                ctx.fillStyle = '#b91c1c';
                ctx.beginPath();
                ctx.moveTo(endX + (40*s*this.facing), p.y); 
                ctx.lineTo(endX - (20*s*this.facing), p.y - 10*s);
                ctx.lineTo(endX - (20*s*this.facing), p.y + 10*s);
                ctx.fill();
            }
        }
        else if(this.type === 'MAX_BLUE') {
            const sz = (this.scale || 1) * s;
            const t = Date.now();
            ctx.fillStyle = '#000'; 
            ctx.beginPath(); ctx.arc(p.x, p.y, 15*sz, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#0088ff'; ctx.lineWidth = 4*s;
            ctx.beginPath(); 
            ctx.ellipse(p.x, p.y, 40*sz, 10*sz, t/100, 0, Math.PI*2); 
            ctx.stroke();
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)'; ctx.lineWidth = 2*s;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 60*sz, 15*sz, -t/150, 0, Math.PI*2);
            ctx.stroke();
        } 
        else if (this.type === 'RED_BLAST') {
            const sz = 1.5 * s;
            const vibX = (Math.random()-0.5)*5*s;
            const vibY = (Math.random()-0.5)*5*s;
            ctx.fillStyle = '#ff0000'; ctx.shadowBlur = 30; ctx.shadowColor = '#f00';
            ctx.beginPath(); ctx.arc(p.x + vibX, p.y + vibY, 15*sz, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(p.x, p.y, 8*sz, 0, Math.PI*2); ctx.fill();
        }
        else if (this.type === 'PURPLE' || this.type === 'PURPLE_200') {
            const sz = (this.scale || 1) * s;
            const t = Date.now();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 10*sz, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = this.type === 'PURPLE_200' ? '#440088' : '#a855f7'; 
            ctx.shadowBlur = 50; ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath(); ctx.arc(p.x, p.y, 25*sz, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3*s; ctx.shadowBlur = 20;
            for(let i=0; i<4; i++) {
                ctx.beginPath();
                const ang = (i * Math.PI/2) + (t/100);
                ctx.arc(p.x, p.y, 30*sz, ang, ang + 1);
                ctx.stroke();
            }
        }
        else if (this.type === 'BLUE_ORB') {
             ctx.fillStyle = 'rgba(0, 204, 255, 0.8)'; ctx.shadowBlur = 20; ctx.shadowColor = '#00ccff';
             ctx.beginPath(); ctx.arc(p.x, p.y, 30*s, 0, Math.PI*2); ctx.fill();
        }
        else {
            ctx.fillStyle = this.color; ctx.shadowBlur = 15; ctx.shadowColor = this.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 15*s, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
}

export class Particle {
    constructor(pos, col, type, txt) {
        this.pos = new Vec3(pos.x, pos.y, pos.z);
        this.color = col; this.type = type || 'sq'; this.text = txt;
        this.life = type==='debris' ? 60 : 40; this.maxLife = this.life;
        this.vel = new Vec3((Math.random()-0.5)*10, (Math.random()-0.5)*10, (Math.random()-0.5)*10);
        this.angle = Math.random() * Math.PI * 2; 

        if(type==='steam') { this.vel.y = -2; this.vel.x*=0.5; }
        if(type==='blood') { this.vel.y = -5; this.vel.x*=0.2; this.life=20; }
        if(type==='debris') { this.vel.y = -5 - Math.random()*10; }
        
        // --- LONG LASTING BLACK FLASH PARTICLES ---
        if(type === 'bf_impact' || type === 'bf_core' || type === 'bf_light') {
            this.life = 90; // 1.5 seconds minimum
            this.maxLife = 90;
            this.scale = 1.0;
            this.vel = new Vec3(0,0,0); // Static
        }
        if(type === 'bf_residue') {
            this.life = 60; // 1 second trailing sparks
            this.maxLife = 60;
            this.vel = new Vec3((Math.random()-0.5)*20, (Math.random()-0.5)*20, 0);
        }
    }
    update() {
        this.life--; 
        if(this.type === 'debris' || this.type === 'blood') {
            this.vel.y += 0.8;
            if(this.pos.y > CFG.GROUND) { this.pos.y = CFG.GROUND; this.vel.y *= -0.5; }
        }
        this.pos = this.pos.add(this.vel);
        if(this.type === 'text') this.pos.y -= 1;
        
        // Expansion logic
        if(this.type === 'bf_impact') this.scale += 0.02; 
        if(this.type === 'bf_light') this.scale += 0.1;
    }
    draw(ctx, project) {
        const p = project(this.pos); const s = p.s;
        
        // Fade out only in the last 20 frames for BF effects
        let alpha = this.life / this.maxLife;
        if(this.type.startsWith('bf_')) {
            if(this.life > 20) alpha = 1.0; // Stay bright
            else alpha = this.life / 20;
        }
        ctx.globalAlpha = alpha;

        // 1. BLACK FLASH CORE (Pulsing Sphere)
        if(this.type === 'bf_core') {
            ctx.save();
            ctx.translate(p.x, p.y);
            const pulse = 1 + Math.sin(Date.now()/50)*0.1; // Pulsing effect
            
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(0, 0, 60*s*pulse, 0, Math.PI*2); ctx.fill();
            
            ctx.strokeStyle = '#b91c1c';
            ctx.lineWidth = 5*s;
            ctx.beginPath();
            // Jagged Rim
            for(let i=0; i<12; i++) {
                const ang = (i/12)*Math.PI*2 + (Date.now()/100);
                const r = (70*s + Math.random()*20*s) * pulse;
                ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
            ctx.globalAlpha = 1.0;
            return;
        }

        // 2. BLACK FLASH IMPACT (Crackling Lightning)
        if(this.type === 'bf_impact') {
            ctx.save();
            ctx.translate(p.x, p.y);
            const scale = (this.scale || 1.0) * s * 2.5;
            
            // Jitter: Randomize shape every frame
            const jitter = () => (Math.random()-0.5) * 60 * scale;
            
            // Heavy Black Bolt
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 15 * scale;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 40; ctx.shadowColor = '#b91c1c'; 
            
            ctx.beginPath();
            ctx.moveTo(-80*scale, jitter());
            ctx.lineTo(-30*scale, jitter());
            ctx.lineTo(0, 0); // Center anchor
            ctx.lineTo(30*scale, jitter());
            ctx.lineTo(80*scale, jitter());
            ctx.stroke();
            
            // Inner Red Current
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4 * scale;
            ctx.globalCompositeOperation = 'lighter';
            ctx.stroke();
            
            ctx.restore();
            ctx.globalAlpha = 1.0;
            return;
        }

        // 3. RESIDUAL LIGHT (Flashbulb effect)
        if(this.type === 'bf_light') {
            ctx.fillStyle = '#fff';
            ctx.globalCompositeOperation = 'overlay';
            ctx.beginPath(); ctx.arc(p.x, p.y, 200*s * (this.life/90), 0, Math.PI*2); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
            return;
        }

        if(this.type === 'slash_bw') {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(this.angle); 
            ctx.strokeStyle = '#000'; ctx.lineWidth = 4*s; ctx.beginPath(); ctx.moveTo(-50*s, 0); ctx.lineTo(50*s, 0); ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2*s; ctx.beginPath(); ctx.moveTo(-50*s, -2*s); ctx.lineTo(50*s, -2*s); ctx.stroke();
            ctx.restore(); ctx.globalAlpha = 1.0; return;
        }

        if(this.type === 'text') {
            ctx.fillStyle = this.color; ctx.font = "900 " + (20*s) + "px Courier New"; ctx.fillText(this.text, p.x, p.y);
        } else {
            ctx.fillStyle = this.color; ctx.fillRect(p.x, p.y, (this.type==='debris'?12:6)*s, (this.type==='debris'?12:6)*s);
        }
        ctx.globalAlpha = 1.0;
    }
}

export class Lightning {
    constructor(pos, col) { this.pos=pos; this.life=10; this.color=col; }
    draw(ctx, project) {
        const p = project(this.pos);
        ctx.strokeStyle = this.color; ctx.lineWidth=4; ctx.shadowBlur = 15; ctx.shadowColor = this.color;
        ctx.beginPath();
        let lx=p.x, ly=p.y-100; ctx.moveTo(lx, ly);
        for(let i=0;i<6;i++) { lx+=(Math.random()-0.5)*80; ly+=(Math.random()*40); ctx.lineTo(lx,ly); }
        ctx.stroke(); ctx.shadowBlur = 0;
    }
}