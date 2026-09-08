let canvas, ctx;
let DEATHS_EL, TIMER_EL, STRAWBERRIES_EL, ROOM_NAME_EL, DASHES_EL;

const GRAVITY = 900;
const JUMP_FORCE = -280;
const DASH_SPEED = 320;
const DASH_TIME = 0.15;
const DASH_COOLDOWN = 0.1;
const MOVE_SPEED = 90;
const AIR_ACCEL = 600;
const GROUND_ACCEL = 1200;
const MAX_FALL_SPEED = 500;
const WALL_SLIDE_SPEED = 60;
const WALL_JUMP_FORCE_X = 160;
const WALL_JUMP_FORCE_Y = -220;
const COYOTE_TIME = 0.08;
const JUMP_BUFFER_TIME = 0.1;
const DASH_REFRESH_ON_GROUND = true;
const DASH_REFRESH_ON_WALL = true;
const CLIMB_SPEED = 60;
const CLIMB_JUMP_FORCE = -200;
const CLIMB_JUMP_FORCE_X = 120;
const SUPER_JUMP_FORCE = -520;
const SUPER_DASH_SPEED = 400;
const BUBBLE_BOOST = -320;
const FEATHER_GRAVITY = 200;
const FEATHER_JUMP = -180;
const FEATHER_DURATION = 3;
const FEATHER_GLIDE_RISE = -70;
const FEATHER_MASTER_SECONDS = 10;
const ICE_FRICTION = 2;
const SEEKER_SPEED = 120;
const BADELINE_SPEED = 110;

const TILE_SIZE = 8;
const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 180;

let cameraX = 0, cameraY = 0;
let deaths = 0;
let gameTime = 0;
let totalStrawberries = 0;
let collectedStrawberries = 0;
let isPlaying = true;
let isPaused = false;
let pauseSelection = 0;
const PAUSE_CHOICES = [
    { label: 'Resume', hint: 'ESC', act: 'resume' },
    { label: 'Restart Room', hint: 'R', act: 'restart' },
    { label: 'Achievements', hint: 'A', act: 'achievements' },
    { label: 'Options', hint: 'O', act: 'options' },
    { label: 'Quit to Menu', hint: 'Q', act: 'quit' },
];

function executePauseChoice(act) {
    playSound('menuSelect');
    switch (act) {
        case 'resume':
            isPaused = false;
            input.jumpPressed = false;
            input.dashPressed = false;
            input.enterPressed = false;
            player.jumpBufferTimer = 0;
            break;
        case 'restart':
            restartCurrentRoom();
            isPaused = false;
            break;
        case 'achievements':
            isPaused = false;
            returnToStateAfterOptions = 'playing';
            gameState = 'achievements';
            achievementScroll = 0;
            break;
        case 'options':
            isPaused = false;
            returnToStateAfterOptions = 'playing';
            gameState = 'options';
            menuSelection = 0;
            break;
        case 'quit':
            saveGame();
            isPaused = false;
            gameState = 'menu';
            menuSelection = 0;
            break;
    }
}
let currentRoom = 'prologue';
let roomTransition = null;
let screenShake = 0;
let lastDashTrailTime = 0;
let gameWon = false;
let goldenBerryFlash = 0;
let savedBerryIds = new Set();
let savedCassetteIds = new Set();
let savedRoom = 'prologue';
let savedSpawnX = null;
let savedSpawnY = null;
let requestedStartRoom = null;
let gameState = 'menu';
let menuSelection = 0;
let achievementScroll = 0;
let confirmResetProgress = false;
let savedGameTime = 0;

function hasSaveData() {
    try { return Boolean(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
}
function getMenuOptions() {
    const options = ['Start Game'];
    if (hasSaveData()) options.push('Continue');
    options.push('Chapter Select', 'Achievements', 'Options', 'Credits');
    return options;
}
let gameLoopStarted = false;
let touchControlsBound = false;
let browserChromeActive = null;
let returnToStateAfterOptions = null;

let chapterSelectIndex = 0;
let chapterSelectFocus = 'card';

let endingPhase = 0;
let endingTimer = 0;
let endingTextAlpha = 0;
const endingMessages = [
    { text: 'You found the crystal heart...', duration: 4 },
    { text: 'The mountain\'s power flows through you.', duration: 4 },
    { text: 'But the climb is never truly over.', duration: 4 },
    { text: 'There are always more mountains to climb.', duration: 4 },
    { text: 'Thank you for playing.', duration: 4 },
    { text: 'A Celeste-inspired browser game', duration: 3 },
    { text: 'Inspired by Maddy Makes Games', duration: 3 },
    { text: 'Original music by Lena Raine', duration: 3 },
    { text: 'Built with HTML5 Canvas & Web Audio', duration: 3 },
];

const achievements = [
    { id: 'first_death', name: 'Welcome to Celeste', desc: 'Die for the first time', icon: '💀' },
    { id: 'first_strawberry', name: 'Sweet Start', desc: 'Collect your first strawberry', icon: '🍓' },
    { id: 'first_dash', name: 'Dash Master', desc: 'Perform your first dash', icon: '💨' },
    { id: 'first_wall_jump', name: 'Wall Kicker', desc: 'Wall jump for the first time', icon: '🦵' },
    { id: 'first_feather', name: 'Light as a Feather', desc: 'Find the feather', icon: '🪶' },
    { id: 'first_cassette', name: 'Mixtape', desc: 'Find a cassette tape', icon: '📼' },
    { id: 'first_heart', name: 'Heart of the Mountain', desc: 'Find the crystal heart', icon: '💎' },
    { id: 'speedrunner', name: 'Speedrunner', desc: 'Complete a chapter under par time', icon: '⏱️' },
    { id: 'golden_berry', name: 'Golden Touch', desc: 'Collect a golden strawberry without dying', icon: '⭐' },
    { id: 'completionist', name: 'Completionist', desc: 'Collect all strawberries in a chapter', icon: '✅' },
    { id: 'deathless', name: 'True Survivor', desc: 'Complete a chapter without dying', icon: '🛡️' },
    { id: 'cassette_collector', name: 'Tape Collector', desc: 'Find all cassette tapes', icon: '📼' },
    { id: 'feather_master', name: 'Feather Master', desc: 'Glide for 10 seconds total', icon: '🪶' },
    { id: 'strawberry_queen', name: 'Strawberry Queen', desc: 'Collect 10 strawberries', icon: '👑' },
    { id: 'explorer', name: 'Explorer', desc: 'Visit every chapter', icon: '🗺️' },
    { id: 'wind_rider', name: 'Wind Rider', desc: 'Ride the wind in Farewell', icon: '💨' },
    { id: 'nightmare', name: 'Nightmare', desc: 'Complete a C-Side chapter', icon: '🌙' },
    { id: 'true_ending', name: 'True Ending', desc: 'Find the heart in Farewell', icon: '💫' },
];

const unlockedAchievements = new Set();

const accessibility = {
    highContrast: false,
    reducedMotion: false,
    sfxEnabled: true,
    musicEnabled: true,
    showGhost: true
};

let tutorialState = 0;
let tutorialTimer = 0;
const tutorialMessages = [
    { text: 'Welcome to Celeste! Use WASD or Arrow Keys to move.', x: 160, y: 100 },
    { text: 'Press Z to jump. Use momentum to clear wider gaps.', x: 160, y: 100 },
    { text: 'Press X to dash in any direction.', x: 160, y: 100 },
    { text: 'You can dash once in the air. Land to recharge!', x: 160, y: 100 },
    { text: 'Hold C while touching a wall to climb. Let go to drop.', x: 160, y: 100 },
    { text: 'Collect a strawberry to continue. Then find the heart!', x: 160, y: 100 },
    { text: 'Press ESC to pause. R to respawn if stuck.', x: 160, y: 100 },
    { text: 'Good luck, Madeline!', x: 160, y: 100 }
];

const input = {
    left: false, right: false, up: false, down: false,
    jump: false, dash: false, climb: false,
    jumpPressed: false, dashPressed: false, climbPressed: false,
    tutorialSkipPressed: false,
    enterPressed: false,
    pausePressed: false,
    upPressed: false, downPressed: false,
    leftPressed: false, rightPressed: false,
    gamepadIndex: -1
};

// Held-state is tracked per source and merged each frame, so an idle
// gamepad can never clobber keyboard/touch input.
const manualInput = {
    left: false, right: false, up: false, down: false,
    jump: false, dash: false, climb: false
};
const padInput = {
    left: false, right: false, up: false, down: false,
    jump: false, dash: false, climb: false
};
const padPrev = { jump: false, dash: false, up: false, down: false, left: false, right: false, pause: false };

const player = {
    x: 160, y: 160,
    vx: 0, vy: 0,
    w: 6, h: 10,
    onGround: false,
    onWall: false,
    wallDir: 0,
    facing: 1,
    dashes: 1,
    maxDashes: 1,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0, dashDirY: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    varJumpTimer: 0,
    wallLockoutTimer: 0,
    wallLockDir: 0,
    hairFrame: 0,
    hairTimer: 0,
    spriteFrame: 0,
    spriteTimer: 0,
    state: 'idle',
    justRespawned: false,
    spawnX: 160, spawnY: 160,
    climbing: false,
    climbTimer: 0,
    stamina: 100,
    maxStamina: 100,
    hasDash: true,
    bestChapters: {},
    color: '#47b9b2',
    hairColor: '#d93659',
    skinColor: '#f6c6a8',
    invincible: false,
    invincibleTimer: 0,
    squash: 1,
    stretch: 1,
    onIce: false,
    inBubble: false,
    bubble: null,
    hasFeather: false,
    featherTimer: 0,
    featherGlideTotal: 0,
    dashRefillTimer: 0,
    cassette: false,
    heartGem: false,
    cassettes: 0,
    goldenBerries: 0,
    goldenBerryRun: true,
    wasLanding: false,
    landingSpeed: 0,
    dying: false,
    deathTimer: 0,
    kevinFeedbackTimer: 0,
    ghostRecording: [],
    bestGhost: null,
    showGhost: false,
    hairNodes: []
};

const bubbles = [];
const kevinBlocks = [];
const cassetteBlocks = [];
const seekers = [];
const badelines = [];
const triggerSpikes = [];
const dashSwitches = [];
const shockwaves = [];
const shootingStars = [];
let nextShootingStarAt = 3;
let nextAmbientAt = 0;

const particles = [];
const dashAfterimages = [];
const rooms = {};
let currentRoomData = null;

const SAVE_KEY = 'celeste_browser_save';

const CHAPTERS = [
    { id: 'prologue', name: 'Prologue', rooms: ['prologue', 'prologue-ascent'], color: '#00d4ff' },
    { id: 'forsaken', name: 'Forsaken City', rooms: ['forsaken', 'forsaken-crossing', 'forsaken-underpass', 'forsaken-rooftops', 'forsaken-tower'], color: '#ff6644' },
    { id: 'forsaken-bside', name: 'Forsaken City B-Side', rooms: ['forsaken-bside', 'forsaken-bside2'], color: '#ff6644' },
    { id: 'old-site', name: 'Old Site', rooms: ['old-site', 'old-site-dream', 'old-site-depths', 'old-site-chase'], color: '#88cc44' },
    { id: 'old-site2', name: 'Old Site B-Side', rooms: ['old-site2', 'old-site-bside2'], color: '#88cc44' },
    { id: 'resort', name: 'Celestial Resort', rooms: ['resort', 'resort-lobby', 'resort2', 'resort-finale', 'resort-cellars'], color: '#ffcc00' },
    { id: 'resort-bside', name: 'Celestial Resort B-Side', rooms: ['resort-bside', 'resort-bside2'], color: '#ffcc00' },
    { id: 'mirror', name: 'Mirror Temple', rooms: ['mirror', 'mirror-depths', 'mirror-sanctum', 'mirror-temple'], color: '#ff44aa' },
    { id: 'mirror-bside', name: 'Mirror Temple B-Side', rooms: ['mirror-bside', 'mirror-bside2'], color: '#ff44aa' },
    { id: 'summit', name: 'The Summit', rooms: ['summit', 'summit-ridge', 'summit-gale', 'summit-aurora', 'summit-final'], color: '#ffffff' },
    { id: 'summit2', name: 'The Summit B-Side', rooms: ['summit2', 'summit3'], color: '#ffffff' },
    { id: 'core', name: 'Core', rooms: ['core', 'core-furnace', 'core-depths', 'core-escape'], color: '#ff0088' },
    { id: 'core2', name: 'Core B-Side', rooms: ['core2', 'core-bside2'], color: '#ff0088' },
    { id: 'farewell', name: 'Farewell', rooms: ['farewell', 'farewell-eventide', 'farewell-approach', 'farewell-final', 'summit-peak'], color: '#66ffdd' }
];

function chapterIdOfRoom(roomId) {
    const group = CHAPTERS.find(c => c.rooms.includes(roomId));
    return group ? group.id : null;
}

function getChapterProgress(chapterId) {
    const group = CHAPTERS.find(c => c.id === chapterId);
    if (!group) return null;
    let total = 0;
    let collected = 0;
    for (const rid of group.rooms) {
        const room = rooms[rid];
        if (!room) continue;
        total += room.strawberries.length;
        collected += room.strawberries.filter(b => b.collected).length;
    }
    return { collected, total };
}

// Chapter progression tracking for exploration/completion achievements.
const visitedChapters = new Set();
const chapterDeathBaselines = {};
const chapterStartTimes = {};

function handleRoomProgression(prevRoomId) {
    const curCh = chapterIdOfRoom(currentRoom);
    if (curCh && !visitedChapters.has(curCh)) {
        visitedChapters.add(curCh);
        chapterDeathBaselines[curCh] = deaths;
        chapterStartTimes[curCh] = gameTime;
    }

    const prevCh = chapterIdOfRoom(prevRoomId);
    if (rooms[prevRoomId] && rooms[prevRoomId].name.includes('C-Side')) unlockAchievement('nightmare');
    if (prevCh && prevCh !== curCh) {
        // Leaving a room from another chapter completes it: record the time.
        const group = CHAPTERS.find(c => c.id === prevCh);
        if (group) {
            const startedAt = chapterStartTimes[prevCh] || 0;
            const elapsed = gameTime - startedAt;
            if (!player.bestChapters[prevCh] || elapsed < player.bestChapters[prevCh]) {
                player.bestChapters[prevCh] = elapsed;
            }
            const par = group.rooms.length * 45 + 45;
            if (elapsed < par) unlockAchievement('speedrunner');
        }
        if (chapterDeathBaselines[prevCh] === deaths) unlockAchievement('deathless');
    }

    if (visitedChapters.size >= CHAPTERS.length) unlockAchievement('explorer');
}

function loadSave() {
    try {
        const save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
        deaths = save.deaths || 0;
        totalStrawberries = save.totalStrawberries || 0;
        collectedStrawberries = save.collectedStrawberries || 0;
        savedBerryIds = new Set(Array.isArray(save.collectedBerryIds) ? save.collectedBerryIds : []);
        savedCassetteIds = new Set(Array.isArray(save.collectedCassetteIds) ? save.collectedCassetteIds : []);
        savedRoom = save.currentRoom || 'prologue';
        savedSpawnX = Number.isFinite(save.spawnX) ? save.spawnX : null;
        savedSpawnY = Number.isFinite(save.spawnY) ? save.spawnY : null;
        player.goldenBerries = save.goldenBerries || 0;
        player.goldenBerryRun = save.goldenBerryRun !== false;
        player.bestChapters = (save.bestChapters && typeof save.bestChapters === 'object') ? save.bestChapters : {};
        if (Array.isArray(save.bestGhost) && save.bestGhost.length > 0) {
            player.bestGhost = save.bestGhost;
            player.showGhost = true;
        }
        if (Number.isFinite(save.gameTime) && save.gameTime > 0) {
            savedGameTime = save.gameTime;
        }
        if (Array.isArray(save.achievementIds)) {
            for (const id of save.achievementIds) unlockedAchievements.add(id);
        }
        accessibility.highContrast = save.highContrast || false;
        accessibility.reducedMotion = save.reducedMotion || false;
        accessibility.sfxEnabled = save.sfxEnabled !== false;
        accessibility.musicEnabled = save.musicEnabled !== false;
        accessibility.showGhost = save.showGhost !== false;
        DEATHS_EL.textContent = `Deaths: ${deaths}`;
    } catch (e) {}
}

function saveGame() {
    const save = {
        deaths,
        totalStrawberries,
        collectedStrawberries,
        gameTime,
        currentRoom,
        spawnX: player.spawnX,
        spawnY: player.spawnY,
        goldenBerries: player.goldenBerries,
        goldenBerryRun: player.goldenBerryRun,
        bestChapters: player.bestChapters,
        bestGhost: player.bestGhost,
        collectedBerryIds: Object.values(rooms).flatMap(room =>
            room.strawberries.filter(berry => berry.collected).map(berry => berry.id)
        ),
        collectedCassetteIds: Object.values(rooms)
            .filter(room => room.cassette?.collected)
            .map(room => room.cassette.id),
        achievementIds: [...unlockedAchievements]
    };
    save.highContrast = accessibility.highContrast;
    save.reducedMotion = accessibility.reducedMotion;
    save.sfxEnabled = accessibility.sfxEnabled;
    save.musicEnabled = accessibility.musicEnabled;
    save.showGhost = accessibility.showGhost;
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (e) {}
}


function initRooms() {
    createRoom('prologue', 'Prologue', 'mountain', { x: 160, y: 140 }, [
        { x: 40, y: 120, w: 48, h: 8 },
        { x: 120, y: 100, w: 32, h: 8 },
        { x: 200, y: 80, w: 40, h: 8 },
        { x: 280, y: 100, w: 32, h: 8 },
        { x: 60, y: 60, w: 24, h: 8 },
        { x: 160, y: 40, w: 32, h: 8 },
        { x: 240, y: 60, w: 24, h: 8 },
    ], [
        { x: 80, y: 152, dir: 'up' }, { x: 88, y: 152, dir: 'up' },
        { x: 160, y: 72, dir: 'up' }, { x: 168, y: 72, dir: 'up' },
        { x: 260, y: 92, dir: 'up' }, { x: 268, y: 92, dir: 'up' },
        { x: 50, y: 112, dir: 'up' }, { x: 58, y: 112, dir: 'up' },
        { x: 130, y: 92, dir: 'up' },
        { x: 210, y: 72, dir: 'up' }, { x: 218, y: 72, dir: 'up' },
    ], [
        { x: 100, y: 144, power: 1 },
        { x: 180, y: 60, power: 2 },
        { x: 260, y: 40, power: 1 },
    ], [
        { x: 300, y: 120, w: 24, h: 8, startX: 300, startY: 120, endX: 300, endY: 40, speed: 30, type: 'vertical' },
        { x: 80, y: 80, w: 32, h: 8, startX: 80, startY: 80, endX: 200, endY: 80, speed: 40, type: 'horizontal' },
    ], [
        { x: 50, y: 100, id: 'berry1' },
        { x: 140, y: 80, id: 'berry2' },
        { x: 220, y: 50, id: 'berry3' },
        { x: 300, y: 30, id: 'berry4' },
        { x: 160, y: 20, id: 'berry5', golden: true },
    ], [
        { x: 120, y: 60, w: 32, h: 8 },
    ], [
        { x: 160, y: 10, targetRoom: 'forsaken' },
    ], [], [], [], []
    );

    rooms['prologue'].cassette = { x: 50, y: 50, collected: false };
    rooms['prologue'].feather = { x: 160, y: 20, collected: false };

    createRoom('forsaken', 'Forsaken City', 'city', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 32, h: 8 },
        { x: 100, y: 100, w: 24, h: 8 },
        { x: 160, y: 80, w: 32, h: 8 },
        { x: 220, y: 60, w: 24, h: 8 },
        { x: 280, y: 80, w: 32, h: 8 },
        { x: 80, y: 40, w: 40, h: 8 },
        { x: 180, y: 20, w: 32, h: 8 },
    ], [
        { x: 70, y: 152, dir: 'up' }, { x: 78, y: 152, dir: 'up' },
        { x: 130, y: 92, dir: 'up' }, { x: 138, y: 92, dir: 'up' },
        { x: 190, y: 72, dir: 'up' }, { x: 198, y: 72, dir: 'up' },
        { x: 250, y: 52, dir: 'up' }, { x: 258, y: 52, dir: 'up' },
        { x: 100, y: 32, dir: 'up' }, { x: 108, y: 32, dir: 'up' },
        { x: 180, y: 12, dir: 'up' }, { x: 188, y: 12, dir: 'up' },
    ], [
        { x: 60, y: 144, power: 1 },
        { x: 140, y: 60, power: 2 },
        { x: 260, y: 40, power: 1 },
    ], [
        { x: 100, y: 140, w: 24, h: 8, startX: 100, startY: 140, endX: 100, endY: 40, speed: 25, type: 'vertical' },
        { x: 200, y: 100, w: 24, h: 8, startX: 200, startY: 100, endX: 280, endY: 100, speed: 35, type: 'horizontal' },
    ], [
        { x: 50, y: 100, id: 'berry6' },
        { x: 110, y: 80, id: 'berry7' },
        { x: 170, y: 60, id: 'berry8' },
        { x: 230, y: 40, id: 'berry9' },
        { x: 290, y: 60, id: 'berry10', golden: true },
    ], [
        { x: 160, y: 40, w: 24, h: 8 },
        { x: 80, y: 20, w: 16, h: 8 },
    ], [
        { x: 40, y: 10, targetRoom: 'old-site' },
    ], [
        { x: 200, y: 120, w: 16, h: 16, pattern: 'circle', radius: 60, speed: 1.5 },
    ], [], []
    );

    createRoom('old-site', 'Old Site', 'oldsite', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 40, h: 8, ice: true },
        { x: 100, y: 100, w: 32, h: 8, ice: true },
        { x: 160, y: 80, w: 24, h: 8, ice: true },
        { x: 220, y: 60, w: 32, h: 8, ice: true },
        { x: 280, y: 80, w: 24, h: 8, ice: true },
        { x: 60, y: 40, w: 40, h: 8, ice: true },
        { x: 140, y: 20, w: 32, h: 8, ice: true },
        { x: 240, y: 40, w: 24, h: 8, ice: true },
    ], [
        { x: 80, y: 152, dir: 'up' }, { x: 88, y: 152, dir: 'up' },
        { x: 140, y: 92, dir: 'up' }, { x: 148, y: 92, dir: 'up' },
        { x: 200, y: 72, dir: 'up' }, { x: 208, y: 72, dir: 'up' },
        { x: 260, y: 52, dir: 'up' }, { x: 268, y: 52, dir: 'up' },
        { x: 80, y: 32, dir: 'up' }, { x: 88, y: 32, dir: 'up' },
        { x: 160, y: 12, dir: 'up' }, { x: 168, y: 12, dir: 'up' },
    ], [
        { x: 50, y: 144, power: 1 },
        { x: 130, y: 80, power: 1 },
        { x: 210, y: 40, power: 2 },
        { x: 290, y: 60, power: 1 },
    ], [
        { x: 120, y: 130, w: 24, h: 8, startX: 120, startY: 130, endX: 120, endY: 30, speed: 20, type: 'vertical' },
        { x: 180, y: 90, w: 32, h: 8, startX: 180, startY: 90, endX: 280, endY: 90, speed: 30, type: 'horizontal' },
    ], [
        { x: 60, y: 100, id: 'berry11' },
        { x: 120, y: 60, id: 'berry12' },
        { x: 180, y: 40, id: 'berry13' },
        { x: 240, y: 20, id: 'berry14' },
        { x: 300, y: 50, id: 'berry15', golden: true },
    ], [
        { x: 100, y: 60, w: 24, h: 8 },
        { x: 200, y: 20, w: 16, h: 8 },
    ], [
        { x: 40, y: 10, targetRoom: 'prologue' },
        { x: 280, y: 10, targetRoom: 'old-site2' },
    ], [
        { x: 80, y: 100, w: 8, h: 8, pattern: 'horizontal', distance: 80, speed: 2 },
    ], [], []
    );

    createRoom('old-site2', 'Old Site B-Side', 'oldsite', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 24, h: 8, ice: true },
        { x: 100, y: 100, w: 16, h: 8, ice: true },
        { x: 160, y: 80, w: 24, h: 8, ice: true },
        { x: 220, y: 60, w: 16, h: 8, ice: true },
        { x: 280, y: 80, w: 24, h: 8, ice: true },
        { x: 60, y: 40, w: 16, h: 8, ice: true },
        { x: 140, y: 20, w: 24, h: 8, ice: true },
    ], [
        { x: 70, y: 152, dir: 'up' }, { x: 78, y: 152, dir: 'up' }, { x: 86, y: 152, dir: 'up' },
        { x: 130, y: 92, dir: 'up' }, { x: 138, y: 92, dir: 'up' }, { x: 146, y: 92, dir: 'up' },
        { x: 190, y: 72, dir: 'up' }, { x: 198, y: 72, dir: 'up' }, { x: 206, y: 72, dir: 'up' },
        { x: 250, y: 52, dir: 'up' }, { x: 258, y: 52, dir: 'up' },
        { x: 80, y: 32, dir: 'up' }, { x: 88, y: 32, dir: 'up' },
        { x: 160, y: 12, dir: 'up' }, { x: 168, y: 12, dir: 'up' },
    ], [
        { x: 50, y: 144, power: 1 },
        { x: 130, y: 80, power: 2 },
        { x: 210, y: 40, power: 2 },
        { x: 290, y: 60, power: 1 },
    ], [
        { x: 120, y: 130, w: 24, h: 8, startX: 120, startY: 130, endX: 120, endY: 30, speed: 25, type: 'vertical' },
        { x: 180, y: 90, w: 24, h: 8, startX: 180, startY: 90, endX: 260, endY: 90, speed: 35, type: 'horizontal' },
        { x: 40, y: 50, w: 24, h: 8, startX: 40, startY: 50, endX: 120, endY: 50, speed: 40, type: 'horizontal' },
    ], [
        { x: 60, y: 100, id: 'berry16' },
        { x: 120, y: 60, id: 'berry17' },
        { x: 180, y: 40, id: 'berry18' },
        { x: 240, y: 20, id: 'berry19' },
        { x: 300, y: 50, id: 'berry20', golden: true },
    ], [
        { x: 100, y: 60, w: 16, h: 8 },
        { x: 200, y: 20, w: 16, h: 8 },
    ], [
        { x: 40, y: 10, targetRoom: 'old-site' },
    ], [
        { x: 80, y: 100, w: 8, h: 8, pattern: 'horizontal', distance: 80, speed: 3 },
        { x: 160, y: 60, w: 8, h: 8, pattern: 'vertical', distance: 60, speed: 2.5 },
        { x: 240, y: 30, w: 8, h: 8, pattern: 'circle', radius: 40, speed: 3 },
    ], [], []
    );

    createRoom('resort', 'Celestial Resort', 'resort', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 48, h: 8 },
        { x: 120, y: 100, w: 40, h: 8 },
        { x: 200, y: 80, w: 32, h: 8 },
        { x: 280, y: 100, w: 32, h: 8 },
        { x: 80, y: 60, w: 24, h: 8 },
        { x: 160, y: 40, w: 40, h: 8 },
        { x: 240, y: 60, w: 24, h: 8 },
    ], [
        { x: 80, y: 152, dir: 'up' }, { x: 88, y: 152, dir: 'up' },
        { x: 160, y: 92, dir: 'up' }, { x: 168, y: 92, dir: 'up' },
        { x: 240, y: 72, dir: 'up' }, { x: 248, y: 72, dir: 'up' },
        { x: 100, y: 52, dir: 'up' }, { x: 108, y: 52, dir: 'up' },
        { x: 180, y: 32, dir: 'up' }, { x: 188, y: 32, dir: 'up' },
    ], [
        { x: 60, y: 144, power: 1 },
        { x: 140, y: 80, power: 2 },
        { x: 220, y: 60, power: 1 },
        { x: 300, y: 40, power: 2 },
    ], [
        { x: 300, y: 120, w: 24, h: 8, startX: 300, startY: 120, endX: 300, endY: 40, speed: 30, type: 'vertical' },
        { x: 80, y: 80, w: 32, h: 8, startX: 80, startY: 80, endX: 200, endY: 80, speed: 40, type: 'horizontal' },
    ], [
        { x: 50, y: 100, id: 'berry21' },
        { x: 140, y: 80, id: 'berry22' },
        { x: 220, y: 50, id: 'berry23' },
        { x: 300, y: 30, id: 'berry24' },
        { x: 160, y: 20, id: 'berry25', golden: true },
    ], [
        { x: 120, y: 60, w: 32, h: 8 },
        { x: 200, y: 20, w: 24, h: 8 },
    ], [
        { x: 40, y: 10, targetRoom: 'old-site2' },
        { x: 280, y: 10, targetRoom: 'resort2' },
    ], [
        { x: 100, y: 100, r: 12, color: '#44ffff' },
        { x: 200, y: 60, r: 12, color: '#44ffff' },
        { x: 280, y: 30, r: 12, color: '#44ffff' },
    ], [], [], []
    );

    createRoom('resort2', 'Mirror Temple', 'mirror', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 32, h: 8 },
        { x: 100, y: 100, w: 24, h: 8 },
        { x: 160, y: 80, w: 32, h: 8 },
        { x: 220, y: 60, w: 24, h: 8 },
        { x: 280, y: 80, w: 32, h: 8 },
    ], [
        { x: 70, y: 152, dir: 'up' }, { x: 78, y: 152, dir: 'up' },
        { x: 130, y: 92, dir: 'up' }, { x: 138, y: 92, dir: 'up' },
        { x: 190, y: 72, dir: 'up' }, { x: 198, y: 72, dir: 'up' },
        { x: 250, y: 52, dir: 'up' }, { x: 258, y: 52, dir: 'up' },
        { x: 100, y: 32, dir: 'up' }, { x: 108, y: 32, dir: 'up' },
    ], [
        { x: 60, y: 144, power: 1 },
        { x: 140, y: 80, power: 2 },
        { x: 260, y: 40, power: 1 },
    ], [
        { x: 100, y: 140, w: 24, h: 8, startX: 100, startY: 140, endX: 100, endY: 40, speed: 25, type: 'vertical' },
        { x: 200, y: 100, w: 24, h: 8, startX: 200, startY: 100, endX: 280, endY: 100, speed: 35, type: 'horizontal' },
    ], [
        { x: 50, y: 100, id: 'berry26' },
        { x: 110, y: 80, id: 'berry27' },
        { x: 170, y: 60, id: 'berry28' },
        { x: 230, y: 40, id: 'berry29' },
        { x: 290, y: 60, id: 'berry30', golden: true },
    ], [
        { x: 160, y: 40, w: 24, h: 8 },
        { x: 80, y: 20, w: 16, h: 8 },
    ], [
        { x: 40, y: 10, targetRoom: 'resort' },
    ], [
        { x: 160, y: 100, r: 12, color: '#ff44aa' },
        { x: 80, y: 60, r: 12, color: '#ff44aa' },
        { x: 240, y: 30, r: 12, color: '#ff44aa' },
    ], [
        { x: 120, y: 120, w: 80, h: 40 },
    ], []
    );

    createRoom('mirror', 'Reflection', 'reflection', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 48, h: 8 },
        { x: 120, y: 100, w: 32, h: 8 },
        { x: 200, y: 80, w: 40, h: 8 },
        { x: 280, y: 100, w: 32, h: 8 },
    ], [
        { x: 80, y: 152, dir: 'up' }, { x: 88, y: 152, dir: 'up' },
        { x: 160, y: 92, dir: 'up' }, { x: 168, y: 92, dir: 'up' },
        { x: 240, y: 72, dir: 'up' }, { x: 248, y: 72, dir: 'up' },
    ], [
        { x: 60, y: 144, power: 1 },
        { x: 180, y: 80, power: 2 },
        { x: 260, y: 40, power: 1 },
    ], [
        { x: 300, y: 120, w: 24, h: 8, startX: 300, startY: 120, endX: 300, endY: 40, speed: 30, type: 'vertical' },
    ], [
        { x: 50, y: 100, id: 'berry31' },
        { x: 140, y: 80, id: 'berry32' },
        { x: 220, y: 50, id: 'berry33' },
        { x: 300, y: 30, id: 'berry34' },
        { x: 160, y: 20, id: 'berry35' },
    ], [
        { x: 120, y: 60, w: 32, h: 8 },
    ], [
        { x: 280, y: 10, targetRoom: 'resort2' },
        { x: 40, y: 10, targetRoom: 'mirror-temple' },
    ], [
        { x: 160, y: 100, r: 12, color: '#8844ff' },
    ], [
        { x: 80, y: 100, w: 80, h: 40 },
    ], []
    );

    createRoom('summit', 'The Summit', 'summit', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 48, h: 8, ice: true },
        { x: 120, y: 100, w: 32, h: 8, ice: true },
        { x: 200, y: 80, w: 40, h: 8, ice: true },
        { x: 280, y: 100, w: 32, h: 8, ice: true },
        { x: 60, y: 60, w: 24, h: 8, ice: true },
        { x: 160, y: 40, w: 32, h: 8, ice: true },
        { x: 240, y: 60, w: 24, h: 8, ice: true },
    ], [
        { x: 80, y: 152, dir: 'up' }, { x: 88, y: 152, dir: 'up' },
        { x: 160, y: 92, dir: 'up' }, { x: 168, y: 92, dir: 'up' },
        { x: 240, y: 72, dir: 'up' }, { x: 248, y: 72, dir: 'up' },
        { x: 100, y: 52, dir: 'up' }, { x: 108, y: 52, dir: 'up' },
        { x: 180, y: 32, dir: 'up' }, { x: 188, y: 32, dir: 'up' },
        { x: 260, y: 12, dir: 'up' }, { x: 268, y: 12, dir: 'up' },
    ], [
        { x: 60, y: 144, power: 2 },
        { x: 140, y: 80, power: 2 },
        { x: 220, y: 60, power: 2 },
        { x: 300, y: 40, power: 2 },
    ], [
        { x: 300, y: 120, w: 24, h: 8, startX: 300, startY: 120, endX: 300, endY: 40, speed: 30, type: 'vertical' },
        { x: 80, y: 80, w: 32, h: 8, startX: 80, startY: 80, endX: 200, endY: 80, speed: 40, type: 'horizontal' },
    ], [
        { x: 50, y: 100, id: 'berry36' },
        { x: 140, y: 80, id: 'berry37' },
        { x: 220, y: 50, id: 'berry38' },
        { x: 300, y: 30, id: 'berry39' },
        { x: 160, y: 20, id: 'berry40' },
    ], [
        { x: 120, y: 60, w: 32, h: 8 },
        { x: 200, y: 20, w: 24, h: 8 },
    ], [
        { x: 40, y: 10, targetRoom: 'mirror' },
        { x: 280, y: 10, targetRoom: 'summit2' },
    ], [
        { x: 100, y: 100, r: 12, color: '#ffffff' },
        { x: 200, y: 60, r: 12, color: '#ffffff' },
    ], [], []
    );

    createRoom('summit2', 'The Summit B-Side', 'summit', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 32, h: 8, ice: true },
        { x: 100, y: 100, w: 24, h: 8, ice: true },
        { x: 160, y: 80, w: 32, h: 8, ice: true },
        { x: 220, y: 60, w: 24, h: 8, ice: true },
        { x: 280, y: 80, w: 32, h: 8, ice: true },
        { x: 80, y: 40, w: 40, h: 8, ice: true },
        { x: 180, y: 20, w: 32, h: 8, ice: true },
    ], [
        { x: 70, y: 152, dir: 'up' }, { x: 78, y: 152, dir: 'up' }, { x: 86, y: 152, dir: 'up' },
        { x: 130, y: 92, dir: 'up' }, { x: 138, y: 92, dir: 'up' }, { x: 146, y: 92, dir: 'up' },
        { x: 190, y: 72, dir: 'up' }, { x: 198, y: 72, dir: 'up' }, { x: 206, y: 72, dir: 'up' },
        { x: 250, y: 52, dir: 'up' }, { x: 258, y: 52, dir: 'up' }, { x: 266, y: 52, dir: 'up' },
        { x: 80, y: 32, dir: 'up' }, { x: 88, y: 32, dir: 'up' },
        { x: 160, y: 12, dir: 'up' }, { x: 168, y: 12, dir: 'up' },
    ], [
        { x: 60, y: 144, power: 2 },
        { x: 140, y: 80, power: 2 },
        { x: 220, y: 60, power: 2 },
        { x: 300, y: 40, power: 2 },
    ], [
        { x: 300, y: 120, w: 24, h: 8, startX: 300, startY: 120, endX: 300, endY: 40, speed: 35, type: 'vertical' },
        { x: 80, y: 80, w: 32, h: 8, startX: 80, startY: 80, endX: 200, endY: 80, speed: 45, type: 'horizontal' },
        { x: 160, y: 40, w: 24, h: 8, startX: 160, startY: 40, endX: 160, endY: 120, speed: 30, type: 'vertical' },
    ], [
        { x: 50, y: 100, id: 'berry41' },
        { x: 140, y: 80, id: 'berry42' },
        { x: 220, y: 50, id: 'berry43' },
        { x: 300, y: 30, id: 'berry44' },
        { x: 160, y: 20, id: 'berry45' },
    ], [
        { x: 120, y: 60, w: 32, h: 8 },
        { x: 200, y: 20, w: 24, h: 8 },
    ], [
        { x: 40, y: 10, targetRoom: 'summit' },
        { x: 280, y: 10, targetRoom: 'summit3' },
    ], [
        { x: 100, y: 100, r: 12, color: '#ffffff' },
        { x: 200, y: 60, r: 12, color: '#ffffff' },
        { x: 280, y: 30, r: 12, color: '#ffffff' },
    ], [], []
    );

    createRoom('summit3', 'The Summit C-Side', 'summit', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 16, h: 8, ice: true },
        { x: 100, y: 100, w: 16, h: 8, ice: true },
        { x: 160, y: 80, w: 16, h: 8, ice: true },
        { x: 220, y: 60, w: 16, h: 8, ice: true },
        { x: 280, y: 80, w: 16, h: 8, ice: true },
        { x: 80, y: 40, w: 16, h: 8, ice: true },
        { x: 180, y: 20, w: 16, h: 8, ice: true },
    ], [
        { x: 70, y: 152, dir: 'up' }, { x: 78, y: 152, dir: 'up' }, { x: 86, y: 152, dir: 'up' }, { x: 94, y: 152, dir: 'up' },
        { x: 130, y: 92, dir: 'up' }, { x: 138, y: 92, dir: 'up' }, { x: 146, y: 92, dir: 'up' }, { x: 154, y: 92, dir: 'up' },
        { x: 190, y: 72, dir: 'up' }, { x: 198, y: 72, dir: 'up' }, { x: 206, y: 72, dir: 'up' }, { x: 214, y: 72, dir: 'up' },
        { x: 250, y: 52, dir: 'up' }, { x: 258, y: 52, dir: 'up' },
        { x: 80, y: 32, dir: 'up' }, { x: 88, y: 32, dir: 'up' },
        { x: 160, y: 12, dir: 'up' }, { x: 168, y: 12, dir: 'up' },
    ], [
        { x: 60, y: 144, power: 2 },
        { x: 140, y: 80, power: 2 },
        { x: 220, y: 60, power: 2 },
        { x: 300, y: 40, power: 2 },
    ], [
        { x: 300, y: 120, w: 16, h: 8, startX: 300, startY: 120, endX: 300, endY: 40, speed: 40, type: 'vertical' },
        { x: 80, y: 80, w: 16, h: 8, startX: 80, startY: 80, endX: 200, endY: 80, speed: 50, type: 'horizontal' },
    ], [
        { x: 50, y: 100, id: 'berry46' },
        { x: 140, y: 80, id: 'berry47' },
        { x: 220, y: 50, id: 'berry48' },
        { x: 300, y: 30, id: 'berry49' },
        { x: 160, y: 20, id: 'berry50' },
    ], [
        { x: 120, y: 60, w: 16, h: 8 },
    ], [
        { x: 40, y: 10, targetRoom: 'summit2' },
    ], [
        { x: 100, y: 100, r: 12, color: '#ffffff' },
        { x: 200, y: 60, r: 12, color: '#ffffff' },
    ], [], []
    );

    createRoom('core', 'Core', 'core', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 48, h: 8 },
        { x: 120, y: 100, w: 32, h: 8 },
        { x: 200, y: 80, w: 40, h: 8 },
        { x: 280, y: 100, w: 32, h: 8 },
        { x: 60, y: 60, w: 24, h: 8 },
        { x: 160, y: 40, w: 32, h: 8 },
        { x: 240, y: 60, w: 24, h: 8 },
    ], [
        { x: 80, y: 152, dir: 'up' }, { x: 88, y: 152, dir: 'up' },
        { x: 160, y: 92, dir: 'up' }, { x: 168, y: 92, dir: 'up' },
        { x: 240, y: 72, dir: 'up' }, { x: 248, y: 72, dir: 'up' },
        { x: 100, y: 52, dir: 'up' }, { x: 108, y: 52, dir: 'up' },
        { x: 180, y: 32, dir: 'up' }, { x: 188, y: 32, dir: 'up' },
    ], [
        { x: 60, y: 144, power: 2 },
        { x: 180, y: 80, power: 2 },
        { x: 260, y: 40, power: 2 },
    ], [
        { x: 300, y: 120, w: 24, h: 8, startX: 300, startY: 120, endX: 300, endY: 40, speed: 30, type: 'vertical' },
        { x: 80, y: 80, w: 32, h: 8, startX: 80, startY: 80, endX: 200, endY: 80, speed: 40, type: 'horizontal' },
    ], [
        { x: 50, y: 100, id: 'berry51' },
        { x: 140, y: 80, id: 'berry52' },
        { x: 220, y: 50, id: 'berry53' },
        { x: 300, y: 30, id: 'berry54' },
        { x: 160, y: 20, id: 'berry55' },
    ], [
        { x: 120, y: 60, w: 32, h: 8 },
        { x: 200, y: 20, w: 24, h: 8 },
    ], [
        { x: 280, y: 10, targetRoom: 'summit3' },
        { x: 160, y: 10, targetRoom: 'summit-peak' },
    ], [
        { x: 160, y: 100, r: 12, color: '#ff0088' },
        { x: 80, y: 60, r: 12, color: '#ff0088' },
        { x: 240, y: 30, r: 12, color: '#ff0088' },
    ], [
        { x: 80, y: 100, w: 80, h: 40 },
        { x: 160, y: 60, w: 80, h: 40 },
    ], []
    );

    createRoom('core2', 'Core B-Side', 'core', { x: 40, y: 140 }, [
        { x: 40, y: 120, w: 32, h: 8 },
        { x: 100, y: 100, w: 24, h: 8 },
        { x: 160, y: 80, w: 32, h: 8 },
        { x: 220, y: 60, w: 24, h: 8 },
        { x: 280, y: 80, w: 32, h: 8 },
    ], [
        { x: 70, y: 152, dir: 'up' }, { x: 78, y: 152, dir: 'up' },
        { x: 130, y: 92, dir: 'up' }, { x: 138, y: 92, dir: 'up' },
        { x: 190, y: 72, dir: 'up' }, { x: 198, y: 72, dir: 'up' },
        { x: 250, y: 52, dir: 'up' }, { x: 258, y: 52, dir: 'up' },
        { x: 100, y: 32, dir: 'up' }, { x: 108, y: 32, dir: 'up' },
    ], [
        { x: 60, y: 144, power: 2 },
        { x: 180, y: 80, power: 2 },
        { x: 260, y: 40, power: 2 },
    ], [
        { x: 300, y: 120, w: 24, h: 8, startX: 300, startY: 120, endX: 300, endY: 40, speed: 35, type: 'vertical' },
        { x: 80, y: 80, w: 32, h: 8, startX: 80, startY: 80, endX: 200, endY: 80, speed: 45, type: 'horizontal' },
    ], [
        { x: 50, y: 100, id: 'berry56' },
        { x: 110, y: 80, id: 'berry57' },
        { x: 170, y: 60, id: 'berry58' },
        { x: 230, y: 40, id: 'berry59' },
        { x: 290, y: 60, id: 'berry60' },
    ], [
        { x: 160, y: 40, w: 24, h: 8 },
        { x: 80, y: 20, w: 16, h: 8 },
    ], [
        { x: 40, y: 10, targetRoom: 'core' },
        { x: 160, y: 10, targetRoom: 'resort-finale' },
    ], [
        { x: 160, y: 100, r: 12, color: '#ff0088' },
        { x: 80, y: 60, r: 12, color: '#ff0088' },
        { x: 240, y: 30, r: 12, color: '#ff0088' },
    ], [
        { x: 80, y: 100, w: 80, h: 40 },
        { x: 160, y: 60, w: 80, h: 40 },
    ], []
    );

    createRoom('summit-peak', 'Summit Peak', 'summit', { x: 160, y: 120 }, [
        { x: 0, y: 172, w: 320, h: 8 },
        { x: 0, y: 160, w: 8, h: 12 },
        { x: 312, y: 160, w: 8, h: 12 },
        { x: 40, y: 140, w: 64, h: 8 },
        { x: 140, y: 120, w: 40, h: 8 },
        { x: 220, y: 100, w: 56, h: 8 },
        { x: 120, y: 80, w: 24, h: 8 },
        { x: 200, y: 70, w: 24, h: 8 },
        { x: 80, y: 50, w: 40, h: 8 },
        { x: 160, y: 30, w: 40, h: 8 },
        { x: 100, y: 20, w: 24, h: 8 },
        { x: 240, y: 20, w: 40, h: 8 },
    ], [
        { x: 0, y: 152, dir: 'right' },
        { x: 320, y: 152, dir: 'left' },
        { x: 40, y: 130, dir: 'up' },
        { x: 180, y: 110, dir: 'up' },
        { x: 240, y: 90, dir: 'up' },
        { x: 80, y: 70, dir: 'down' },
        { x: 200, y: 60, dir: 'up' },
        { x: 100, y: 40, dir: 'up' },
    ], [
        { x: 140, y: 140, power: 1 },
        { x: 260, y: 80, power: 2 },
    ], [
        { x: 260, y: 120, w: 24, h: 8, startX: 260, startY: 120, endX: 260, endY: 50, speed: 40, type: 'vertical' },
        { x: 40, y: 70, w: 32, h: 8, startX: 40, startY: 70, endX: 120, endY: 70, speed: 35, type: 'horizontal' },
        { x: 160, y: 50, w: 24, h: 8, startX: 160, startY: 50, endX: 200, endY: 50, speed: 30, type: 'horizontal' },
    ], [
        { x: 60, y: 130, id: 'berry51' },
        { x: 120, y: 90, id: 'berry52' },
        { x: 240, y: 70, id: 'berry53' },
        { x: 180, y: 15, id: 'berry54' },
    ], [
        { x: 50, y: 110, w: 24, h: 8 },
        { x: 180, y: 50, w: 40, h: 8 },
    ], [
        { x: 240, y: 10, targetRoom: 'summit2' },
    ], [
        { x: 200, y: 100, r: 12, color: '#ffffff' },
    ], [], [
        { x: 140, y: 110, speed: 80, state: 'patrol', startX: 140, endX: 280 },
    ], [], [], []
    );

    rooms['summit-peak'].heartGem = { x: 240, y: 10, collected: false };

    createRoom('mirror-temple', 'Mirror Temple', 'mirror', { x: 40, y: 140 }, [
        { x: 0, y: 172, w: 320, h: 8 },
        { x: 0, y: 160, w: 8, h: 12 },
        { x: 312, y: 160, w: 8, h: 12 },
        { x: 40, y: 140, w: 64, h: 8 },
        { x: 120, y: 120, w: 40, h: 8 },
        { x: 200, y: 100, w: 64, h: 8 },
        { x: 80, y: 80, w: 32, h: 8 },
        { x: 180, y: 60, w: 48, h: 8 },
        { x: 100, y: 40, w: 56, h: 8 },
        { x: 220, y: 20, w: 40, h: 8 },
        { x: 60, y: 15, w: 56, h: 8 },
    ], [], [
        { x: 100, y: 140, power: 1 },
        { x: 240, y: 80, power: 2 },
    ], [
        { x: 80, y: 110, w: 24, h: 8, startX: 80, startY: 110, endX: 260, endY: 110, speed: 35, type: 'horizontal' },
        { x: 200, y: 70, w: 24, h: 8, startX: 200, startY: 70, endX: 200, endY: 30, speed: 40, type: 'vertical' },
    ], [
        { x: 80, y: 120, id: 'berry55' },
        { x: 160, y: 90, id: 'berry56' },
        { x: 240, y: 50, id: 'berry57' },
        { x: 120, y: 15, id: 'berry58' },
    ], [
        { x: 140, y: 100, w: 24, h: 8 },
        { x: 180, y: 40, w: 32, h: 8 },
    ], [
        { x: 140, y: 10, targetRoom: 'core' },
    ], [], [], [
        { x: 100, y: 100, r: 12, color: '#8844ff' },
        { x: 220, y: 40, r: 12, color: '#8844ff' },
    ], [], [], [
        { x: 80, y: 100, w: 80, h: 40 },
        { x: 160, y: 30, w: 80, h: 24 },
    ]
    );

    createRoom('resort-finale', 'Resort Finale', 'resort', { x: 160, y: 140 }, [
        { x: 0, y: 172, w: 320, h: 8 },
        { x: 0, y: 160, w: 8, h: 12 },
        { x: 312, y: 160, w: 8, h: 12 },
        { x: 60, y: 140, w: 200, h: 8 },
        { x: 40, y: 120, w: 40, h: 8 },
        { x: 180, y: 100, w: 64, h: 8 },
        { x: 120, y: 80, w: 32, h: 8 },
        { x: 240, y: 60, w: 40, h: 8 },
        { x: 80, y: 40, w: 48, h: 8 },
        { x: 200, y: 20, w: 40, h: 8 },
        { x: 140, y: 10, w: 24, h: 8 },
    ], [
        { x: 0, y: 152, dir: 'right' },
        { x: 320, y: 152, dir: 'left' },
        { x: 80, y: 130, dir: 'up' },
        { x: 220, y: 110, dir: 'up' },
        { x: 40, y: 90, dir: 'up' },
        { x: 160, y: 70, dir: 'up' },
        { x: 260, y: 50, dir: 'up' },
        { x: 100, y: 30, dir: 'up' },
    ], [
        { x: 60, y: 140, power: 1 },
        { x: 200, y: 60, power: 2 },
        { x: 120, y: 20, power: 1 },
    ], [
        { x: 180, y: 110, w: 32, h: 8, startX: 180, startY: 110, endX: 260, endY: 110, speed: 50, type: 'horizontal' },
        { x: 280, y: 80, w: 24, h: 8, startX: 280, startY: 80, endX: 280, endY: 30, speed: 35, type: 'vertical' },
        { x: 30, y: 90, w: 24, h: 8, startX: 30, startY: 90, endX: 90, endY: 90, speed: 45, type: 'horizontal' },
    ], [
        { x: 40, y: 130, id: 'berry59' },
        { x: 100, y: 90, id: 'berry60' },
        { x: 180, y: 70, id: 'berry61' },
        { x: 260, y: 40, id: 'berry62' },
        { x: 160, y: 5, id: 'berry63' },
    ], [], [
        { x: 60, y: 10, targetRoom: 'mirror-temple' },
    ], [
        { x: 120, y: 70, r: 12, color: '#44ffaa' },
        { x: 80, y: 30, r: 12, color: '#44ffaa' },
        { x: 240, y: 10, r: 12, color: '#44ffaa' },
    ], [], [
        { x: 300, y: 120, r: 12, color: '#ff0088' },
        { x: 240, y: 50, r: 12, color: '#ff0088' },
    ], [], []
    );

    currentRoomData = rooms.prologue;
    totalStrawberries = 0;
    collectedStrawberries = 0;
    for (const key in rooms) {
        totalStrawberries += rooms[key].strawberries.length;
        rooms[key].strawberries.forEach(berry => {
            berry.collected = savedBerryIds.has(berry.id);
        });
    }
    STRAWBERRIES_EL.textContent = `Strawberries: ${collectedStrawberries}/${totalStrawberries}`;
    ROOM_NAME_EL.textContent = currentRoomData.name;
}


function createRoom(id, name, background, spawn, platforms, spikes, springs, movingPlatforms, strawberries, dreamBlocks, flags, bubbles, kevinBlocks, cassetteBlocks, seekers, badelines, triggerSpikes, dashSwitches) {
    platforms = platforms || [];
    spikes = spikes || [];
    springs = springs || [];
    movingPlatforms = movingPlatforms || [];
    strawberries = strawberries || [];
    dreamBlocks = dreamBlocks || [];
    flags = flags || [];
    bubbles = bubbles || [];
    kevinBlocks = kevinBlocks || [];
    cassetteBlocks = cassetteBlocks || [];
    seekers = seekers || [];
    badelines = badelines || [];
    triggerSpikes = triggerSpikes || [];
    dashSwitches = dashSwitches || [];

    rooms[id] = {
        name,
        width: ROOM_WIDTH, height: ROOM_HEIGHT,
        spawn,
        solids: [],
        spikes: [],
        springs: [],
        movingPlatforms: [],
        strawberries: [],
        dreamBlocks: [],
        cassetteBlocks: [],
        flags: [],
        background,
        music: id,
        bubbles: [],
        kevinBlocks: [],
        seekers: [],
        badelines: [],
        triggerSpikes: [],
        dashSwitches: [],
        heartGem: null,
        feather: null,
        wind: null
    };

    const r = rooms[id];
    const groundY = r.height - 16;

    for (let x = 0; x < r.width; x += 8) {
        r.solids.push({ x, y: groundY, w: 8, h: 16, type: 'ground', ice: false });
    }

    for (let y = 0; y < r.height; y += 8) {
        r.solids.push({ x: 0, y, w: 8, h: 8, type: 'wall', ice: false });
        r.solids.push({ x: r.width - 8, y, w: 8, h: 8, type: 'wall', ice: false });
    }

    platforms.forEach(p => {
        const ice = p.ice || false;
        for (let x = p.x; x < p.x + p.w; x += 8) {
            for (let y = p.y; y < p.y + p.h; y += 8) {
                r.solids.push({ x, y, w: 8, h: 8, type: 'platform', ice });
            }
        }
    });

    spikes.forEach(s => {
        r.spikes.push({ x: s.x, y: s.y, w: 8, h: 8, dir: s.dir });
    });

    springs.forEach(s => {
        r.springs.push({ x: s.x, y: s.y, w: 16, h: 16, power: s.power, timer: 0 });
    });

    movingPlatforms.forEach(mp => {
        r.movingPlatforms.push({
            x: mp.startX, y: mp.startY, w: mp.w, h: mp.h,
            startX: mp.startX, startY: mp.startY,
            endX: mp.endX, endY: mp.endY,
            originStartX: mp.startX, originStartY: mp.startY,
            originEndX: mp.endX, originEndY: mp.endY,
            speed: mp.speed, timer: 0, waitTimer: 0, waiting: false, type: mp.type
        });
    });

    strawberries.forEach(s => {
        const berryIndex = r.strawberries.length;
        const sideOffset = berryIndex % 2 === 0 ? 14 : -14;
        const perchX = Math.max(16, Math.min(r.width - 24, s.x + sideOffset));
        const perchY = Math.max(18, s.y - 18);

        r.strawberries.push({
            x: perchX,
            y: perchY,
            collected: false,
            id: s.id,
            golden: Boolean(s.golden),
            wiggle: 0,
        });

        // Give each berry a small elevated landing target instead of leaving it on the main route.
        r.solids.push({
            x: perchX - 5,
            y: perchY + 11,
            w: 18,
            h: 4,
            type: 'berry-perch',
            ice: false,
            berryId: s.id
        });
    });

    dreamBlocks.forEach(db => {
        r.dreamBlocks.push({ x: db.x, y: db.y, w: db.w, h: db.h, active: true, timer: 0 });
    });

    flags.forEach(f => {
        r.flags.push({ x: f.x, y: f.y, w: 8, h: 24, targetRoom: f.targetRoom, timer: 0 });
    });

    bubbles.forEach(b => {
        r.bubbles.push({ x: b.x, y: b.y, r: b.r, color: b.color, timer: 0, active: true });
    });

    kevinBlocks.forEach(k => {
        r.kevinBlocks.push({ x: k.x, y: k.y, w: k.w, h: k.h, timer: 0, active: true, particles: [], kevin: true });
    });

    cassetteBlocks.forEach(c => {
        r.cassetteBlocks.push({ x: c.x, y: c.y, w: c.w, h: c.h, active: false, timer: 0 });
    });

    seekers.forEach(s => {
        r.seekers.push({ x: s.x, y: s.y, spawnX: s.x, spawnY: s.y, w: 8, h: 8, vx: 0, vy: 0, timer: 0, state: 'idle', targetX: s.x, targetY: s.y });
    });

    badelines.forEach(b => {
        r.badelines.push({ x: b.x, y: b.y, spawnX: b.x, spawnY: b.y, w: 8, h: 8, vx: 0, vy: 0, timer: 0, state: 'idle', particles: [] });
    });

    triggerSpikes.forEach(t => {
        r.triggerSpikes.push({ x: t.x, y: t.y, w: 8, h: 8, dir: t.dir || 'up', triggered: false, timer: 0, delay: t.delay || 0.5 });
    });

    dashSwitches.forEach(d => {
        r.dashSwitches.push({ x: d.x, y: d.y, w: 16, h: 16, activated: false, timer: 0, targets: d.targets || [] });
    });
}

function createExpansionRooms() {
    const expansionRooms = [
        ['prologue-ascent', 'Prologue - First Ascent', 'mountain'],
        ['forsaken-rooftops', 'Forsaken City - Rooftops', 'city'],
        ['forsaken-crossing', 'Forsaken City - Broken Crossing', 'city'],
        ['forsaken-underpass', 'Forsaken City - Underpass', 'city'],
        ['forsaken-tower', 'Forsaken City - Clock Tower', 'city'],
        ['forsaken-bside', 'Forsaken City B-Side - Momentum', 'city'],
        ['forsaken-bside2', 'Forsaken City B-Side - Skyline', 'city'],
        ['old-site-depths', 'Old Site - Depths', 'oldsite'],
        ['old-site-dream', 'Old Site - Lucid Passage', 'oldsite'],
        ['old-site-chase', 'Old Site - Awakening', 'oldsite'],
        ['old-site-bside2', 'Old Site B-Side - Nightmare', 'oldsite'],
        ['resort-lobby', 'Celestial Resort - Lobby', 'resort'],
        ['resort-cellars', 'Celestial Resort - Old Cellars', 'resort'],
        ['resort-bside', 'Celestial Resort B-Side - Service Halls', 'resort'],
        ['resort-bside2', 'Celestial Resort B-Side - Penthouse', 'resort'],
        ['mirror-depths', 'Reflection - Depths', 'reflection'],
        ['mirror-sanctum', 'Mirror Temple - Inner Sanctum', 'mirror'],
        ['mirror-bside', 'Mirror Temple B-Side - Labyrinth', 'reflection'],
        ['mirror-bside2', 'Mirror Temple B-Side - Escape', 'reflection'],
        ['summit-ridge', 'The Summit - Razor Ridge', 'summit'],
        ['summit-gale', 'The Summit - Whiteout', 'summit'],
        ['summit-aurora', 'The Summit - Aurora Crossing', 'summit'],
        ['summit-final', 'The Summit - Final Flags', 'summit'],
        ['core-depths', 'Core - Furnace', 'core'],
        ['core-furnace', 'Core - Magma Conduit', 'core'],
        ['core-escape', 'Core - Pressure Release', 'core'],
        ['core-bside2', 'Core B-Side - Meltdown', 'core'],
        ['farewell', 'Farewell - Departure', 'summit'],
        ['farewell-eventide', 'Farewell - Eventide', 'summit'],
        ['farewell-approach', 'Farewell - Moonlit Ascent', 'summit'],
        ['farewell-final', 'Farewell - Last Breath', 'summit']
    ];
    for (const [id, name, background] of expansionRooms) {
        createRoom(id, name, background, { x: 20, y: 146 });
    }
}


const CURATED_ROOM_DESIGNS = {
    'prologue': {
        name: "Prologue - First Steps",
        spawn: [16,146],
        terrain: [
            [0,160,80,24],
            [120,160,72,24],
            [232,160,80,24],
            [248,128,32,16],
            [280,48,32,80],
            [192,88,48,16],
            [112,64,48,16],
            [96,24,64,16]
        ],
        spikes: [
            [80,168,5,"up"],
            [192,168,5,"up"],
            [248,120,2,"up"],
            [192,80,2,"up"]
        ],
        berries: [
            [288,140,"prologue-secret-steps"]
        ],
        exit: [120,0,"prologue-ascent"]
    },

    'prologue-ascent': {
        name: "Prologue - Mountain Base",
        spawn: [16,146],
        terrain: [
            [0,156,56,24],
            [128,144,48,36],
            [184,48,16,88],
            [232,32,16,120],
            [264,72,40,16],
            [96,20,56,16]
        ],
        spikes: [
            [56,168,7,"up"],
            [176,144,2,"up"],
            [184,40,2,"up"],
            [264,64,1,"up"]
        ],
        movers: [
            [64,136,28,8,104,136,40]
        ],
        berries: [
            [288,56,"prologue-hidden-ledge"]
        ],
        exit: [112,0,"forsaken"]
    },

    'forsaken': {
        name: "Forsaken City - Broken Streets",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [136,152,48,32],
            [80,120,36,12],
            [160,100,56,12],
            [24,76,48,12],
            [240,88,72,24],
            [152,52,60,12],
            [96,20,56,16]
        ],
        spikes: [
            [64,168,9,"up"],
            [184,168,7,"up"],
            [240,80,2,"up"],
            [152,44,2,"up"]
        ],
        berries: [
            [28,60,"city-secret-alley"]
        ],
        exit: [112,0,"forsaken-crossing"]
    },

    'forsaken-crossing': {
        name: "Forsaken City - Broken Crossing",
        spawn: [16,146],
        terrain: [
            [0,160,56,24],
            [272,160,40,24],
            [272,136,16,24],
            [64,124,32,12],
            [152,108,36,12],
            [220,84,36,12],
            [112,56,40,12],
            [120,20,48,16]
        ],
        spikes: [
            [56,168,27,"up"],
            [220,76,2,"up"]
        ],
        movers: [
            [56,144,28,8,236,144,45],
            [168,68,24,8,216,68,50]
        ],
        exits: [
            [128,0,"forsaken-rooftops"],
            [304,148,"forsaken-underpass","right"]
        ]
    },

    'forsaken-underpass': {
        name: "Forsaken City - Underpass",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [96,160,40,24],
            [184,160,40,24],
            [264,160,56,24],
            [40,124,36,16],
            [128,100,36,16],
            [196,76,36,16],
            [260,44,40,16],
            [272,16,32,8]
        ],
        spikes: [
            [64,168,4,"up"],
            [136,168,6,"up"],
            [224,168,5,"up"],
            [128,92,1,"up"],
            [196,68,1,"up"],
            [260,36,1,"up"]
        ],
        kevin: [
            [232,118,24,24]
        ],
        gate: [
            [68,150,26,8],
            [226,150,36,8]
        ],
        switches: [
            [52,108,[[68,150],[226,150]]]
        ],
        berries: [
            [292,132,"city-secret-underpass"]
        ],
        exit: [284,0,"forsaken-tower"]
    },

    'forsaken-rooftops': {
        name: "Forsaken City - Rooftops",
        spawn: [16,146],
        terrain: [
            [0,160,56,24],
            [112,152,48,32],
            [224,144,88,40],
            [24,76,44,12],
            [96,104,36,12],
            [176,80,40,16],
            [256,56,56,24],
            [168,32,40,16],
            [88,16,48,16]
        ],
        spikes: [
            [56,168,7,"up"],
            [160,168,8,"up"],
            [176,72,2,"up"],
            [256,48,2,"up"]
        ],
        movers: [
            [64,128,24,8,104,128,46]
        ],
        berries: [
            [28,60,"city-secret-billboard"]
        ],
        exit: [104,0,"forsaken-tower"]
    },

    'forsaken-tower': {
        name: "Forsaken City - Transmission Tower",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [128,160,56,24],
            [240,160,80,24],
            [40,128,40,16],
            [120,108,36,16],
            [192,84,36,16],
            [260,60,52,20],
            [176,36,40,16],
            [96,16,48,16]
        ],
        spikes: [
            [64,168,8,"up"],
            [184,168,7,"up"],
            [120,100,2,"up"],
            [192,76,2,"up"],
            [260,52,2,"up"]
        ],
        cassette: [64,118,"cassette-city","forsaken-bside"],
        exit: [112,0,"old-site"]
    },

    'forsaken-bside': {
        name: "Forsaken City B-Side - Severed",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [120,156,32,28],
            [224,148,88,36],
            [24,108,24,16],
            [88,92,28,12],
            [160,72,28,12],
            [236,48,56,16],
            [160,24,36,12],
            [88,12,40,16]
        ],
        spikes: [
            [48,168,9,"up"],
            [152,168,9,"up"],
            [88,84,2,"up"],
            [160,64,2,"up"],
            [236,40,2,"up"]
        ],
        movers: [
            [56,128,20,8,96,128,54],
            [128,84,20,8,168,84,56]
        ],
        exit: [100,0,"forsaken-bside2"]
    },

    'forsaken-bside2': {
        name: "Forsaken City B-Side - Apex",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [112,160,32,24],
            [216,152,96,32],
            [24,124,28,16],
            [88,96,28,12],
            [156,68,28,12],
            [232,36,60,16],
            [144,12,40,16]
        ],
        spikes: [
            [48,168,8,"up"],
            [144,168,9,"up"],
            [88,88,2,"up"],
            [156,60,2,"up"],
            [232,28,2,"up"]
        ],
        movers: [
            [48,120,20,8,88,120,58],
            [124,80,20,8,156,80,60]
        ],
        gate: [
            [52,116,40,8]
        ],
        switches: [
            [8,96,[[52,116]]]
        ],
        wind: [40,24,240,120,-1,34],
        exit: [156,0,"forsaken"]
    },

    'old-site': {
        name: "Old Site - Dream Gate",
        spawn: [16,146],
        terrain: [
            [0,160,56,24],
            [168,156,56,24],
            [256,124,56,56],
            [24,76,44,12],
            [104,112,40,12],
            [180,88,44,12],
            [236,60,52,16],
            [152,40,48,12],
            [96,16,56,16]
        ],
        spikes: [
            [56,168,14,"up"],
            [224,168,4,"up"],
            [180,80,2,"up"],
            [236,52,2,"up"]
        ],
        dream: [
            [68,124,28,16],
            [136,76,28,16]
        ],
        berries: [
            [28,60,"oldsite-secret-memory"]
        ],
        exit: [112,0,"old-site-dream"]
    },

    'old-site-dream': {
        name: "Old Site - Dream Crossing",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [112,144,32,16],
            [192,128,36,16],
            [248,88,64,20],
            [168,60,40,12],
            [88,16,48,16]
        ],
        spikes: [
            [48,168,28,"up"],
            [112,136,2,"up"],
            [192,120,2,"up"],
            [248,80,2,"up"]
        ],
        movers: [
            [48,88,20,8,84,88,38]
        ],
        dream: [
            [56,124,32,16],
            [144,96,32,16],
            [216,64,32,16]
        ],
        exit: [100,0,"old-site-depths"]
    },

    'old-site-depths': {
        name: "Old Site - Depths",
        spawn: [16,146],
        terrain: [
            [0,160,56,24],
            [168,156,56,24],
            [256,116,56,64],
            [24,84,44,12],
            [112,116,36,12],
            [184,88,44,12],
            [244,60,52,16],
            [160,36,44,12],
            [96,16,52,16]
        ],
        spikes: [
            [56,168,14,"up"],
            [224,168,4,"up"],
            [196,80,2,"up"],
            [244,52,2,"up"]
        ],
        springs: [
            [32,144,2]
        ],
        movers: [
            [56,112,24,8,88,112,38],
            [132,76,24,8,156,76,40]
        ],
        berries: [
            [28,68,"oldsite-secret-basement"]
        ],
        exit: [112,0,"old-site-chase"]
    },

    'old-site-chase': {
        name: "Old Site - Badeline Chase",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [128,156,48,24],
            [232,148,80,32],
            [40,124,36,16],
            [116,104,36,16],
            [184,80,36,16],
            [248,56,64,20],
            [176,32,36,16],
            [96,12,48,16],
            [272,40,32,16]
        ],
        spikes: [
            [64,168,8,"up"],
            [176,168,7,"up"],
            [116,96,2,"up"],
            [184,72,2,"up"],
            [248,48,2,"up"]
        ],
        badelines: [
            [280,120]
        ],
        cassette: [280,26,"cassette-oldsite","old-site2"],
        exit: [112,0,"resort"]
    },

    'old-site2': {
        name: "Old Site B-Side - Lucid",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [116,152,36,28],
            [220,144,92,36],
            [24,112,28,16],
            [96,88,32,12],
            [168,68,32,12],
            [240,44,56,16],
            [160,20,36,12],
            [88,8,40,16]
        ],
        spikes: [
            [48,168,8,"up"],
            [152,168,8,"up"],
            [96,80,2,"up"],
            [168,60,2,"up"],
            [240,36,2,"up"]
        ],
        movers: [
            [56,128,16,8,96,128,54]
        ],
        dream: [
            [60,116,28,16],
            [132,80,28,16],
            [204,48,28,16]
        ],
        exit: [100,0,"old-site-bside2"]
    },

    'old-site-bside2': {
        name: "Old Site B-Side - Phantasm",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [104,160,32,24],
            [208,152,104,28],
            [24,124,24,16],
            [96,92,28,12],
            [168,64,28,12],
            [240,36,64,16],
            [144,8,40,16]
        ],
        spikes: [
            [48,168,7,"up"],
            [136,168,9,"up"],
            [96,84,2,"up"],
            [168,56,2,"up"],
            [240,28,2,"up"]
        ],
        movers: [
            [48,120,16,8,88,120,58],
            [128,80,16,8,152,80,60]
        ],
        dream: [
            [64,112,24,16],
            [136,80,24,16]
        ],
        bubbles: [
            [148,76,9,"#a879ff"]
        ],
        badelines: [
            [280,112]
        ],
        exit: [156,0,"old-site"]
    },

    'resort': {
        name: "Celestial Resort - Service Entrance",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [136,152,48,32],
            [232,144,88,40],
            [24,76,44,12],
            [96,112,36,12],
            [176,88,40,16],
            [252,60,60,20],
            [168,36,40,16],
            [96,16,48,16]
        ],
        spikes: [
            [64,168,9,"up"],
            [184,168,6,"up"],
            [176,80,2,"up"],
            [252,52,2,"up"]
        ],
        springs: [
            [48,120,2]
        ],
        berries: [
            [28,60,"resort-secret-laundry"]
        ],
        exit: [108,0,"resort-lobby"]
    },

    'resort-lobby': {
        name: "Celestial Resort - Grand Lobby",
        spawn: [16,146],
        terrain: [
            [0,160,56,24],
            [112,160,48,24],
            [224,160,96,24],
            [80,128,32,16],
            [152,112,32,16],
            [232,88,40,16],
            [160,64,32,16],
            [88,40,32,16],
            [184,24,40,16],
            [280,120,32,16],
            [232,48,24,12]
        ],
        spikes: [
            [48,152,2,"up"],
            [128,152,2,"up"],
            [286,112,2,"up"],
            [104,32,2,"up"],
            [220,16,1,"up"]
        ],
        springs: [
            [32,144,1],
            [144,96,2]
        ],
        kevin: [
            [256,72,24,32]
        ],
        exit: [192,0,"resort2"]
    },

    'resort2': {
        name: "Celestial Resort - Presidential Suite",
        background: "resort",
        spawn: [16,146],
        terrain: [
            [0,160,56,24],
            [120,156,44,28],
            [224,148,88,36],
            [24,120,36,16],
            [104,100,36,16],
            [176,76,40,16],
            [256,52,56,24],
            [176,32,40,16],
            [96,12,48,16],
            [280,112,24,16]
        ],
        spikes: [
            [56,168,8,"up"],
            [164,168,7,"up"],
            [104,92,2,"up"],
            [176,68,2,"up"],
            [256,44,2,"up"]
        ],
        springs: [
            [32,104,1]
        ],
        bubbles: [
            [200,58,9,"#6ef3ef"]
        ],
        gate: [
            [228,100,50,8]
        ],
        switches: [
            [188,16,[[228,100]]]
        ],
        berries: [
            [288,96,"resort-secret-suite"]
        ],
        exit: [112,0,"resort-finale"]
    },

    'resort-finale': {
        name: "Celestial Resort - Rooftop",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [128,156,44,28],
            [224,148,96,36],
            [36,124,36,16],
            [112,100,36,16],
            [180,76,36,16],
            [248,52,64,24],
            [172,28,40,16],
            [96,12,48,16],
            [16,48,24,16],
            [280,160,40,24]
        ],
        spikes: [
            [64,168,8,"up"],
            [172,168,6,"up"],
            [112,92,2,"up"],
            [196,68,2,"up"],
            [248,44,2,"up"]
        ],
        movers: [
            [68,112,24,8,92,112,44],
            [132,72,24,8,156,72,46]
        ],
        cassette: [20,34,"cassette-resort","resort-bside"],
        exits: [
            [112,0,"mirror"],
            [296,136,"resort-cellars","right"]
        ]
    },

    'resort-cellars': {
        name: "Celestial Resort - Old Cellars",
        spawn: [288,20],
        terrain: [
            [240,32,80,16],
            [168,56,56,16],
            [96,80,56,16],
            [32,104,48,16],
            [88,136,64,24],
            [192,144,128,40]
        ],
        spikes: [
            [168,48,3,"up"],
            [96,72,3,"up"],
            [200,136,3,"up"],
            [280,152,2,"up"]
        ],
        springs: [
            [52,96,1]
        ],
        bubbles: [
            [224,92,9,"#6ef3ef"],
            [140,116,9,"#6ef3ef"]
        ],
        berries: [
            [28,124,"resort-secret-vintage"]
        ],
        exit: [296,120,"resort-finale"]
    },

    'resort-bside': {
        name: "Celestial Resort B-Side - Clutter",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [116,152,36,28],
            [224,144,88,36],
            [24,112,28,16],
            [96,88,32,12],
            [168,68,32,12],
            [240,44,56,16],
            [160,20,36,12],
            [88,8,40,16]
        ],
        spikes: [
            [48,168,8,"up"],
            [152,168,9,"up"],
            [96,80,2,"up"],
            [168,60,2,"up"],
            [240,36,2,"up"]
        ],
        springs: [
            [36,96,2]
        ],
        movers: [
            [56,128,16,8,96,128,58],
            [128,88,16,8,160,88,60]
        ],
        exit: [100,0,"resort-bside2"]
    },

    'resort-bside2': {
        name: "Celestial Resort B-Side - Suite Lunacy",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [108,160,32,24],
            [212,152,100,28],
            [24,124,24,16],
            [96,92,28,12],
            [168,64,28,12],
            [240,36,64,16],
            [144,8,40,16]
        ],
        spikes: [
            [48,168,7,"up"],
            [140,168,9,"up"],
            [96,84,2,"up"],
            [168,56,2,"up"],
            [240,28,2,"up"]
        ],
        movers: [
            [48,120,16,8,88,120,60],
            [128,80,16,8,152,80,62]
        ],
        bubbles: [
            [220,44,9,"#66ffd0"]
        ],
        exit: [156,0,"resort"]
    },

    'mirror': {
        name: "Mirror Temple - Entrance",
        background: "mirror",
        spawn: [16,146],
        terrain: [
            [0,160,56,24],
            [124,156,44,28],
            [228,148,84,36],
            [24,76,44,12],
            [104,112,36,12],
            [180,84,40,16],
            [252,60,60,20],
            [172,36,40,16],
            [96,16,48,16]
        ],
        spikes: [
            [56,168,8,"up"],
            [168,168,7,"up"],
            [180,76,2,"up"],
            [252,52,2,"up"]
        ],
        bubbles: [
            [80,116,10,"#a879ff"],
            [160,84,10,"#a879ff"],
            [236,52,10,"#a879ff"]
        ],
        berries: [
            [28,60,"mirror-secret-entrance"]
        ],
        exit: [112,0,"mirror-depths"]
    },

    'mirror-depths': {
        name: "Mirror Temple - Depths",
        background: "mirror",
        spawn: [16,146],
        terrain: [
            [0,160,56,24],
            [116,156,40,28],
            [220,148,92,36],
            [24,120,36,16],
            [96,100,36,16],
            [172,76,40,16],
            [248,52,64,24],
            [168,28,40,16],
            [88,12,48,16]
        ],
        spikes: [
            [56,168,7,"up"],
            [156,168,8,"up"],
            [96,92,2,"up"],
            [172,68,2,"up"],
            [248,44,2,"up"]
        ],
        bubbles: [
            [80,112,9,"#aa82ff"],
            [152,76,9,"#aa82ff"],
            [224,44,9,"#aa82ff"]
        ],
        seekers: [
            [280,104]
        ],
        exit: [104,0,"mirror-sanctum"]
    },

    'mirror-sanctum': {
        name: "Mirror Temple - Sanctum",
        background: "mirror",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [124,156,44,28],
            [224,148,88,36],
            [24,84,44,12],
            [108,112,36,12],
            [180,84,40,16],
            [256,56,56,24],
            [172,32,40,16],
            [96,12,48,16]
        ],
        spikes: [
            [64,168,7,"up"],
            [168,168,7,"up"],
            [180,76,2,"up"],
            [256,48,2,"up"]
        ],
        movers: [
            [68,112,24,8,92,112,46]
        ],
        bubbles: [
            [232,58,10,"#a879ff"]
        ],
        seekers: [
            [280,112]
        ],
        berries: [
            [28,68,"mirror-secret-sanctum"]
        ],
        exit: [112,0,"mirror-temple"]
    },

    'mirror-temple': {
        name: "Mirror Temple - Escape",
        background: "mirror",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [128,156,44,28],
            [228,148,84,36],
            [36,124,36,16],
            [112,100,36,16],
            [184,76,36,16],
            [256,52,56,24],
            [176,28,40,16],
            [96,12,48,16],
            [272,40,32,16]
        ],
        spikes: [
            [64,168,8,"up"],
            [172,168,7,"up"],
            [112,92,2,"up"],
            [184,68,2,"up"],
            [256,44,2,"up"]
        ],
        bubbles: [
            [224,60,9,"#a879ff"]
        ],
        badelines: [
            [280,120]
        ],
        cassette: [280,26,"cassette-mirror","mirror-bside"],
        exit: [112,0,"summit"]
    },

    'mirror-bside': {
        name: "Mirror Temple B-Side - Reflections",
        background: "mirror",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [116,152,36,28],
            [224,144,88,36],
            [24,112,28,16],
            [96,88,32,12],
            [168,68,32,12],
            [240,44,56,16],
            [160,20,36,12],
            [88,8,40,16]
        ],
        spikes: [
            [48,168,8,"up"],
            [152,168,9,"up"],
            [96,80,2,"up"],
            [168,60,2,"up"],
            [240,36,2,"up"]
        ],
        bubbles: [
            [80,112,9,"#aa82ff"],
            [152,76,9,"#aa82ff"],
            [224,40,9,"#aa82ff"]
        ],
        seekers: [
            [280,112]
        ],
        exit: [100,0,"mirror-bside2"]
    },

    'mirror-bside2': {
        name: "Mirror Temple B-Side - Void Glass",
        background: "mirror",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [108,160,32,24],
            [212,152,100,28],
            [24,124,24,16],
            [96,92,28,12],
            [168,64,28,12],
            [240,36,64,16],
            [144,8,40,16]
        ],
        spikes: [
            [48,168,7,"up"],
            [140,168,9,"up"],
            [96,84,2,"up"],
            [168,56,2,"up"],
            [240,28,2,"up"]
        ],
        bubbles: [
            [76,116,9,"#aa82ff"],
            [148,76,9,"#aa82ff"],
            [220,40,9,"#aa82ff"]
        ],
        badelines: [
            [280,112]
        ],
        triggerSpikes: [
            [112,152,2],
            [232,152,3]
        ],
        exit: [156,0,"mirror"]
    },

    'summit': {
        name: "The Summit - Snowline",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,64,24],
            [124,156,44,28],
            [224,148,88,36],
            [24,76,44,12],
            [104,112,36,12],
            [176,84,40,16],
            [252,60,60,20],
            [168,36,40,16],
            [96,16,48,16]
        ],
        spikes: [
            [64,168,7,"up"],
            [168,168,7,"up"],
            [176,76,2,"up"],
            [252,52,2,"up"]
        ],
        springs: [
            [48,120,2]
        ],
        berries: [
            [28,60,"summit-secret-snowbank"]
        ],
        exit: [112,0,"summit-ridge"]
    },

    'summit-ridge': {
        name: "The Summit - Razor Ridge",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,72,24],
            [136,160,48,24],
            [232,160,88,24],
            [88,124,32,20],
            [160,108,32,16],
            [224,84,32,20],
            [176,56,32,16],
            [104,36,32,16],
            [40,16,40,16]
        ],
        spikes: [
            [56,152,2,"up"],
            [152,152,2,"up"],
            [104,28,2,"up"],
            [184,48,2,"up"],
            [248,76,2,"up"]
        ],
        wind: [40,16,240,120,-1,38],
        exit: [48,0,"summit-gale"]
    },

    'summit-gale': {
        name: "The Summit - Gale Tunnel",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,64,24],
            [120,156,44,28],
            [224,148,88,36],
            [24,128,36,16],
            [104,100,36,16],
            [176,76,40,16],
            [256,52,56,24],
            [176,32,40,16],
            [88,12,48,16],
            [280,112,24,16]
        ],
        spikes: [
            [64,168,7,"up"],
            [164,168,7,"up"],
            [104,92,2,"up"],
            [176,68,2,"up"],
            [256,44,2,"up"]
        ],
        bubbles: [
            [80,114,9,"#d9fbff"],
            [156,76,9,"#d9fbff"],
            [228,44,9,"#d9fbff"]
        ],
        gate: [
            [60,132,40,8]
        ],
        switches: [
            [40,112,[[60,132]]]
        ],
        wind: [48,24,240,120,-1,36],
        feather: [40,96],
        berries: [
            [288,96,"summit-secret-weather-station"]
        ],
        exit: [100,0,"summit-aurora"]
    },

    'summit-aurora': {
        name: "The Summit - Aurora Crossing",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,72,24],
            [104,128,32,12],
            [168,104,32,12],
            [232,80,40,16],
            [120,56,40,12],
            [40,40,48,16],
            [200,24,48,16]
        ],
        spikes: [
            [72,152,2,"up"],
            [176,96,2,"up"],
            [240,72,2,"up"],
            [48,32,2,"up"]
        ],
        wind: [0,16,320,130,-1,46],
        feather: [16,140],
        berries: [
            [288,60,"summit-secret-aurora"]
        ],
        exit: [216,0,"summit-final"]
    },

    'summit-final': {
        name: "The Summit - 3000M",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,64,24],
            [128,156,44,28],
            [224,148,96,36],
            [36,124,36,16],
            [112,100,36,16],
            [180,76,36,16],
            [248,52,64,24],
            [172,28,40,16],
            [96,12,48,16],
            [16,48,24,16]
        ],
        spikes: [
            [64,168,8,"up"],
            [172,168,6,"up"],
            [112,92,2,"up"],
            [196,68,2,"up"],
            [248,44,2,"up"]
        ],
        movers: [
            [68,112,24,8,92,112,50],
            [132,72,24,8,156,72,52]
        ],
        cassette: [20,34,"cassette-summit","summit2"],
        exit: [112,0,"core"]
    },

    'summit-peak': {
        name: "The Summit - Mountain Peak",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,80,24],
            [112,156,56,28],
            [208,148,104,36],
            [32,124,40,16],
            [104,100,40,16],
            [176,76,40,16],
            [248,52,64,24],
            [168,32,48,16],
            [88,12,48,16]
        ],
        spikes: [
            [56,168,7,"up"],
            [168,168,5,"up"],
            [104,92,2,"up"],
            [176,68,2,"up"],
            [248,44,2,"up"]
        ],
        heartGem: [184,16]
    },

    'summit2': {
        name: "The Summit B-Side - Thin Air",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,48,24],
            [116,152,36,28],
            [224,144,88,36],
            [24,112,28,16],
            [96,88,32,12],
            [168,68,32,12],
            [240,44,56,16],
            [160,20,36,12],
            [88,8,40,16]
        ],
        spikes: [
            [48,168,8,"up"],
            [152,168,9,"up"],
            [96,80,2,"up"],
            [168,60,2,"up"],
            [240,36,2,"up"]
        ],
        movers: [
            [56,128,16,8,96,128,60],
            [128,88,16,8,160,88,62]
        ],
        wind: [40,24,248,120,-1,42],
        exit: [100,0,"summit3"]
    },

    'summit3': {
        name: "The Summit C-Side - Whiteout",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,48,24],
            [108,160,32,24],
            [212,152,100,28],
            [24,124,24,16],
            [96,92,28,12],
            [168,64,28,12],
            [240,36,64,16],
            [144,8,40,16]
        ],
        spikes: [
            [48,168,7,"up"],
            [140,168,9,"up"],
            [96,84,2,"up"],
            [168,56,2,"up"],
            [240,28,2,"up"]
        ],
        bubbles: [
            [76,116,9,"#d9fbff"],
            [148,76,9,"#d9fbff"],
            [220,40,9,"#d9fbff"]
        ],
        wind: [32,16,264,128,-1,52],
        exit: [156,0,"summit"]
    },

    'core': {
        name: "Core - Threshold",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [124,156,44,28],
            [224,148,88,36],
            [24,76,44,12],
            [104,112,36,12],
            [176,84,40,16],
            [252,60,60,20],
            [168,36,40,16],
            [96,16,48,16]
        ],
        spikes: [
            [64,168,7,"up"],
            [168,168,7,"up"],
            [176,76,2,"up"],
            [252,52,2,"up"]
        ],
        springs: [
            [48,120,1]
        ],
        bubbles: [
            [232,60,9,"#ff8b61"]
        ],
        berries: [
            [28,60,"core-secret-vent"]
        ],
        exit: [112,0,"core-furnace"]
    },

    'core-furnace': {
        name: "Core - Magma Conduit",
        spawn: [16,146],
        terrain: [
            [0,160,60,24],
            [132,160,40,24],
            [236,160,84,24],
            [76,126,28,18],
            [188,110,32,16],
            [268,92,32,16],
            [120,70,32,16],
            [204,16,32,16],
            [288,44,32,16],
            [48,72,24,16]
        ],
        spikes: [
            [36,152,2,"up"],
            [148,152,2,"up"],
            [84,118,2,"up"],
            [128,62,2,"up"]
        ],
        bubbles: [
            [252,74,9,"#ff8b61"]
        ],
        kevin: [
            [152,128,24,24],
            [40,96,24,24]
        ],
        exit: [212,0,"core-depths"]
    },

    'core-depths': {
        name: "Core - Depths",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [112,156,44,28],
            [216,148,96,36],
            [24,124,36,16],
            [104,100,36,16],
            [176,76,40,16],
            [248,52,64,24],
            [172,28,40,16],
            [88,12,48,16],
            [280,112,24,16]
        ],
        spikes: [
            [64,168,6,"up"],
            [156,168,7,"up"],
            [104,92,2,"up"],
            [176,68,2,"up"],
            [248,44,2,"up"]
        ],
        movers: [
            [64,112,24,8,88,112,48],
            [132,72,24,8,148,72,50]
        ],
        bubbles: [
            [232,54,9,"#ff8b61"]
        ],
        kevin: [
            [256,56,24,24]
        ],
        triggerSpikes: [
            [136,152,2],
            [240,144,2]
        ],
        berries: [
            [288,96,"core-secret-coolant"]
        ],
        exit: [104,0,"core-escape"]
    },

    'core-escape': {
        name: "Core - Escape",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [128,156,44,28],
            [228,148,84,36],
            [36,124,36,16],
            [112,100,36,16],
            [184,76,36,16],
            [256,52,56,24],
            [176,28,40,16],
            [96,12,48,16],
            [272,40,32,16]
        ],
        spikes: [
            [64,168,8,"up"],
            [172,168,7,"up"],
            [112,92,2,"up"],
            [184,68,2,"up"],
            [256,44,2,"up"]
        ],
        bubbles: [
            [216,62,9,"#ff8b61"]
        ],
        badelines: [
            [280,120]
        ],
        cassette: [280,26,"cassette-core","core2"],
        exit: [112,0,"farewell"]
    },

    'core2': {
        name: "Core B-Side - Overheat",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [116,152,36,28],
            [224,144,88,36],
            [24,112,28,16],
            [96,88,32,12],
            [168,68,32,12],
            [240,44,56,16],
            [160,20,36,12],
            [88,8,40,16]
        ],
        spikes: [
            [48,168,8,"up"],
            [152,168,9,"up"],
            [96,80,2,"up"],
            [168,60,2,"up"],
            [240,36,2,"up"]
        ],
        movers: [
            [56,128,16,8,96,128,62],
            [128,88,16,8,156,88,64]
        ],
        bubbles: [
            [224,44,9,"#ff8b61"]
        ],
        exit: [100,0,"core-bside2"]
    },

    'core-bside2': {
        name: "Core B-Side - Magma Heart",
        spawn: [16,146],
        terrain: [
            [0,160,48,24],
            [108,160,32,24],
            [212,152,100,28],
            [24,124,24,16],
            [96,92,28,12],
            [168,64,28,12],
            [240,36,64,16],
            [144,8,40,16]
        ],
        spikes: [
            [48,168,7,"up"],
            [140,168,9,"up"],
            [96,84,2,"up"],
            [168,56,2,"up"],
            [240,28,2,"up"]
        ],
        movers: [
            [48,120,16,8,88,120,64],
            [128,80,16,8,152,80,66]
        ],
        bubbles: [
            [76,112,9,"#ff8b61"],
            [220,40,9,"#ff8b61"]
        ],
        kevin: [
            [192,120,24,24]
        ],
        exit: [156,0,"core"]
    },

    'farewell': {
        name: "Farewell - Departure",
        spawn: [16,146],
        terrain: [
            [0,160,56,24],
            [124,156,44,28],
            [228,148,84,36],
            [24,76,44,12],
            [104,112,36,12],
            [180,84,40,16],
            [252,60,60,20],
            [172,36,40,16],
            [96,16,48,16]
        ],
        spikes: [
            [56,168,8,"up"],
            [168,168,7,"up"],
            [180,76,2,"up"],
            [252,52,2,"up"]
        ],
        bubbles: [
            [80,116,9,"#78ffe1"],
            [160,84,9,"#78ffe1"],
            [236,52,9,"#78ffe1"]
        ],
        berries: [
            [28,60,"farewell-secret-departure"]
        ],
        exit: [112,0,"farewell-eventide"]
    },

    'farewell-eventide': {
        name: "Farewell - Eventide",
        spawn: [16,146],
        terrain: [
            [0,160,64,24],
            [116,156,40,28],
            [220,148,92,36],
            [24,124,36,16],
            [104,100,36,16],
            [176,76,40,16],
            [248,52,64,24],
            [168,28,40,16],
            [88,12,48,16]
        ],
        spikes: [
            [64,168,6,"up"],
            [156,168,8,"up"],
            [104,92,2,"up"],
            [176,68,2,"up"],
            [248,44,2,"up"]
        ],
        movers: [
            [64,112,24,8,84,112,52],
            [132,72,24,8,148,72,54]
        ],
        wind: [40,24,248,120,-1,44],
        exit: [104,0,"farewell-approach"]
    },

    'farewell-approach': {
        name: "Farewell - Approach",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,56,24],
            [112,156,44,28],
            [216,148,96,36],
            [24,124,36,16],
            [104,100,36,16],
            [176,76,40,16],
            [248,52,64,24],
            [172,28,40,16],
            [88,12,48,16],
            [280,112,24,16]
        ],
        spikes: [
            [56,168,7,"up"],
            [156,168,7,"up"],
            [104,92,2,"up"],
            [176,68,2,"up"],
            [248,44,2,"up"]
        ],
        bubbles: [
            [80,112,9,"#7effe4"],
            [152,76,9,"#7effe4"],
            [224,44,9,"#7effe4"]
        ],
        wind: [40,24,248,120,-1,50],
        berries: [
            [288,96,"farewell-secret-moon"]
        ],
        exit: [104,0,"farewell-final"]
    },

    'farewell-final': {
        name: "Farewell - Final Breath",
        spawn: [16,146],
        ice: true,
        terrain: [
            [0,160,48,24],
            [108,160,32,24],
            [212,152,100,28],
            [24,124,24,16],
            [96,92,28,12],
            [168,64,28,12],
            [240,36,64,16],
            [144,8,40,16],
            [280,112,24,16]
        ],
        spikes: [
            [48,168,7,"up"],
            [140,168,9,"up"],
            [96,84,2,"up"],
            [168,56,2,"up"],
            [240,28,2,"up"]
        ],
        movers: [
            [48,120,16,8,88,120,58],
            [124,84,16,8,152,84,60]
        ],
        bubbles: [
            [72,110,9,"#78ffe1"],
            [152,70,9,"#78ffe1"],
            [224,38,9,"#78ffe1"]
        ],
        wind: [32,16,264,128,-1,54],
        berries: [
            [288,96,"farewell-secret-last-breath",{"golden":true}]
        ],
        exit: [156,0,"summit-peak"]
    }
};


function applyCuratedRoomDesigns() {
    for (const [id, design] of Object.entries(CURATED_ROOM_DESIGNS)) {
        const room = rooms[id];
        if (!room) continue;

        if (design.name) room.name = design.name;
        if (design.background) room.background = design.background;
        room.spawn = { x: design.spawn[0], y: design.spawn[1] };
        room.solids = [];

        const addTiles = (rect, type = 'platform') => {
            const [rx, ry, rw, rh] = rect;
            for (let x = rx; x < rx + rw; x += TILE_SIZE) {
                for (let y = ry; y < ry + rh; y += TILE_SIZE) {
                    room.solids.push({
                        x, y, w: Math.min(TILE_SIZE, rx + rw - x), h: Math.min(TILE_SIZE, ry + rh - y),
                        type: y >= 160 ? 'ground' : type,
                        ice: Boolean(design.ice)
                    });
                }
            }
        };

        addTiles([0, 0, 8, ROOM_HEIGHT], 'wall');
        addTiles([ROOM_WIDTH - 8, 0, 8, ROOM_HEIGHT], 'wall');
        design.terrain.forEach(rect => addTiles(rect));

        room.spikes = [];
        for (const [x, y, count, dir] of design.spikes || []) {
            for (let i = 0; i < count; i++) {
                room.spikes.push({ x: x + (dir === 'up' || dir === 'down' ? i * 8 : 0), y: y + (dir === 'left' || dir === 'right' ? i * 8 : 0), w: 8, h: 8, dir });
            }
        }

        room.springs = (design.springs || []).map(([x, y, power]) => ({ x, y, w: 16, h: 16, power, timer: 0 }));
        room.movingPlatforms = (design.movers || []).map(([startX, startY, w, h, endX, endY, speed]) => ({
            x: startX, y: startY, w, h, startX, startY, endX, endY,
            originStartX: startX, originStartY: startY, originEndX: endX, originEndY: endY,
            speed, timer: 0, waitTimer: 0, waiting: false, type: 'moving'
        }));

        const legacyBerries = room.strawberries;
        room.strawberries = (design.berries || []).map((position, index) => ({
            x: position[0], y: position[1],
            id: position[2] || `${id}-secret-${index + 1}`,
            legacyId: legacyBerries[index]?.id || null,
            collected: false,
            golden: Boolean(position[3]?.golden),
            secret: position[3]?.secret !== false,
            wiggle: 0,
        }));
        // A room may define one `exit` or several `exits` (branching routes).
        const exitDefs = design.exits || (design.exit ? [design.exit] : []);
        room.flags = exitDefs.map(([x, y, targetRoom, dir]) => ({
            x, y,
            w: dir === 'left' || dir === 'right' ? 16 : 8,
            h: 24,
            targetRoom,
            exitDir: dir || 'up',
            timer: 0
        }));
        room.dreamBlocks = (design.dream || []).map(([x, y, w, h]) => ({ x, y, w, h, active: true, timer: 0 }));
        room.bubbles = (design.bubbles || []).map(([x, y, r, color]) => ({ x, y, r, color, timer: 0, active: true }));
        room.kevinBlocks = (design.kevin || []).map(([x, y, w, h]) => ({ x, y, w, h, timer: 0, active: true, particles: [], kevin: true }));
        room.seekers = (design.seekers || []).map(([x, y]) => ({ x, y, spawnX: x, spawnY: y, w: 8, h: 8, vx: 0, vy: 0, timer: 0, state: 'idle', targetX: x, targetY: y }));
        room.badelines = (design.badelines || []).map(([x, y]) => ({ x, y, spawnX: x, spawnY: y, w: 8, h: 8, vx: 0, vy: 0, timer: 0, state: 'idle', particles: [] }));
        room.cassetteBlocks = (design.gate || []).map(([x, y, w, h]) => ({ x, y, w, h, active: false, timer: 0 }));
        // Dash-activated switches: [x, y, [[gateX, gateY], ...]] — dashing
        // into the switch toggles the listed gate blocks.
        room.dashSwitches = (design.switches || []).map(([x, y, targets]) => ({
            x, y, w: 16, h: 16, activated: false, timer: 0,
            targets: (targets || []).map(([tx, ty]) => ({ x: tx, y: ty }))
        }));
        room.triggerSpikes = [];
        for (const [x, y, count, delay] of design.triggerSpikes || []) {
            for (let i = 0; i < count; i++) {
                room.triggerSpikes.push({ x: x + i * 8, y, w: 8, h: 8, dir: 'up', triggered: false, timer: 0, delay: delay || 0.5 });
            }
        }
        room.wind = design.wind ? { x: design.wind[0], y: design.wind[1], w: design.wind[2], h: design.wind[3], dir: design.wind[4], strength: design.wind[5] } : null;

        room.cassette = design.cassette ? {
            x: design.cassette[0], y: design.cassette[1], id: design.cassette[2], unlocks: design.cassette[3],
            collected: savedCassetteIds.has(design.cassette[2])
        } : null;
        room.feather = design.feather ? { x: design.feather[0], y: design.feather[1], collected: false } : null;
        if (!room.heartGem && design.heartGem) {
            room.heartGem = { x: design.heartGem[0], y: design.heartGem[1], collected: false };
        }
        if (room.heartGem && design.heartGem) Object.assign(room.heartGem, { x: design.heartGem[0], y: design.heartGem[1] });

        // Perimeter alcoves are optional routes, not free wall-climb shortcuts.
        const guardedTargets = [...room.strawberries, ...(room.cassette ? [room.cassette] : [])];
        const guardKeys = new Set();
        for (const target of guardedTargets) {
            const side = target.x < 40 ? 'left' : target.x > 272 ? 'right' : null;
            if (!side) continue;
            const guardY = Math.max(0, Math.floor((target.y - 16) / TILE_SIZE) * TILE_SIZE);
            const guardKey = `${side},${guardY}`;
            if (guardKeys.has(guardKey)) continue;
            guardKeys.add(guardKey);
            for (let i = 0; i < 4; i++) {
                room.spikes.push({ x: side === 'left' ? 8 : ROOM_WIDTH - 16, y: guardY + i * 8, w: 8, h: 8, dir: side === 'left' ? 'right' : 'left' });
            }
        }
    }
}

function switchRoom(targetRoom, direction = 'up') {
    if (roomTransition) return;
    roomTransition = {
        from: currentRoom,
        to: targetRoom,
        progress: 0,
        direction,
        phase: 'out'
    };
    screenShake = 0.5;
}

let renderScale = 1;

function resize() {
    if (!canvas || !ctx) return;
    const shellGutter = window.innerWidth <= 768 ? 24 : 44;
    const maxScale = Math.min(
        (window.innerWidth - shellGutter) / ROOM_WIDTH,
        (window.innerHeight - shellGutter) / ROOM_HEIGHT
    );
    renderScale = Math.max(0.5, maxScale >= 2 ? Math.floor(maxScale) : maxScale);
    canvas.width = ROOM_WIDTH * renderScale;
    canvas.height = ROOM_HEIGHT * renderScale;
    canvas.style.width = `${ROOM_WIDTH * renderScale}px`;
    canvas.style.height = `${ROOM_HEIGHT * renderScale}px`;
    ctx.imageSmoothingEnabled = false;
}


// Forgiving hazard hitboxes: spikes only kill near their visual point,
// anchored toward the base they point away from.
function spikeKillBox(s) {
    switch (s.dir) {
        case 'down': return { x: s.x + 1, y: s.y, w: s.w - 2, h: Math.max(3, s.h * 0.55) };
        case 'left': return { x: s.x + s.w - Math.max(3, s.w * 0.55), y: s.y + 1, w: Math.max(3, s.w * 0.55), h: s.h - 2 };
        case 'right': return { x: s.x, y: s.y + 1, w: Math.max(3, s.w * 0.55), h: s.h - 2 };
        default: return { x: s.x + 1, y: s.y + s.h - Math.max(3, s.h * 0.55), w: s.w - 2, h: Math.max(3, s.h * 0.55) };
    }
}

function boxOverlap(ax, ay, aw, ah, b) {
    return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}

function checkSolid(x, y, w, h) {
    for (const solid of currentRoomData.solids) {
        if (x < solid.x + solid.w && x + w > solid.x &&
            y < solid.y + solid.h && y + h > solid.y) {
            return solid;
        }
    }
    for (const mp of currentRoomData.movingPlatforms) {
        if (x < mp.x + mp.w && x + w > mp.x &&
            y < mp.y + mp.h && y + h > mp.y) {
            return mp;
        }
    }
    for (const db of currentRoomData.dreamBlocks) {
        // Dream blocks are intangible to an active dash so the player can
        // enter them; updateEntities() then dissolves the block.
        if (!db.active || player.dashTimer > 0) continue;
        if (x < db.x + db.w && x + w > db.x &&
            y < db.y + db.h && y + h > db.y) {
            return db;
        }
    }
    for (const kb of currentRoomData.kevinBlocks) {
        if (kb.active && x < kb.x + kb.w && x + w > kb.x &&
            y < kb.y + kb.h && y + h > kb.y) {
            return kb;
        }
    }
    for (const cb of currentRoomData.cassetteBlocks) {
        if (cb.active && x < cb.x + cb.w && x + w > cb.x &&
            y < cb.y + cb.h && y + h > cb.y) {
            return cb;
        }
    }
    return null;
}

function checkBubble(x, y, w, h) {
    for (const bubble of currentRoomData.bubbles) {
        if (bubble.active && x < bubble.x + bubble.r && x + w > bubble.x - bubble.r &&
            y < bubble.y + bubble.r && y + h > bubble.y - bubble.r) {
            return bubble;
        }
    }
    return null;
}

function checkKevinBlock(x, y, w, h) {
    for (const kb of currentRoomData.kevinBlocks) {
        if (kb.active && x < kb.x + kb.w && x + w > kb.x &&
            y < kb.y + kb.h && y + h > kb.y) {
            return kb;
        }
    }
    return null;
}

function checkCassetteBlock(x, y, w, h) {
    for (const cb of currentRoomData.cassetteBlocks) {
        if (cb.active && x < cb.x + cb.w && x + w > cb.x &&
            y < cb.y + cb.h && y + h > cb.y) {
            return cb;
        }
    }
    return null;
}

function checkSeeker(x, y, w, h) {
    for (const seeker of currentRoomData.seekers) {
        if (x < seeker.x + seeker.w && x + w > seeker.x &&
            y < seeker.y + seeker.h && y + h > seeker.y) {
            return seeker;
        }
    }
    return null;
}

function checkBadeline(x, y, w, h) {
    for (const badeline of currentRoomData.badelines) {
        if (x < badeline.x + badeline.w && x + w > badeline.x &&
            y < badeline.y + badeline.h && y + h > badeline.y) {
            return badeline;
        }
    }
    return null;
}

function checkTriggerSpike(x, y, w, h) {
    for (const ts of currentRoomData.triggerSpikes) {
        if (ts.triggered && boxOverlap(x, y, w, h, spikeKillBox(ts))) {
            return ts;
        }
    }
    return null;
}

function checkDashSwitch(x, y, w, h) {
    for (const ds of currentRoomData.dashSwitches) {
        if (!ds.activated && x < ds.x + ds.w && x + w > ds.x &&
            y < ds.y + ds.h && y + h > ds.y) {
            return ds;
        }
    }
    return null;
}

function checkSpikes(x, y, w, h) {
    for (const spike of currentRoomData.spikes) {
        if (boxOverlap(x, y, w, h, spikeKillBox(spike))) {
            return spike;
        }
    }
    return null;
}

function checkSpring(x, y, w, h) {
    for (const spring of currentRoomData.springs) {
        if (x < spring.x + spring.w && x + w > spring.x &&
            y < spring.y + spring.h && y + h > spring.y) {
            return spring;
        }
    }
    return null;
}

function checkStrawberry(x, y, w, h) {
    for (const berry of currentRoomData.strawberries) {
        if (!berry.collected && x < berry.x + 8 && x + w > berry.x &&
            y < berry.y + 8 && y + h > berry.y) {
            return berry;
        }
    }
    return null;
}

function checkFlag(x, y, w, h) {
    for (const flag of currentRoomData.flags) {
        if (x < flag.x + flag.w && x + w > flag.x &&
            y < flag.y + flag.h && y + h > flag.y) {
            return flag;
        }
    }
    return null;
}


function spawnParticles(x, y, color, count, speed = 50, gravity = 200) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * speed + 20;
        particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: 1,
            maxLife: 0.5 + Math.random() * 0.5,
            color,
            size: 1 + Math.random() * 2,
            gravity
        });
    }
}

function spawnBurst(x, y, color, count, speed = 100, gravity = 0, sizeMult = 1) {
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const spd = Math.random() * speed + 50;
        particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: 1,
            maxLife: 0.4 + Math.random() * 0.4,
            color,
            size: (1 + Math.random() * 2) * sizeMult,
            gravity
        });
    }
}

function spawnTrail(x, y, color, count = 5, spread = 20) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * spread,
            y: y + (Math.random() - 0.5) * spread,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20 - 10,
            life: 1,
            maxLife: 0.2 + Math.random() * 0.3,
            color,
            size: 1 + Math.random() * 1.5,
            gravity: 0
        });
    }
}

function spawnDashParticles() {
    for (let i = 0; i < 3; i++) {
        particles.push({
            x: player.x + player.w/2,
            y: player.y + player.h/2,
            vx: -player.dashDirX * 50 + (Math.random() - 0.5) * 30,
            vy: -player.dashDirY * 50 + (Math.random() - 0.5) * 30,
            life: 1,
            maxLife: 0.3,
            color: '#fff',
            size: 2 + Math.random() * 2,
            gravity: 0
        });
    }
}

function spawnDashTrail() {
    const now = performance.now();
    if (now - lastDashTrailTime > 30) {
        lastDashTrailTime = now;
        const trailColor = player.color === '#00d4ff' ? '#44aaff' : player.color;
        for (let i = 0; i < 2; i++) {
            const offsetX = (Math.random() - 0.5) * 4;
            const offsetY = (Math.random() - 0.5) * 4;
            particles.push({
                x: player.x + player.w/2 + offsetX,
                y: player.y + player.h/2 + offsetY,
                vx: -player.dashDirX * 30 + (Math.random() - 0.5) * 20,
                vy: -player.dashDirY * 30 + (Math.random() - 0.5) * 20,
                life: 1,
                maxLife: 0.4 + Math.random() * 0.2,
                color: trailColor,
                size: 2 + Math.random() * 2,
                gravity: player.dashDirY > 0 ? 50 : 0
            });
        }
    }
}

function spawnLandingParticles() {
    for (let i = 0; i < 10; i++) {
        const dir = i < 5 ? -1 : 1;
        particles.push({
            x: player.x + player.w / 2 + dir * (2 + Math.random() * 3),
            y: player.y + player.h - 1,
            vx: dir * (18 + Math.random() * 42),
            vy: -8 - Math.random() * 26,
            life: 1,
            maxLife: 0.22 + Math.random() * 0.18,
            color: Math.random() < 0.5 ? '#ffffff' : '#cdd8ea',
            size: 1 + Math.random() * 2,
            gravity: 170
        });
    }
}

function initHair() {
    const headX = player.x + player.w / 2;
    const headY = player.y + 2;
    player.hairNodes = Array.from({ length: 6 }, (_, index) => ({
        x: headX - player.facing * index * 1.6,
        y: headY + index * 0.7
    }));
}

function updateHair(dt) {
    if (!player.hairNodes.length) initHair();

    const nodes = player.hairNodes;
    nodes[0].x = player.x + player.w / 2 - player.facing * 1.5;
    nodes[0].y = player.y + 2;

    for (let i = 1; i < nodes.length; i++) {
        const node = nodes[i];
        const previous = nodes[i - 1];
        const segmentLength = 1.7;

        if (player.dashTimer > 0) {
            node.x -= player.dashDirX * 60 * dt;
            node.y -= player.dashDirY * 60 * dt;
        } else {
            node.y += (20 + i * 3) * dt;
            node.x += Math.sin(gameTime * 8 + i * 1.3) * 2 * dt;
        }

        let dx = node.x - previous.x;
        let dy = node.y - previous.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 0.001) {
            dx = -player.facing;
            dy = 0.25;
            distance = Math.hypot(dx, dy);
        }

        node.x = previous.x + dx / distance * segmentLength;
        node.y = previous.y + dy / distance * segmentLength;
    }
}

function drawPlayerHair() {
    if (player.invincible && Math.floor(player.invincibleTimer * 20) % 2 === 0) return;
    if (!player.hairNodes.length) return;

    const hairColor = player.dashTimer > 0
        ? '#ffffff'
        : player.dashes === 0 ? '#4aa6df' : player.hairColor;

    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    for (let i = player.hairNodes.length - 1; i >= 0; i--) {
        const node = player.hairNodes[i];
        const radius = Math.max(1, 2.5 - i * 0.25);
        ctx.fillStyle = i === 0 && player.dashes > 0 ? '#ef5570' : hairColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    const highlight = player.hairNodes[1];
    if (highlight) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(highlight.x - 1, highlight.y - 1, 1, 1);
    }
    ctx.restore();
}

function spawnShockwave(x, y, maxRadius, color) {
    shockwaves.push({ x, y, radius: 2, maxRadius, life: 1, color });
}

function updateShockwaves(dt) {
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const wave = shockwaves[i];
        wave.life -= dt * 3;
        wave.radius = wave.maxRadius * (1 - Math.max(0, wave.life));
        if (wave.life <= 0) shockwaves.splice(i, 1);
    }
}

function drawShockwaves() {
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    for (const wave of shockwaves) {
        ctx.globalAlpha = wave.life * 0.85;
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, Math.max(1, wave.radius), 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

function startDeath() {
    player.dying = true;
    player.deathTimer = 0.5;
    player.vx = player.vx * 0.3;
    player.vy = Math.min(player.vy, 50);
    screenShake = 0.2;

    const deathX = player.x + player.w/2;
    const deathY = player.y + player.h/2;
    spawnParticles(deathX, deathY, '#ff6b6b', 40, 120);
    spawnParticles(deathX, deathY, '#ffffff', 20, 80);
    playSound('death');
    unlockAchievement('first_death');
}

function respawn() {
    deaths++;
    DEATHS_EL.textContent = `Deaths: ${deaths}`;
    saveGame();
    resetRoomState();
    player.goldenBerryRun = false;
    player.ghostRecording = [];
    respawnPlayerAtSpawn();
}

function respawnPlayerAtSpawn() {
    player.x = player.spawnX;
    player.y = player.spawnY;
    initHair();
    player.vx = 0;
    player.vy = 0;
    player.dashes = player.maxDashes;
    player.dashTimer = 0;
    player.dashCooldown = 0;
    player.onGround = false;
    player.onWall = false;
    player.climbing = false;
    player.stamina = player.maxStamina;
    player.inBubble = false;
    player.bubble = null;
    player.hasFeather = false;
    player.featherTimer = 0;
    player.jumpBufferTimer = 0;
    player.coyoteTimer = 0;
    player.varJumpTimer = 0;
    player.wallLockoutTimer = 0;
    player.justRespawned = true;
    player.invincible = true;
    player.invincibleTimer = 0.5;
    player.dying = false;
    player.deathTimer = 0;
    screenShake = 0.5;
}

// Pause-menu retry: rebuild hazards in place without leaving the current room
// (initRooms() would desync currentRoomData back to the prologue).
function restartCurrentRoom() {
    resetRoomState();
    player.spawnX = currentRoomData.spawn.x;
    player.spawnY = currentRoomData.spawn.y;
    respawnPlayerAtSpawn();
    particles.length = 0;
    dashAfterimages.length = 0;
    cameraX = player.x - ROOM_WIDTH / 2;
    cameraY = player.y - ROOM_HEIGHT / 2;
}

function resetRoomState() {
    for (const mp of currentRoomData.movingPlatforms) {
        mp.startX = mp.originStartX;
        mp.startY = mp.originStartY;
        mp.endX = mp.originEndX;
        mp.endY = mp.originEndY;
        mp.x = mp.startX;
        mp.y = mp.startY;
        mp.timer = 0;
        mp.waitTimer = 0;
        mp.waiting = false;
        mp.vx = 0;
        mp.vy = 0;
    }
    for (const spring of currentRoomData.springs) spring.timer = 0;
    for (const db of currentRoomData.dreamBlocks) {
        db.active = true;
        db.timer = 0;
    }
    for (const bubble of currentRoomData.bubbles) {
        bubble.active = true;
        bubble.timer = 0;
    }
    for (const kb of currentRoomData.kevinBlocks) {
        kb.active = true;
        kb.timer = 0;
        kb.particles = [];
    }
    for (const cb of currentRoomData.cassetteBlocks) {
        cb.active = false;
        cb.timer = 0;
    }
    if (currentRoomData.feather) {
        currentRoomData.feather.collected = false;
    }
    for (const seeker of currentRoomData.seekers) {
        seeker.x = seeker.spawnX;
        seeker.y = seeker.spawnY;
        seeker.vx = 0;
        seeker.vy = 0;
        seeker.timer = 0;
        seeker.state = 'idle';
        seeker.charging = false;
        seeker.chargeTimer = 0;
    }
    for (const badeline of currentRoomData.badelines) {
        badeline.x = badeline.spawnX;
        badeline.y = badeline.spawnY;
        badeline.vx = 0;
        badeline.vy = 0;
        badeline.timer = 0;
        badeline.state = 'idle';
        badeline.charging = false;
        badeline.chargeTimer = 0;
        badeline.particles = [];
    }
    for (const ts of currentRoomData.triggerSpikes) {
        ts.triggered = false;
        ts.timer = 0;
    }
    for (const ds of currentRoomData.dashSwitches) {
        ds.activated = false;
        ds.timer = 0;
    }
}

function collectStrawberry(berry) {
    berry.collected = true;
    collectedStrawberries++;
    STRAWBERRIES_EL.textContent = `Strawberries: ${collectedStrawberries}/${totalStrawberries}`;
    saveGame();
    spawnBurst(berry.x + 4, berry.y + 4, '#ff3366', 30, 120, 0, 1.5);
    playSound('berry');
    screenShake = 0.15;

    if (collectedStrawberries >= 10) unlockAchievement('strawberry_queen');

    const chapterProgress = getChapterProgress(chapterIdOfRoom(currentRoom));
    if (chapterProgress && chapterProgress.total > 0 && chapterProgress.collected === chapterProgress.total) {
        unlockAchievement('completionist');
    }

    if (berry.golden && player.goldenBerryRun) {
        player.goldenBerries++;
        unlockAchievement('golden_berry');
        spawnBurst(berry.x + 4, berry.y + 4, '#ffd700', 60, 200, 0, 2);
        playSound('cassette');
        screenShake = 0.3;
        goldenBerryFlash = 1;
    }
}


function updatePlayer(dt) {
    if (player.justRespawned) {
        player.justRespawned = false;
        return;
    }

    if (player.invincibleTimer > 0) {
        player.invincibleTimer -= dt;
        if (player.invincibleTimer <= 0) player.invincible = false;
    }
    if (player.kevinFeedbackTimer > 0) player.kevinFeedbackTimer -= dt;

    // Feather mode counts down even while grounded (prevents infinite hops).
    if (player.hasFeather) {
        player.featherTimer -= dt;
        if (player.featherTimer <= 0) {
            player.hasFeather = false;
            player.featherTimer = 0;
            spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ffffff', 10, 60);
        }
    }

    player.squash = lerp(player.squash, 1, 10 * dt);
    player.stretch = lerp(player.stretch, 1, 10 * dt);

    const bubble = checkBubble(player.x, player.y, player.w, player.h);
    if (bubble && bubble.active) {
        player.inBubble = true;
        player.bubble = bubble;
        player.vy = Math.max(player.vy, -50);
        player.vx *= 0.95;
        if (input.jumpPressed) {
            player.vy = BUBBLE_BOOST;
            player.inBubble = false;
            player.bubble = null;
            bubble.active = false;
            bubble.timer = 2;
            player.jumpBufferTimer = 0;
            input.jumpPressed = false;
            spawnParticles(bubble.x, bubble.y, bubble.color, 20, 60);
            playSound('spring');
        }
        player.dashes = player.maxDashes;
        player.stamina = player.maxStamina;
    } else {
        player.inBubble = false;
        player.bubble = null;
    }

    if (player.dashTimer > 0) {
        player.dashTimer -= dt;
        if (player.dashTimer <= 0) {
            player.dashTimer = 0;
            player.dashCooldown = DASH_COOLDOWN;
                player.vx = player.dashDirX * MOVE_SPEED;
            player.vy = player.dashDirY * MOVE_SPEED;
            player.squash = 1.3;
            player.stretch = 0.7;
            spawnParticles(player.x + player.w/2, player.y + player.h/2, '#44aaff', 15, 100);
        } else {
            player.squash = 0.7;
            player.stretch = 1.4;
            dashAfterimages.push({ x: player.x, y: player.y, facing: player.facing, life: 0.32, maxLife: 0.32 });
        }
    } else if (player.dashCooldown > 0) {
        player.dashCooldown -= dt;
    }

    if (player.coyoteTimer > 0) player.coyoteTimer -= dt;
    if (player.jumpBufferTimer > 0) player.jumpBufferTimer -= dt;
    if (player.varJumpTimer > 0) {
        player.varJumpTimer -= dt;
        if (!input.jump) player.varJumpTimer = 0;
    }
    if (player.wallLockoutTimer > 0) player.wallLockoutTimer -= dt;

    player.onGround = false;
    player.onWall = false;
    player.wallDir = 0;
    player.onIce = false;
    let onMovingPlatform = null;

    const footY = player.y + player.h;
    const solidBelow = checkSolid(player.x + 1, footY, player.w - 2, 2);
    if (solidBelow) {
        player.onGround = true;
        player.coyoteTimer = COYOTE_TIME;
        if (DASH_REFRESH_ON_GROUND) player.dashes = player.maxDashes;
        if (solidBelow.type === 'moving') onMovingPlatform = solidBelow;
        if (solidBelow.ice) player.onIce = true;
    }

    const solidLeft = checkSolid(player.x - 2, player.y + 2, 2, player.h - 4);
    const solidRight = checkSolid(player.x + player.w, player.y + 2, 2, player.h - 4);

    // Wall contact counts while rising as well as falling so players can
    // latch on mid-jump; slide/climb logic below decides what it means.
    if (solidLeft && !player.onGround) {
        player.onWall = true;
        player.wallDir = -1;
        if (DASH_REFRESH_ON_WALL) player.dashes = player.maxDashes;
        if (player.vy > 0 && player.vy < MAX_FALL_SPEED) {
            const wallX = solidLeft.x + solidLeft.w;
            spawnParticles(wallX, player.y + Math.random() * player.h, '#dfe7f2', 1, 20);
        }
    } else if (solidRight && !player.onGround) {
        player.onWall = true;
        player.wallDir = 1;
        if (DASH_REFRESH_ON_WALL) player.dashes = player.maxDashes;
        if (player.vy > 0 && player.vy < MAX_FALL_SPEED) {
            const wallX = solidRight.x;
            spawnParticles(wallX, player.y + Math.random() * player.h, '#dfe7f2', 1, 20);
        }
    }

    const spring = checkSpring(player.x + 1, footY, player.w - 2, 4);
    if (spring && player.vy >= 0 && spring.timer <= 0) {
        spring.timer = 0.3;
        player.vy = spring.power === 2 ? SUPER_JUMP_FORCE : JUMP_FORCE * 1.5;
        player.onGround = false;
        player.coyoteTimer = 0;
        spawnParticles(player.x + player.w/2, player.y + player.h, '#ffdd44', 15, 60);
        playSound(spring.power === 2 ? 'superSpring' : 'spring');
        screenShake = spring.power === 2 ? 0.2 : 0.1;
    }

    for (const spring of currentRoomData.springs) {
        if (spring.timer > 0) spring.timer -= dt;
    }

    const berry = checkStrawberry(player.x, player.y, player.w, player.h);
    if (berry) {
        collectStrawberry(berry);
        unlockAchievement('first_strawberry');
    }

    if (currentRoomData.heartGem && !currentRoomData.heartGem.collected &&
        player.x + player.w > currentRoomData.heartGem.x &&
        player.x < currentRoomData.heartGem.x + 16 &&
        player.y + player.h > currentRoomData.heartGem.y &&
        player.y < currentRoomData.heartGem.y + 16) {
        currentRoomData.heartGem.collected = true;
        player.heartGem = true;
        gameWon = true;
        gameState = 'ending';
        endingPhase = 0;
        endingTimer = 0;
        endingTextAlpha = 0;
        if (chapterIdOfRoom(currentRoom) === 'farewell') unlockAchievement('true_ending');
        // The final room has no exit flag, so record chapter stats here.
        const wonCh = chapterIdOfRoom(currentRoom);
        if (wonCh) {
            const group = CHAPTERS.find(c => c.id === wonCh);
            if (group) {
                const elapsed = gameTime - (chapterStartTimes[wonCh] || 0);
                if (!player.bestChapters[wonCh] || elapsed < player.bestChapters[wonCh]) {
                    player.bestChapters[wonCh] = elapsed;
                }
                if (elapsed < group.rooms.length * 45 + 45) unlockAchievement('speedrunner');
            }
            if (chapterDeathBaselines[wonCh] === deaths) unlockAchievement('deathless');
        }
        spawnParticles(currentRoomData.heartGem.x + 8, currentRoomData.heartGem.y + 8, '#ff88ff', 50, 150);
        playSound('heart');
        unlockAchievement('first_heart');
    }

    if (currentRoomData.cassette && !currentRoomData.cassette.collected &&
        player.x + player.w > currentRoomData.cassette.x &&
        player.x < currentRoomData.cassette.x + 16 &&
        player.y + player.h > currentRoomData.cassette.y &&
        player.y < currentRoomData.cassette.y + 10) {
        currentRoomData.cassette.collected = true;
        savedCassetteIds.add(currentRoomData.cassette.id);
        player.cassettes = savedCassetteIds.size;
        spawnParticles(currentRoomData.cassette.x + 8, currentRoomData.cassette.y + 8, '#ffcc00', 50, 150);
        playSound('cassette');
        unlockAchievement('first_cassette');
        const side = chapterList.find(chapter => chapter.id === currentRoomData.cassette.unlocks);
        if (side) {
            showAchievementPopup({ name: 'B-SIDE UNLOCKED', desc: side.name, icon: '📼' });
        }
        const cassetteTotal = Object.values(rooms).filter(room => room.cassette).length;
        if (player.cassettes >= cassetteTotal) unlockAchievement('cassette_collector');
        saveGame();
    }

    if (currentRoomData.feather && !currentRoomData.feather.collected &&
        player.x + player.w > currentRoomData.feather.x &&
        player.x < currentRoomData.feather.x + 16 &&
        player.y + player.h > currentRoomData.feather.y &&
        player.y < currentRoomData.feather.y + 16) {
        currentRoomData.feather.collected = true;
        player.hasFeather = true;
        player.featherTimer = FEATHER_DURATION;
        spawnParticles(currentRoomData.feather.x + 8, currentRoomData.feather.y + 8, '#ffffff', 30, 100);
        playSound('cassette');
        unlockAchievement('first_feather');
    }

    const flag = checkFlag(player.x, player.y, player.w, player.h);
    if (flag && rooms[flag.targetRoom]) {
        player.spawnX = player.x;
        player.spawnY = player.y;
        spawnParticles(flag.x + 4, flag.y + 4, '#ffffff', 20, 80);
        screenShake = 0.15;
        switchRoom(flag.targetRoom, flag.exitDir);
    }

    const ds = checkDashSwitch(player.x, player.y, player.w, player.h);
    if (ds && player.dashTimer > 0) {
        ds.activated = true;
        ds.timer = 0.5;
        for (const target of ds.targets) {
            const tb = currentRoomData.cassetteBlocks.find(cb => cb.x === target.x && cb.y === target.y);
            if (tb) tb.active = !tb.active;
        }
        screenShake = 0.3;
        playSound('switch');
        spawnShockwave(ds.x + ds.w / 2, ds.y + ds.h / 2, 18, '#a5eeee');
    }

    const jumpPressedThisFrame = input.jumpPressed;
    if (input.jumpPressed) {
        player.jumpBufferTimer = JUMP_BUFFER_TIME;
        input.jumpPressed = false;
    }

    if (input.dashPressed && player.dashes > 0 && player.dashTimer <= 0 && player.dashCooldown <= 0 && player.hasDash) {
        let dx = 0, dy = 0;
        if (input.left) dx = -1;
        if (input.right) dx = 1;
        if (input.up) dy = -1;
        if (input.down) dy = 1;

        if (dx === 0 && dy === 0) dx = player.facing;
        // Dashing straight down while grounded would grind into the floor and
        // waste the dash; convert it to a forward dash like the original.
        if (dy === 1 && dx === 0 && player.onGround) {
            dx = player.facing;
            dy = 0;
        }

        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len; dy /= len;

        player.dashDirX = dx;
        player.dashDirY = dy;
        player.dashTimer = DASH_TIME;
        player.dashes--;
        player.vx = dx * DASH_SPEED;
        player.vy = dy * DASH_SPEED;
        player.coyoteTimer = 0;
        player.climbing = false;

        spawnDashParticles();
        spawnShockwave(player.x + player.w / 2, player.y + player.h / 2, 20, '#b9f4ff');
        playSound('dash');
        unlockAchievement('first_dash');
        input.dashPressed = false;
    }

    if (player.climbing) {
        player.stamina -= dt * 30;
        if (player.stamina <= 0) {
            player.climbing = false;
            player.stamina = 0;
            player.vy = 50;
        } else if (player.stamina < 25 && Math.random() < 12 * dt) {
            particles.push({
                x: player.x + (player.wallDir === -1 ? player.w : 0),
                y: player.y + 2,
                vx: -player.wallDir * (15 + Math.random() * 20),
                vy: -10 - Math.random() * 15,
                life: 1, maxLife: 0.35,
                color: '#66ddff',
                size: 1.5,
                gravity: 120
            });
        }

        const climbingInput = input.climb || input.up;
        let targetVy = 0;
        if (input.up) targetVy = -CLIMB_SPEED;
        if (input.down) targetVy = CLIMB_SPEED;
        if (climbingInput && targetVy === 0) targetVy = -CLIMB_SPEED * 0.25;

        if (targetVy !== 0) {
            player.vy = lerp(player.vy, targetVy, 15 * dt);
        } else {
            player.vy = lerp(player.vy, 0, 10 * dt);
        }

        if (jumpPressedThisFrame) {
            player.vx = -player.wallDir * CLIMB_JUMP_FORCE_X;
            player.vy = CLIMB_JUMP_FORCE;
            player.facing = -player.wallDir;
            player.climbing = false;
            player.jumpBufferTimer = 0;
            player.varJumpTimer = 0.16;
            player.wallLockoutTimer = 0.12;
            player.wallLockDir = -player.wallDir;
            player.stretch = 1.25;
            player.squash = 0.8;
            spawnParticles(player.x + player.w/2, player.y + player.h/2, '#fff', 10, 60);
            playSound('jump');
        }

        if (!player.onWall || player.onGround || (!input.climb && !input.up && !input.down)) {
            player.climbing = false;
        }
    } else {
        // Grounded recovery is quick (Celeste refills on landing); air is slow.
        player.stamina = Math.min(player.maxStamina, player.stamina + dt * (player.onGround ? 110 : 20));

        const pressingIntoWall = (player.wallDir === -1 && input.left) || (player.wallDir === 1 && input.right);
        // Grabbing works on the way up too — only requires holding onto the
        // wall. This matches Celeste's forgiving ledge catches mid-jump.
        if (player.onWall && !player.onGround && !player.inBubble && (input.climb || input.up || pressingIntoWall)) {
            player.climbing = true;
            if (player.vy > 0) player.vy = 0;
        }
    }

    const seeker = checkSeeker(player.x, player.y, player.w, player.h);
    if (seeker && seeker.state === 'chase' && player.dashTimer <= 0 && !player.invincible) {
        startDeath();
        return;
    } else if (seeker && player.dashTimer > 0) {
        seeker.state = 'idle';
        seeker.charging = false;
        seeker.chargeTimer = 0;
        seeker.timer = -1.5;
        seeker.vx = (player.dashDirX || player.facing) * 160;
        seeker.vy = -100;
        player.dashes = player.maxDashes;
        spawnBurst(seeker.x + seeker.w / 2, seeker.y + seeker.h / 2, '#a066ff', 20, 100);
        playSound('seeker');
        screenShake = 0.2;
    }

    const badeline = checkBadeline(player.x, player.y, player.w, player.h);
    if (badeline && player.dashTimer <= 0 && !player.invincible) {
        startDeath();
        return;
    } else if (badeline && player.dashTimer > 0) {
        badeline.state = 'idle';
        badeline.charging = false;
        badeline.timer = -2.0;
        badeline.vx = (player.dashDirX || player.facing) * 120;
        badeline.vy = -80;
        player.dashes = player.maxDashes;
        spawnBurst(badeline.x + badeline.w / 2, badeline.y + badeline.h / 2, '#ff44aa', 20, 100);
        playSound('badeline');
        screenShake = 0.2;
    }

    const ts = checkTriggerSpike(player.x, player.y, player.w, player.h);
    if (ts && player.dashTimer <= 0 && !player.invincible) {
        startDeath();
        return;
    }

    if (player.dashTimer > 0) {
        player.vx = player.dashDirX * DASH_SPEED;
        player.vy = player.dashDirY * DASH_SPEED;

        // Celeste Super Jump / Wave Dash: jumping while grounded during a dash!
        if (player.jumpBufferTimer > 0 && (player.onGround || player.coyoteTimer > 0)) {
            const dir = Math.sign(player.dashDirX || player.facing) || player.facing;
            player.vx = dir * SUPER_DASH_SPEED;
            player.vy = JUMP_FORCE;
            player.dashTimer = 0;
            player.varJumpTimer = 0.2;
            player.stretch = 1.35;
            player.squash = 0.7;
            spawnBurst(player.x + player.w / 2, player.y + player.h, '#ffffff', 14, 90, 0, 1.2);
            playSound('superSpring');
            screenShake = 0.15;
            player.jumpBufferTimer = 0;
            player.coyoteTimer = 0;
        }
    } else {
        let targetVx = 0;
        if (input.left) targetVx = -MOVE_SPEED;
        if (input.right) targetVx = MOVE_SPEED;

        const accel = player.onGround ? (player.onIce ? GROUND_ACCEL / 3 : GROUND_ACCEL) : AIR_ACCEL;
        const friction = player.onGround ? (player.onIce ? ICE_FRICTION : 15) : 5;
        // Right after a wall jump, steering back into the wall is weakened so
        // the kick actually carries you away from it.
        const lockedTowardWall =
            player.wallLockoutTimer > 0 &&
            ((player.wallLockDir === -1 && targetVx < 0) || (player.wallLockDir === 1 && targetVx > 0));

        if (targetVx !== 0) {
            player.vx = lerp(player.vx, targetVx, (lockedTowardWall ? accel * 0.3 : accel) * dt);
            if (!player.climbing) player.facing = targetVx > 0 ? 1 : -1;
        } else {
            player.vx = lerp(player.vx, 0, friction * dt);
        }

        if (!player.onGround && !player.climbing && !player.inBubble) {
            // Wind physics
            if (currentRoomData.wind && player.x > currentRoomData.wind.x && player.x < currentRoomData.wind.x + currentRoomData.wind.w &&
                player.y > currentRoomData.wind.y && player.y < currentRoomData.wind.y + currentRoomData.wind.h) {
                player.vx += currentRoomData.wind.dir * currentRoomData.wind.strength * dt;
                if (currentRoom.indexOf('farewell') === 0) unlockAchievement('wind_rider');
            }

            if (player.hasFeather) {
                // Timed feather glide: hold jump to rise, release to drift down.
                if (input.jump) {
                    player.vy = lerp(player.vy, FEATHER_GLIDE_RISE, 8 * dt);
                    player.featherGlideTotal += dt;
                    if (player.featherGlideTotal >= FEATHER_MASTER_SECONDS) unlockAchievement('feather_master');
                } else {
                    player.vy = Math.min(player.vy + FEATHER_GRAVITY * dt, MAX_FALL_SPEED / 2);
                }
            } else {
                // Held jumps rise against softened gravity for controllable,
                // variable-height arcs; releasing or expiring restores it.
                const risingSoft = player.varJumpTimer > 0 && player.vy < 0;
                player.vy += GRAVITY * (risingSoft ? 0.5 : 1) * dt;
            }
            if (player.onWall && player.vy > WALL_SLIDE_SPEED && !player.climbing) {
                player.vy = WALL_SLIDE_SPEED;
            }
            if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
        } else if (player.onGround) {
            player.vy = 0;
        }

        const canJump = player.onGround || player.coyoteTimer > 0 || player.onWall;
        if (player.jumpBufferTimer > 0 && canJump) {
            if (player.onWall && !player.onGround && !player.climbing) {
                player.vx = -player.wallDir * WALL_JUMP_FORCE_X;
                player.vy = WALL_JUMP_FORCE_Y;
                player.facing = -player.wallDir;
                player.onWall = false;
                player.varJumpTimer = 0.16;
                player.wallLockoutTimer = 0.14;
                player.wallLockDir = -player.wallDir;
                player.stretch = 1.25;
                player.squash = 0.8;
                spawnParticles(player.x + player.w/2, player.y + player.h/2, '#fff', 10, 60);
                playSound('jump');
                unlockAchievement('first_wall_jump');
            } else {
                player.vy = player.hasFeather ? FEATHER_JUMP : JUMP_FORCE;
                player.varJumpTimer = 0.18;
                player.stretch = 1.25;
                player.squash = 0.8;
                spawnParticles(player.x + player.w/2, player.y + player.h, '#fff', 6, 40);
                playSound('jump');
            }
            player.jumpBufferTimer = 0;
            player.coyoteTimer = 0;
        }
    }

    let newX = player.x + player.vx * dt;
    let newY = player.y + player.vy * dt;

    if (onMovingPlatform) {
        newX += onMovingPlatform.vx * dt;
        newY += onMovingPlatform.vy * dt;
    }

    let solidX = checkSolid(newX, player.y, player.w, player.h);
    if (solidX && player.dashTimer > 0 && Math.abs(player.dashDirX) > 0.5 && player.dashDirY === 0 && !solidX.kevin) {
        // Ledge hop: nudge up 1-4px if dashing onto a ledge
        for (let dist = 1; dist <= 4; dist++) {
            if (!checkSolid(newX, player.y - dist, player.w, player.h)) {
                newY -= dist;
                solidX = null;
                break;
            }
        }
    }
    if (solidX) {
        if (solidX.kevin && player.dashTimer > 0 && player.kevinFeedbackTimer <= 0) {
            player.kevinFeedbackTimer = 0.35;
            screenShake = Math.max(screenShake, 0.25);
            playSound('kevin');
            spawnShockwave(player.x + player.w / 2, player.y + player.h / 2, 14, '#c9a6ff');
            spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#d9c2ff', 8, 60);
        }
        if (player.vx > 0) newX = solidX.x - player.w;
        else newX = solidX.x + solidX.w;
        player.vx = 0;
        if (player.dashTimer > 0) player.dashTimer = 0;
    }

    let solidY = checkSolid(newX, newY, player.w, player.h);
    if (solidY && player.vy < 0 && !solidY.kevin) {
        // Ceiling corner correction: nudge left or right 1-4px to avoid head bonk
        for (let dist = 1; dist <= 4; dist++) {
            if (!checkSolid(newX - dist, newY, player.w, player.h) && !checkSolid(newX - dist, player.y, player.w, player.h)) {
                newX -= dist;
                solidY = null;
                break;
            }
            if (!checkSolid(newX + dist, newY, player.w, player.h) && !checkSolid(newX + dist, player.y, player.w, player.h)) {
                newX += dist;
                solidY = null;
                break;
            }
        }
    }
    if (solidY) {
        if (solidY.kevin && player.dashTimer > 0 && player.kevinFeedbackTimer <= 0) {
            player.kevinFeedbackTimer = 0.35;
            screenShake = Math.max(screenShake, 0.25);
            playSound('kevin');
            spawnShockwave(player.x + player.w / 2, player.y + player.h / 2, 14, '#c9a6ff');
            spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#d9c2ff', 8, 60);
        }
        if (player.vy > 0) {
            // Falling onto a surface (top edge at or below the previous top):
            // remember the impact for landing feedback.
            if (solidY.y >= player.y - 1 || solidY.y + solidY.h > player.y + player.h * 0.5) {
                player.wasLanding = true;
                player.landingSpeed = player.vy;
            }
        }
        if (player.vy > 0) newY = solidY.y - player.h;
        else newY = solidY.y + solidY.h;
        player.vy = 0;
        if (player.dashTimer > 0) player.dashTimer = 0;
    }

    const cornerX = checkSolid(newX, player.y, player.w, player.h);
    const cornerY = checkSolid(player.x, newY, player.w, player.h);
    if (cornerX && cornerY) {
        newX = player.x;
        newY = player.y;
        player.vx = 0;
        player.vy = 0;
    }

    player.x = newX;
    player.y = newY;

    if (player.wasLanding) {
        const fallSpeed = Math.abs(player.landingSpeed) || 0;
        if (fallSpeed > 50) {
            spawnLandingParticles();
            playSound('land');
            screenShake = Math.min(0.2, fallSpeed / 2500);
            player.squash = Math.min(1.45, 1.05 + fallSpeed / 900);
            player.stretch = Math.max(0.65, 0.95 - fallSpeed / 1400);
        }
        player.wasLanding = false;
    }

    if (player.onGround && (input.left || input.right) && Math.abs(player.vx) > 20 && Math.random() < 7 * dt) {
        particles.push({
            x: player.x + (player.vx > 0 ? 1 : player.w - 1),
            y: player.y + player.h - 1,
            vx: -Math.sign(player.vx) * (8 + Math.random() * 18),
            vy: -6 - Math.random() * 14,
            life: 1,
            maxLife: 0.28,
            color: '#e4ebf6',
            size: 1 + Math.random(),
            gravity: 110
        });
    }

    // Skid burst when reversing direction at speed on the ground.
    if (player.onGround && Math.abs(player.vx) > 55 &&
        ((input.left && player.vx > 30) || (input.right && player.vx < -30)) &&
        Math.random() < 22 * dt) {
        particles.push({
            x: player.x + player.w / 2,
            y: player.y + player.h - 1,
            vx: Math.sign(player.vx) * (30 + Math.random() * 40),
            vy: -(14 + Math.random() * 24),
            life: 1,
            maxLife: 0.3,
            color: '#f2e9d8',
            size: 1.5,
            gravity: 160
        });
    }

    const spike = checkSpikes(player.x + 1, player.y + 1, player.w - 2, player.h - 2);
    if (spike && player.dashTimer <= 0 && !player.invincible) {
        startDeath();
        return;
    }

    if (player.y > currentRoomData.height + 50) {
        startDeath();
        return;
    }

    if (Math.abs(player.vx) > 10 || Math.abs(player.vy) > 10) {
        player.spriteTimer += dt;
        if (player.spriteTimer > 0.1) {
            player.spriteFrame = (player.spriteFrame + 1) % 4;
            player.spriteTimer = 0;
        }
    } else {
        player.spriteFrame = 0;
    }

    player.hairTimer += dt;
    if (player.hairTimer > 0.08) {
        player.hairFrame = (player.hairFrame + 1) % 8;
        player.hairTimer = 0;
    }

    if (player.climbing) player.state = 'climb';
    else if (player.onGround) player.state = (input.left || input.right) ? 'run' : 'idle';
    else if (player.onWall) player.state = 'wall';
    else if (player.dashTimer > 0) player.state = 'dash';
    else if (player.inBubble) player.state = 'bubble';
    else if (player.vy < 0) player.state = 'jump';
    else player.state = 'fall';

    if (!player.dying && gameState === 'playing') {
        player.ghostRecording.push({
            x: player.x, y: player.y,
            vx: player.vx, vy: player.vy,
            state: player.state, facing: player.facing,
            hairFrame: player.hairFrame,
            time: gameTime
        });
        if (player.ghostRecording.length > 2400) player.ghostRecording.shift();
    }

    if (gameWon && player.bestGhost === null && player.ghostRecording.length > 0) {
        player.bestGhost = [...player.ghostRecording];
        player.showGhost = true;
        saveGame();
    }
}

function lerp(a, b, t) {
    return a + (b - a) * Math.min(1, t);
}


function updateEntities(dt) {
    if (!accessibility.reducedMotion &&
        (currentRoomData.background === 'mountain' || currentRoomData.background === 'summit') &&
        gameTime >= nextShootingStarAt) {
        shootingStars.push({
            x: 40 + Math.random() * ROOM_WIDTH,
            y: 8 + Math.random() * ROOM_HEIGHT * 0.28,
            vx: -(70 + Math.random() * 80),
            vy: 24 + Math.random() * 28,
            life: 1
        });
        nextShootingStarAt = gameTime + 3 + Math.random() * 5;
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        star.x += star.vx * dt;
        star.y += star.vy * dt;
        star.life -= dt * 0.7;
        if (star.life <= 0) shootingStars.splice(i, 1);
    }

    if (!accessibility.reducedMotion && gameTime >= nextAmbientAt) {
        const ambientType = currentRoomData.background;
        if (ambientType === 'oldsite') {
            particles.push({
                x: cameraX + Math.random() * ROOM_WIDTH,
                y: cameraY - 6,
                vx: (Math.random() - 0.5) * 16,
                vy: 13 + Math.random() * 9,
                life: 4.5, maxLife: 4.5,
                color: Math.random() < 0.5 ? '#7fbf62' : '#a8d47f',
                size: 2, gravity: 5
            });
            nextAmbientAt = gameTime + 0.32;
        } else if (ambientType === 'summit') {
            particles.push({
                x: cameraX + Math.random() * ROOM_WIDTH,
                y: cameraY - 4,
                vx: (Math.random() - 0.5) * 12,
                vy: 15 + Math.random() * 8,
                life: 4, maxLife: 4,
                color: Math.random() < 0.3 ? '#eafcff' : '#ffffff',
                size: Math.random() < 0.3 ? 2 : 1, gravity: 2
            });
            nextAmbientAt = gameTime + 0.1;
        } else if (ambientType === 'core') {
            particles.push({
                x: cameraX + Math.random() * ROOM_WIDTH,
                y: cameraY + ROOM_HEIGHT + 3,
                vx: (Math.random() - 0.5) * 10,
                vy: -12 - Math.random() * 10,
                life: 3.2, maxLife: 3.2,
                color: Math.random() < 0.5 ? '#ff9b57' : '#e05a3d',
                size: Math.random() < 0.25 ? 2 : 1, gravity: -4
            });
            nextAmbientAt = gameTime + 0.24;
        } else {
            nextAmbientAt = gameTime + 1;
        }
    }

    for (const mp of currentRoomData.movingPlatforms) {
        if (mp.waiting) {
            mp.waitTimer -= dt;
            if (mp.waitTimer <= 0) {
                mp.waiting = false;
                mp.timer = 0;
                const temp = mp.startX; mp.startX = mp.endX; mp.endX = temp;
                const temp2 = mp.startY; mp.startY = mp.endY; mp.endY = temp2;
            }
            mp.vx = 0; mp.vy = 0;
        } else {
            mp.timer += dt * mp.speed / Math.max(1, Math.sqrt((mp.endX - mp.startX)**2 + (mp.endY - mp.startY)**2));
            if (mp.timer >= 1) {
                mp.timer = 1;
                mp.waiting = true;
                mp.waitTimer = 1;
            }
            mp.x = lerp(mp.startX, mp.endX, mp.timer);
            mp.y = lerp(mp.startY, mp.endY, mp.timer);
            mp.vx = (mp.endX - mp.startX) * mp.speed / Math.max(1, Math.sqrt((mp.endX - mp.startX)**2 + (mp.endY - mp.startY)**2));
            mp.vy = (mp.endY - mp.startY) * mp.speed / Math.max(1, Math.sqrt((mp.endX - mp.startX)**2 + (mp.endY - mp.startY)**2));
        }
        mp.type = 'moving';
    }

    for (const db of currentRoomData.dreamBlocks) {
        if (!db.active) {
            // Hold the block dissolved while the player is still inside.
            const playerInside = player.x < db.x + db.w && player.x + player.w > db.x &&
                player.y < db.y + db.h && player.y + player.h > db.y;
            if (!playerInside) {
                db.timer -= dt;
                if (db.timer <= 0) db.active = true;
            }
        } else {
            const inDream = player.dashTimer > 0 &&
                player.x < db.x + db.w && player.x + player.w > db.x &&
                player.y < db.y + db.h && player.y + player.h > db.y;
            if (inDream) {
                db.active = false;
                db.timer = 1;
                player.dashes = player.maxDashes;
                spawnParticles(db.x + db.w/2, db.y + db.h/2, '#64c8ff', 15, 50);
                playSound('dream');
            }
        }
    }

    for (const berry of currentRoomData.strawberries) {
        berry.wiggle += dt * 3;
    }

    for (const flag of currentRoomData.flags) {
        flag.timer += dt;
    }

    for (const bubble of currentRoomData.bubbles) {
        if (!bubble.active) {
            bubble.timer -= dt;
            if (bubble.timer <= 0) bubble.active = true;
        } else {
            bubble.timer += dt;
        }
    }

    for (const kb of currentRoomData.kevinBlocks) {
        if (kb.active) {
            kb.timer += dt;
            if (Math.random() < 0.02) {
                kb.particles.push({
                    x: kb.x + Math.random() * kb.w,
                    y: kb.y + Math.random() * kb.h,
                    vx: (Math.random() - 0.5) * 20,
                    vy: (Math.random() - 0.5) * 20 - 30,
                    life: 1,
                    maxLife: 0.5,
                    color: '#ffff88',
                    size: 2
                });
            }
        } else {
            kb.timer -= dt;
            if (kb.timer <= 0) kb.active = true;
        }
        for (let i = kb.particles.length - 1; i >= 0; i--) {
            const p = kb.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 100 * dt;
            p.life -= dt;
            if (p.life <= 0) kb.particles.splice(i, 1);
        }
    }

    for (const seeker of currentRoomData.seekers) {
        seeker.timer += dt;
        const dx = player.x - seeker.x;
        const dy = player.y - seeker.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100 && seeker.state === 'idle') {
            seeker.state = 'chase';
            seeker.targetX = player.x;
            seeker.targetY = player.y;
        }

        if (seeker.state === 'chase' && !seeker.charging) {
            const tx = player.x - seeker.x;
            const ty = player.y - seeker.y;
            const td = Math.sqrt(tx * tx + ty * ty);
            if (td > 0) {
                seeker.vx = (tx / td) * SEEKER_SPEED;
                seeker.vy = (ty / td) * SEEKER_SPEED;
            }
            seeker.x += seeker.vx * dt;
            seeker.y += seeker.vy * dt;
        }

        if (seeker.state === 'chase' && dist > 150) {
            seeker.state = 'idle';
            seeker.charging = false;
        } else if (seeker.state === 'chase' && dist < 40 && !seeker.charging) {
            seeker.charging = true;
            seeker.chargeTimer = 0.5;
            const angle = Math.atan2(dy, dx);
            seeker.chargeVx = Math.cos(angle) * 300;
            seeker.chargeVy = Math.sin(angle) * 300;
        }

        if (seeker.charging) {
            seeker.chargeTimer -= dt;
            seeker.vx = seeker.chargeVx;
            seeker.vy = seeker.chargeVy;
            seeker.x += seeker.chargeVx * dt;
            seeker.y += seeker.chargeVy * dt;
            if (seeker.chargeTimer <= 0) {
                seeker.charging = false;
                seeker.vx = 0;
                seeker.vy = 0;
            }
        }
    }

    for (const badeline of currentRoomData.badelines) {
        badeline.timer += dt;
        if (badeline.state === 'idle' && badeline.timer > 2) {
            badeline.state = 'attack';
            const adx = player.x - badeline.x;
            const ady = player.y - badeline.y;
            const adist = Math.sqrt(adx * adx + ady * ady) || 1;
            badeline.vx = (adx / adist) * BADELINE_SPEED;
            badeline.vy = (ady / adist) * BADELINE_SPEED;
        }

        if (badeline.state === 'attack' && !badeline.charging) {
            badeline.x += badeline.vx * dt;
            badeline.y += badeline.vy * dt;

            if (Math.random() < 0.1) {
                badeline.particles.push({
                    x: badeline.x,
                    y: badeline.y,
                    vx: (Math.random() - 0.5) * 30,
                    vy: (Math.random() - 0.5) * 30,
                    life: 1,
                    maxLife: 0.3,
                    color: '#ff44aa',
                    size: 2
                });
            }
        }

        for (let i = badeline.particles.length - 1; i >= 0; i--) {
            const p = badeline.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) badeline.particles.splice(i, 1);
        }

        const dx = player.x - badeline.x;
        const dy = player.y - badeline.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 200) {
            badeline.state = 'idle';
            badeline.timer = 0;
            badeline.charging = false;
        } else if (badeline.state === 'attack' && dist < 50 && !badeline.charging) {
            badeline.charging = true;
            badeline.chargeTimer = 0.4;
            const angle = Math.atan2(dy, dx);
            badeline.chargeVx = Math.cos(angle) * 400;
            badeline.chargeVy = Math.sin(angle) * 400;
            screenShake = 0.3;
            playSound('badeline');
        }

        if (badeline.charging) {
            badeline.chargeTimer -= dt;
            badeline.vx = badeline.chargeVx;
            badeline.vy = badeline.chargeVy;
            badeline.x += badeline.vx * dt;
            badeline.y += badeline.vy * dt;
            if (badeline.chargeTimer <= 0) {
                badeline.charging = false;
                badeline.vx = 0;
                badeline.vy = 0;
                badeline.state = 'idle';
                badeline.timer = 0;
            }
        }
    }

    for (const ts of currentRoomData.triggerSpikes) {
        const dx = player.x - ts.x;
        const dy = player.y - ts.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!ts.triggered && dist < 30) {
            ts.triggered = true;
            ts.timer = ts.delay;
        }

        if (ts.triggered) {
            ts.timer -= dt;
            if (ts.timer <= 0) {
                ts.triggered = false;
            }
        }
    }

    for (const ds of currentRoomData.dashSwitches) {
        if (ds.activated) {
            ds.timer -= dt;
            if (ds.timer <= 0) {
                ds.activated = false;
            }
        }
    }

    for (const cb of currentRoomData.cassetteBlocks) {
        if (cb.active) {
            cb.timer += dt;
        }
    }
}

function updateParticles(dt) {
    // Hard cap keeps burst effects from ever starving the frame budget.
    if (particles.length > 600) particles.splice(0, particles.length - 600);
    for (let i = dashAfterimages.length - 1; i >= 0; i--) {
        dashAfterimages[i].life -= dt;
        if (dashAfterimages[i].life <= 0) dashAfterimages.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity ?? 200) * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function resetTutorial() {
    tutorialState = 0;
    tutorialTimer = 0;
    input.tutorialSkipPressed = false;
    input.jumpPressed = false;
    input.dashPressed = false;
    input.climbPressed = false;
    input.pausePressed = false;
}

function updateTutorial(dt) {
    if (tutorialState >= tutorialMessages.length) return;
    if (currentRoom !== 'prologue') return;
    if (gameTime < 2.5) return;

    if (input.tutorialSkipPressed) {
        tutorialState = tutorialMessages.length;
        tutorialTimer = 0;
        input.tutorialSkipPressed = false;
        return;
    }

    tutorialTimer += dt;

    const timeoutAdvance = tutorialState === 7 ? 2 : tutorialState === 6 ? 8 : tutorialState === 5 ? 12 : 4;
    const timeoutReached = tutorialTimer > timeoutAdvance;

    // Advance on player action or if the player stalls too long.
    if (tutorialState === 0 && (input.left || input.right || timeoutReached)) {
        tutorialState++;
        tutorialTimer = 0;
    } else if (tutorialState === 1 && (input.jumpPressed || timeoutReached)) {
        tutorialState++;
        tutorialTimer = 0;
    } else if (tutorialState === 2 && (input.dashPressed || timeoutReached)) {
        tutorialState++;
        tutorialTimer = 0;
    } else if (tutorialState === 3 && (player.onGround || timeoutReached)) {
        tutorialState++;
        tutorialTimer = 0;
    } else if (tutorialState === 4 && (player.climbing || input.climb || timeoutReached)) {
        tutorialState++;
        tutorialTimer = 0;
    } else if (tutorialState === 5 && (collectedStrawberries > 0 || player.goldenBerries > 0 || timeoutReached)) {
        tutorialState++;
        tutorialTimer = 0;
    } else if (tutorialState === 6 && (input.pausePressed || input.jumpPressed || input.climbPressed || timeoutReached)) {
        tutorialState++;
        tutorialTimer = 0;
    } else if (tutorialState === 7 && (timeoutReached || input.pausePressed || input.jumpPressed || input.dashPressed || input.climbPressed)) {
        tutorialState++;
        tutorialTimer = 0;
    }
}

function unlockAchievement(id) {
    if (!unlockedAchievements.has(id)) {
        unlockedAchievements.add(id);
        const achievement = achievements.find(a => a.id === id);
        if (achievement) {
            showAchievementPopup(achievement);
            playSound('berry');
        }
    }
}

let achievementPopup = null;
let achievementPopupTimer = 0;

function showAchievementPopup(achievement) {
    achievementPopup = achievement;
    achievementPopupTimer = 3;
}

function updateAchievementPopup(dt) {
    if (achievementPopup) {
        achievementPopupTimer -= dt;
        if (achievementPopupTimer <= 0) {
            achievementPopup = null;
        }
    }
}

let cameraLookX = 0;
function updateCamera(dt) {
    // Lookahead eases toward the facing offset so quick direction flips
    // don't yank the camera.
    cameraLookX = lerp(cameraLookX, player.facing * 18, 4 * dt);
    const targetX = player.x + cameraLookX - ROOM_WIDTH / 2;
    const targetY = player.y - ROOM_HEIGHT / 2;
    cameraX = lerp(cameraX, targetX, 10 * dt);
    cameraY = lerp(cameraY, targetY, 10 * dt);
    cameraX = Math.max(0, Math.min(currentRoomData.width - ROOM_WIDTH, cameraX));
    cameraY = Math.max(0, Math.min(currentRoomData.height - ROOM_HEIGHT, cameraY));

    if (roomTransition) {
        if (roomTransition.phase === 'out') {
            roomTransition.progress = Math.min(1, roomTransition.progress + dt * 3.2);
        } else {
            roomTransition.progress = Math.max(0, roomTransition.progress - dt * 3.2);
            if (roomTransition.progress <= 0) roomTransition = null;
        }

        if (roomTransition && roomTransition.phase === 'out' && roomTransition.progress >= 1) {
            const prevRoom = currentRoom;
            currentRoom = roomTransition.to;
            currentRoomData = rooms[currentRoom];
            // Arrive with hazards/movers in their rest state so puzzle timing
            // is predictable no matter how the room was left.
            resetRoomState();
            player.spawnX = currentRoomData.spawn.x;
            player.spawnY = currentRoomData.spawn.y;
            player.x = player.spawnX;
            player.y = player.spawnY;
            player.vx = 0; player.vy = 0;
            cameraX = player.x - ROOM_WIDTH / 2;
            cameraY = player.y - ROOM_HEIGHT / 2;
            ROOM_NAME_EL.textContent = currentRoomData.name;
            roomTransition.phase = 'in';
            screenShake = 0.5;
            saveGame();
            handleRoomProgression(prevRoom);
            startBackgroundMusic(currentRoomData.background);
        }
    }
}


function drawPlayer() {
    if (player.invincible && Math.floor(player.invincibleTimer * 20) % 2 === 0) return;

    ctx.save();
    const px = player.x - cameraX;
    const py = player.y - cameraY;
    ctx.translate(px + player.w/2, py + player.h/2);
    ctx.scale(player.facing * player.squash, player.stretch);
    ctx.translate(-player.w/2, -player.h/2);

    if (player.dashTimer > 0) {
        spawnDashTrail();
    }

    const isMoving = player.onGround && (input.left || input.right);
    const runFrame = isMoving ? Math.floor(player.spriteTimer * 12) % 2 : 0;
    const jacket = player.dashTimer > 0 ? '#dffbff' : player.color;
    const jacketLight = player.dashTimer > 0 ? '#ffffff' : '#72d2c7';
    const hair = player.dashTimer > 0 ? '#ffffff' : player.dashes === 0 ? '#4aa6df' : player.hairColor;

    if (player.dashTimer > 0 || player.inBubble) {
        ctx.fillStyle = player.dashTimer > 0 ? 'rgba(205,248,255,0.28)' : 'rgba(110,255,244,0.18)';
        ctx.fillRect(-3, -3, 12, 16);
    }

    // Backpack and hair sit behind the compact body silhouette.
    ctx.fillStyle = '#5d3150';
    ctx.fillRect(-1, 4, 2, 5);
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, 5, 4);
    ctx.fillRect(-1, 1, 2, 3);
    ctx.fillStyle = player.dashes > 0 ? '#ef5570' : hair;
    ctx.fillRect(1, 0, 3, 1);

    ctx.fillStyle = '#2d203d';
    if (player.state === 'dash') {
        ctx.fillRect(-2, 8, 4, 2);
        ctx.fillRect(4, 8, 4, 2);
    } else if (!player.onGround) {
        ctx.fillRect(0, 8, 2, 3);
        ctx.fillRect(4, 8, 2, 3);
    } else {
        ctx.fillRect(runFrame ? 0 : 1, 8, 2, 3);
        ctx.fillRect(runFrame ? 4 : 3, 8, 2, 3);
    }
    ctx.fillStyle = '#e7d7df';
    ctx.fillRect(runFrame ? -1 : 0, 10, 3, 1);
    ctx.fillRect(runFrame ? 4 : 3, 10, 3, 1);

    ctx.fillStyle = jacket;
    ctx.fillRect(0, 4, 6, 5);
    ctx.fillStyle = jacketLight;
    ctx.fillRect(1, 4, 3, 1);
    ctx.fillStyle = '#238887';
    ctx.fillRect(1, 8, 4, 1);

    ctx.fillStyle = player.skinColor;
    ctx.fillRect(1, 1, 5, 4);
    ctx.fillRect(player.state === 'climb' ? 6 : -1, player.state === 'climb' ? 3 : 5, 2, 2);
    ctx.fillStyle = hair;
    ctx.fillRect(0, 0, 5, 2);
    ctx.fillRect(0, 1, 1, 3);
    ctx.fillStyle = '#2b2340';
    ctx.fillRect(4, 2, 1, 1);

    if (player.state === 'climb') {
        ctx.fillStyle = player.skinColor;
        ctx.fillRect(6, 1, 2, 2);
        ctx.fillRect(6, 6, 2, 2);
    }

    if (player.stamina < player.maxStamina && player.climbing) {
        ctx.fillStyle = '#171326';
        ctx.fillRect(-1, -4, 8, 3);
        const lowStamina = player.stamina < 25;
        const flash = lowStamina && Math.floor(Date.now() / 120) % 2 === 0;
        ctx.fillStyle = flash ? '#ffffff' : (player.stamina < 45 ? '#e84b5f' : '#ffc83b');
        const staminaW = (player.stamina / player.maxStamina) * player.w;
        ctx.fillRect(0, -3, staminaW, 2);
    }

    if (player.hasFeather) {
        const featherAlpha = Math.sin(player.featherTimer * 10) * 0.3 + 0.7;
        ctx.globalAlpha = featherAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-4, -3);
        ctx.lineTo(-8, -8);
        ctx.lineTo(-6, -7);
        ctx.lineTo(-2, -4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(player.w + 4, -3);
        ctx.lineTo(player.w + 8, -8);
        ctx.lineTo(player.w + 6, -7);
        ctx.lineTo(player.w + 2, -4);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function pixelHash(x, y, salt = 0) {
    const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
    return value - Math.floor(value);
}

// Themed parallax scenery behind the level geometry.
function drawCelesteBackdrop(type, viewW, viewH) {
    const palettes = {
        mountain: ['#10152f', '#29234f', '#6a5272'],
        city: ['#151126', '#35213d', '#7b3f57'],
        oldsite: ['#12271c', '#2b4a33', '#57724a'],
        resort: ['#251226', '#4f2a44', '#7c4457'],
        mirror: ['#12142e', '#33306a', '#58509b'],
        reflection: ['#101228', '#2f2f60', '#4f4c88'],
        summit: ['#0d1730', '#27395c', '#4c6484'],
        core: ['#26081c', '#571f38', '#84384c']
    };
    const colors = palettes[type] || palettes.mountain;

    const skyGlow = ctx.createLinearGradient(0, 0, 0, viewH);
    skyGlow.addColorStop(0, colors[0]);
    skyGlow.addColorStop(0.6, colors[1]);
    skyGlow.addColorStop(1, colors[2]);
    ctx.fillStyle = skyGlow;
    ctx.fillRect(0, 0, viewW, viewH);

    const glowGradient = ctx.createRadialGradient(viewW * 0.5, viewH * 0.18, 10, viewW * 0.5, viewH * 0.18, viewW * 0.4);
    glowGradient.addColorStop(0, 'rgba(255,255,255,0.28)');
    glowGradient.addColorStop(0.18, 'rgba(160,190,255,0.14)');
    glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 25; i++) {
        const beamX = (i * 79 + cameraX * 0.18) % (viewW + 120) - 60;
        const beamW = 18 + (i % 6) * 8;
        const beamH = viewH * (0.38 + (i % 4) * 0.05);
        ctx.fillRect(beamX, viewH * 0.22, beamW, beamH);
    }

    const parallaxFar = 0.05;
    const parallaxMid = 0.2;
    const parallaxNear = 0.5;

    ctx.fillStyle = type === 'core' || type === 'mirror' || type === 'reflection' ? 'rgba(190,200,255,0.55)' : '#ffffaa';
    for (let i = 0; i < 150; i++) {
        const starX = ((i * 37 + cameraX * parallaxFar) % (viewW + 400)) + (viewW * parallaxFar) % 8 - 4;
        const starY = ((i * 53 + cameraY * parallaxFar * 0.3) % (viewH + 400)) + (viewH * parallaxFar) % 8 - 4;
        const starSize = i % 3 === 0 ? 2 : 1;
        ctx.globalAlpha = 0.6 + (i % 3) * 0.2;
        ctx.fillRect(starX, starY, starSize, starSize);
        ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 80; i++) {
        const starX = ((i * 73 + cameraX * parallaxMid) % (viewW + 400)) + (viewW * parallaxMid) % 8 - 4;
        const starY = ((i * 127 + cameraY * parallaxMid * 0.5) % (viewH + 400)) + (viewH * parallaxMid) % 8 - 4;
        const starSize = i % 4 === 0 ? 2 : 1;
        ctx.globalAlpha = 0.7 + (i % 4) * 0.1;
        ctx.fillRect(starX, starY, starSize, starSize);
        ctx.globalAlpha = 1;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 16; i++) {
        const hazeX = (i * 41 + cameraX * 0.12) % (viewW + 50) - 25;
        const hazeY = viewH * 0.5 + (i % 3) * 16;
        ctx.fillRect(hazeX, hazeY, 40, 12);
    }

    ctx.fillStyle = colors[2];
    const mountainLayer1 = cameraX * parallaxNear;
    const mountainLayer2 = cameraX * (parallaxNear + 0.1);
    const mountainY = viewH * 0.62;
    for (let i = -200; i < viewW + 200; i += 80) {
        const mx = i - mountainLayer1 % 80;
        ctx.beginPath();
        ctx.moveTo(mx, mountainY);
        ctx.lineTo(mx + 30, mountainY - 42);
        ctx.lineTo(mx + 52, mountainY - 88);
        ctx.lineTo(mx + 74, mountainY - 48);
        ctx.lineTo(mx + 80, mountainY);
        ctx.fill();
    }
    for (let i = -200; i < viewW + 200; i += 100) {
        const mx = i - mountainLayer2 % 100;
        ctx.beginPath();
        ctx.moveTo(mx, mountainY);
        ctx.lineTo(mx + 26, mountainY - 24);
        ctx.lineTo(mx + 52, mountainY - 58);
        ctx.lineTo(mx + 74, mountainY - 28);
        ctx.lineTo(mx + 100, mountainY);
        ctx.fill();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, viewH * 0.72, viewW, viewH * 0.28);

    if (type === 'city') {
        for (let i = -1; i < 12; i++) {
            const buildingX = i * 34 - (cameraX * 0.28 % 34);
            const buildingH = 28 + (i % 5) * 11;
            const buildingY = viewH * 0.72 - buildingH;
            ctx.fillStyle = i % 2 === 0 ? 'rgba(35,30,70,0.72)' : 'rgba(48,36,82,0.68)';
            ctx.fillRect(buildingX, buildingY, 26, buildingH);
            ctx.fillStyle = 'rgba(255,210,120,0.32)';
            for (let row = 8; row < buildingH - 4; row += 10) {
                if ((i + row) % 3 !== 0) ctx.fillRect(buildingX + 5, buildingY + row, 3, 3);
                if ((i + row) % 4 !== 0) ctx.fillRect(buildingX + 16, buildingY + row, 3, 3);
            }
        }
    } else if (type === 'oldsite') {
        ctx.strokeStyle = 'rgba(100,210,130,0.24)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
            const vineX = (i * 43 + cameraX * 0.12) % (viewW + 40) - 20;
            ctx.beginPath();
            ctx.moveTo(vineX, viewH * 0.32);
            ctx.bezierCurveTo(vineX - 14, viewH * 0.46, vineX + 18, viewH * 0.56, vineX + 2, viewH * 0.72);
            ctx.stroke();
            ctx.fillStyle = 'rgba(130,235,150,0.25)';
            ctx.fillRect(vineX - 5, viewH * 0.5 + (i % 4) * 9, 5, 3);
        }
    } else if (type === 'resort') {
        ctx.fillStyle = 'rgba(90,55,100,0.5)';
        ctx.fillRect(0, viewH * 0.61, viewW, viewH * 0.11);
        for (let i = 0; i < 9; i++) {
            const windowX = (i * 43 + cameraX * 0.18) % (viewW + 40) - 20;
            const windowY = viewH * 0.63 + (i % 2) * 7;
            ctx.fillStyle = i % 3 === 0 ? 'rgba(255,225,130,0.5)' : 'rgba(100,220,255,0.35)';
            ctx.fillRect(windowX, windowY, 18, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.24)';
            ctx.fillRect(windowX + 2, windowY + 1, 5, 1);
        }
    } else if (type === 'core') {
        ctx.fillStyle = 'rgba(130,20,70,0.42)';
        for (let i = -1; i < 8; i++) {
            const ventX = i * 58 - (cameraX * 0.2 % 58);
            ctx.beginPath();
            ctx.moveTo(ventX, viewH * 0.72);
            ctx.lineTo(ventX + 18, viewH * 0.5 - (i % 3) * 14);
            ctx.lineTo(ventX + 38, viewH * 0.72);
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,100,70,0.26)';
        for (let i = 0; i < 15; i++) {
            const emberX = (i * 61 + gameTime * (8 + i % 4)) % viewW;
            const emberY = viewH * 0.65 - ((i * 17 + gameTime * 12) % 45);
            ctx.fillRect(emberX, emberY, 2, 2);
        }
    }

    if (type === 'mountain' || type === 'summit') {
        const auroraColors = type === 'summit'
            ? ['120,255,210', '110,190,255', '205,155,255']
            : ['85,225,255', '150,125,255', '95,255,185'];
        const drift = accessibility.reducedMotion ? 0 : gameTime;

        for (let band = 0; band < auroraColors.length; band++) {
            const baseY = viewH * (0.13 + band * 0.075);
            ctx.beginPath();
            ctx.moveTo(-24, baseY);
            for (let x = -24; x <= viewW + 24; x += 16) {
                const y = baseY +
                    Math.sin(x * 0.025 + drift * 0.7 + band * 2.1) * 7 +
                    Math.sin(x * 0.055 - drift * 0.35 + band) * 3;
                ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `rgba(${auroraColors[band]},${0.08 + band * 0.02})`;
            ctx.lineWidth = 10 + band * 3;
            ctx.stroke();
        }

        for (const star of shootingStars) {
            const sx = star.x - cameraX * parallaxFar;
            const sy = star.y - cameraY * parallaxFar;
            const tailX = sx - star.vx * 0.11;
            const tailY = sy - star.vy * 0.11;
            const trail = ctx.createLinearGradient(sx, sy, tailX, tailY);
            trail.addColorStop(0, `rgba(255,255,235,${star.life})`);
            trail.addColorStop(1, 'rgba(255,255,235,0)');
            ctx.strokeStyle = trail;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();
            ctx.fillStyle = `rgba(255,255,245,${star.life})`;
            ctx.fillRect(sx - 1, sy - 1, 2, 2);
        }

        ctx.fillStyle = 'rgba(20, 20, 50, 0.3)';
        for (let i = 0; i < 8; i++) {
            const cloudX = (i * 57 + cameraX * 0.03) % (viewW + 200) - 100;
            const cloudY = 20 + Math.sin(i * 0.5 + gameTime * 0.3) * 10;
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, 12, 0, Math.PI * 2);
            ctx.arc(cloudX + 15, cloudY - 3, 10, 0, Math.PI * 2);
            ctx.arc(cloudX + 15, cloudY + 3, 10, 0, Math.PI * 2);
            ctx.arc(cloudX + 30, cloudY, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = type === 'summit' ? 'rgba(225,245,255,0.55)' : 'rgba(190,215,255,0.32)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 34; i++) {
            const snowX = (i * 47 + cameraX * 0.08 + gameTime * (8 + i % 5)) % (viewW + 24) - 12;
            const snowY = (i * 31 + cameraY * 0.05 + gameTime * (12 + i % 4)) % (viewH + 20) - 10;
            ctx.beginPath();
            ctx.moveTo(snowX, snowY);
            ctx.lineTo(snowX - 2, snowY + 4 + (i % 3));
            ctx.stroke();
        }
    } else if (type === 'oldsite') {
        ctx.fillStyle = 'rgba(180,255,190,0.3)';
        for (let i = 0; i < 20; i++) {
            const moteX = (i * 59 + cameraX * 0.05 + Math.sin(gameTime + i) * 8) % (viewW + 12) - 6;
            const moteY = (i * 37 + cameraY * 0.04 - gameTime * (4 + i % 3)) % (viewH + 12) - 6;
            ctx.fillRect(moteX, moteY, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
        }
    } else if (type === 'mirror' || type === 'reflection') {
        ctx.fillStyle = 'rgba(170,190,255,0.12)';
        for (let i = 0; i < 11; i++) {
            const shardX = (i * 61 + cameraX * 0.16) % (viewW + 80) - 40;
            const shardY = 18 + (i % 5) * 26 + Math.sin(gameTime * 0.7 + i) * 4;
            const shardW = 10 + (i % 4) * 5;
            ctx.beginPath();
            ctx.moveTo(shardX, shardY);
            ctx.lineTo(shardX + shardW, shardY + 5);
            ctx.lineTo(shardX + shardW - 6, shardY + 22);
            ctx.lineTo(shardX - 4, shardY + 14);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(210,220,255,0.28)';
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(160,180,255,0.13)';
        for (let i = 0; i < 8; i++) {
            const beamX = (i * 87 + cameraX * 0.09) % (viewW + 50) - 25;
            ctx.beginPath();
            ctx.moveTo(beamX, viewH * 0.18);
            ctx.lineTo(beamX + Math.sin(gameTime * 0.4 + i) * 12, viewH * 0.7);
            ctx.stroke();
        }
    }
}


// Static terrain (solids only) rendered once per room into an offscreen
// layer; movers/dream/kevin/gate blocks stay dynamic.
function drawTerrainInto(T, material, backgroundType) {
    for (const solid of currentRoomData.solids) {
        const x = solid.x;
        const y = solid.y;
        const isGround = solid.type === 'ground';
        const isWall = solid.type === 'wall';

        if (solid.type === 'berry-perch') {
            T.fillStyle = '#6d4c78';
        } else if (solid.ice) {
            T.fillStyle = '#9be9ff';
        } else if (isGround) {
            T.fillStyle = material.ground;
        } else if (isWall) {
            T.fillStyle = material.wall;
        } else {
            T.fillStyle = material.platform;
        }

        T.fillRect(x, y, solid.w, solid.h);

        T.fillStyle = solid.type === 'berry-perch'
            ? 'rgba(255,190,235,0.42)'
            : solid.ice ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.09)';
        T.fillRect(x + 1, y + 1, Math.max(2, solid.w - 2), 2);
        T.fillStyle = solid.type === 'berry-perch'
            ? 'rgba(42,20,55,0.32)'
            : solid.ice ? 'rgba(70,120,170,0.28)' : 'rgba(0,0,0,0.18)';
        T.fillRect(x + 1, y + solid.h - 2, solid.w - 2, 1);

        T.fillStyle = solid.type === 'berry-perch'
            ? 'rgba(255,145,220,0.3)'
            : solid.ice ? 'rgba(160,220,255,0.22)' : material.accent;
        for (let line = 0; line < Math.max(2, solid.h / 8); line++) {
            const lineY = y + 2 + line * 6;
            T.fillRect(x + 2, lineY, Math.max(4, solid.w - 4), 1);
        }

        if (!solid.ice && !isWall && solid.type !== 'berry-perch') {
            T.fillStyle = 'rgba(80,120,60,0.22)';
            for (let ix = 0; ix < solid.w; ix += 6) {
                T.fillRect(x + ix, y + 1, 2, solid.h - 2);
            }
        }
    }

    for (const solid of currentRoomData.solids) {
        const x = solid.x;
        const y = solid.y;
        T.fillStyle = solid.ice ? 'rgba(220,250,255,0.75)' : 'rgba(255,255,255,0.14)';
        T.fillRect(x, y, solid.w, 1);
        T.fillStyle = solid.ice ? 'rgba(40,100,150,0.32)' : 'rgba(0,0,0,0.22)';
        T.fillRect(x, y + solid.h - 1, solid.w, 1);
        if (solid.type === 'wall') {
            T.fillStyle = solid.ice ? 'rgba(200,245,255,0.42)' : 'rgba(255,255,255,0.08)';
            T.fillRect(x, y, 1, solid.h);
        }
    }

    drawAutotiledTerrain(material, backgroundType, T);
}

// Deterministic tile-edge detailing: exposed faces get brighter rims,
// interior tiles get sparse speckle so large slabs don't read flat.
function drawAutotiledTerrain(material, backgroundType, T) {
    T = T || ctx;
    const solidAt = (x, y) => currentRoomData.solids.some(s =>
        s.x === x && s.y === y && s.type !== 'berry-perch');

    for (const solid of currentRoomData.solids) {
        if (solid.w !== TILE_SIZE || solid.h !== TILE_SIZE) continue;
        if (solid.type === 'berry-perch') continue;

        const up = solidAt(solid.x, solid.y - TILE_SIZE);
        const down = solidAt(solid.x, solid.y + TILE_SIZE);
        const left = solidAt(solid.x - TILE_SIZE, solid.y);
        const right = solidAt(solid.x + TILE_SIZE, solid.y);

        if (!up) {
            T.fillStyle = solid.ice ? 'rgba(240,253,255,0.85)' : 'rgba(255,255,255,0.22)';
            T.fillRect(solid.x, solid.y, solid.w, 1);
        }
        if (!down) {
            T.fillStyle = 'rgba(0,0,0,0.28)';
            T.fillRect(solid.x, solid.y + solid.h - 1, solid.w, 1);
        }
        if (!left) {
            T.fillStyle = 'rgba(255,255,255,0.10)';
            T.fillRect(solid.x, solid.y, 1, solid.h);
        }
        if (!right) {
            T.fillStyle = 'rgba(0,0,0,0.16)';
            T.fillRect(solid.x + solid.w - 1, solid.y, 1, solid.h);
        }

        const h = pixelHash(solid.x, solid.y, 7);
        if (h > 0.82) {
            T.fillStyle = solid.ice ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)';
            const px = solid.x + 2 + Math.floor(pixelHash(solid.x, solid.y, 11) * (solid.w - 4));
            const py = solid.y + 2 + Math.floor(pixelHash(solid.x, solid.y, 13) * (solid.h - 4));
            T.fillRect(px, py, 2, 1);
        }
    }
}

// Foreground tint strip, grass blades and snow caps along the bottom edge.
function drawForegroundAtmosphere(backgroundType, viewW, viewH) {
    const foregroundTint = {
        mountain: 'rgba(15,24,52,0.3)',
        city: 'rgba(28,18,45,0.34)',
        oldsite: 'rgba(16,46,32,0.28)',
        resort: 'rgba(42,20,48,0.3)',
        mirror: 'rgba(20,20,62,0.3)',
        reflection: 'rgba(20,20,62,0.3)',
        summit: 'rgba(30,48,70,0.28)',
        core: 'rgba(52,12,30,0.34)'
    }[backgroundType] || 'rgba(15,24,52,0.3)';
    ctx.fillStyle = foregroundTint;
    ctx.fillRect(0, viewH - 18, viewW, 18);
    for (let i = 0; i < 24; i++) {
        const foregroundX = (i * 29 + cameraX * 0.7) % (viewW + 30) - 15;
        const foregroundHeight = 3 + (i % 4) * 2;
        ctx.fillRect(foregroundX, viewH - foregroundHeight, 2, foregroundHeight);
    }

    if (backgroundType === 'oldsite') {
        ctx.strokeStyle = 'rgba(130,220,145,0.24)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const grassX = (i * 53 + cameraX * 0.55) % (viewW + 20) - 10;
            ctx.beginPath();
            ctx.moveTo(grassX, viewH - 2);
            ctx.lineTo(grassX - 3, viewH - 8 - (i % 3) * 2);
            ctx.moveTo(grassX, viewH - 2);
            ctx.lineTo(grassX + 4, viewH - 10);
            ctx.stroke();
        }
    } else if (backgroundType === 'summit') {
        ctx.fillStyle = 'rgba(235,250,255,0.3)';
        for (let i = 0; i < 12; i++) {
            const snowCapX = (i * 41 + cameraX * 0.45) % (viewW + 20) - 10;
            ctx.fillRect(snowCapX, viewH - 4 - (i % 2), 7, 2);
        }
    }
}

let terrainLayer = null;
let terrainLayerKey = '';

function getIceSparkleSolids() {
    if (!currentRoomData._iceSolids || currentRoomData._iceKey !== currentRoomData.solids.length) {
        currentRoomData._iceSolids = currentRoomData.solids.filter(s => s.ice);
        currentRoomData._iceKey = currentRoomData.solids.length;
    }
    return currentRoomData._iceSolids;
}


function drawLevel() {
    const bgColors = {
        mountain: ['#0a0a2a', '#2a2a6a', '#4a4a8a'],
        city: ['#1a0a2a', '#5a2a5a', '#8a3a8a'],
        oldsite: ['#0a2a0a', '#3a5a3a', '#4a8a4a'],
        resort: ['#1a0a2a', '#5a2a5a', '#8a3a8a'],
        mirror: ['#0a0a2a', '#3a2a7a', '#5a4a9a'],
        reflection: ['#0a0a2a', '#3a2a7a', '#5a4a9a'],
        summit: ['#0a0a2a', '#2a2a6a', '#4a4a8a'],
        core: ['#1a0a2a', '#5a2a5a', '#8a3a8a']
    };
    const colors = bgColors[currentRoomData?.background] || bgColors.mountain;
    const backgroundType = currentRoomData.background;

    const viewW = canvas.width / renderScale;
    const viewH = canvas.height / renderScale;

    drawCelesteBackdrop(backgroundType, viewW, viewH);

    const materialPalettes = {
        mountain: { ground: '#354657', wall: '#354657', platform: '#3f5360', accent: '#516c65', fill: '#354657', fillAlt: '#3b4d5d', shadow: '#182634', edge: '#58706f', surface: '#78966b', detail: '#263947', outline: '#131c28' },
        city: { ground: '#4b3c58', wall: '#4b3c58', platform: '#594660', accent: '#6e536a', fill: '#4b3c58', fillAlt: '#55425e', shadow: '#241d31', edge: '#755d76', surface: '#a06b72', detail: '#352b43', outline: '#191222' },
        oldsite: { ground: '#294f49', wall: '#294f49', platform: '#315a50', accent: '#47705b', fill: '#294f49', fillAlt: '#31584f', shadow: '#102d30', edge: '#4b7863', surface: '#69a56b', detail: '#1c403d', outline: '#0a1e1c' },
        resort: { ground: '#604451', wall: '#604451', platform: '#6e4d58', accent: '#87625f', fill: '#604451', fillAlt: '#694955', shadow: '#301f31', edge: '#936b68', surface: '#bd806c', detail: '#47313f', outline: '#251527' },
        mirror: { ground: '#35365f', wall: '#35365f', platform: '#41436f', accent: '#555187', fill: '#35365f', fillAlt: '#3c3d69', shadow: '#181a3a', edge: '#66649a', surface: '#8276b3', detail: '#292a51', outline: '#0e1030' },
        reflection: { ground: '#43325e', wall: '#43325e', platform: '#503b6a', accent: '#684c82', fill: '#43325e', fillAlt: '#4b3865', shadow: '#21172f', edge: '#80619a', surface: '#9e75b2', detail: '#352548', outline: '#140d20' },
        summit: { ground: '#4d6678', wall: '#4d6678', platform: '#587589', accent: '#7895a4', fill: '#4d6678', fillAlt: '#567083', shadow: '#263a4d', edge: '#89a9b5', surface: '#d7eef0', detail: '#3b5668', outline: '#182c3c' },
        core: { ground: '#633747', wall: '#633747', platform: '#74404d', accent: '#944e50', fill: '#633747', fillAlt: '#6e3b4a', shadow: '#321426', edge: '#a65c58', surface: '#d87055', detail: '#4d293a', outline: '#200a16' }
    };
    const material = materialPalettes[backgroundType] || materialPalettes.mountain;

    // Static terrain is pre-rendered once per room into an offscreen layer;
    // only dynamic ice sparkles are stamped on top each frame.
    const tKey = currentRoom + '|' + currentRoomData.solids.length;
    if (!terrainLayer || terrainLayerKey !== tKey) {
        terrainLayerKey = tKey;
        terrainLayer = document.createElement('canvas');
        terrainLayer.width = ROOM_WIDTH;
        terrainLayer.height = ROOM_HEIGHT;
        const tg = terrainLayer.getContext('2d');
        tg.imageSmoothingEnabled = false;
        drawTerrainInto(tg, material, backgroundType);
    }
    ctx.drawImage(terrainLayer, -cameraX, -cameraY);

    // Ice sparkle overlay (dynamic).
    if (!accessibility.reducedMotion) {
        for (const solid of getIceSparkleSolids()) {
            const x = solid.x - cameraX;
            const y = solid.y - cameraY;
            const sparkleFrame = Math.floor(gameTime * 3 + solid.x * 0.37 + solid.y * 0.21);
            if (sparkleFrame % 9 === 0) {
                const sparkleX = x + 1 + Math.abs((solid.x * 13 + sparkleFrame) % Math.max(1, solid.w - 2));
                const sparkleY = y + 1 + Math.abs((solid.y * 7 + sparkleFrame) % Math.max(1, solid.h - 2));
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.fillRect(sparkleX - 1, sparkleY, 3, 1);
                ctx.fillRect(sparkleX, sparkleY - 1, 1, 3);
            }
        }
    }

    // Heart gem / cassette pickups.
    if (currentRoomData.heartGem && !currentRoomData.heartGem.collected) {
        const hx = currentRoomData.heartGem.x - cameraX;
        const hy = currentRoomData.heartGem.y - cameraY;
        const gemPulse = Math.sin(gameTime * 5) * 2;
        const gemScale = 1 + Math.sin(gameTime * 5) * 0.08;

        ctx.fillStyle = 'rgba(255,136,255,0.22)';
        ctx.beginPath();
        ctx.arc(hx + 8, hy + 8 + gemPulse, 14 * gemScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff88ff';
        ctx.beginPath();
        ctx.ellipse(hx + 8, hy + 8 + gemPulse, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffaaff';
        ctx.beginPath();
        ctx.ellipse(hx + 6, hy + 6 + gemPulse, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(hx + 10, hy + 8 + gemPulse, 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff66cc';
        ctx.beginPath();
        ctx.ellipse(hx + 5, hy + 7 + gemPulse, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffd5ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hx + 8, hy + 1 + gemPulse);
        ctx.lineTo(hx + 14, hy + 7 + gemPulse);
        ctx.lineTo(hx + 8, hy + 14 + gemPulse);
        ctx.lineTo(hx + 2, hy + 7 + gemPulse);
        ctx.closePath();
        ctx.stroke();
    }

    if (currentRoomData.feather && !currentRoomData.feather.collected) {
        const fxp = currentRoomData.feather.x - cameraX;
        const fyp = currentRoomData.feather.y - cameraY + Math.sin(gameTime * 3) * 2;
        ctx.save();
        ctx.translate(fxp + 8, fyp + 8);
        ctx.rotate(Math.sin(gameTime * 2) * 0.3);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.quadraticCurveTo(5, -2, 0, 6);
        ctx.quadraticCurveTo(-5, -2, 0, -6);
        ctx.fill();
        ctx.strokeStyle = '#cfe4ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();
        ctx.restore();
    }

    if (currentRoomData.cassette && !currentRoomData.cassette.collected) {
        const cx = currentRoomData.cassette.x - cameraX;
        const cy = currentRoomData.cassette.y - cameraY;
        const tapePulse = Math.sin(gameTime * 4) * 1.5;

        ctx.fillStyle = 'rgba(255,204,0,0.2)';
        ctx.fillRect(cx - 4, cy - 4 + tapePulse, 24, 18);

        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(cx, cy + tapePulse, 16, 10);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(cx + 2, cy + 2 + tapePulse, 12, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + 4, cy + 4 + tapePulse, 8, 2);
        ctx.fillStyle = '#6b4310';
        ctx.fillRect(cx + 3, cy + 3 + tapePulse, 2, 4);
        ctx.fillRect(cx + 11, cy + 3 + tapePulse, 2, 4);
        ctx.fillStyle = '#fff2a8';
        ctx.fillRect(cx + 2, cy + 1 + tapePulse, 10, 1);
    }

    for (const mp of currentRoomData.movingPlatforms) {
        const mx = mp.x - cameraX;
        const my = mp.y - cameraY;
        ctx.fillStyle = 'rgba(100,180,255,0.14)';
        ctx.fillRect(mx - 3, my - 3, mp.w + 6, mp.h + 6);
        ctx.fillStyle = '#394461';
        ctx.fillRect(mx, my, mp.w, mp.h);
        ctx.fillStyle = '#8db9d6';
        ctx.fillRect(mx + 1, my + 1, Math.max(2, mp.w - 2), 2);
        ctx.fillStyle = '#202b45';
        ctx.fillRect(mx + 1, my + mp.h - 2, Math.max(2, mp.w - 2), 1);
        ctx.fillStyle = '#6c86a8';
        for (let stripe = 4; stripe < mp.w - 2; stripe += 8) {
            ctx.fillRect(mx + stripe, my + 3, 3, Math.max(1, mp.h - 5));
        }
        ctx.fillStyle = '#b9d7e8';
        ctx.fillRect(mx + 2, my + 2, 2, 1);
        ctx.fillRect(mx + mp.w - 4, my + 2, 2, 1);
        ctx.fillStyle = '#18243a';
        ctx.fillRect(mx + 2, my + mp.h - 2, 2, 1);
        ctx.fillRect(mx + mp.w - 4, my + mp.h - 2, 2, 1);
    }
    
    for (const db of currentRoomData.dreamBlocks) {
        if (db.active) {
            const dx = db.x - cameraX;
            const dy = db.y - cameraY;
            const pulse = 0.3 + Math.sin(db.timer * 5) * 0.12;
            ctx.fillStyle = `rgba(70, 170, 255, ${pulse * 0.35})`;
            ctx.fillRect(dx - 3, dy - 3, db.w + 6, db.h + 6);
            ctx.fillStyle = `rgba(100, 200, 255, ${pulse})`;
            ctx.fillRect(dx, dy, db.w, db.h);
            ctx.fillStyle = 'rgba(190,240,255,0.72)';
            ctx.fillRect(dx, dy, db.w, 1);
            ctx.fillRect(dx, dy, 1, db.h);
            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            for (let stripe = -db.h; stripe < db.w; stripe += 7) {
                ctx.fillRect(dx + stripe, dy, 2, db.h);
            }
        } else {
            ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
            ctx.fillRect(db.x - cameraX, db.y - cameraY, db.w, db.h);
        }
    }
    
    for (const bubble of currentRoomData.bubbles) {
        if (bubble.active) {
            const bx = bubble.x - cameraX;
            const by = bubble.y - cameraY;
            const pulse = Math.sin(bubble.timer * 3) * 2;
            
            ctx.strokeStyle = bubble.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bx, by, bubble.r + pulse, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = bubble.color + '40';
            ctx.beginPath();
            ctx.arc(bx, by, bubble.r + pulse - 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = bubble.color;
            ctx.beginPath();
            ctx.arc(bx + Math.sin(bubble.timer * 2) * 3, by + Math.cos(bubble.timer * 2) * 3, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath();
            ctx.arc(bx - bubble.r * 0.35, by - bubble.r * 0.4, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    for (const kb of currentRoomData.kevinBlocks) {
        if (kb.active) {
            const kx = kb.x - cameraX;
            const ky = kb.y - cameraY;
            const kevinPulse = 0.18 + Math.sin(kb.timer * 4) * 0.06;

            ctx.fillStyle = `rgba(255,220,60,${kevinPulse})`;
            ctx.fillRect(kx - 4, ky - 4, kb.w + 8, kb.h + 8);
            
            ctx.fillStyle = '#ffff44';
            ctx.fillRect(kx, ky, kb.w, kb.h);
            
            ctx.fillStyle = '#ffff88';
            ctx.fillRect(kx + 1, ky + 1, kb.w - 2, kb.h - 2);
            
            ctx.fillStyle = '#ffff44';
            for (let x = 0; x < kb.w; x += 4) {
                for (let y = 0; y < kb.h; y += 4) {
                    if ((x + y + kb.timer * 20) % 8 < 4) {
                        ctx.fillRect(kx + x, ky + y, 2, 2);
                    }
                }
            }

            ctx.strokeStyle = 'rgba(255,255,210,0.75)';
            ctx.lineWidth = 1;
            ctx.strokeRect(kx + 0.5, ky + 0.5, kb.w - 1, kb.h - 1);
            
            for (const p of kb.particles) {
                const alpha = p.life / p.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - cameraX - p.size/2, p.y - cameraY - p.size/2, p.size, p.size);
            }
            ctx.globalAlpha = 1;
        }
    }
    
    for (const cb of currentRoomData.cassetteBlocks) {
        if (cb.active) {
            const cx = cb.x - cameraX;
            const cy = cb.y - cameraY;
            const pulse = Math.sin(cb.timer * 10) * 2;
            
            ctx.fillStyle = 'rgba(255,0,255,0.2)';
            ctx.fillRect(cx - 4, cy - 4, cb.w + 8, cb.h + 8);
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(cx, cy, cb.w, cb.h);
            
            ctx.fillStyle = '#ff88ff';
            ctx.fillRect(cx + 1, cy + 1, cb.w - 2, cb.h - 2);
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - 1, cy - 1, cb.w + 2, cb.h + 2);

            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            for (let stripe = -cb.h; stripe < cb.w; stripe += 8) {
                ctx.fillRect(cx + stripe + (pulse % 8), cy, 2, cb.h);
            }
        } else {
            const cx = cb.x - cameraX;
            const cy = cb.y - cameraY;
            
            ctx.fillStyle = '#440044';
            ctx.fillRect(cx, cy, cb.w, cb.h);
            
            ctx.fillStyle = '#660066';
            ctx.fillRect(cx + 1, cy + 1, cb.w - 2, cb.h - 2);
            ctx.fillStyle = 'rgba(255,120,255,0.2)';
            for (let stripe = -cb.h; stripe < cb.w; stripe += 8) {
                ctx.fillRect(cx + stripe, cy, 2, cb.h);
            }
            ctx.strokeStyle = 'rgba(255,120,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx + 0.5, cy + 0.5, cb.w - 1, cb.h - 1);
        }
    }
    
    for (const spring of currentRoomData.springs) {
        const compressed = spring.timer > 0;
        const h = compressed ? 8 : 16;
        const y = spring.y + (16 - h);
        const sx = spring.x - cameraX;
        const sy = y - cameraY;
        const springGlow = spring.power === 2 ? 'rgba(255,120,40,0.26)' : 'rgba(255,220,70,0.2)';

        ctx.fillStyle = springGlow;
        ctx.fillRect(sx - 3, sy - 3, spring.w + 6, h + 6);
        
        ctx.fillStyle = spring.power === 2 ? '#ff8800' : '#ffdd44';
        ctx.fillRect(sx, sy, spring.w, h);
        
        ctx.fillStyle = spring.power === 2 ? '#ffaa00' : '#ffff88';
        ctx.fillRect(sx + 2, sy + 2, spring.w - 4, h - 4);
        
        ctx.fillStyle = spring.power === 2 ? '#ff8800' : '#ffdd44';
        for (let i = 0; i < 3; i++) {
            const sy = y + 3 + i * 3 - (compressed ? 2 : 0);
            ctx.fillRect(sx + 2, sy - cameraY, spring.w - 4, 1);
        }

        ctx.strokeStyle = spring.power === 2 ? '#ffe0a0' : '#fffbd0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + 3, sy + 4);
        ctx.lineTo(sx + spring.w - 3, sy + 4);
        ctx.lineTo(sx + 3, sy + 8);
        ctx.lineTo(sx + spring.w - 3, sy + 12);
        ctx.stroke();

        ctx.fillStyle = '#fff6b0';
        ctx.fillRect(sx + 3, sy + 2, 3, 1);
        ctx.fillStyle = '#5e3e23';
        ctx.fillRect(sx + 1, sy + h - 1, spring.w - 2, 1);
    }
    
    ctx.fillStyle = '#ff4444';
    for (const spike of currentRoomData.spikes) {
        const spikeX = spike.x - cameraX;
        const spikeY = spike.y - cameraY;
        ctx.fillStyle = 'rgba(255,50,90,0.22)';
        ctx.fillRect(spikeX - 2, spikeY - 2, spike.w + 4, spike.h + 4);
        ctx.fillStyle = '#ff3f61';
        ctx.beginPath();
        if (spike.dir === 'up') {
            ctx.moveTo(spikeX, spikeY + spike.h);
            ctx.lineTo(spikeX + spike.w/2, spikeY);
            ctx.lineTo(spikeX + spike.w, spikeY + spike.h);
        } else if (spike.dir === 'down') {
            ctx.moveTo(spikeX, spikeY);
            ctx.lineTo(spikeX + spike.w/2, spikeY + spike.h);
            ctx.lineTo(spikeX + spike.w, spikeY);
        } else if (spike.dir === 'left') {
            ctx.moveTo(spikeX + spike.w, spikeY);
            ctx.lineTo(spikeX, spikeY + spike.h/2);
            ctx.lineTo(spikeX + spike.w, spikeY + spike.h);
        } else if (spike.dir === 'right') {
            ctx.moveTo(spikeX, spikeY);
            ctx.lineTo(spikeX + spike.w, spikeY + spike.h/2);
            ctx.lineTo(spikeX, spikeY + spike.h);
        }
        ctx.fill();

        ctx.fillStyle = '#ffb0b8';
        ctx.beginPath();
        if (spike.dir === 'up') {
            ctx.moveTo(spikeX + 1, spikeY + spike.h - 1);
            ctx.lineTo(spikeX + spike.w/2, spikeY + 2);
            ctx.lineTo(spikeX + spike.w - 1, spikeY + spike.h - 1);
        }
        ctx.fill();
        ctx.fillStyle = '#ff4444';
    }
    
    for (const ts of currentRoomData.triggerSpikes) {
        if (ts.triggered) {
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            if (ts.dir === 'up') {
                ctx.moveTo(ts.x - cameraX, ts.y + ts.h - cameraY);
                ctx.lineTo(ts.x + ts.w/2 - cameraX, ts.y - cameraY);
                ctx.lineTo(ts.x + ts.w - cameraX, ts.y + ts.h - cameraY);
            } else if (ts.dir === 'down') {
                ctx.moveTo(ts.x - cameraX, ts.y - cameraY);
                ctx.lineTo(ts.x + ts.w/2 - cameraX, ts.y + ts.h - cameraY);
                ctx.lineTo(ts.x + ts.w - cameraX, ts.y - cameraY);
            } else if (ts.dir === 'left') {
                ctx.moveTo(ts.x + ts.w - cameraX, ts.y - cameraY);
                ctx.lineTo(ts.x - cameraX, ts.y + ts.h/2 - cameraY);
                ctx.lineTo(ts.x + ts.w - cameraX, ts.y + ts.h - cameraY);
            } else if (ts.dir === 'right') {
                ctx.moveTo(ts.x - cameraX, ts.y - cameraY);
                ctx.lineTo(ts.x + ts.w - cameraX, ts.y + ts.h/2 - cameraY);
                ctx.lineTo(ts.x - cameraX, ts.y + ts.h - cameraY);
            }
            ctx.fill();
            
            ctx.fillStyle = '#ff8888';
            ctx.beginPath();
            if (ts.dir === 'up') {
                ctx.moveTo(ts.x - cameraX + 1, ts.y + ts.h - 1 - cameraY);
                ctx.lineTo(ts.x + ts.w/2 - cameraX, ts.y + 2 - cameraY);
                ctx.lineTo(ts.x + ts.w - 1 - cameraX, ts.y + ts.h - 1 - cameraY);
            }
            ctx.fill();
            ctx.fillStyle = '#ff4444';
        } else {
            ctx.fillStyle = '#884444';
            ctx.beginPath();
            if (ts.dir === 'up') {
                ctx.moveTo(ts.x - cameraX, ts.y + ts.h - cameraY);
                ctx.lineTo(ts.x + ts.w/2 - cameraX, ts.y - cameraY);
                ctx.lineTo(ts.x + ts.w - cameraX, ts.y + ts.h - cameraY);
            }
            ctx.fill();
        }
    }
    
    for (const ds of currentRoomData.dashSwitches) {
        const dx = ds.x - cameraX;
        const dy = ds.y - cameraY;
        
        if (ds.activated) {
            ctx.fillStyle = 'rgba(0,255,255,0.24)';
            ctx.fillRect(dx - 4, dy - 4, ds.w + 8, ds.h + 8);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(dx, dy, ds.w, ds.h);
            ctx.fillStyle = '#88ffff';
            ctx.fillRect(dx + 2, dy + 2, ds.w - 4, ds.h - 4);
        } else {
            ctx.fillStyle = '#448888';
            ctx.fillRect(dx, dy, ds.w, ds.h);
            ctx.fillStyle = '#66aaaa';
            ctx.fillRect(dx + 2, dy + 2, ds.w - 4, ds.h - 4);
        }
        
        ctx.strokeStyle = ds.activated ? '#eaffff' : '#a5dddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx + 0.5, dy + 0.5, ds.w - 1, ds.h - 1);
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DASH', dx + ds.w/2, dy + ds.h/2 + 3);
    }
    
    for (const berry of currentRoomData.strawberries) {
        if (!berry.collected) {
            const bx = berry.x - cameraX;
            const by = berry.y - cameraY + Math.sin(berry.wiggle) * 3;

            ctx.strokeStyle = berry.golden ? '#fff0a0' : '#aa1133';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(bx + 4, by + 4, 4.5, 5.5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = berry.golden ? '#ffd84d' : '#ff3366';
            ctx.beginPath();
            ctx.ellipse(bx + 4, by + 4, 4, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ff6688';
            ctx.beginPath();
            ctx.ellipse(bx + 3, by + 2, 2, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = berry.golden ? '#8fcf42' : '#33cc33';
            ctx.fillRect(bx + 3, by - 1, 2, 2);
            ctx.beginPath();
            ctx.ellipse(bx + 3, by + 5, 2.5, 1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(bx + 2, by + 7, 1.5, 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(bx + 4, by + 7, 1.5, 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    for (const seeker of currentRoomData.seekers) {
        const sx = seeker.x - cameraX;
        const sy = seeker.y - cameraY;
        const seekerPulse = seeker.state === 'chase' ? 1 + Math.sin(seeker.timer * 12) * 0.12 : 1;

        ctx.fillStyle = seeker.state === 'chase' ? 'rgba(255,30,50,0.25)' : 'rgba(160,20,30,0.12)';
        ctx.beginPath();
        ctx.arc(sx + 4, sy + 4, 8 * seekerPulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = seeker.state === 'chase' ? '#ff0000' : '#880000';
        ctx.beginPath();
        ctx.arc(sx + 4, sy + 4, 4 * seekerPulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(sx + 3, sy + 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + 5, sy + 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb0b0';
        ctx.fillRect(sx + 2, sy + 2, 1, 1);
        ctx.fillRect(sx + 5, sy + 2, 1, 1);
        ctx.strokeStyle = seeker.state === 'chase' ? '#ff8a8a' : '#c24b5d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx + 4, sy + 4, 5.5, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    for (const badeline of currentRoomData.badelines) {
        const bx = badeline.x - cameraX;
        const by = badeline.y - cameraY;
        
        const badelineAlpha = badeline.state === 'attack' ? 1 : 0.7;
        ctx.globalAlpha = badelineAlpha;

        ctx.fillStyle = badeline.state === 'attack' ? 'rgba(255,40,150,0.24)' : 'rgba(220,40,150,0.12)';
        ctx.beginPath();
        ctx.arc(bx + 4, by + 6, badeline.state === 'attack' ? 12 : 9, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff44aa';
        ctx.beginPath();
        ctx.ellipse(bx + 4, by + 4, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff88cc';
        ctx.beginPath();
        ctx.ellipse(bx + 4, by + 6, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff2288';
        ctx.beginPath();
        ctx.moveTo(bx + 1, by + 8);
        ctx.lineTo(bx + 4, by + 14);
        ctx.lineTo(bx + 7, by + 8);
        ctx.fill();
        
        ctx.fillStyle = '#ff44aa';
        ctx.beginPath();
        ctx.moveTo(bx + 2, by + 10);
        ctx.lineTo(bx + 4, by + 13);
        ctx.lineTo(bx + 6, by + 10);
        ctx.fill();
        
        ctx.fillStyle = '#aa0066';
        ctx.beginPath();
        ctx.arc(bx + 3, by + 3, 1.5, 0, Math.PI * 2);
        ctx.arc(bx + 5, by + 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx + 3, by + 3, 0.5, 0, Math.PI * 2);
        ctx.arc(bx + 5, by + 3, 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffb4e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx + 4, by + 5, 7, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        
        for (const p of badeline.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - cameraX - p.size/2, p.y - cameraY - p.size/2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }
    
    for (const flag of currentRoomData.flags) {
        const fx = flag.x - cameraX;
        const fy = flag.y - cameraY;
        const wave = Math.sin(flag.timer * 3) * 3;

        ctx.fillStyle = 'rgba(255,180,80,0.18)';
        ctx.fillRect(fx - 4, fy - 4, 28, flag.h + 8);
        
        ctx.fillStyle = '#888';
        ctx.fillRect(fx + 3, fy, 2, flag.h);
        ctx.fillStyle = '#d9e2ee';
        ctx.fillRect(fx + 3, fy, 1, flag.h);
        
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(fx + 5, fy + 2);
        ctx.lineTo(fx + 18 + wave, fy + 6);
        ctx.lineTo(fx + 5, fy + 10);
        ctx.fill();
        
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(fx + 5, fy + 3);
        ctx.lineTo(fx + 15 + wave, fy + 6);
        ctx.lineTo(fx + 5, fy + 9);
        ctx.fill();

        ctx.fillStyle = '#fff0b0';
        ctx.fillRect(fx + 5, fy + 4, 3, 1);
    }

    // Wind gust streaks in windy rooms.
    if (currentRoomData.wind) {
        ctx.strokeStyle = 'rgba(220,240,255,0.16)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
            const wx = currentRoomData.wind.x + ((i * 37 + gameTime * 90 * -Math.sign(currentRoomData.wind.dir || 1)) % Math.max(1, currentRoomData.wind.w) + currentRoomData.wind.w) % currentRoomData.wind.w;
            const wy = currentRoomData.wind.y + (i * 23) % Math.max(1, currentRoomData.wind.h);
            const len = 8 + (i % 4) * 4;
            ctx.beginPath();
            ctx.moveTo(wx - cameraX, wy - cameraY);
            ctx.lineTo(wx - cameraX + len * -(currentRoomData.wind.dir || -1), wy - cameraY);
            ctx.stroke();
        }
    }

    drawForegroundAtmosphere(backgroundType, viewW, viewH);
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / (p.maxLife || 1)));
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cameraX - p.size / 2, p.y - cameraY - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

function drawDashAfterimages() {
    for (const img of dashAfterimages) {
        const alpha = img.life / img.maxLife;
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = '#9fdcff';
        ctx.fillRect(img.x - cameraX - 1, img.y - cameraY - 1, player.w + 2, player.h + 2);
    }
    ctx.globalAlpha = 1;
}


// Clickable regions rebuilt every frame by the UI layer (device pixels).
let uiHitAreas = [];
function addHitArea(x, y, w, h, action) {
    uiHitAreas.push({ x, y, w, h, action });
}

function handleUiPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * canvas.width / Math.max(1, rect.width);
    const my = (e.clientY - rect.top) * canvas.height / Math.max(1, rect.height);
    return { mx, my };
}

function drawUI() {
    uiHitAreas = [];
    const chromeActive = gameState === 'playing' && !gameWon;
    document.body.classList.toggle('room-transitioning', Boolean(roomTransition));
    if (chromeActive !== browserChromeActive) {
        document.body.classList.toggle('game-active', chromeActive);
        browserChromeActive = chromeActive;
    }

    if (gameState === 'menu') {
        drawMenu();
        return;
    }

    if (gameState === 'achievements') {
        drawAchievements();
        return;
    }

    if (gameState === 'options') {
        drawOptions();
        return;
    }

    if (gameState === 'chapterSelect') {
        drawChapterSelect();
        return;
    }

    if (gameState === 'credits') {
        drawCredits();
        return;
    }

    if (roomTransition) {
        const progress = roomTransition.progress;
        const eased = progress * progress * (3 - 2 * progress);
        const direction = roomTransition.direction;
        let wipeX = 0;
        let wipeY = 0;
        let wipeW = canvas.width;
        let wipeH = canvas.height;

        if (direction === 'right') {
            wipeW = canvas.width * eased;
        } else if (direction === 'left') {
            wipeW = canvas.width * eased;
            wipeX = canvas.width - wipeW;
        } else if (direction === 'down') {
            wipeH = canvas.height * eased;
        } else {
            wipeH = canvas.height * eased;
            wipeY = canvas.height - wipeH;
        }

        ctx.fillStyle = '#070914';
        ctx.fillRect(wipeX, wipeY, wipeW, wipeH);

        if (progress > 0.04 && progress < 0.98) {
            ctx.fillStyle = 'rgba(156,190,230,0.55)';
            if (direction === 'right') ctx.fillRect(wipeX + wipeW - 2, 0, 2, canvas.height);
            else if (direction === 'left') ctx.fillRect(wipeX, 0, 2, canvas.height);
            else if (direction === 'down') ctx.fillRect(0, wipeY + wipeH - 2, canvas.width, 2);
            else ctx.fillRect(0, wipeY, canvas.width, 2);
        }

        if (progress > 0.55) {
            const alpha = Math.min(1, (progress - 0.55) / 0.12);
            ctx.fillStyle = `rgba(255,255,255,${alpha * 0.08})`;
            ctx.fillRect(canvas.width * 0.24, canvas.height * 0.5 - 1, canvas.width * 0.52, 2);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.font = '18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(rooms[roomTransition.to].name, canvas.width / 2, canvas.height / 2 - 8);
            ctx.fillStyle = `rgba(143,169,205,${alpha})`;
            ctx.font = '9px monospace';
            ctx.fillText('CLIMB', canvas.width / 2, canvas.height / 2 + 15);
        }
    }

    if (gameState === 'playing' && currentRoom === 'prologue' && gameTime < 2.5) {
        const introAlpha = Math.max(0, 1 - gameTime / 2.5);
        ctx.fillStyle = `rgba(8, 8, 26, ${introAlpha * 0.72})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const glow = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.3, 30, canvas.width / 2, canvas.height * 0.3, 160);
        glow.addColorStop(0, `rgba(182, 214, 255, ${0.35 * introAlpha})`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = `rgba(255, 255, 255, ${introAlpha})`;
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('The mountain waits.', canvas.width / 2, canvas.height / 2 - 14);
        ctx.font = '12px monospace';
        ctx.fillText('A story begins in the sky.', canvas.width / 2, canvas.height / 2 + 18);
    }

    if (gameState === 'playing') {
        const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 60, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(0.7, 'rgba(0,0,0,0.08)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (isPaused) {
        ctx.fillStyle = 'rgba(4, 7, 20, 0.78)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(110,150,255,0.1)';
        ctx.fillRect(canvas.width * 0.2, canvas.height * 0.14, canvas.width * 0.6, canvas.height * 0.72);
        ctx.strokeStyle = 'rgba(170,200,255,0.28)';
        ctx.lineWidth = 1;
        ctx.strokeRect(canvas.width * 0.2, canvas.height * 0.14, canvas.width * 0.6, canvas.height * 0.72);
        ctx.fillStyle = '#fff';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width/2, canvas.height/2 - 96);

        const pausedChapter = getChapterProgress(chapterIdOfRoom(currentRoom));
        let statsY = canvas.height/2 + 8;
        if (pausedChapter && pausedChapter.total > 0) {
            ctx.fillStyle = '#ffd76e';
            ctx.font = '13px monospace';
            ctx.fillText(`Chapter berries: ${pausedChapter.collected}/${pausedChapter.total}`, canvas.width/2, statsY);
            statsY += 20;
        }
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.fillText(`Deaths: ${deaths}    Time: ${gameTime.toFixed(2)}s`, canvas.width/2, statsY);

        const btnW = Math.min(260, canvas.width * 0.5);
        const btnH = 28;
        const btnX = canvas.width / 2 - btnW / 2;
        let by = canvas.height / 2 - 80;
        pauseSelection = Math.max(0, Math.min(pauseSelection, PAUSE_CHOICES.length - 1));
        for (let i = 0; i < PAUSE_CHOICES.length; i++) {
            const choice = PAUSE_CHOICES[i];
            const isSelected = i === pauseSelection;
            ctx.fillStyle = isSelected ? 'rgba(50, 75, 145, 0.95)' : 'rgba(28, 36, 66, 0.9)';
            ctx.fillRect(btnX, by, btnW, btnH);
            ctx.strokeStyle = isSelected ? '#ffee77' : 'rgba(170, 200, 255, 0.4)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(btnX + 0.5, by + 0.5, btnW - 1, btnH - 1);
            ctx.fillStyle = isSelected ? '#ffffbb' : '#e8efff';
            ctx.font = `${isSelected ? 'bold ' : ''}14px monospace`;
            ctx.textAlign = 'center';
            const labelText = isSelected ? `> ${choice.label} <` : choice.label;
            ctx.fillText(labelText, canvas.width / 2 - 14, by + 20);
            ctx.fillStyle = isSelected ? 'rgba(255, 235, 160, 0.95)' : 'rgba(150, 175, 220, 0.7)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(choice.hint, btnX + btnW - 10, by + 19);
            ctx.textAlign = 'center';
            addHitArea(btnX, by, btnW, btnH, { type: 'pause', act: choice.act, index: i });
            by += btnH + 12;
        }

        ctx.fillStyle = '#788bb0';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Up/Down: Navigate  |  Enter/Space: Select  |  ESC: Resume', canvas.width / 2, canvas.height * 0.83);
    }

    if (gameWon && gameState !== 'ending') {
        ctx.fillStyle = 'rgba(13, 5, 28, 0.84)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const heartGlow = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.34, 10, canvas.width / 2, canvas.height * 0.34, canvas.width * 0.42);
        heartGlow.addColorStop(0, 'rgba(255,130,230,0.3)');
        heartGlow.addColorStop(0.35, 'rgba(110,150,255,0.12)');
        heartGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = heartGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(255,150,230,0.12)';
        ctx.fillRect(canvas.width * 0.14, canvas.height * 0.18, canvas.width * 0.72, canvas.height * 0.62);
        ctx.strokeStyle = 'rgba(255,190,240,0.38)';
        ctx.lineWidth = 1;
        ctx.strokeRect(canvas.width * 0.14, canvas.height * 0.18, canvas.width * 0.72, canvas.height * 0.62);

        ctx.fillStyle = '#ff9ee8';
        ctx.font = '36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOU FOUND THE HEART!', canvas.width/2, canvas.height/2 - 40);
        ctx.fillStyle = '#fff';
        ctx.font = '18px monospace';
        ctx.fillText(`Strawberries: ${collectedStrawberries}/${totalStrawberries}`, canvas.width/2, canvas.height/2);
        ctx.fillText(`Golden Berries: ${player.goldenBerries}`, canvas.width/2, canvas.height/2 + 30);
        ctx.fillText(`Deaths: ${deaths}`, canvas.width/2, canvas.height/2 + 60);
        ctx.fillText(`Time: ${gameTime.toFixed(2)}s`, canvas.width/2, canvas.height/2 + 90);
        ctx.font = '14px monospace';
        ctx.fillText('Press Enter, Space or ESC to restart', canvas.width/2, canvas.height/2 + 130);
        addHitArea(canvas.width * 0.3, canvas.height/2 + 110, canvas.width * 0.4, 40, { type: 'restart-run' });
    }

    if (gameState === 'ending') {
        if (endingPhase < endingMessages.length) {
            const alpha = endingTextAlpha;
            ctx.fillStyle = 'rgba(13, 5, 28, 0.92)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const msg = endingMessages[endingPhase];
            ctx.fillStyle = `rgba(255, 150, 230, ${alpha})`;
            ctx.font = '28px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(msg.text, canvas.width/2, canvas.height/2 - 20);

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.font = '12px monospace';
            ctx.fillText(`Press Space to continue`, canvas.width/2, canvas.height/2 + 50);
        } else {
            ctx.fillStyle = 'rgba(13, 5, 28, 0.92)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#ff9ee8';
            ctx.font = '32px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('THE END', canvas.width/2, canvas.height/2 - 20);
            ctx.fillStyle = '#fff';
            ctx.font = '14px monospace';
            ctx.fillText('Press ESC for credits', canvas.width/2, canvas.height/2 + 30);
        }
    }

    if (player.dying) {
        const fadeAlpha = 1 - (player.deathTimer / 0.5);
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (gameState === 'playing') {
        const curCh = chapterIdOfRoom(currentRoom);
        const startedAt = curCh ? (chapterStartTimes[curCh] || 0) : 0;
        const chapterElapsed = Math.max(0, gameTime - startedAt);
        const chapterBest = curCh ? player.bestChapters[curCh] : null;
        ctx.textAlign = 'right';
        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffff88';
        ctx.fillText(`Chapter: ${chapterElapsed.toFixed(2)}s`, canvas.width - 10, 20);
        if (chapterBest !== undefined) {
            ctx.fillStyle = chapterElapsed <= chapterBest ? '#88ff88' : '#ff8888';
            ctx.fillText(`Best: ${chapterBest.toFixed(2)}s`, canvas.width - 10, 33);
        }

        let hudY = chapterBest !== undefined ? 46 : 33;
        if (player.goldenBerryRun && !gameWon && !player.dying) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText('* golden run active', canvas.width - 10, hudY);
            hudY += 12;
        }
        if (player.goldenBerries > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`Golden: ${player.goldenBerries}`, canvas.width - 10, hudY);
        }
    }

    if (achievementPopup) {
        const alpha = Math.min(1, achievementPopupTimer * 2);
        const boxW = Math.min(400, canvas.width - 20);
        const boxH = 80;
        const boxX = canvas.width / 2 - boxW / 2;
        const boxY = canvas.height - boxH - 40;

        ctx.fillStyle = `rgba(8, 12, 30, ${0.9 * alpha})`;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = `rgba(160,200,255,${0.4 * alpha})`;
        ctx.fillRect(boxX, boxY, boxW, 1);
        ctx.fillRect(boxX, boxY + boxH - 1, boxW, 1);
        ctx.fillStyle = `rgba(80,130,220,${0.24 * alpha})`;
        ctx.fillRect(boxX, boxY, 3, boxH);
        ctx.fillRect(boxX + boxW - 3, boxY, 3, boxH);

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Achievement Unlocked!', boxX + 18, boxY + 20);

        ctx.fillStyle = `rgba(255,215,0,${alpha})`;
        ctx.font = '24px monospace';
        ctx.fillText(achievementPopup.icon, boxX + 20, boxY + 54);

        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.font = '13px monospace';
        ctx.fillText(achievementPopup.name, boxX + 56, boxY + 34);

        ctx.fillStyle = `rgba(160,200,255,${0.8 * alpha})`;
        ctx.font = '10px monospace';
        ctx.fillText(achievementPopup.desc, boxX + 56, boxY + 52);

        ctx.fillStyle = `rgba(160,200,255,${0.4 * alpha})`;
        ctx.fillRect(boxX + 18, boxY + 60, (boxW - 36) * Math.min(1, achievementPopupTimer), 2);
    }
}


function drawMenu() {
    const viewW = canvas.width;
    const viewH = canvas.height;
    const compact = viewH < 360;
    ctx.fillStyle = '#080d26';
    ctx.fillRect(0, 0, viewW, viewH);
    const menuGradient = ctx.createLinearGradient(0, viewH * 0.3, 0, viewH);
    menuGradient.addColorStop(0, 'rgba(23,16,74,0)');
    menuGradient.addColorStop(1, '#080a18');
    ctx.fillStyle = menuGradient;
    ctx.fillRect(0, 0, viewW, viewH);

    const menuGlow = ctx.createRadialGradient(viewW * 0.5, viewH * 0.3, 12, viewW * 0.5, viewH * 0.3, viewW * 0.6);
    menuGlow.addColorStop(0, 'rgba(130,170,255,0.22)');
    menuGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = menuGlow;
    ctx.fillRect(0, 0, viewW, viewH);

    const stars = Math.sin(Date.now() * 0.001) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 255, 170, ${stars * 0.5 + 0.3})`;
    for (let i = 0; i < 50; i++) {
        const x = (i * 73) % viewW;
        const y = (i * 127) % viewH;
        const size = i % 9 === 0 ? 2 : 1;
        ctx.fillRect(x, y, size, size);
    }

    ctx.fillStyle = 'rgba(100,140,230,0.18)';
    for (let i = -2; i < 8; i++) {
        const x = i * 70 - (Date.now() * 0.01 % 70);
        ctx.beginPath();
        ctx.moveTo(x, viewH * 0.78);
        ctx.lineTo(x + 34, viewH * 0.45);
        ctx.lineTo(x + 70, viewH * 0.78);
        ctx.fill();
    }

    ctx.shadowColor = 'rgba(140,180,255,0.65)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff9ee8';
    ctx.font = `${compact ? 28 : 48}px monospace`;
    ctx.textAlign = 'center';
    const titleY = compact ? 35 : viewH / 2 - 100;
    ctx.fillText('CELESTE', viewW / 2, titleY);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#88aaff';
    ctx.font = `${compact ? 10 : 16}px monospace`;
    ctx.fillText('A Browser Clone', viewW / 2, titleY + (compact ? 19 : 30));

    const optionStartY = compact ? 82 : viewH / 2;
    const optionGap = compact ? 24 : 40;
    ctx.font = `${compact ? 13 : 16}px monospace`;

    const options = getMenuOptions();
    menuSelection = Math.min(menuSelection, options.length - 1);
    options.forEach((option, i) => {
        const y = optionStartY + i * optionGap;
        addHitArea(viewW / 2 - (compact ? 90 : 110), y - (compact ? 16 : 20), compact ? 180 : 220, compact ? 24 : 32, { type: 'menu', index: i });
        if (i === menuSelection) {
            ctx.fillStyle = 'rgba(255,240,130,0.13)';
            ctx.fillRect(viewW / 2 - (compact ? 76 : 92), y - (compact ? 14 : 18), compact ? 152 : 184, compact ? 20 : 26);
            ctx.fillStyle = '#ffff88';
            ctx.fillText('> ' + option + ' <', viewW/2, y);
        } else {
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(option, viewW/2, y);
        }
    });

    if (!compact) {
        ctx.fillStyle = '#666666';
        ctx.font = '12px monospace';
        ctx.fillText('Arrow Keys/WASD: Navigate  |  Space/Enter: Select  |  Mouse: Click', viewW/2, viewH - 40);
        ctx.fillText('ESC: Pause  |  R: Respawn', viewW/2, viewH - 20);
    }
}

function drawAchievements() {
    const viewW = canvas.width;
    const viewH = canvas.height;
    const compact = viewH < 360;

    ctx.fillStyle = '#070918';
    ctx.fillRect(0, 0, viewW, viewH);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, viewH);
    bgGrad.addColorStop(0, '#0d1330');
    bgGrad.addColorStop(0.5, '#12112d');
    bgGrad.addColorStop(1, '#080814');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.fillStyle = 'rgba(255, 255, 200, 0.35)';
    for (let i = 0; i < 40; i++) {
        const sx = (i * 79) % viewW;
        const sy = (i * 113) % viewH;
        ctx.fillRect(sx, sy, 1, 1);
    }

    const unlockedCount = unlockedAchievements.size;
    const totalCount = achievements.length;
    const pct = Math.round((unlockedCount / totalCount) * 100);

    ctx.shadowColor = 'rgba(255, 158, 232, 0.5)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff9ee8';
    ctx.font = `${compact ? 22 : 32}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('ACHIEVEMENTS', viewW / 2, compact ? 26 : 42);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffd700';
    ctx.font = `${compact ? 11 : 14}px monospace`;
    ctx.fillText(`Unlocked: ${unlockedCount} / ${totalCount} (${pct}%)`, viewW / 2, compact ? 42 : 64);

    const barW = Math.min(320, viewW * 0.7);
    const barH = 4;
    const barX = viewW / 2 - barW / 2;
    const barY = compact ? 48 : 74;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(barX, barY, barW * (unlockedCount / totalCount), barH);

    const itemsPerPage = compact ? 4 : 6;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const currentPage = Math.max(0, Math.min(totalPages - 1, Math.floor(achievementScroll)));
    achievementScroll = currentPage;
    const pageStart = currentPage * itemsPerPage;
    const pageItems = achievements.slice(pageStart, pageStart + itemsPerPage);

    const listStartY = compact ? 56 : 88;
    const cardGap = compact ? 23 : 36;
    const cardW = Math.min(compact ? 300 : 540, viewW - 24);
    const cardH = compact ? 21 : 32;
    const cardX = viewW / 2 - cardW / 2;

    pageItems.forEach((ach, idx) => {
        const isUnlocked = unlockedAchievements.has(ach.id);
        const cy = listStartY + idx * cardGap;

        ctx.fillStyle = isUnlocked ? 'rgba(38, 48, 92, 0.85)' : 'rgba(18, 20, 38, 0.7)';
        ctx.fillRect(cardX, cy, cardW, cardH);
        ctx.strokeStyle = isUnlocked ? 'rgba(140, 185, 255, 0.45)' : 'rgba(80, 85, 120, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cardX + 0.5, cy + 0.5, cardW - 1, cardH - 1);

        ctx.font = `${compact ? 13 : 16}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(isUnlocked ? ach.icon : '🔒', cardX + (compact ? 14 : 20), cy + (compact ? 15 : 22));

        ctx.textAlign = 'left';
        ctx.font = `bold ${compact ? 10 : 13}px monospace`;
        ctx.fillStyle = isUnlocked ? '#ffffaa' : '#778899';
        ctx.fillText(ach.name, cardX + (compact ? 30 : 42), cy + (compact ? 14 : 21));

        ctx.font = `${compact ? 8 : 10}px monospace`;
        ctx.fillStyle = isUnlocked ? '#ccddee' : '#556677';
        ctx.fillText(ach.desc, cardX + (compact ? 115 : 180), cy + (compact ? 14 : 21));

        ctx.textAlign = 'right';
        ctx.font = `bold ${compact ? 8 : 10}px monospace`;
        if (isUnlocked) {
            ctx.fillStyle = '#55ff88';
            ctx.fillText('✓ UNLOCKED', cardX + cardW - (compact ? 6 : 10), cy + (compact ? 14 : 21));
        } else {
            ctx.fillStyle = '#556677';
            ctx.fillText('LOCKED', cardX + cardW - (compact ? 6 : 10), cy + (compact ? 14 : 21));
        }
    });

    const navY = viewH - (compact ? 24 : 36);
    ctx.textAlign = 'center';
    ctx.font = `${compact ? 10 : 12}px monospace`;
    ctx.fillStyle = '#88aaff';
    ctx.fillText(`Page ${currentPage + 1} of ${totalPages}`, viewW / 2, navY - (compact ? 10 : 14));

    if (currentPage > 0) {
        const prevBtnW = compact ? 50 : 70;
        const prevBtnX = viewW / 2 - (compact ? 75 : 105);
        ctx.fillStyle = 'rgba(40, 50, 90, 0.8)';
        ctx.fillRect(prevBtnX, navY - (compact ? 20 : 26), prevBtnW, compact ? 16 : 22);
        ctx.strokeStyle = 'rgba(150, 180, 255, 0.4)';
        ctx.strokeRect(prevBtnX, navY - (compact ? 20 : 26), prevBtnW, compact ? 16 : 22);
        ctx.fillStyle = '#fff';
        ctx.fillText('< Prev', prevBtnX + prevBtnW / 2, navY - (compact ? 8 : 11));
        addHitArea(prevBtnX, navY - (compact ? 20 : 26), prevBtnW, compact ? 16 : 22, { type: 'achievements-page', dir: -1 });
    }
    if (currentPage < totalPages - 1) {
        const nextBtnW = compact ? 50 : 70;
        const nextBtnX = viewW / 2 + (compact ? 25 : 35);
        ctx.fillStyle = 'rgba(40, 50, 90, 0.8)';
        ctx.fillRect(nextBtnX, navY - (compact ? 20 : 26), nextBtnW, compact ? 16 : 22);
        ctx.strokeStyle = 'rgba(150, 180, 255, 0.4)';
        ctx.strokeRect(nextBtnX, navY - (compact ? 20 : 26), nextBtnW, compact ? 16 : 22);
        ctx.fillStyle = '#fff';
        ctx.fillText('Next >', nextBtnX + nextBtnW / 2, navY - (compact ? 8 : 11));
        addHitArea(nextBtnX, navY - (compact ? 20 : 26), nextBtnW, compact ? 16 : 22, { type: 'achievements-page', dir: 1 });
    }

    const backBtnW = compact ? 90 : 120;
    const backBtnH = compact ? 18 : 24;
    const backBtnX = viewW / 2 - backBtnW / 2;
    const backBtnY = navY + (compact ? 2 : 4);
    ctx.fillStyle = 'rgba(30, 36, 68, 0.9)';
    ctx.fillRect(backBtnX, backBtnY, backBtnW, backBtnH);
    ctx.strokeStyle = 'rgba(160, 190, 255, 0.45)';
    ctx.strokeRect(backBtnX, backBtnY, backBtnW, backBtnH);
    ctx.fillStyle = '#ffdd66';
    ctx.font = `${compact ? 10 : 12}px monospace`;
    ctx.fillText('BACK (ESC / ENTER)', viewW / 2, backBtnY + (compact ? 13 : 17));
    addHitArea(backBtnX, backBtnY, backBtnW, backBtnH, { type: 'achievements-back' });
}

let resetConfirmTimer = null;
function getAccessibilityOptions() {
    return [
        { label: 'High Contrast Mode', value: accessibility.highContrast, toggle: () => { accessibility.highContrast = !accessibility.highContrast; } },
        { label: 'Reduced Motion', value: accessibility.reducedMotion, toggle: () => { accessibility.reducedMotion = !accessibility.reducedMotion; } },
        { label: 'Music', value: accessibility.musicEnabled, toggle: () => { accessibility.musicEnabled = !accessibility.musicEnabled; applyMusicSetting(); } },
        { label: 'Sound Effects', value: accessibility.sfxEnabled, toggle: () => { accessibility.sfxEnabled = !accessibility.sfxEnabled; } },
        { label: 'Ghost Replay', value: accessibility.showGhost, toggle: () => { accessibility.showGhost = !accessibility.showGhost; } },
        {
            label: confirmResetProgress ? 'CONFIRM: Reset All Save Data?' : 'Reset Save Data',
            value: confirmResetProgress,
            isAction: true,
            toggle: () => {
                if (!confirmResetProgress) {
                    confirmResetProgress = true;
                    if (resetConfirmTimer) clearTimeout(resetConfirmTimer);
                    resetConfirmTimer = setTimeout(() => { confirmResetProgress = false; }, 5000);
                } else {
                    confirmResetProgress = false;
                    localStorage.removeItem(SAVE_KEY);
                    unlockedAchievements.clear();
                    startNewGame();
                    gameState = 'menu';
                    menuSelection = 0;
                    playSound('death');
                }
            }
        },
        {
            label: 'Back to Menu',
            isAction: true,
            isBack: true,
            toggle: () => {
                gameState = returnToStateAfterOptions === 'playing' ? 'playing' : 'menu';
                if (returnToStateAfterOptions !== 'playing' && gameState === 'menu') menuSelection = 0;
                returnToStateAfterOptions = null;
            }
        }
    ];
}

function drawOptions() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff88ff';
    ctx.font = '32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('OPTIONS', canvas.width/2, canvas.height/2 - 125);

    const options = getAccessibilityOptions();
    options.forEach((opt, i) => {
        const y = canvas.height/2 - 75 + i * 30;
        addHitArea(canvas.width / 2 - 170, y - 14, 340, 26, { type: 'option', index: i });
        if (i === menuSelection) {
            ctx.fillStyle = '#ffff88';
            if (opt.isAction) {
                ctx.fillText('> ' + opt.label + ' <', canvas.width/2, y);
            } else {
                ctx.fillText('> ' + opt.label + ': ' + (opt.value ? 'ON' : 'OFF') + ' <', canvas.width/2, y);
            }
        } else {
            if (opt.isAction) {
                ctx.fillStyle = opt.isBack ? '#ffdd66' : (confirmResetProgress ? '#ff4444' : '#aaaaaa');
                ctx.fillText(opt.label, canvas.width/2, y);
            } else {
                ctx.fillStyle = opt.value ? '#88ff88' : '#ff8888';
                ctx.fillText(opt.label + ': ' + (opt.value ? 'ON' : 'OFF'), canvas.width/2, y);
            }
        }
    });

    ctx.fillStyle = '#666666';
    ctx.font = '12px monospace';
    ctx.fillText('Up/Down: Navigate  |  Left/Right/Enter: Toggle  |  ESC: Back', canvas.width/2, canvas.height - 25);
    addHitArea(canvas.width / 2 - 90, canvas.height - 35, 180, 24, { type: 'options-back' });
}

function drawChapterPostcard(room, chapter, x, y, w, h) {
    const palettes = {
        mountain: { sky: '#151a38', horizon: '#68516f', terrain: '#405363', edge: '#86a277', spike: '#d9d5e5' },
        city: { sky: '#171126', horizon: '#7a3e56', terrain: '#59465f', edge: '#aa7072', spike: '#d9d5e5' },
        oldsite: { sky: '#07191f', horizon: '#1f5c4a', terrain: '#2b6b52', edge: '#7fbf62', spike: '#eafadf' },
        resort: { sky: '#180e20', horizon: '#603445', terrain: '#6e4050', edge: '#bd806c', spike: '#ffd9c9' },
        reflection: { sky: '#080a26', horizon: '#402f68', terrain: '#37306b', edge: '#80619a', spike: '#dcd6ff' },
        summit: { sky: '#0c162b', horizon: '#53617e', terrain: '#46647a', edge: '#d7eef0', spike: '#ffffff' },
        core: { sky: '#190719', horizon: '#691d2f', terrain: '#571f38', edge: '#d87055', spike: '#ffb3a0' },
        mirror: { sky: '#12142e', horizon: '#33306a', terrain: '#3a3670', edge: '#8276b3', spike: '#e4dcff' }
    };
    const p = palettes[chapter.bg] || palettes.mountain;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, p.sky);
    sky.addColorStop(1, p.horizon);
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    // moon/sun
    ctx.fillStyle = 'rgba(255,246,220,0.85)';
    ctx.beginPath();
    ctx.arc(x + w * 0.78, y + h * 0.22, Math.max(4, w * 0.035), 0, Math.PI * 2);
    ctx.fill();

    // stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 22; i++) {
        ctx.fillRect(x + (i * 29 + 7) % w, y + (i * 13 + 5) % (h * 0.5), 1, 1);
    }

    // layered ridges from the room's real terrain silhouette
    if (room) {
        const tops = new Map();
        for (const s of room.solids) {
            if (s.type === 'berry-perch') continue;
            const col = Math.floor(s.x / 8);
            if (!tops.has(col) || s.y < tops.get(col)) tops.set(col, s.y);
        }
        for (let layer = 0; layer < 2; layer++) {
            ctx.fillStyle = layer === 0 ? p.terrain : p.edge;
            const lift = layer === 0 ? 0 : -6;
            ctx.beginPath();
            ctx.moveTo(x, y + h);
            for (let col = 0; col <= Math.ceil(w / 8); col++) {
                const ty = tops.has(col) ? tops.get(col) : 160;
                const px = x + (col * w) / 40;
                const py = y + ((ty - lift) / 180) * h * 0.92;
                ctx.lineTo(px, py);
                ctx.lineTo(px + w / 40, py);
            }
            ctx.lineTo(x + w, y + h);
            ctx.closePath();
            ctx.fill();
        }

        // spikes
        ctx.fillStyle = p.spike;
        for (const sp of room.spikes.slice(0, 40)) {
            const sx = x + (sp.x / 320) * w;
            const sy = y + (sp.y / 180) * h;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + (sp.w / 320) * w / 2, sy + (sp.h / 180) * h);
            ctx.lineTo(sx + (sp.w / 320) * w, sy);
            ctx.fill();
        }

        // berries
        for (const b of room.strawberries.slice(0, 8)) {
            const bx = x + (b.x / 320) * w;
            const by = y + (b.y / 180) * h;
            ctx.fillStyle = b.golden ? '#ffd84d' : '#ff3366';
            ctx.fillRect(bx - 1, by - 1, 2, 2);
        }

        // heart
        if (room.heartGem && !room.heartGem.collected) {
            ctx.fillStyle = '#ff88ff';
            ctx.fillRect(x + (room.heartGem.x / 320) * w - 1, y + (room.heartGem.y / 180) * h - 1, 3, 3);
        }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
}


function drawChapterSelect() {
    const viewW = canvas.width;
    const viewH = canvas.height;
    const compact = viewH < 320 || viewW < 600;
    const chapter = chapterList[chapterSelectIndex];
    const chapterUnlocked = isChapterUnlocked(chapter);
    const palette = {
        mountain: ['#090d20', '#292344'], city: ['#100b1d', '#43233a'], oldsite: ['#07191f', '#19483d'],
        resort: ['#180e20', '#603445'], reflection: ['#080a26', '#402f68'], summit: ['#0c162b', '#53617e'], core: ['#190719', '#691d2f']
    }[chapter.bg] || ['#090d20', '#292344'];

    const background = ctx.createLinearGradient(0, 0, 0, viewH);
    background.addColorStop(0, palette[0]);
    background.addColorStop(1, palette[1]);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.fillStyle = 'rgba(255,246,220,0.45)';
    for (let i = 0; i < 44; i++) {
        ctx.fillRect((i * 83 + 17) % viewW, (i * 47 + 11) % Math.max(1, viewH * 0.64), i % 13 === 0 ? 2 : 1, i % 13 === 0 ? 2 : 1);
    }

    ctx.fillStyle = 'rgba(9,11,29,0.48)';
    for (let i = -1; i < 8; i++) {
        const mx = i * viewW / 6;
        ctx.beginPath();
        ctx.moveTo(mx, viewH);
        ctx.lineTo(mx + viewW * 0.1, viewH * (0.52 + (i % 3) * 0.08));
        ctx.lineTo(mx + viewW * 0.22, viewH);
        ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#d9e3f7';
    ctx.font = `bold ${compact ? 9 : 16}px monospace`;
    ctx.fillText('SELECT CHAPTER', viewW / 2, compact ? 16 : 38);
    ctx.fillStyle = '#7486ab';
    ctx.fillRect(viewW * 0.39, compact ? 21 : 47, viewW * 0.22, 2);

    const cardW = compact ? Math.min(226, viewW * 0.64) : Math.min(480, viewW * 0.5);
    const cardH = compact ? Math.min(96, viewH * 0.47) : Math.min(cardW * 0.54, viewH * 0.48);
    const cardX = viewW / 2 - cardW / 2;
    const cardY = compact ? 30 : viewH * 0.18;

    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(cardX + (compact ? 4 : 8), cardY + (compact ? 4 : 8), cardW, cardH);
    ctx.fillStyle = (chapterSelectFocus === 'card') ? '#ffea70' : '#e8e4da';
    ctx.fillRect(cardX - 4, cardY - 4, cardW + 8, cardH + 8);
    if (chapterSelectFocus === 'card') {
        ctx.strokeStyle = '#ffee77';
        ctx.lineWidth = compact ? 1 : 2;
        ctx.strokeRect(cardX - 5.5, cardY - 5.5, cardW + 11, cardH + 11);
    }
    ctx.fillStyle = '#1d2034';
    ctx.fillRect(cardX - 2, cardY - 2, cardW + 4, cardH + 4);
    drawChapterPostcard(rooms[chapter.id], chapter, cardX, cardY, cardW, cardH);
    if (!chapterUnlocked) {
        ctx.fillStyle = 'rgba(5,7,18,0.76)';
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.strokeStyle = '#d9bd67';
        ctx.lineWidth = compact ? 1 : 2;
        ctx.strokeRect(cardX + cardW / 2 - 13, cardY + cardH / 2 - 7, 26, 20);
        ctx.beginPath();
        ctx.arc(cardX + cardW / 2, cardY + cardH / 2 - 7, 8, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#fff0a4';
        ctx.font = `bold ${compact ? 7 : 12}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('CASSETTE REQUIRED', cardX + cardW / 2, cardY + cardH - (compact ? 8 : 15));
    }

    const previous = chapterList[(chapterSelectIndex - 1 + chapterList.length) % chapterList.length];
    const next = chapterList[(chapterSelectIndex + 1) % chapterList.length];
    ctx.fillStyle = 'rgba(214,224,244,0.52)';
    ctx.font = `${compact ? 6 : 10}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`< ${previous.name}`, cardX - (compact ? 8 : 18), cardY + cardH / 2);
    ctx.textAlign = 'left';
    ctx.fillText(`${next.name} >`, cardX + cardW + (compact ? 8 : 18), cardY + cardH / 2);
    addHitArea(0, cardY, Math.max(30, cardX - 10), cardH, { type: 'chapter', act: 'prev' });
    addHitArea(cardX + cardW + 10, cardY, Math.max(30, viewW - (cardX + cardW) - 10), cardH, { type: 'chapter', act: 'next' });
    addHitArea(cardX - 4, cardY - 4, cardW + 8, cardH + 8, { type: 'chapter', act: 'start' });

    const chapterGroup = CHAPTERS.find(group => group.id === chapter.id);
    const chapterRooms = (chapterGroup?.rooms || [chapter.id]).map(id => rooms[id]).filter(Boolean);
    const progress = getChapterProgress(chapter.id);
    const collected = progress ? progress.collected : 0;
    const berryTotal = progress ? progress.total : 0;
    const infoY = cardY + cardH + (compact ? 16 : 32);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8395b8';
    ctx.font = `${compact ? 6 : 10}px monospace`;
    ctx.fillText(`CHAPTER ${chapter.number}`, viewW / 2, infoY - (compact ? 8 : 14));
    ctx.fillStyle = '#fff0a4';
    ctx.font = `bold ${compact ? 10 : 22}px monospace`;
    ctx.fillText(chapter.name.toUpperCase(), viewW / 2, infoY + (compact ? 3 : 8));
    ctx.fillStyle = '#cad3e8';
    ctx.font = `${compact ? 6 : 11}px monospace`;
    ctx.fillText(chapter.subtitle, viewW / 2, infoY + (compact ? 13 : 27));
    ctx.fillStyle = chapterUnlocked ? '#9db0d2' : '#d9bd67';
    ctx.font = `${compact ? 6 : 10}px monospace`;
    const chapterStatus = chapterUnlocked
        ? `${chapter.difficulty}   ${chapterRooms.length} ROOMS   SECRETS ${collected}/${berryTotal}`
        : `LOCKED   CASSETTE HIDES IN ${(findCassetteRoom(chapter.unlockId)?.name || 'AN A-SIDE').toUpperCase()}`;
    ctx.fillText(chapterStatus, viewW / 2, infoY + (compact ? 23 : 45));

    const dotY = compact ? viewH - 9 : viewH - 42;
    for (let i = 0; i < chapterList.length; i++) {
        ctx.fillStyle = i === chapterSelectIndex ? '#fff0a4' : '#53617f';
        const dotSize = i === chapterSelectIndex ? (compact ? 5 : 7) : (compact ? 3 : 4);
        const dotX = viewW / 2 + (i - (chapterList.length - 1) / 2) * (compact ? 11 : 17) - dotSize / 2;
        ctx.fillRect(dotX, dotY - dotSize / 2, dotSize, dotSize);
        addHitArea(dotX - 5, dotY - 9, dotSize + 10, 18, { type: 'chapter', act: 'goto', index: i });
    }

    const isBackSelected = chapterSelectFocus === 'back';
    const backBtnW = compact ? 90 : 130;
    const backBtnH = compact ? 16 : 22;
    const backBtnX = viewW / 2 - backBtnW / 2;
    const backBtnY = compact ? viewH - 20 : viewH - 32;
    ctx.fillStyle = isBackSelected ? 'rgba(52, 76, 146, 0.95)' : 'rgba(28, 34, 62, 0.85)';
    ctx.fillRect(backBtnX, backBtnY, backBtnW, backBtnH);
    ctx.strokeStyle = isBackSelected ? '#ffee77' : 'rgba(160, 190, 255, 0.45)';
    ctx.lineWidth = isBackSelected ? 2 : 1;
    ctx.strokeRect(backBtnX + 0.5, backBtnY + 0.5, backBtnW - 1, backBtnH - 1);
    ctx.fillStyle = isBackSelected ? '#ffffbb' : '#ffdd66';
    ctx.font = `${compact ? 9 : 11}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(isBackSelected ? '> BACK TO MENU <' : 'BACK (ESC)', viewW / 2, backBtnY + (compact ? 12 : 15));
    addHitArea(backBtnX, backBtnY, backBtnW, backBtnH, { type: 'chapter', act: 'back' });

    if (!compact) {
        ctx.fillStyle = '#71809f';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ARROWS: Navigate  |  ENTER: Select  |  ESC: Back', viewW / 2, viewH - 8);
    }
}

function drawCredits() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff88ff';
    ctx.font = '32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CREDITS', canvas.width/2, canvas.height/2 - 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('Celeste Browser Clone', canvas.width/2, canvas.height/2 - 50);
    ctx.fillText('Inspired by Celeste by Maddy Makes Games', canvas.width/2, canvas.height/2 - 20);
    ctx.fillText('Built with HTML5 Canvas & Web Audio API', canvas.width/2, canvas.height/2 + 10);

    ctx.fillStyle = '#88aaff';
    ctx.fillText('Original Game: Maddy Thorson, Noel Berry', canvas.width/2, canvas.height/2 + 40);
    ctx.fillText('Music: Lena Raine', canvas.width/2, canvas.height/2 + 70);

    ctx.fillStyle = '#666666';
    ctx.font = '12px monospace';
    ctx.fillText('Press Enter, Space, or ESC to go back', canvas.width/2, canvas.height - 40);
    addHitArea(0, 0, canvas.width, canvas.height, { type: 'credits-back' });
}

function draw() {
    const shakeX = accessibility.reducedMotion ? 0 : (screenShake > 0 ? (Math.random() - 0.5) * screenShake * 10 : 0);
    const shakeY = accessibility.reducedMotion ? 0 : (screenShake > 0 ? (Math.random() - 0.5) * screenShake * 10 : 0);
    screenShake = Math.max(0, screenShake - 0.02);

    ctx.save();
    if (!accessibility.reducedMotion) {
        ctx.translate(shakeX, shakeY);
    }
    ctx.scale(renderScale, renderScale);

    const viewW = canvas.width / renderScale;
    const viewH = canvas.height / renderScale;

    if (accessibility.highContrast) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, viewW, viewH);
    } else {
        ctx.fillStyle = '#0a0a2a';
        ctx.fillRect(0, 0, viewW, viewH);
    }

    drawLevel();
    drawParticles();
    drawShockwaves();
    drawDashAfterimages();
    drawPlayerHair();
    drawPlayer();

    if (player.showGhost && accessibility.showGhost && player.bestGhost && player.bestGhost.length > 0) {
        const ghostLen = player.bestGhost.length;
        const ghostIndex = Math.floor(((gameTime * 30) % ghostLen));
        const ghost = player.bestGhost[ghostIndex];
        if (ghost) {
            const gx = ghost.x - cameraX;
            const gy = ghost.y - cameraY;
            ctx.save();
            ctx.translate(gx + player.w / 2, gy + player.h / 2);
            ctx.scale(ghost.facing || 1, 1);
            ctx.translate(-player.w / 2, -player.h / 2);

            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#7ac0ff';
            ctx.fillRect(0, 2, player.w, player.h - 2);
            ctx.fillStyle = '#bce6ff';
            ctx.fillRect(1, 0, player.w - 2, 3);
            ctx.fillStyle = '#55aaff';
            ctx.fillRect(-1, 3, 2, 4);

            ctx.globalAlpha = 1;
            ctx.restore();
        }
    }

    if (goldenBerryFlash > 0) {
        goldenBerryFlash = Math.max(0, goldenBerryFlash - 0.02);
        ctx.fillStyle = `rgba(255, 215, 0, ${goldenBerryFlash * 0.6})`;
        ctx.fillRect(0, 0, viewW, viewH);
    }

    if (tutorialState < tutorialMessages.length && currentRoom === 'prologue' && gameTime >= 2.5) {
        const msg = tutorialMessages[tutorialState];

        const boxW = 170;
        const boxH = 32;
        const boxX = viewW / 2 - boxW / 2;
        const boxY = viewH - 42;

        ctx.fillStyle = 'rgba(80,150,255,0.12)';
        ctx.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);
        ctx.fillStyle = 'rgba(8,12,30,0.9)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = 'rgba(160,200,255,0.4)';
        ctx.fillRect(boxX, boxY, boxW, 1);
        ctx.fillRect(boxX, boxY + boxH - 1, boxW, 1);
        ctx.fillStyle = 'rgba(80,130,220,0.24)';
        ctx.fillRect(boxX, boxY, 3, boxH);
        ctx.fillRect(boxX + boxW - 3, boxY, 3, boxH);

        ctx.fillStyle = '#fff1a1';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        const textLines = [];
        let currentLine = '';
        for (const word of msg.text.split(' ')) {
            const candidate = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(candidate).width > boxW - 24 && currentLine) {
                textLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = candidate;
            }
        }
        if (currentLine) textLines.push(currentLine);
        const textStartY = boxY + 9 - (textLines.length - 1) * 3;
        textLines.forEach((line, index) => {
            ctx.fillText(line, viewW / 2, textStartY + index * 7);
        });

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(boxX + 7, boxY + 20, boxW - 14, 2);
        ctx.fillStyle = '#88c8ff';
        const progress = Math.min(tutorialTimer / 3, 1);
        ctx.fillRect(boxX + 7, boxY + 20, (boxW - 14) * progress, 2);

        ctx.fillStyle = '#9eb8e8';
        ctx.font = '6px monospace';
        ctx.fillText(`${tutorialState + 1} / ${tutorialMessages.length}`, viewW / 2, boxY + 29);
        ctx.textAlign = 'right';
        ctx.fillText('ENTER: SKIP', boxX + boxW - 7, boxY + 29);
    }

    if (player.dashTimer > 0 && !accessibility.reducedMotion) {
        const flashProgress = player.dashTimer / DASH_TIME;
        const flashAlpha = Math.sin(flashProgress * Math.PI) * 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, viewW, viewH);
    }

    ctx.restore();

    drawUI();

    if (!accessibility.highContrast && !accessibility.reducedMotion) {
        const vignetteGrad = ctx.createRadialGradient(
            canvas.width/2, canvas.height/2, canvas.width * 0.3,
            canvas.width/2, canvas.height/2, canvas.width * 0.5
        );
        vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}


const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
// Browsers start audio suspended until a user gesture; unlock on first input.
const resumeAudioCtx = () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            applyMusicSetting();
        }).catch(() => {});
    }
};
window.addEventListener('pointerdown', resumeAudioCtx);
window.addEventListener('keydown', resumeAudioCtx);

// Shared white-noise buffer for percussive/transient sound layers.
let noiseBuffer = null;
function getNoiseBuffer() {
    if (!noiseBuffer) {
        const len = Math.floor(audioCtx.sampleRate * 0.5);
        noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
}

function playNoise(duration = 0.15, volume = 0.08, filterFreq = 800) {
    try {
        const src = audioCtx.createBufferSource();
        src.buffer = getNoiseBuffer();
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(now);
        src.stop(now + duration);
    } catch (err) { /* audio unavailable — stay silent */ }
}

function playSound(name) {
    if (!accessibility.sfxEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    switch(name) {
        case 'jump':
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        case 'dash':
            playNoise(0.12, 0.05, 2400);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        case 'spring':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'superSpring':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'berry':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
            osc.frequency.exponentialRampToValueAtTime(2640, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'death':
            playNoise(0.45, 0.12, 320);
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        case 'bubble':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'kevin':
            playNoise(0.2, 0.06, 1200);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.2);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'seeker':
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'badeline':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'switch':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'cassette':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(880, now + 0.1);
            osc.frequency.setValueAtTime(1760, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'land':
            playNoise(0.12, 0.07, 500);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'menuMove':
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'menuSelect':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;
        case 'heart': {
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((freq, idx) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(freq, now + idx * 0.08);
                g.gain.setValueAtTime(0.12, now + idx * 0.08);
                g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
                o.connect(g);
                g.connect(audioCtx.destination);
                o.start(now + idx * 0.08);
                o.stop(now + idx * 0.08 + 0.4);
            });
            break;
        }
        case 'dream':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
            break;
    }
}

function startNewGame() {
    releaseAllInputs();
    localStorage.removeItem(SAVE_KEY);
    deaths = 0;
    totalStrawberries = 0;
    collectedStrawberries = 0;
    savedBerryIds = new Set();
    savedCassetteIds = new Set();
    savedRoom = 'prologue';
    savedSpawnX = null;
    savedSpawnY = null;
    player.goldenBerries = 0;
    player.goldenBerryRun = true;
    player.cassettes = 0;
    player.hasFeather = false;
    player.bestChapters = {};
    savedGameTime = 0;
    gameTime = 0;
    currentRoom = 'prologue';
    resetTutorial();
    gameState = 'playing';
    isPaused = false;
    errorMsg = null;
    init();
    saveGame();
}

function selectMenuOption() {
    playSound('menuSelect');
    switch(getMenuOptions()[menuSelection]) {
        case 'Start Game':
            startNewGame();
            break;
        case 'Continue':
            continueGame();
            break;
        case 'Chapter Select':
            gameState = 'chapterSelect';
            chapterSelectIndex = 0;
            chapterSelectFocus = 'card';
            break;
        case 'Achievements':
            gameState = 'achievements';
            achievementScroll = 0;
            returnToStateAfterOptions = 'menu';
            break;
        case 'Options':
            gameState = 'options';
            menuSelection = 0;
            returnToStateAfterOptions = 'menu';
            break;
        case 'Credits':
            gameState = 'credits';
            returnToStateAfterOptions = 'menu';
            break;
    }
}

const chapterList = [
    { id: 'prologue', number: '00', name: 'Prologue', subtitle: 'The climb begins', bg: 'mountain', difficulty: '★★☆☆☆' },
    { id: 'forsaken', number: '01', name: 'Forsaken City', subtitle: 'Momentum over the rooftops', bg: 'city', difficulty: '★★★☆☆' },
    { id: 'forsaken-bside', number: '01-B', name: 'Forsaken City B-Side', subtitle: 'No room to hesitate', bg: 'city', difficulty: '★★★★☆', unlockId: 'cassette-city' },
    { id: 'old-site', number: '02', name: 'Old Site', subtitle: 'A dream below', bg: 'oldsite', difficulty: '★★★☆☆' },
    { id: 'old-site2', number: '02-B', name: 'Old Site B-Side', subtitle: 'Wake from the nightmare', bg: 'oldsite', difficulty: '★★★★☆', unlockId: 'cassette-oldsite' },
    { id: 'resort', number: '03', name: 'Celestial Resort', subtitle: 'No vacancies, no safety', bg: 'resort', difficulty: '★★★☆☆' },
    { id: 'resort-bside', number: '03-B', name: 'Resort B-Side', subtitle: 'Staff only', bg: 'resort', difficulty: '★★★★★', unlockId: 'cassette-resort' },
    { id: 'mirror', number: '04', name: 'Mirror Temple', subtitle: 'Look inward', bg: 'reflection', difficulty: '★★★★☆' },
    { id: 'mirror-bside', number: '04-B', name: 'Mirror Temple B-Side', subtitle: 'The maze looks back', bg: 'reflection', difficulty: '★★★★★', unlockId: 'cassette-mirror' },
    { id: 'summit', number: '05', name: 'The Summit', subtitle: 'Above the clouds', bg: 'summit', difficulty: '★★★★☆' },
    { id: 'summit2', number: '05-B', name: 'Summit B-Side', subtitle: 'Razor-thin air', bg: 'summit', difficulty: '★★★★★', unlockId: 'cassette-summit' },
    { id: 'core', number: '06', name: 'Core', subtitle: 'Heart of the mountain', bg: 'core', difficulty: '★★★★★' },
    { id: 'core2', number: '06-B', name: 'Core B-Side', subtitle: 'Meltdown', bg: 'core', difficulty: '★★★★★+', unlockId: 'cassette-core' },
    { id: 'farewell', number: '07', name: 'Farewell', subtitle: 'One final ascent', bg: 'summit', difficulty: '★★★★★+' }
];

function isChapterUnlocked(chapter) {
    return !chapter.unlockId || savedCassetteIds.has(chapter.unlockId);
}

// Tells players which room hides the cassette that unlocks a chapter.
function findCassetteRoom(cassetteId) {
    for (const room of Object.values(rooms)) {
        if (room.cassette && room.cassette.id === cassetteId) return room;
    }
    return null;
}

function startChapter(chapter) {
    if (!isChapterUnlocked(chapter)) return;
    gameTime = 0;
    resetTutorial();
    gameState = 'playing';
    isPaused = false;
    currentRoom = chapter.id;
    requestedStartRoom = chapter.id;
    init();
    saveGame();
}

function continueGame() {
    resetTutorial();
    gameState = 'playing';
    isPaused = false;
    init();
}

let bgOscillator = null;
let bgGainNode = null;
let musicFifthOsc = null;
let musicFifthGain = null;
let lfoOsc = null;
let lfoGain = null;
let musicNextSwapAt = 0;
let musicCurrentBg = null;

const MUSIC_THEMES = {
    mountain: { base: 55, alt: 65, type: 'sine', gain: 0.05 },
    city: { base: 49, alt: 61, type: 'triangle', gain: 0.04 },
    oldsite: { base: 61, alt: 73, type: 'sine', gain: 0.05 },
    resort: { base: 73, alt: 82, type: 'triangle', gain: 0.04 },
    mirror: { base: 41, alt: 55, type: 'sawtooth', gain: 0.03 },
    reflection: { base: 37, alt: 49, type: 'sine', gain: 0.03 },
    summit: { base: 55, alt: 69, type: 'sine', gain: 0.05 },
    core: { base: 46, alt: 58, type: 'square', gain: 0.04 }
};
const MUSIC_BAR_SECONDS = 8;

function startBackgroundMusic(roomBg) {
    if (!accessibility.musicEnabled) {
        stopBackgroundMusic();
        return;
    }
    if (bgOscillator) stopBackgroundMusic();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    bgOscillator = audioCtx.createOscillator();
    bgGainNode = audioCtx.createGain();

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const theme = MUSIC_THEMES[roomBg] || MUSIC_THEMES.mountain;
    musicCurrentBg = roomBg;

    bgOscillator.type = theme.type;
    bgOscillator.frequency.setValueAtTime(theme.base, audioCtx.currentTime);

    // Fifth-above pad voice gives the drone a chordal, less sterile body.
    musicFifthOsc = audioCtx.createOscillator();
    musicFifthOsc.type = 'sine';
    musicFifthOsc.frequency.setValueAtTime(theme.base * 1.5, audioCtx.currentTime);
    musicFifthGain = audioCtx.createGain();
    musicFifthGain.gain.value = theme.gain * 0.45;

    bgGainNode.gain.value = theme.gain;

    bgOscillator.connect(filter);
    musicFifthOsc.connect(musicFifthGain);
    musicFifthGain.connect(filter);
    filter.connect(bgGainNode);
    bgGainNode.connect(audioCtx.destination);

    bgOscillator.start();
    musicFifthOsc.start();

    lfoOsc = audioCtx.createOscillator();
    lfoGain = audioCtx.createGain();
    lfoOsc.type = 'sine';
    lfoOsc.frequency.value = 0.1;
    lfoGain.gain.value = 0.02;
    lfoOsc.connect(lfoGain);
    lfoGain.connect(bgGainNode.gain);
    lfoOsc.start();

    musicNextSwapAt = audioCtx.currentTime + MUSIC_BAR_SECONDS;
}

// The old scheduling fired once at absolute times and let the theme decay
// into a flat drone; keep the base/alt pattern cycling for as long as it plays.
function updateBackgroundMusic() {
    if (!bgOscillator || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    if (now < musicNextSwapAt) return;
    const theme = MUSIC_THEMES[musicCurrentBg] || MUSIC_THEMES.mountain;
    const barIndex = Math.floor(now / MUSIC_BAR_SECONDS);
    const freq = barIndex % 2 ? theme.alt : theme.base;
    bgOscillator.frequency.setValueAtTime(freq, now);
    if (musicFifthOsc) musicFifthOsc.frequency.setValueAtTime(freq * 1.5, now);
    musicNextSwapAt = (barIndex + 1) * MUSIC_BAR_SECONDS;
}

function stopBackgroundMusic() {
    if (bgOscillator) {
        try { bgOscillator.stop(); bgOscillator.disconnect(); } catch (e) {}
        bgOscillator = null;
    }
    if (musicFifthOsc) {
        try { musicFifthOsc.stop(); musicFifthOsc.disconnect(); } catch (e) {}
        musicFifthOsc = null;
    }
    if (musicFifthGain) {
        try { musicFifthGain.disconnect(); } catch (e) {}
        musicFifthGain = null;
    }
    if (lfoOsc) {
        try { lfoOsc.stop(); lfoOsc.disconnect(); } catch (e) {}
        lfoOsc = null;
    }
    if (lfoGain) {
        try { lfoGain.disconnect(); } catch (e) {}
        lfoGain = null;
    }
    if (bgGainNode) {
        try { bgGainNode.disconnect(); } catch (e) {}
        bgGainNode = null;
    }
    musicCurrentBg = null;
}

// Apply the music toggle immediately instead of waiting for the next room.
function applyMusicSetting() {
    if (accessibility.musicEnabled) {
        if (!bgOscillator && currentRoomData) startBackgroundMusic(currentRoomData.background);
    } else {
        stopBackgroundMusic();
    }
}


function pollGamepad() {
    padInput.left = padInput.right = padInput.up = padInput.down = false;
    padInput.jump = padInput.dash = padInput.climb = false;

    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp || !gp.connected) continue;
        input.gamepadIndex = i;

        const deadzone = 0.2;
        const b = idx => Boolean(gp.buttons && gp.buttons[idx] && gp.buttons[idx].pressed);
        const ax = n => (typeof gp.axes[n] === 'number' ? gp.axes[n] : 0);

        padInput.left ||= ax(0) < -deadzone || b(14);
        padInput.right ||= ax(0) > deadzone || b(15);
        padInput.up ||= ax(1) < -deadzone || b(12);
        padInput.down ||= ax(1) > deadzone || b(13);
        padInput.jump ||= b(0) || b(3);
        padInput.dash ||= b(1) || b(2) || b(5);
        padInput.climb ||= b(4) || b(6) || b(7);

        // Edge-triggered presses: the game consumes one-shot flags, so held
        // buttons must fire them exactly once.
        if (padInput.jump && !padPrev.jump) input.jumpPressed = true;
        if (padInput.dash && !padPrev.dash) input.dashPressed = true;
        if (padInput.up && !padPrev.up) input.upPressed = true;
        if (padInput.down && !padPrev.down) input.downPressed = true;
        if (padInput.left && !padPrev.left) input.leftPressed = true;
        if (padInput.right && !padPrev.right) input.rightPressed = true;
        if (b(9) && !padPrev.pause) input.pausePressed = true;
        padPrev.jump = padInput.jump;
        padPrev.dash = padInput.dash;
        padPrev.up = padInput.up;
        padPrev.down = padInput.down;
        padPrev.left = padInput.left;
        padPrev.right = padInput.right;
        padPrev.pause = b(9);
    }

    input.left = manualInput.left || padInput.left;
    input.right = manualInput.right || padInput.right;
    input.up = manualInput.up || padInput.up;
    input.down = manualInput.down || padInput.down;
    input.jump = manualInput.jump || padInput.jump;
    input.dash = manualInput.dash || padInput.dash;
    input.climb = manualInput.climb || padInput.climb;
}

let lastTime = 0;
let errorMsg = null;
let errorCleanFrames = 0;
function gameLoop(time) {
    if (!isPlaying || !canvas || !ctx) return;

    const dt = Math.min((time - lastTime) / 1000, 1/30);
    lastTime = time;

    pollGamepad();

    try {
        // ESC to go back from options/credits/achievements
        if (input.pausePressed) {
            if (gameState === 'options' || gameState === 'credits' || gameState === 'achievements') {
                gameState = returnToStateAfterOptions === 'playing' ? 'playing' : 'menu';
                if (returnToStateAfterOptions !== 'playing' && gameState === 'menu') menuSelection = 0;
                returnToStateAfterOptions = null;
                playSound('menuSelect');
            } else if (gameState === 'menu' || gameState === 'chapterSelect') {
                // Back-navigation for these screens is handled in their own
                // branches below; don't toggle pause here.
            } else if (gameWon) {
                // A real fresh run — init() alone would reload the just-saved game.
                startNewGame();
            } else if (gameState === 'playing') {
                isPaused = !isPaused;
                // Resuming shouldn't fire actions that were tapped while paused.
                if (!isPaused) {
                    input.jumpPressed = false;
                    input.dashPressed = false;
                    input.enterPressed = false;
                    player.jumpBufferTimer = 0;
                }
            }
            input.pausePressed = false;
        }

        // Pause menu navigation (when paused in-game)
        if (gameState === 'playing' && isPaused) {
            if (input.upPressed) {
                pauseSelection = (pauseSelection - 1 + PAUSE_CHOICES.length) % PAUSE_CHOICES.length;
                playSound('menuMove');
                input.upPressed = false;
            }
            if (input.downPressed) {
                pauseSelection = (pauseSelection + 1) % PAUSE_CHOICES.length;
                playSound('menuMove');
                input.downPressed = false;
            }
            if (input.jumpPressed || input.dashPressed || input.enterPressed) {
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
                executePauseChoice(PAUSE_CHOICES[pauseSelection].act);
            }
        }

        // Victory screen restart
        if (gameWon && gameState !== 'ending') {
            if (input.jumpPressed || input.dashPressed || input.enterPressed) {
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
                startNewGame();
            }
        }

        // Menu navigation
        if (gameState === 'menu') {
            const options = getMenuOptions();
            menuSelection = Math.min(menuSelection, options.length - 1);
            if (input.upPressed) {
                menuSelection = (menuSelection - 1 + options.length) % options.length;
                playSound('menuMove');
                input.upPressed = false;
            }
            if (input.downPressed) {
                menuSelection = (menuSelection + 1) % options.length;
                playSound('menuMove');
                input.downPressed = false;
            }
            if (input.jumpPressed || input.dashPressed || input.enterPressed) {
                selectMenuOption();
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
            }
        }

        // Achievements screen navigation
        if (gameState === 'achievements') {
            const compact = canvas.height < 500 || canvas.width < 500;
            const itemsPerPage = compact ? 4 : 6;
            const totalPages = Math.ceil(achievements.length / itemsPerPage);
            if (input.upPressed || input.leftPressed) {
                achievementScroll = Math.max(0, achievementScroll - 1);
                playSound('menuMove');
                input.upPressed = false;
                input.leftPressed = false;
            }
            if (input.downPressed || input.rightPressed) {
                achievementScroll = Math.min(totalPages - 1, achievementScroll + 1);
                playSound('menuMove');
                input.downPressed = false;
                input.rightPressed = false;
            }
            if (input.jumpPressed || input.dashPressed || input.enterPressed) {
                gameState = returnToStateAfterOptions === 'playing' ? 'playing' : 'menu';
                if (returnToStateAfterOptions !== 'playing' && gameState === 'menu') menuSelection = 0;
                returnToStateAfterOptions = null;
                playSound('menuSelect');
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
            }
        }

        // Options menu navigation
        if (gameState === 'options') {
            const options = getAccessibilityOptions();
            const optionCount = options.length;
            menuSelection = Math.min(menuSelection, optionCount - 1);
            if (input.upPressed) {
                menuSelection = (menuSelection - 1 + optionCount) % optionCount;
                playSound('menuMove');
                input.upPressed = false;
            }
            if (input.downPressed) {
                menuSelection = (menuSelection + 1) % optionCount;
                playSound('menuMove');
                input.downPressed = false;
            }
            if (input.leftPressed || input.rightPressed) {
                const option = options[menuSelection];
                if (option && !option.isBack) {
                    playSound('menuSelect');
                    option.toggle();
                    saveGame();
                }
                input.leftPressed = false;
                input.rightPressed = false;
            }
            if (input.jumpPressed || input.dashPressed || input.enterPressed) {
                playSound('menuSelect');
                const option = options[menuSelection];
                if (option) option.toggle();
                saveGame();
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
            }
        }

        // Chapter Select navigation
        if (gameState === 'chapterSelect') {
            if (input.leftPressed) {
                chapterSelectIndex = (chapterSelectIndex - 1 + chapterList.length) % chapterList.length;
                chapterSelectFocus = 'card';
                playSound('menuMove');
                input.leftPressed = false;
            }
            if (input.rightPressed) {
                chapterSelectIndex = (chapterSelectIndex + 1) % chapterList.length;
                chapterSelectFocus = 'card';
                playSound('menuMove');
                input.rightPressed = false;
            }
            if (input.upPressed) {
                if (chapterSelectFocus === 'back') {
                    chapterSelectFocus = 'card';
                    playSound('menuMove');
                } else {
                    chapterSelectIndex = (chapterSelectIndex - 1 + chapterList.length) % chapterList.length;
                    playSound('menuMove');
                }
                input.upPressed = false;
            }
            if (input.downPressed) {
                if (chapterSelectFocus === 'card') {
                    chapterSelectFocus = 'back';
                    playSound('menuMove');
                } else {
                    chapterSelectIndex = (chapterSelectIndex + 1) % chapterList.length;
                    playSound('menuMove');
                }
                input.downPressed = false;
            }
            if (input.jumpPressed || input.dashPressed || input.enterPressed) {
                if (chapterSelectFocus === 'back') {
                    gameState = 'menu';
                    chapterSelectFocus = 'card';
                    playSound('menuSelect');
                } else {
                    playSound('menuSelect');
                    startChapter(chapterList[chapterSelectIndex]);
                }
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
            }
            if (input.pausePressed) {
                gameState = 'menu';
                chapterSelectFocus = 'card';
                playSound('menuSelect');
                input.pausePressed = false;
            }
        }

        // Credits screen navigation
        if (gameState === 'credits') {
            if (input.jumpPressed || input.dashPressed || input.enterPressed || input.pausePressed) {
                gameState = 'menu';
                menuSelection = 0;
                playSound('menuSelect');
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
                input.pausePressed = false;
            }
        }

        if (gameState === 'playing' && !isPaused && !gameWon) {
            gameTime += dt;
            TIMER_EL.textContent = `Time: ${gameTime.toFixed(2)}s`;
            DASHES_EL.textContent = `Dashes: ${player.dashes}/${player.maxDashes}`;

            if (player.dying) {
                player.deathTimer -= dt;
                if (player.deathTimer <= 0) {
                    respawn();
                }
            } else {
                updateEntities(dt);
                updatePlayer(dt);
                updateHair(dt);
                updateTutorial(dt);
                updateAchievementPopup(dt);
                updateParticles(dt);
                updateShockwaves(dt);
                updateCamera(dt);
                input.upPressed = false;
                input.downPressed = false;
                input.leftPressed = false;
                input.rightPressed = false;
            }
        } else if (gameState === 'ending') {
            // Jump/confirm skips the current line.
            if (input.jumpPressed || input.dashPressed || input.enterPressed) {
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
                if (endingPhase < endingMessages.length - 1) {
                    endingPhase++;
                    endingTimer = 0;
                    endingTextAlpha = 0;
                }
            }
            endingTimer += dt;
            if (endingPhase < endingMessages.length) {
                if (endingTimer >= endingMessages[endingPhase].duration) {
                    endingPhase++;
                    endingTimer = 0;
                    endingTextAlpha = 0;
                } else {
                    endingTextAlpha = Math.min(1, endingTimer / 0.5);
                }
            } else {
                gameState = 'credits';
                menuSelection = 0;
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
                input.pausePressed = false;
            }
        }

        updateBackgroundMusic();
        draw();
        // A transient error shouldn't brick the session: recover after a
        // stretch of clean frames.
        if (errorMsg) {
            errorCleanFrames++;
            if (errorCleanFrames > 180) {
                errorMsg = null;
                errorCleanFrames = 0;
            }
        }
    } catch (e) {
        errorMsg = e.message + '\n' + (e.stack || '');
        errorCleanFrames = 0;
        console.error('Game error:', e);
        console.error(e.stack);
    }

    if (errorMsg) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        const lines = errorMsg.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, 10, 20 + i * 20);
        });
    }

    requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
    const actionKeys = ['Space', 'Enter', 'KeyZ', 'KeyX', 'KeyK', 'ShiftLeft', 'ShiftRight', 'KeyC', 'KeyR'];
    if (e.repeat && actionKeys.includes(e.code)) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ...actionKeys].includes(e.code)) {
        e.preventDefault();
    }

    if (e.code === 'Escape') {
        if (gameState === 'ending') {
            gameState = 'menu';
            playSound('menuSelect');
        } else {
            input.pausePressed = true;
        }
        return;
    }

    if (e.code === 'Enter') {
        input.enterPressed = true;
        if (gameWon) {
            startNewGame();
            return;
        }
        if (isPaused) {
            executePauseChoice(PAUSE_CHOICES[pauseSelection].act);
            return;
        }
        if (gameState === 'playing' && currentRoom === 'prologue') {
            input.tutorialSkipPressed = true;
        } else if (gameState !== 'playing') {
            input.jumpPressed = true;
        }
        return;
    }

    if (isPaused) {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            pauseSelection = (pauseSelection - 1 + PAUSE_CHOICES.length) % PAUSE_CHOICES.length;
            playSound('menuMove');
            return;
        }
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            pauseSelection = (pauseSelection + 1) % PAUSE_CHOICES.length;
            playSound('menuMove');
            return;
        }
        if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'KeyX') {
            executePauseChoice(PAUSE_CHOICES[pauseSelection].act);
            return;
        }
        if (e.code === 'KeyR') {
            restartCurrentRoom();
            isPaused = false;
        } else if (e.code === 'KeyQ') {
            saveGame();
            isPaused = false;
            gameState = 'menu';
            menuSelection = 0;
        } else if (e.code === 'KeyO') {
            isPaused = false;
            returnToStateAfterOptions = 'playing';
            gameState = 'options';
            menuSelection = 0;
        } else if (e.code === 'KeyA') {
            isPaused = false;
            returnToStateAfterOptions = 'playing';
            gameState = 'achievements';
            achievementScroll = 0;
        }
        return;
    }

    switch(e.code) {
        case 'ArrowLeft': case 'KeyA': manualInput.left = true; input.leftPressed = true; break;
        case 'ArrowRight': case 'KeyD': manualInput.right = true; input.rightPressed = true; break;
        case 'ArrowUp': case 'KeyW': manualInput.up = true; input.upPressed = true; break;
        case 'ArrowDown': case 'KeyS': manualInput.down = true; input.downPressed = true; break;
        case 'Space': case 'KeyZ': case 'KeyK': manualInput.jump = true; input.jumpPressed = true; break;
        case 'KeyX': case 'ShiftLeft': case 'ShiftRight': manualInput.dash = true; input.dashPressed = true; break;
        case 'KeyC': manualInput.climb = true; input.climbPressed = true; break;
        case 'KeyR': if (gameState === 'playing' && !gameWon && !player.dying) respawn(); break;
    }
});

window.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyZ', 'KeyX', 'KeyK', 'ShiftLeft', 'ShiftRight', 'KeyC'].includes(e.code)) {
        e.preventDefault();
    }

    switch(e.code) {
        case 'ArrowLeft': case 'KeyA': manualInput.left = false; break;
        case 'ArrowRight': case 'KeyD': manualInput.right = false; break;
        case 'ArrowUp': case 'KeyW': manualInput.up = false; break;
        case 'ArrowDown': case 'KeyS': manualInput.down = false; break;
        case 'Space': case 'KeyZ': case 'KeyK': manualInput.jump = false; break;
        case 'KeyX': case 'ShiftLeft': case 'ShiftRight': manualInput.dash = false; break;
        case 'KeyC': manualInput.climb = false; break;
        case 'Enter': input.enterPressed = false; break;
    }
});

function init() {
    try {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        DEATHS_EL = document.getElementById('deaths');
        TIMER_EL = document.getElementById('timer');
        STRAWBERRIES_EL = document.getElementById('strawberries');
        ROOM_NAME_EL = document.getElementById('room-name');
        DASHES_EL = document.getElementById('dashes');

        if (!canvas || !ctx || !DEATHS_EL || !TIMER_EL || !STRAWBERRIES_EL || !ROOM_NAME_EL || !DASHES_EL) {
            console.error('Required DOM elements not found');
            return;
        }

        bindTouchControls();
        bindCanvasUi();

        console.log('Celeste Browser Clone starting...');
        console.log('canvas:', canvas.width, 'x', canvas.height);

        const forcedStartRoom = requestedStartRoom;
        loadSave();
        initRooms();
        createExpansionRooms();
        applyCuratedRoomDesigns();
        gameWon = false;
        isPaused = false;
        gameTime = forcedStartRoom ? 0 : (savedGameTime || 0);

        currentRoom = forcedStartRoom && rooms[forcedStartRoom]
            ? forcedStartRoom
            : rooms[savedRoom] ? savedRoom : 'prologue';
        currentRoomData = rooms[currentRoom];
        ROOM_NAME_EL.textContent = currentRoomData.name;

        visitedChapters.clear();
        const startCh = chapterIdOfRoom(currentRoom);
        if (startCh) {
            visitedChapters.add(startCh);
            chapterDeathBaselines[startCh] = deaths;
            chapterStartTimes[startCh] = gameTime;
        }

        console.log('Rooms created:', Object.keys(rooms));
        console.log('Current room:', currentRoomData.name);
        console.log('Solids:', currentRoomData.solids.length);
        console.log('Spikes:', currentRoomData.spikes.length);
        console.log('Strawberries:', currentRoomData.strawberries.length);

        player.spawnX = !forcedStartRoom && savedSpawnX !== null ? savedSpawnX : currentRoomData.spawn.x;
        player.spawnY = !forcedStartRoom && savedSpawnY !== null ? savedSpawnY : currentRoomData.spawn.y;
        player.x = player.spawnX;
        player.y = player.spawnY;
        initHair();
        player.vx = 0;
        player.vy = 0;
        player.dashes = player.maxDashes;
        player.dashTimer = 0;
        player.dashCooldown = 0;
        player.dying = false;
        cameraX = player.x - ROOM_WIDTH / 2;
        cameraY = player.y - ROOM_HEIGHT / 2;

        resize();
        startBackgroundMusic(currentRoomData.background);
        requestedStartRoom = null;

        console.log('renderScale:', renderScale);
        console.log('canvas:', canvas.width, 'x', canvas.height);
        console.log('camera:', cameraX, cameraY);

        if (!gameLoopStarted) {
            gameLoopStarted = true;
            requestAnimationFrame(gameLoop);
        }
    } catch (e) {
        console.error('Init error:', e);
        console.error(e.stack);
        errorMsg = 'Init error: ' + e.message;
    }
}

function bindTouchControls() {
    if (touchControlsBound) return;
    touchControlsBound = true;
    for (const button of document.querySelectorAll('#touch-controls button')) {
        const control = button.dataset.input;
        const pressed = (event) => {
            event.preventDefault();
            if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
            if (control === 'pause') {
                input.pausePressed = true;
                return;
            }
            if (gameState !== 'playing' || isPaused || gameWon) {
                if (control === 'left' || control === 'up') input.upPressed = true;
                if (control === 'right' || control === 'down') input.downPressed = true;
                if (control === 'jump') input.jumpPressed = true;
                if (control === 'dash') input.dashPressed = true;
                return;
            }
            if (control === 'left' || control === 'right' || control === 'up' || control === 'down' || control === 'climb') {
                manualInput[control] = true;
            }
            if (control === 'up') input.upPressed = true;
            if (control === 'down') input.downPressed = true;
            if (control === 'climb') input.climbPressed = true;
            if (control === 'jump') {
                manualInput.jump = true;
                input.jumpPressed = true;
            }
            if (control === 'dash') {
                manualInput.dash = true;
                input.dashPressed = true;
            }
        };
        const released = (event) => {
            event.preventDefault();
            if (control === 'left' || control === 'right' || control === 'up' || control === 'down' || control === 'climb') {
                manualInput[control] = false;
            }
            if (control === 'jump' || control === 'dash') manualInput[control] = false;
        };
        button.addEventListener('pointerdown', pressed);
        button.addEventListener('pointerup', released);
        button.addEventListener('pointercancel', released);
        button.addEventListener('pointerleave', released);
    }
}

// --- Pointer support for menus, pause and overlays ---
function activateUiAction(action) {
    switch (action.type) {
        case 'menu':
            menuSelection = action.index;
            selectMenuOption();
            break;
        case 'option': {
            menuSelection = action.index;
            const option = getAccessibilityOptions()[action.index];
            if (option) option.toggle();
            playSound('menuSelect');
            saveGame();
            break;
        }
        case 'options-back':
            gameState = returnToStateAfterOptions === 'playing' ? 'playing' : 'menu';
            if (returnToStateAfterOptions !== 'playing' && gameState === 'menu') menuSelection = 0;
            returnToStateAfterOptions = null;
            playSound('menuSelect');
            break;
        case 'achievements-page':
            achievementScroll = Math.max(0, achievementScroll + action.dir);
            playSound('menuMove');
            break;
        case 'achievements-back':
            gameState = returnToStateAfterOptions === 'playing' ? 'playing' : 'menu';
            if (returnToStateAfterOptions !== 'playing' && gameState === 'menu') menuSelection = 0;
            returnToStateAfterOptions = null;
            playSound('menuSelect');
            break;
        case 'chapter':
            if (action.act === 'prev' || action.act === 'next') {
                chapterSelectIndex = (chapterSelectIndex + (action.act === 'next' ? 1 : -1) + chapterList.length) % chapterList.length;
                chapterSelectFocus = 'card';
                playSound('menuMove');
            } else if (action.act === 'goto') {
                chapterSelectIndex = action.index;
                chapterSelectFocus = 'card';
                playSound('menuMove');
            } else if (action.act === 'start') {
                playSound('menuSelect');
                startChapter(chapterList[chapterSelectIndex]);
            } else if (action.act === 'back') {
                playSound('menuSelect');
                gameState = 'menu';
                chapterSelectFocus = 'card';
            }
            break;
        case 'credits-back':
            gameState = 'menu';
            playSound('menuSelect');
            break;
        case 'restart-run':
            startNewGame();
            break;
        case 'pause':
            playSound('menuSelect');
            if (action.act === 'resume') {
                isPaused = false;
                input.jumpPressed = false;
                input.dashPressed = false;
                input.enterPressed = false;
                player.jumpBufferTimer = 0;
            } else if (action.act === 'restart') {
                restartCurrentRoom();
                isPaused = false;
            } else if (action.act === 'achievements') {
                isPaused = false;
                returnToStateAfterOptions = 'playing';
                gameState = 'achievements';
                achievementScroll = 0;
            } else if (action.act === 'options') {
                isPaused = false;
                returnToStateAfterOptions = 'playing';
                gameState = 'options';
                menuSelection = 0;
            } else if (action.act === 'quit') {
                saveGame();
                isPaused = false;
                gameState = 'menu';
                menuSelection = 0;
            }
            break;
    }
}

let uiPointerBound = false;
function bindCanvasUi() {
    if (uiPointerBound || !canvas) return;
    uiPointerBound = true;
    canvas.addEventListener('pointermove', (e) => {
        const { mx, my } = handleUiPointer(e);
        for (const area of uiHitAreas) {
            if (mx >= area.x && mx <= area.x + area.w && my >= area.y && my <= area.y + area.h) {
                if (area.action.type === 'menu' && gameState === 'menu') menuSelection = area.action.index;
                else if (area.action.type === 'option' && gameState === 'options') menuSelection = area.action.index;
                else if (area.action.type === 'pause' && isPaused) {
                    const idx = PAUSE_CHOICES.findIndex(c => c.act === area.action.act);
                    if (idx >= 0) pauseSelection = idx;
                }
                else if (area.action.type === 'chapter' && gameState === 'chapterSelect') {
                    if (area.action.act === 'back') chapterSelectFocus = 'back';
                    else if (area.action.act === 'start') chapterSelectFocus = 'card';
                }
                break;
            }
        }
    });

    canvas.addEventListener('pointerdown', (e) => {
        resumeAudioCtx();
        if (gameWon && gameState !== 'ending') { startNewGame(); return; }
        if (gameState === 'ending') { endingTimer = 1e9; return; }
        const { mx, my } = handleUiPointer(e);
        // Topmost (later) areas win.
        for (let i = uiHitAreas.length - 1; i >= 0; i--) {
            const area = uiHitAreas[i];
            if (mx >= area.x && mx <= area.x + area.w && my >= area.y && my <= area.y + area.h) {
                activateUiAction(area.action);
                return;
            }
        }
    });
}

window.addEventListener('resize', resize);

// Losing focus (alt-tab, minimized window) leaves held keys stuck and the
// run timer burning; release inputs and pause to stay fair.
function releaseAllInputs() {
    for (const key of Object.keys(manualInput)) manualInput[key] = false;
    for (const key of Object.keys(padInput)) padInput[key] = false;
    padPrev.jump = false;
    padPrev.dash = false;
    padPrev.up = false;
    padPrev.down = false;
    padPrev.left = false;
    padPrev.right = false;
    padPrev.pause = false;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
    input.jump = false;
    input.dash = false;
    input.climb = false;
    input.jumpPressed = false;
    input.dashPressed = false;
    input.climbPressed = false;
    input.pausePressed = false;
    input.upPressed = false;
    input.downPressed = false;
    input.leftPressed = false;
    input.rightPressed = false;
    input.enterPressed = false;
}

function suspendForBlur() {
    const wasActive = gameState === 'playing' && !gameWon && !isPaused;
    releaseAllInputs();
    if (wasActive) {
        isPaused = true;
        saveGame();
    }
}

window.addEventListener('blur', suspendForBlur);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendForBlur();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

