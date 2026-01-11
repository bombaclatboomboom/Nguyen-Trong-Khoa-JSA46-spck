import { CHAR_DEFS } from './data.js';

export const UI = {
    p1: null, p2: null,
    selectStage: 0, 
    selectedP1: null,
    selectedP2: null,

    initHUD() {
        this.p1 = window.Engine.fighters[0]; this.p2 = window.Engine.fighters[1];
        if(!this.p1 || !this.p2) return;
        document.getElementById('p1-name').innerText = this.p1.name.toUpperCase();
        document.getElementById('p2-name').innerText = this.p2.name.toUpperCase();
        document.getElementById('name-u').innerText = this.p1.def.moves[0];
        document.getElementById('name-i').innerText = this.p1.def.moves[1];
        document.getElementById('name-o').innerText = this.p1.def.moves[2];
        if(this.p1.def.moves[3]) document.getElementById('name-p').innerText = this.p1.def.moves[3];
        document.getElementById('hud-p1').style.borderColor = this.p1.skin.aura;
    },

    update() {
        if(!this.p1) return;
        const set = (id, v, m) => document.getElementById(id).style.width = (v/m*100)+'%';
        set('p1-hp', this.p1.hp, this.p1.maxHp); set('p1-ce', this.p1.ce, this.p1.maxCe);
        set('p2-hp', this.p2.hp, this.p2.maxHp); set('p2-ce', this.p2.ce, this.p2.maxCe);
        document.getElementById('p1-fatigue').style.width = (this.p1.fatigue/this.p1.maxFatigue*100) + '%';
        const cd = (id, k) => document.getElementById(id).style.height = (this.p1.cds[k]>0?100:0)+'%';
        cd('cd-u', 's1'); cd('cd-i', 's2'); cd('cd-o', 'ult'); cd('cd-p', 'p');
        document.getElementById('p1-domain').style.width = this.p1.domainGauge + '%';
        document.getElementById('p2-domain').style.width = this.p2.domainGauge + '%';
    },

    toSelect() { 
        document.getElementById('main-menu').style.display = 'none'; 
        document.getElementById('char-select').style.display = 'flex';
        this.renderGrid();
        this.selectStage = 0;
        this.resetPanels();
    },

    resetPanels() {
        document.getElementById('p1-sel-name').innerText = "PLAYER 1";
        document.getElementById('p2-sel-name').innerText = "OPPONENT";
        document.getElementById('p1-desc').innerText = "Select Character...";
        document.getElementById('p2-desc').innerText = "Waiting...";
        document.getElementById('p1-card').classList.add('p1-active');
        document.getElementById('p2-card').classList.remove('p2-active');
        document.getElementById('p1-model').style.background = '#111';
        document.getElementById('p2-model').style.background = '#111';
    },

    renderGrid() {
        const grid = document.getElementById('roster-grid');
        grid.innerHTML = '';
        Object.keys(CHAR_DEFS).forEach(key => {
            const def = CHAR_DEFS[key];
            const slot = document.createElement('div');
            slot.className = 'char-slot';
            slot.style.borderBottom = `4px solid ${def.skin.aura}`;
            slot.innerHTML = `
                <span class="slot-initial">${def.name.charAt(0)}</span>
                <div class="slot-name-hover">${def.name.split(' ')[0]}</div>
            `;
            slot.onmouseenter = () => this.onHover(key);
            slot.onclick = () => this.onPick(key);
            grid.appendChild(slot);
        });
    },

    onHover(key) {
        const def = CHAR_DEFS[key];
        const targetModel = this.selectStage === 0 ? 'p1-model' : 'p2-model';
        const targetName = this.selectStage === 0 ? 'p1-sel-name' : 'p2-sel-name';
        const targetDesc = this.selectStage === 0 ? 'p1-desc' : 'p2-desc';
        const elModel = document.getElementById(targetModel);
        elModel.style.background = def.skin.gradient;
        elModel.style.filter = 'grayscale(0) brightness(1)';
        elModel.style.boxShadow = `inset 0 0 50px ${def.skin.aura}`;
        const elName = document.getElementById(targetName);
        elName.innerText = def.name.toUpperCase();
        elName.style.color = def.skin.aura;
        document.getElementById(targetDesc).innerText = def.desc;
    },

    onPick(key) {
        const def = CHAR_DEFS[key];
        if(this.selectStage === 0) {
            this.selectedP1 = key;

            const bfUi = document.getElementById('bf-chance');
            if(key === 'yuji') bfUi.style.display = 'block';
            else bfUi.style.display = 'none';
            this.selectStage = 1;
            
            document.getElementById('select-instruction').innerText = "PLAYER 2: SELECT OPPONENT";
            document.getElementById('p1-card').classList.remove('p1-active');
            document.getElementById('p2-card').classList.add('p2-active');
            document.getElementById('p1-model').style.filter = 'grayscale(0.5)';
        } else {
            this.selectedP2 = key;
            document.getElementById('char-select').style.display = 'none';
            this.playCurtainTransition();
        }
    },

    playCurtainTransition() {
        const layer = document.getElementById('curtain-layer');
        layer.style.display = 'block';
        setTimeout(() => layer.classList.add('anim-drop'), 50);
        setTimeout(() => layer.classList.add('anim-flash'), 600);
        setTimeout(() => {
            document.getElementById('c-text').innerText = "INCIDENT: SHINJUKU";
            layer.classList.add('anim-show-text');
        }, 800);
        setTimeout(() => {
            window.Engine.start(this.selectedP1, this.selectedP2);
            layer.style.opacity = 0;
            setTimeout(() => {
                layer.style.display = 'none';
                layer.className = ''; 
                layer.style.opacity = 1;
            }, 1000);
        }, 2200);
    },

     toggleTutorial() {
        const modal = document.getElementById('tutorial-modal');
        if(modal.style.display === 'flex') {
            modal.style.display = 'none';
        } else {
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
        }
    },

    playIntro(charDef) {
        const intro = document.getElementById('intro-layer');
        const name = document.getElementById('intro-name');
        const face = document.getElementById('intro-face');
        
        face.className = 'vis-head'; 
        face.innerHTML = ''; 

        let charKey = 'yuji';
        for(let k in CHAR_DEFS) {
            if(CHAR_DEFS[k].name === charDef.name) charKey = k;
        }

        face.classList.add(`vis-${charKey}`);

        if(charKey !== 'gojo') {
            const eyes = document.createElement('div');
            eyes.className = 'vis-eyes';
            eyes.innerHTML = '<div class="vis-eye"></div><div class="vis-eye"></div>';
            face.appendChild(eyes);
        }

        name.innerText = charDef.name;
        name.style.textShadow = `4px 4px 0 ${charDef.skin.aura}`;
        face.style.boxShadow = `0 0 50px ${charDef.skin.aura}`;

        intro.style.display = 'flex';
        setTimeout(() => { intro.style.display = 'none'; }, 2500);
    }
};