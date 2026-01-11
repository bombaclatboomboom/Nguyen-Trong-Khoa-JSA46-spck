export const SKINS = {
    yuji:     { color: '#ff0055', aura: '#b91c1c', eye: '#ff0055', gradient: 'linear-gradient(to bottom, #ffcccc, #111, #b91c1c)' },
    gojo:     { color: '#00ccff', aura: '#3388ff', eye: '#3388ff', gradient: 'linear-gradient(to bottom, #fff, #111, #3388ff)' },
    megumi:   { color: '#55dd55', aura: '#15803d', eye: '#55dd55', gradient: 'linear-gradient(to bottom, #111, #15803d, #000)' },
    yuta:     { color: '#ffffff', aura: '#ffccff', eye: '#444',    gradient: 'linear-gradient(to bottom, #fff, #ddd, #111)' },
    hakari:   { color: '#aaff00', aura: '#aaff00', eye: '#aaff00', gradient: 'linear-gradient(to bottom, #443300, #aaff00, #443300)' },
    sukuna:   { color: '#ff0000', aura: '#ff0000', eye: '#ff0000', gradient: 'linear-gradient(to bottom, #ffaaaa, #111, #ff0000)' },
    toji:     { color: '#333333', aura: '#000000', eye: '#22c55e', gradient: 'linear-gradient(to bottom, #333, #000, #111)' },
    kashimo:  { color: '#00ffff', aura: '#00ffff', eye: '#00ffff', gradient: 'linear-gradient(to bottom, #fff, #00ffff, #111)' },
    mahito:   { color: '#888888', aura: '#6666ff', eye: '#ccc',    gradient: 'linear-gradient(to bottom, #ccc, #6666ff, #111)' },
    mahoraga: { color: '#d4af37', aura: '#d4af37', eye: '#fff',    gradient: 'linear-gradient(to bottom, #fff, #d4af37, #555)' }
};

export const CHAR_DEFS = {
    yuji: { 
        name: "Yuji Itadori", hp: 1600, ce: 800, skin: SKINS.yuji, 
        moves: ['Divergent/Black Flash', 'Piercing Blood', 'Dismantle', 'Manji Kick'], 
        domainName: "SOUL STATION",
        cds: [20, 150, 60, 100], 
        desc: "A lean and muscular vessel. Uses martial arts and Black Flash. Wears the modified high uniform with a red hood."
    },
    gojo: { 
        name: "Satoru Gojo", hp: 1300, ce: 9999, skin: SKINS.gojo, 
        moves: ['Lapse: Blue', 'Reversal: Red', 'Hollow Purple', 'Infinity Rush'], 
        domainName: "UNLIMITED VOID",
        cds: [100, 150, 800, 300],
        desc: "The strongest. Manipulates space at the atomic level. Domain overloads the target's mind."
    },
    megumi: { name: "Megumi Fushiguro", hp: 1400, ce: 1200, skin: SKINS.megumi, moves: ['Divine Dog', 'Nue', 'Chimera Shadow Garden', 'Mahoraga Summon'], domainName: "CHIMERA SHADOW GARDEN", cds: [50, 80, 1100, 2000], desc: "Spiky black hair, green eyes. Uses Ten Shadows Technique. Wears standard uniform." },
    yuta: { name: "Yuta Okkotsu", hp: 1300, ce: 2000, skin: SKINS.yuta, moves: ['Rika Manifest', 'Cursed Speech', 'True Love', 'Copy'], domainName: "TRUE MUTUAL LOVE", cds: [200, 150, 900, 600], desc: "Disheveled black hair, dark circles. Wears a white uniform jacket and carries a katana." },
    hakari: { name: "Kinji Hakari", hp: 1400, ce: 800, skin: SKINS.hakari, moves: ['Train Doors', 'Jackpot', 'Idle Death Gamble', 'Fever'], domainName: "IDLE DEATH GAMBLE", cds: [80, 100, 800, 600], desc: "Tall, muscular, rough aura. Blonde hair (dyed). Uses a pachinko-themed domain." },
    sukuna: { name: "Ryomen Sukuna", hp: 1800, ce: 1800, skin: SKINS.sukuna, moves: ['Dismantle', 'Cleave', 'Malevolent Shrine', 'World Slash'], domainName: "MALEVOLENT SHRINE", cds: [80, 120, 1000, 1500], desc: "King of Curses. Four arms, four eyes, tattoos. Ruthless and overwhelmingly powerful." },
    toji: { name: "Toji Fushiguro", hp: 1500, ce: 0, skin: SKINS.toji, moves: ['Inverted Spear', 'Chain of Thousand Miles', 'Heavenly Restriction', 'Playful Cloud'], domainName: "NONE", cds: [40, 60, 999, 100], desc: "Sorcerer Killer. Muscular, scar on lip, tight black outfit. Zero Cursed Energy, max physicals." },
    kashimo: { name: "Hajime Kashimo", hp: 1200, ce: 1000, skin: SKINS.kashimo, moves: ['Lightning Bolt', 'Staff Charge', 'Mythical Beast Amber', 'Discharge'], domainName: "NONE", cds: [100, 80, 9999, 150], desc: "God of Lightning. Cyan hair, bandage-wrapped arms. seeks the strongest." },
    mahito: { name: "Mahito", hp: 1400, ce: 1200, skin: SKINS.mahito, moves: ['Idle Transfiguration', 'Soul Multiplicity', 'Self-Embodiment of Perfection', 'Instant Spirit Body'], domainName: "SELF-EMBODIMENT OF PERFECTION", cds: [60, 100, 1100, 800], desc: "Patchwork face, grey-blue hair, heterochromia. A human-looking curse born from hatred." },
    mahoraga: { name: "Mahoraga", hp: 2500, ce: 500, skin: SKINS.mahoraga, moves: ['Sword of Extermination', 'Adaptation', 'Wheel Spin', 'World Slash'], domainName: "NONE", cds: [120, 400, 100, 1200], desc: "Eight-Handled Sword Divergent Sila Divine General. Giant figure with a wheel and wings." }
};