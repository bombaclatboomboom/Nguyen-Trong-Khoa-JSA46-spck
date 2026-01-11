import { CFG, Vec3 } from './utils.js';
import { Fighter } from './fighter.js';
import { CHAR_DEFS } from './data.js';
import { Obstacle, Particle, Lightning } from './objects.js';
import { UI } from './ui.js';
import { drawYujiDomain, drawYujiQTE } from './yuji.js';
import { drawGojoDomain, updateGojoCinematic, triggerGojoCinematic } from './gojo.js';

export const Engine = {
    canvas: null, ctx: null,
    width: 0, height: 0,
    fighters: [], projectiles: [], particles: [], obstacles: [], lightnings: [],
    camera: { x: 0, y: -200, z: -600 }, fov: 400, screenShake: 0,
    domain: { active: false, owner: null, timer: 0 },
    cutscene: { active: false, timer: 0, stage: 0, owner: null },
    keys: {},

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;
            if(e.key.toLowerCase() === 'g') {
                const p = this.fighters.find(f => f.isPlayer);
                if(p && p.domainGauge >= 100 && !this.domain.active && !this.cutscene.active) {
                    this.triggerDomain(p);
                }
            }
            if(e.key.toLowerCase() === 'u') {
                const p = this.fighters.find(f => f.isPlayer);
                if(p && !e.repeat && p.name === "Yuji Itadori") {
                    p.useSkill(1);
                }
            }
        });
        
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
        this.genMap();
        this.loop();
    },

    resize() { 
        this.width = window.innerWidth; this.height = window.innerHeight; 
        if(this.canvas) { this.canvas.width = this.width; this.canvas.height = this.height; }
    },

    start(p1, p2) {
        const p1Def = CHAR_DEFS[p1];
        this.fighters = [ new Fighter(p1Def, true), new Fighter(CHAR_DEFS[p2], false) ];
        this.genMap(); 
        UI.initHUD(); 
        document.getElementById('ui-layer').style.display = 'flex';
        UI.playIntro(p1Def);
    },

    genMap() {
        this.obstacles = [];
        this.obstacles.push(new Obstacle(-800, 400, 300, 10, 300, 'lake'));
        for(let i=0; i<6; i++) {
            const x = (Math.random()-0.5)*2400; const z = (Math.random()-0.5)*1200;
            if(Math.abs(x) < 700 && Math.abs(z) < 300) continue;
            this.obstacles.push(new Obstacle(x, z, 120+Math.random()*100, 200+Math.random()*300, 120+Math.random()*100, 'build'));
        }
    },

    spawnDebris(pos, w, h) { for(let i=0; i<15; i++) this.particles.push(new Particle(pos,'#555','debris')); },
    spawnParticle(pos, c, t, txt) { this.particles.push(new Particle(pos, c, t, txt)); },
    spawnLightning(pos, color) { this.lightnings.push(new Lightning(pos, color)); },

    triggerDomain(caster) {
        if(caster.name === "Satoru Gojo") {
            triggerGojoCinematic(caster);
            return; 
        }

        this.domain.active = true; this.domain.owner = caster;
        const b = document.getElementById('alert-banner'); 
        b.style.display = 'block'; 
        b.innerText = (caster.def.domainName || "DOMAIN EXPANSION").toUpperCase(); 
        b.style.color = caster.skin.aura;
        setTimeout(() => b.style.display = 'none', 2500);
        
        if(caster.name === "Yuji Itadori") {
            this.backupObstacles = [...this.obstacles];
            this.obstacles = [];
            for(let i=0; i<8; i++) {
                const x = (Math.random()-0.5)*2400; const z = (Math.random()-0.5)*1000;
                if(Math.abs(x) < 400) continue; 
                this.obstacles.push(new Obstacle(x, z, 200, 150, 200, 'house'));
            }
        }
        this.startDomainEffectLoop(caster);
    },

    startDomainEffectLoop(caster) {
        const t = this.fighters.find(f => f !== caster);
        if(t) {
            const iv = setInterval(() => {
                if(!this.domain.active) {
                    clearInterval(iv);
                    if(caster.name === "Yuji Itadori" && this.backupObstacles) { 
                        this.obstacles = this.backupObstacles; 
                        this.backupObstacles = null; 
                    }
                    if(caster.name === "Satoru Gojo" && t.state === 'STUN') t.state = 'IDLE';
                    return;
                }
                if (t.state !== 'DEAD') {
                    if(caster.name === "Yuji Itadori") {
                        this.spawnParticle(t.pos.add(new Vec3((Math.random()-0.5)*100, (Math.random()-0.5)*100, 0)), '#fff', 'slash_bw');
                        t.takeDamage(8, caster); 
                        this.screenShake = 2;
                    } else if (caster.name === "Satoru Gojo") {
                        t.state = 'STUN';
                        t.vel.x = 0; t.vel.z = 0;
                        if(Math.random() < 0.3) this.spawnParticle(t.pos.add(new Vec3(0,-100,0)), '#fff', 'text', '...INFO...');
                        t.takeDamage(2, caster); 
                    }
                    else {
                        t.takeDamage(5, caster); 
                        this.spawnParticle(t.pos, caster.skin.aura, 'burst');
                    }
                }
            }, 200);
        }
    },

    update() {
        // 1. Cutscene Logic
        if(this.cutscene.active && this.cutscene.owner.name === "Satoru Gojo") {
            updateGojoCinematic(this);
            if(this.cutscene.timer === 100) this.startDomainEffectLoop(this.cutscene.owner); 
            this.particles.forEach(p => p.update());
            this.particles = this.particles.filter(p => p.life > 0);
            return; 
        }

        // 2. Yuji "THE ZONE" Logic (Freeze Everything & Focus)
        const p1 = this.fighters.find(f => f.isPlayer && f.name === "Yuji Itadori");
        if(p1 && p1.state === 'BF_PREP') {
            p1.qteTimer--;
            
            // STRICT FOCUS CAMERA
            // 1. Hard Lock X/Y to player to prevent "rotation/parallax"
            this.camera.x = p1.pos.x; 
            this.camera.y = p1.pos.y - 80; 
            
            // 2. Slow Cinematic Zoom (FOV interpolation)
            // Zooms from 400 down to 250 slowly
            this.fov += (250 - this.fov) * 0.02; 
            
            if(p1.qteTimer <= 0) {
                p1.state = 'IDLE'; // Fail timeout
                this.spawnParticle(p1.pos, '#888', 'text', 'TIMEOUT');
                p1.bfChance = 0; // Punish timeout
            }
            
            // FREEZE GAME STATE
            return; 
        } else {
             // Reset Camera smoothly
             if(this.fov < 400) this.fov += (400 - this.fov) * 0.1;
        }

        // 3. Normal Physics Update
        if(this.fighters.length > 0) {
            const mid = (this.fighters[0].pos.x + this.fighters[1].pos.x)/2;
            this.camera.x += (mid - this.camera.x) * 0.1;
            if(this.screenShake > 0) {
                this.camera.x += (Math.random()-0.5)*this.screenShake;
                this.camera.y = -200 + (Math.random()-0.5)*this.screenShake;
                this.screenShake *= 0.9;
            } else this.camera.y = -200;
        }

        this.fighters.forEach(f => f.update());
        this.projectiles.forEach(p => p.update());
        this.particles.forEach(p => p.update());
        this.lightnings = this.lightnings.filter(l => l.life-- > 0);
        this.projectiles = this.projectiles.filter(p => p.life > 0);
        this.particles = this.particles.filter(p => p.life > 0);
        UI.update();
    },

    project(v) {
        const r = v.sub(new Vec3(this.camera.x, this.camera.y, this.camera.z));
        const s = this.fov / (r.z + this.fov);
        return { x: r.x * s + this.width/2, y: r.y * s + this.height/2, s: s, z: r.z };
    },

    draw() {
        if(!this.ctx) return;
        const ctx = this.ctx;
        
        // Background
        if(this.cutscene.active && this.cutscene.timer > 60) {
            ctx.fillStyle = '#000'; ctx.fillRect(0,0,this.width, this.height);
            if(this.cutscene.timer > 120) drawGojoDomain(ctx, this);
        }
        else if(this.domain.active && this.domain.owner) {
            const owner = this.domain.owner;
            if(owner.name === "Yuji Itadori") drawYujiDomain(ctx, this);
            else if(owner.name === "Satoru Gojo") drawGojoDomain(ctx, this);
            else {
                ctx.fillStyle = owner.skin.aura; ctx.fillRect(0,0,this.width, this.height);
                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0,0,this.width, this.height);
            }
        } else {
            ctx.fillStyle = '#111'; ctx.fillRect(0,0,this.width, this.height);
            ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
            for(let x=-2000; x<=2000; x+=250) {
                const p1 = this.project(new Vec3(x, CFG.GROUND, -1000));
                const p2 = this.project(new Vec3(x, CFG.GROUND, 2000));
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            }
        }

        if(this.cutscene.active) {
            this.drawFighter(this.cutscene.owner, ctx);
            this.particles.forEach(p => p.draw(ctx, this.project.bind(this)));
            return;
        }

        const list = [...this.obstacles, ...this.fighters, ...this.projectiles, ...this.particles];
        list.sort((a,b) => b.pos.z - a.pos.z);

        this.lightnings.forEach(l => l.draw(ctx, this.project.bind(this)));

        list.forEach(o => {
            if(o.draw) {
                o.draw(ctx, this.project.bind(this));
            } else if(o.constructor.name === "Fighter") {
                this.drawFighter(o, ctx);
            }
        });

        // DRAW YUJI QTE OVERLAY
        const yuji = this.fighters.find(f => f.name === "Yuji Itadori");
        if(yuji && yuji.state === 'BF_PREP') {
             drawYujiQTE(ctx, yuji, this.project.bind(this));
        }
    },

    drawFighter(f, ctx) {
        const p = this.project(f.pos);
        const x = p.x; const y = p.y; const s = p.s;
        
        if(f.state === 'DEAD') { ctx.fillStyle = '#555'; ctx.fillRect(x-20*s, y, 40*s, 10*s); return; }
        
        const w = 40*s; const h = 90*s;
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, w, w/3, 0, 0, Math.PI*2); ctx.fill();
        
        if(f.state === 'CHARGE' || f.ce > 800) { ctx.shadowBlur = 20; ctx.shadowColor = f.skin.aura; }
        if(f.state === 'BF_PREP') { ctx.shadowBlur = 50; ctx.shadowColor = '#ff0055'; }

        if(f.name === "Yuji Itadori") {
            const legOff = (f.state==='RUN') ? Math.sin(Date.now()/50)*10*s : 0;
            const facing = f.facing;
            ctx.fillStyle = '#080808'; 
            ctx.beginPath(); ctx.moveTo(x-w/2.5+legOff, y-h/3); ctx.lineTo(x-w/2.5-5*s+legOff, y); ctx.lineTo(x-2*s+legOff, y); ctx.lineTo(x-2*s+legOff, y-h/3); ctx.fill();
            ctx.beginPath(); ctx.moveTo(x+w/6-legOff, y-h/3); ctx.lineTo(x+w/6-5*s-legOff, y); ctx.lineTo(x+w/6+12*s-legOff, y); ctx.lineTo(x+w/6+12*s-legOff, y-h/3); ctx.fill();
            ctx.fillStyle = '#b91c1c'; ctx.fillRect(x-w/2.5-5*s+legOff, y-8*s, 18*s, 8*s); ctx.fillRect(x+w/6-5*s-legOff, y-8*s, 18*s, 8*s);
            ctx.fillStyle = '#050505'; ctx.fillRect(x - w/2, y - h + h/3, w, h/2);
            ctx.fillStyle = '#d4af37'; ctx.beginPath(); ctx.arc(x - 5*s*facing, y - h + h/2.5, 3*s, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath(); ctx.moveTo(x-w/1.8, y-h+h/3+5*s); ctx.bezierCurveTo(x-w/2, y-h+h/3-5*s, x+w/2, y-h+h/3-5*s, x+w/1.8, y-h+h/3+5*s);
            ctx.lineTo(x+w/1.8, y-h+h/3+15*s); ctx.bezierCurveTo(x+w/2, y-h+h/3+25*s, x-w/2, y-h+h/3+25*s, x-w/1.8, y-h+h/3+15*s); ctx.fill();
            ctx.fillStyle = '#ffe0bd';
            ctx.beginPath(); ctx.moveTo(x-13*s, y-h+8*s); ctx.lineTo(x-12*s, y-h+22*s); ctx.quadraticCurveTo(x, y-h+28*s, x+12*s, y-h+22*s); ctx.lineTo(x+13*s, y-h+8*s); ctx.fill();
            ctx.fillStyle = '#111'; 
            ctx.beginPath(); ctx.moveTo(x-14*s, y-h+5*s); ctx.lineTo(x-14*s, y-h+15*s); ctx.lineTo(x-10*s, y-h+5*s); ctx.lineTo(x+10*s, y-h+5*s); ctx.lineTo(x+14*s, y-h+15*s); ctx.lineTo(x+14*s, y-h+5*s); ctx.fill();
            ctx.fillStyle = '#ff9988'; 
            ctx.beginPath(); ctx.moveTo(x-15*s, y-h+8*s);
            ctx.lineTo(x-18*s, y-h-5*s); ctx.lineTo(x-12*s, y-h-2*s); ctx.lineTo(x-8*s, y-h-12*s); ctx.lineTo(x-4*s, y-h-5*s); ctx.lineTo(x, y-h-15*s);
            ctx.lineTo(x+4*s, y-h-5*s); ctx.lineTo(x+8*s, y-h-12*s); ctx.lineTo(x+12*s, y-h-2*s); ctx.lineTo(x+18*s, y-h-5*s); ctx.lineTo(x+15*s, y-h+8*s); ctx.fill();
            ctx.strokeStyle = '#521'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x-3*s, y-h+15*s); ctx.lineTo(x+3*s, y-h+15*s); ctx.stroke(); 

            const armAng = f.state==='ATTACK' ? -facing*1.5 : 0;
            ctx.save(); ctx.translate(x, y-h*0.7); 
            
            if(f.state === 'CHARGING_PB') {
                ctx.fillStyle = '#050505'; ctx.fillRect(-5*s, 10*s, 10*s, 20*s); 
                ctx.fillStyle = '#ffe0bd'; ctx.fillRect(-8*s, 30*s, 16*s, 8*s); 
                ctx.shadowBlur = 10; ctx.shadowColor = '#f00'; ctx.fillStyle = '#f00';
                ctx.beginPath(); ctx.arc(0, 30*s, 5*s + Math.random()*5*s, 0, Math.PI*2); ctx.fill();
            } 
            else {
                ctx.rotate(armAng); 
                ctx.fillStyle = '#050505'; ctx.fillRect(-10*s, 0, 10*s, 30*s);
                
                if (f.state === 'ATTACK') {
                    ctx.shadowBlur = 15; ctx.shadowColor = '#0088ff'; ctx.fillStyle = '#0088ff'; 
                    ctx.beginPath(); ctx.arc(-5*s, 30*s, 8*s, 0, Math.PI*2); ctx.fill();
                }
                else {
                    ctx.fillStyle = '#b91c1c'; ctx.fillRect(-11*s, 28*s, 12*s, 5*s);
                    ctx.fillStyle = '#ffe0bd'; ctx.fillRect(-11*s, 33*s, 12*s, 8*s); 
                }
            }
            ctx.restore(); ctx.shadowBlur = 0;
            return;
        }

        if(f.name === "Satoru Gojo") {
            const legOff = (f.state==='RUN') ? Math.sin(Date.now()/50)*10*s : 0;
            ctx.fillStyle = '#080810';
            ctx.fillRect(x-w/2+legOff+3*s, y-h/3, w/3-4*s, h/3); ctx.fillRect(x+w/6-legOff+3*s, y-h/3, w/3-4*s, h/3);
            ctx.fillRect(x-w/2+3*s, y-h+h/3+10*s, w-6*s, h/2-10*s);
            ctx.fillStyle = '#222'; ctx.fillRect(x-1*s, y-h+h/3+10*s, 2*s, h/2-10*s);
            ctx.fillStyle = '#05050a'; ctx.beginPath(); ctx.moveTo(x-16*s, y-h+h/3+20*s); ctx.lineTo(x-16*s, y-h+10*s); ctx.lineTo(x+16*s, y-h+10*s); ctx.lineTo(x+16*s, y-h+h/3+20*s); ctx.fill();
            ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.arc(x, y-h+5*s, 13*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(x-14*s, y-h-4*s, 28*s, 12*s);
            ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(255,255,255,0.6)';
            ctx.beginPath(); ctx.moveTo(x-14*s, y-h-2*s);
            ctx.lineTo(x-22*s, y-h-10*s); ctx.lineTo(x-16*s, y-h-12*s);
            ctx.lineTo(x-18*s, y-h-25*s); ctx.lineTo(x-10*s, y-h-18*s);
            ctx.lineTo(x-8*s, y-h-35*s); ctx.lineTo(x-4*s, y-h-20*s);
            ctx.lineTo(x, y-h-38*s); ctx.lineTo(x+4*s, y-h-20*s);
            ctx.lineTo(x+8*s, y-h-35*s); ctx.lineTo(x+10*s, y-h-18*s);
            ctx.lineTo(x+18*s, y-h-25*s); ctx.lineTo(x+16*s, y-h-12*s);
            ctx.lineTo(x+22*s, y-h-10*s); ctx.lineTo(x+14*s, y-h-2*s);
            ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#080810';
            ctx.beginPath(); ctx.moveTo(x-15*s, y-h+45*s); ctx.lineTo(x-10*s, y-h+65*s); ctx.lineTo(x-5*s, y-h+45*s); ctx.fill();
            ctx.beginPath(); ctx.moveTo(x+15*s, y-h+45*s); ctx.lineTo(x+10*s, y-h+65*s); ctx.lineTo(x+5*s, y-h+45*s); ctx.fill();
            if(Engine.domain.active && Engine.domain.owner === f || Engine.cutscene.active) {
                ctx.fillStyle = '#ffe0bd'; ctx.fillRect(x-5*s, y-h+25*s, 10*s, 12*s);
                ctx.fillStyle = '#dcb'; ctx.fillRect(x-5*s, y-h+28*s, 10*s, 2*s);
            }
            return;
        }

        if(f.name === "Ryomen Sukuna") {
            const legOff = (f.state==='RUN') ? Math.sin(Date.now()/50)*10*s : 0;
            const facing = f.facing;
            ctx.fillStyle = '#42080f'; ctx.beginPath(); 
            ctx.moveTo(x-20*s+legOff, y); ctx.lineTo(x-10*s, y-h/2); ctx.lineTo(x+10*s, y-h/2); ctx.lineTo(x+20*s-legOff, y); 
            ctx.lineTo(x+5*s, y-10*s); ctx.lineTo(x-5*s, y-10*s); ctx.fill();
            ctx.fillStyle = '#c4a66f'; ctx.fillRect(x-12*s, y-h/2-5*s, 24*s, 10*s);
            ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.moveTo(x-18*s, y-h+25*s); ctx.lineTo(x-12*s, y-h/2-5*s); ctx.lineTo(x+12*s, y-h/2-5*s); ctx.lineTo(x+18*s, y-h+25*s); ctx.fill();
            ctx.fillStyle = '#500'; ctx.beginPath(); ctx.ellipse(x, y-h/2-15*s, 8*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(x-4*s, y-h/2-16*s, 8*s, 1*s); ctx.fillRect(x-4*s, y-h/2-14*s, 8*s, 1*s);
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2*s;
            ctx.beginPath(); ctx.arc(x-12*s, y-h+35*s, 4*s, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(x+12*s, y-h+35*s, 4*s, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x-20*s, y-h+40*s); ctx.lineTo(x+20*s, y-h+40*s); ctx.stroke();
            const drawArm = (ox, oy, ang, scale) => {
                ctx.save(); ctx.translate(ox, oy); ctx.rotate(ang);
                ctx.fillStyle = '#ffe0bd'; ctx.fillRect(0, 0, 10*s*scale, 30*s*scale);
                ctx.fillStyle = '#000'; ctx.fillRect(0, 8*s*scale, 10*s*scale, 2*s*scale); ctx.fillRect(0, 18*s*scale, 10*s*scale, 2*s*scale);
                ctx.fillStyle = '#ffe0bd'; ctx.fillRect(-2*s*scale, 30*s*scale, 14*s*scale, 10*s*scale);
                ctx.restore();
            };
            const armAng = f.state==='ATTACK' ? -facing*1.2 : 0;
            drawArm(x-18*s, y-h+25*s, 0.4+armAng, 1.1); drawArm(x+8*s, y-h+25*s, -0.4+armAng, 1.1);
            drawArm(x-12*s, y-h+45*s, 0.8+armAng, 0.9); drawArm(x+2*s, y-h+45*s, -0.8+armAng, 0.9);
            ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.arc(x, y-h+15*s, 15*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffe5c4'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, y-h); ctx.quadraticCurveTo(x+18*s, y-h+5*s, x+10*s, y-h+25*s); ctx.lineTo(x, y-h+25*s); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x-6*s, y-h+12*s, 4*s, 2*s); ctx.fillRect(x+6*s, y-h+10*s, 5*s, 3*s);
            ctx.fillRect(x-6*s, y-h+18*s, 3*s, 2*s); ctx.fillRect(x+8*s, y-h+16*s, 3*s, 2*s);
            ctx.fillStyle = '#ff8888'; ctx.beginPath(); ctx.moveTo(x-15*s, y-h+5*s); ctx.lineTo(x-10*s, y-h-10*s); ctx.lineTo(x, y-h-15*s); ctx.lineTo(x+10*s, y-h-10*s); ctx.lineTo(x+15*s, y-h+5*s); ctx.lineTo(x, y-h+8*s); ctx.fill();
            return;
        }

        this.drawGenericFighter(f, x, y, s, w, h, ctx);
    },

    drawGenericFighter(f, x, y, s, w, h, ctx) {
        ctx.fillStyle = '#111'; 
        const legOff = (f.state==='RUN') ? Math.sin(Date.now()/50)*10*s : 0;
        ctx.fillRect(x-w/2+legOff, y-h/3, w/3, h/3); ctx.fillRect(x+w/6-legOff, y-h/3, w/3, h/3);
        ctx.fillStyle = f.skin.outfit==='kimono'?'#eee':'#222';
        ctx.fillRect(x - w/2, y - h + h/3, w, h/2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#222'; 
        const armAng = f.state==='ATTACK' ? -f.facing*1.5 : 0;
        ctx.save(); ctx.translate(x, y-h*0.7); ctx.rotate(armAng); ctx.fillRect(-10*s, 0, 10*s, 30*s); ctx.restore();
        ctx.fillStyle = '#ffe0bd';
        ctx.beginPath(); ctx.arc(x, y - h + 10*s, 15*s, 0, Math.PI*2); ctx.fill();
        if(f.skin.hair !== 'none') {
            ctx.fillStyle = f.skin.color;
            ctx.beginPath(); ctx.arc(x, y - h, 18*s, 0, Math.PI, true); ctx.fill();
        }
    },

    loop() { this.update(); this.draw(); requestAnimationFrame(() => this.loop()); }
};