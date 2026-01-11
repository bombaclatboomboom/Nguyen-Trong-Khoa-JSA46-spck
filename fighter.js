import { Vec3, CFG } from './utils.js';
import { Projectile } from './objects.js'; 
import { handleYujiSkill } from './yuji.js';
import { handleGojoSkill } from './gojo.js';

const getEngine = () => window.Engine;

export class Fighter {
    constructor(def, isPlayer) {
        this.name = def.name; this.skin = def.skin;
        this.maxHp = def.hp; this.hp = def.hp;
        this.maxCe = def.ce; this.ce = def.ce;
        this.def = def; this.isPlayer = isPlayer;
        
        this.pos = new Vec3(isPlayer?-250:250, 0, 0);
        this.vel = new Vec3(0,0,0);
        this.facing = isPlayer?1:-1;
        this.state = 'IDLE'; 
        this.cds = { s1: 0, s2: 0, ult: 0, p: 0, global: 0 };
        this.maxCds = { s1: def.cds[0], s2: def.cds[1], ult: def.cds[2], p: def.cds[3] || 600 };
        
        this.fatigue = 0; this.maxFatigue = 300; this.burnout = 0; this.domainGauge = 0;
        
        // NEW: Black Flash System
        this.bfChance = 0; // Start at 0% (Must build it up)
        this.inTheZone = false; 
        this.qteTimer = 0;     
        // Yuji Specific Logic
        this.bfWindow = 0; 
        this.bfChain = 0; 
        this.waitingForTiming = false;
        this.chargeTimer = 0; 
        this.manjiCounterWindow = 0;

        this.comboIndex = 0; 
        this.comboTimer = 0; 
        this.recoveryTime = 0;
    }

    update() {
        if(this.state === 'DEAD') return;
        const Engine = getEngine();
        
        if(Engine.cutscene.active) return;

        // Physics
        this.vel.y += CFG.GRAVITY;
        this.pos = this.pos.add(this.vel);
        if(this.pos.y > CFG.GROUND) { this.pos.y = CFG.GROUND; this.vel.y = 0; }
        this.vel.x *= CFG.FRICTION; this.vel.z *= CFG.FRICTION;


        // Domain Drain
        if(Engine.domain.active && Engine.domain.owner === this) {
            this.domainGauge -= 0.1;
            if(this.domainGauge <= 0) { 
                Engine.domain.active = false; 
                this.domainGauge = 0; 
                Engine.spawnParticle(this.pos, '#fff', 'text', 'DOMAIN END'); 
            }
        }

        // Combo Reset
        if(this.comboTimer > 0) {
            this.comboTimer--;
            if(this.comboTimer === 0) this.comboIndex = 0;
        }

        // Recovery
        if(this.recoveryTime > 0) {
            this.recoveryTime--;
            if(this.recoveryTime === 0) this.state = 'IDLE';
            return; 
        }

         // --- GOJO SPECIFIC: INFINITY RUSH (Skill 4) ---
        if(this.state === 'RUSHING') {
            this.vel.x = this.facing * 30; // High speed dash
            const t = Engine.fighters.find(f => f !== this);
            if(t && this.pos.dist(t.pos) < 60) {
                // Hit confirm
                this.state = 'ATTACK';
                this.vel.x = 0;
                this.performGojoCombo(t, Engine);
            } else if (Math.abs(this.pos.x) > 1500) {
                this.state = 'IDLE'; // Missed
            }
            return;
        }

        if(this.state === 'CHARGING_PB') {
            this.chargeTimer++;
            // Visual: Convergence Orb
            if(this.chargeTimer % 5 === 0) Engine.spawnParticle(this.pos.add(new Vec3(this.facing*20, -40, 0)), '#b91c1c', 'blood');
            
            // Fire after 1 second (60 frames)
            if(this.chargeTimer >= 60) { 
                this.firePiercingBlood();
            }
            return; // Lock movement
        }

         // YUJI BLACK FLASH TIMING
         if(this.waitingForTiming) {
            this.bfWindow++;
            if(this.bfWindow > 40) { // Extended window
                this.waitingForTiming = false; this.bfWindow = 0; this.bfChain = 0;
                if(this.isPlayer) Engine.spawnParticle(this.pos, '#888', 'text', 'CHAIN BROKEN');
            }
        }

        // MANJI KICK
        if(this.state === 'COUNTER_STANCE') {
            this.manjiCounterWindow--;
            if(this.manjiCounterWindow <= 0) { this.state = 'IDLE'; Engine.spawnParticle(this.pos, '#888', 'text', 'FAILED'); }
            return; 
        }

        this.checkEnv(Engine); 
        this.updateCD(Engine);
        
        // Input / AI
        if(this.state !== 'STUN' && this.state !== 'ATTACK' && this.state !== 'CHARGING_P' && this.state !== 'RUSHING' && this.state !== 'CHARGING_PB' && this.state !== 'COUNTER_STANCE') {
            if(this.isPlayer) this.handleInput(Engine); 
            else this.handleAI(Engine);
        }

        this.handleSustain(Engine);
    }

    performGojoCombo(target, Engine) {
        Engine.screenShake = 5;
        Engine.spawnParticle(target.pos, '#fff', 'burst');
        
        let hits = 0;
        const iv = setInterval(() => {
            hits++;
            // Flurry hits
            Engine.spawnParticle(target.pos.add(new Vec3((Math.random()-0.5)*50, (Math.random()-0.5)*50, 0)), '#00ccff', 'spark');
            target.takeDamage(10, this); 
            
            if(hits >= 5) {
                clearInterval(iv);
                // FINISHER: BLACK FLASH
                Engine.spawnLightning(target.pos, '#000');
                Engine.spawnLightning(target.pos, '#b91c1c');
                Engine.screenShake = 30;
                
                Engine.spawnParticle(target.pos.add(new Vec3(0,-50,0)), '#000', 'bf_impact');
                
                target.takeDamage(60, this);
                target.vel.x = this.facing * 30; 
                target.vel.y = -10;
                
                // Screen Invert for impact
                const cvs = document.getElementById('gameCanvas'); 
                if(cvs) { cvs.style.filter = 'invert(1)'; setTimeout(() => cvs.style.filter = 'none', 100); }

                Engine.spawnParticle(target.pos, '#000', 'text', 'BLACK FLASH');
                this.state = 'IDLE';
            }
        }, 50);
    }

    firePiercingBlood() {
        const Engine = getEngine();
        this.state = 'ATTACK'; 
        this.chargeTimer = 0;
        
        Engine.spawnParticle(this.pos.add(new Vec3(this.facing*30, -40, 0)), '#fff', 'burst');
        
        Engine.projectiles.push(new Projectile(
            this.pos.x + (this.facing * 20), 
            this.pos.y - 40, 
            this.pos.z, 
            this.facing, 
            this, 
            'PB_ARROW'
        ));
        
        Engine.screenShake = 20;
        Engine.spawnParticle(this.pos, '#b91c1c', 'text', 'PIERCING BLOOD');
        
        setTimeout(() => { if(this.state === 'ATTACK') this.state = 'IDLE'; }, 300);
    }

    checkEnv(Engine) {
        Engine.obstacles.forEach(obs => {
            if(!obs.solid || obs.hp <= 0) return;
            const xd = Math.abs(this.pos.x - obs.pos.x); const zd = Math.abs(this.pos.z - obs.pos.z);
            if(xd < (obs.w/2 + 20) && zd < (obs.d/2 + 20) && this.pos.y > obs.pos.y - obs.h) {
                if(xd > zd) this.pos.x = obs.pos.x + (this.pos.x > obs.pos.x ? 1 : -1) * (obs.w/2 + 20);
                else this.pos.z = obs.pos.z + (this.pos.z > obs.pos.z ? 1 : -1) * (obs.d/2 + 20);
            }
        });
    }

    updateCD(Engine) {
        for(let k in this.cds) if(this.cds[k] > 0) this.cds[k]--;
        if(this.state === 'STUN' && this.cds.global <= 0) this.state = 'IDLE';
        if(this.burnout > 0) { 
            this.burnout--; 
            if(this.burnout === 0) Engine.spawnParticle(this.pos, '#fff', 'text', 'RECOVERED'); 
        } else if (this.state !== 'CHARGE' && this.state !== 'HEAL' && this.fatigue > 0) {
            this.fatigue -= 0.3;
        }
    }

    handleSustain(Engine) {
        if(this.burnout > 0 && (this.state === 'CHARGE' || this.state === 'HEAL')) { this.state = 'IDLE'; return; }
        if(this.state === 'CHARGE' && this.ce < this.maxCe) { this.fatigue += 2.5; this.ce += 6; Engine.spawnParticle(this.pos, this.skin.aura, 'aura'); }
        if(this.state === 'HEAL' && this.ce > 4 && this.hp < this.maxHp) { this.fatigue += 3.5; this.ce -= 4; this.hp += 3; Engine.spawnParticle(this.pos, '#fff', 'steam'); }
        if(this.fatigue >= this.maxFatigue) { this.state = 'IDLE'; this.burnout = 300; this.fatigue = 0; Engine.spawnParticle(this.pos.add(new Vec3(0,-50,0)), '#888', 'text', 'BURNOUT!'); }
    }

    handleInput(Engine) {
        const k = Engine.keys;
        if(this.state === 'STUN') {
            if(k['l'] && this.ce >= 30) { 
                this.ce -= 30; this.state = 'IDLE'; this.dodge(Engine); Engine.spawnParticle(this.pos, '#fff', 'text', 'ESCAPE!');
            }
            return;
        }

        if(this.state === 'ATTACK') return;

        if(k['g']) {
            if(this.domainGauge >= 100 && !Engine.domain.active) {
                Engine.triggerDomain(this);
                return;
            }
        }

        let mv = false;
        if(k['w']) { this.vel.z = 7; mv=true; }
        if(k['s']) { this.vel.z = -7; mv=true; }
        if(k['a']) { this.vel.x = -7; this.facing = -1; mv=true; }
        if(k['d']) { this.vel.x = 7; this.facing = 1; mv=true; }
        if(k[' '] && this.pos.y >= CFG.GROUND) this.vel.y = -18;

        if(mv && this.state !== 'RUN') this.state = 'RUN';
        if(!mv && ['RUN', 'IDLE', 'CHARGE', 'HEAL'].includes(this.state)) this.state = 'IDLE';

        if(k['c']) this.state = 'CHARGE'; 
        else if(k['h']) this.state = 'HEAL';
        
        else if(k['j']) this.performCombo('LIGHT', Engine); 
        else if(k['k']) this.performCombo('HEAVY', Engine); 
        
        else if(k['l']) this.dodge(Engine);
        else if(k['u']) this.useSkill(1); 
        else if(k['i']) this.useSkill(2); 
        else if(k['o']) this.useSkill(3); 
        else if(k['p']) this.useSkill(4);
    }

    performCombo(type, Engine) {
        if(this.cds.global > 0) return;
        if(type === 'LIGHT') {
            this.comboIndex++;
            if(this.comboIndex > 3) this.comboIndex = 1;
        } else {
            this.comboIndex = 4; 
        }
        this.comboTimer = 60; 
        this.state = 'ATTACK';
        this.cds.global = 20; 
        
        let lunge = 10;
        let visualText = '';
        
        if(this.comboIndex === 1) { lunge = 10; visualText = 'JAB'; }
        if(this.comboIndex === 2) { lunge = 15; visualText = 'KICK'; }
        if(this.comboIndex === 3) { lunge = 25; visualText = 'SMASH'; } 
        if(this.comboIndex === 4) { lunge = 5; visualText = 'HEAVY'; }

        this.vel.x = this.facing * lunge;
        Engine.spawnParticle(this.pos.add(new Vec3(0,-50,0)), '#fff', 'text', visualText);

        setTimeout(() => {
            const range = (this.comboIndex === 3) ? 90 : 70;
            const dmg = (this.comboIndex * 10) + 10; 
            
            let hit = false;
            
            Engine.obstacles.forEach(obs => { 
                if(obs.hp > 0 && this.pos.dist(obs.pos) < range + obs.w/2) {
                    obs.takeDamage(dmg); 
                    hit = true;
                }
            });

            const t = Engine.fighters.find(f => f !== this);
            if(t && this.pos.dist(t.pos) < range && Math.abs(this.pos.z - t.pos.z) < 50) {
                t.takeDamage(dmg, this);
                
            // NEW: Increase Black Flash Chance on hit
                if(this.name === "Yuji Itadori") {
                    this.bfChance = Math.min(99, this.bfChance + 0.5); // Harder to build (+0.5% per hit)
                    
                    // Update UI
                    const el = document.getElementById('bf-percent');
                    if(el) {
                        el.innerText = Math.floor(this.bfChance) + "%";
                        el.style.color = this.bfChance > 50 ? '#ff0055' : '#fff';
                    }
                }
                
                this.ce = Math.min(this.maxCe, this.ce + 10);
                this.ce = Math.min(this.maxCe, this.ce + 10);
                this.domainGauge = Math.min(100, this.domainGauge + 2);
                hit = true;
                if(this.comboIndex === 3) {
                    t.vel.x = this.facing * 20;
                    t.vel.y = -10;
                    Engine.spawnParticle(t.pos, '#fff', 'burst');
                    Engine.screenShake = 10;
                }
            }

            if(!hit) {
                this.recoveryTime = 30; 
                Engine.spawnParticle(this.pos, '#555', 'text', 'MISS');
            }

            setTimeout(() => { 
                if(this.state==='ATTACK') this.state = 'IDLE'; 
            }, 100);
        }, 120); 
    }

    handleAI(Engine) {
        const t = Engine.fighters.find(f => f !== this);
        if(!t) return;
        const dist = this.pos.dist(t.pos);
        if(this.aiActionLock > 0) { this.aiActionLock--; if(dist < 100) { this.aiActionLock = 0; this.state = 'IDLE'; } return; }
        
        this.aiTimer = (this.aiTimer || 0) + 1;
        if(this.aiTimer > 8) {
            this.aiTimer = 0;
            if(Math.abs(t.pos.z - this.pos.z) > 30) {
                this.vel.z = (t.pos.z > this.pos.z ? 1 : -1) * 7;
                this.vel.x = (t.pos.x > this.pos.x ? 1 : -1) * 2; 
                this.facing = t.pos.x > this.pos.x ? 1 : -1;
                this.state = 'RUN'; return;
            }
            if(dist < 80) { this.performCombo('LIGHT', Engine); }
            else if(dist < 450) { 
                this.vel.x = (t.pos.x - this.pos.x > 0 ? 1 : -1) * 8; 
                this.state = 'RUN'; 
                if(Math.random()<0.1) this.useSkill(2); 
            }
            else { 
                this.vel.x = (t.pos.x - this.pos.x > 0 ? 1 : -1) * 8; 
                this.state = 'RUN'; 
                if(this.ce>500 && Math.random()<0.05) this.useSkill(3); 
            }
        }
    }

    useSkill(slot) {
        const Engine = getEngine();
        if(this.name === "Yuji Itadori" && handleYujiSkill(this, slot)) return;
        if(this.name === "Satoru Gojo" && handleGojoSkill(this, slot)) return;

        const cdKey = slot===1?'s1':slot===2?'s2':slot===3?'ult':'p';
        const cost = (slot===1?30:slot===2?50:200);
        if(this.cds[cdKey] > 0 || this.ce < cost) return;
        
        this.ce -= cost; this.cds[cdKey] = this.maxCds[cdKey]; this.state = 'ATTACK';
        if (slot === 3) {
            if(this.domainGauge >= 100 && !Engine.domain.active) Engine.triggerDomain(this);
            else if(this.isPlayer) Engine.spawnParticle(this.pos, '#888', 'text', 'NOT READY');
        } else {
            Engine.spawnParticle(this.pos, this.skin.aura, 'text', this.def.moves[slot-1]);
            Engine.screenShake = 10; this.attack('HEAVY'); Engine.spawnParticle(this.pos.add(new Vec3(this.facing*50, -50, 0)), this.skin.aura, 'burst');
        }
        setTimeout(() => { this.state = 'IDLE'; }, 500);
    }

    attack(type) { this.performCombo(type, getEngine()); }
    dodge(Engine) {
        if(!Engine) Engine = getEngine();
        if(this.ce < 15) return; this.ce -= 15; this.vel.x = this.facing * 25; this.vel.y = -5; this.state = 'IDLE';
        Engine.spawnParticle(this.pos.add(new Vec3(0,-80,0)), '#fff', 'text', 'DODGE');
    }

    takeDamage(dmg, attacker) {
        const Engine = getEngine();
        
        if(this.state === 'COUNTER_STANCE') {
            this.state = 'ATTACK';
            this.manjiCounterWindow = 0;
            this.pos.x = attacker.pos.x - (attacker.facing * 50);
            this.pos.y = attacker.pos.y - 10;
            this.facing = attacker.facing; 
            this.vel.y = -15;
            Engine.spawnParticle(this.pos, '#fff', 'text', 'MANJI KICK');
            Engine.screenShake = 20;
            attacker.takeDamage(80, this);
            attacker.vel.y = -20; 
            setTimeout(() => { 
                if(this.state === 'ATTACK') this.state = 'IDLE'; 
            }, 600); 
            return;
        }

        if(this.state === 'DODGE') return;
        if(this.name === "Satoru Gojo" && Math.random() < 0.15 && this.ce > 100) { Engine.spawnParticle(this.pos, '#00ccff', 'text', 'INFINITY'); return; }
        
        this.hp -= dmg; this.state = 'STUN'; this.aiActionLock = 0; this.cds.global = 20;
        this.vel.x = attacker.facing * 8; this.vel.y = -3; Engine.screenShake = 5;
        Engine.spawnParticle(this.pos.add(new Vec3(0,-50,0)), '#f00', 'blood');
        this.domainGauge = Math.min(100, this.domainGauge + 5);
        if(this.hp <= 0) this.die();
    }

    die() {
        const Engine = getEngine();
        this.state = 'DEAD'; Engine.spawnParticle(this.pos.add(new Vec3(0,-100,0)), '#f00', 'text', 'ELIMINATED');
        setTimeout(() => document.getElementById('win-screen').style.display = 'flex', 3000);
    }
}