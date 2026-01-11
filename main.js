import { UI } from './ui.js';
import { Engine } from './engine.js';

window.UI = UI;
window.Engine = Engine;

window.addEventListener('DOMContentLoaded', () => {
    // Start Engine (Draws the map/intro screen)
    Engine.init();
    // Play the Boot Text Sequence
    playBootSequence();
});

function playBootSequence() {
    const t1 = document.getElementById('boot-t1');
    const t2 = document.getElementById('boot-t2');
    const t3 = document.getElementById('boot-t3');
    const line = document.querySelector('.boot-line');
    const bg1 = document.getElementById('bg-sukuna');
    const bg2 = document.getElementById('bg-gojo');
    
    const menu = document.getElementById('main-menu');
    const boot = document.getElementById('boot-sequence');

    // Safety check: If elements missing, force menu immediately
    if(!t1 || !menu || !boot) {
        if(boot) boot.style.display = 'none';
        if(menu) {
            menu.style.display = 'flex';
            menu.style.opacity = 1;
        }
        return;
    }

    // 1. CURSES (Sukuna)
    setTimeout(() => { 
        if(t1) t1.style.animation = 'flash-text 0.8s forwards'; 
        if(bg1) {
            bg1.style.opacity = '0.3'; 
            bg1.style.transform = 'translate(-50%, -50%) scale(1.1)';
        }
    }, 500);
    
    // 2. SORCERERS (Gojo)
    setTimeout(() => { 
        if(bg1) bg1.style.opacity = '0';
        if(t2) t2.style.animation = 'flash-text 0.8s forwards'; 
        if(bg2) bg2.style.opacity = '0.4';
    }, 1500);
    
    // 3. DEATH
    setTimeout(() => { 
        if(bg2) bg2.style.opacity = '0';
        if(t3) t3.style.animation = 'flash-text 1.0s forwards'; 
    }, 2500);
    
    // 4. Line Slash
    setTimeout(() => { 
        if(line) line.style.animation = 'line-expand 0.5s forwards'; 
    }, 3500);

    // End & Show Menu
    setTimeout(() => {
        if(boot) boot.style.display = 'none';
        if(menu) {
            menu.style.display = 'flex'; // FORCE DISPLAY FLEX
            // Small delay to allow display change before opacity
            setTimeout(() => {
                menu.style.opacity = 1;
            }, 50);
        }
    }, 4000);
}