const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const highScoreEl = document.getElementById('high-score');
const uiOverlay = document.getElementById('ui-overlay');
const uiTitle = document.getElementById('ui-title');
const uiSubtitle = document.getElementById('ui-subtitle');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');

// Звуковой синтезатор Web Audio API
class SoundController {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playLaser() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playExplosion() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playPowerup() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
}

const sounds = new SoundController();

// Размеры экрана
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Состояние игры
let gameState = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
let score = 0;
let highScore = localStorage.getItem('cyber_runner_highscore') || 0;
highScoreEl.textContent = highScore;

// Управление
const keys = { left: false, right: false, shoot: false };

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'Space' || e.code === 'ArrowUp') keys.shoot = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp') keys.shoot = false;
});

// Сенсорные кнопки
const bindTouch = (id, key) => {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
    btn.addEventListener('mousedown', () => keys[key] = true);
    btn.addEventListener('mouseup', () => keys[key] = false);
};
bindTouch('btn-left', 'left');
bindTouch('btn-right', 'right');
bindTouch('btn-shoot', 'shoot');

// Игрок
class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 80;
        this.speed = 7;
        this.health = 100;
        this.shield = false;
        this.tripleShotTimer = 0;
        this.lastShot = 0;
    }

    reset() {
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 80;
        this.health = 100;
        this.shield = false;
        this.tripleShotTimer = 0;
    }

    update() {
        if (keys.left && this.x > 0) this.x -= this.speed;
        if (keys.right && this.x < canvas.width - this.width) this.x += this.speed;

        if (keys.shoot && Date.now() - this.lastShot > 150) {
            this.shoot();
            this.lastShot = Date.now();
        }

        if (this.tripleShotTimer > 0) this.tripleShotTimer--;
    }

    shoot() {
        sounds.playLaser();
        if (this.tripleShotTimer > 0) {
            bullets.push(new Bullet(this.x + this.width / 2, this.y, -2));
            bullets.push(new Bullet(this.x + this.width / 2, this.y, 0));
            bullets.push(new Bullet(this.x + this.width / 2, this.y, 2));
        } else {
            bullets.push(new Bullet(this.x + this.width / 2, this.y, 0));
        }
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f3ff';
        ctx.fillStyle = '#00f3ff';

        // Форма корабля (треугольник)
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Щит
        if (this.shield) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 30, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Пули
class Bullet {
    constructor(x, y, vx) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = -12;
        this.radius = 4;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Враги
class Enemy {
    constructor() {
        this.width = 35;
        this.height = 35;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = Math.random() * 2 + 2;
        this.hp = Math.random() > 0.7 ? 2 : 1;
        this.color = this.hp > 1 ? '#ff0055' : '#ffaa00';
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }
}

// Бонусы (Power-ups)
class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.speed = 2;
        const types = ['shield', 'triple', 'heal'];
        this.type = types[Math.floor(Math.random() * types.length)];
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.type === 'shield' ? '#ff00ff' : this.type === 'triple' ? '#00f3ff' : '#00ff66';
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

// Частицы взрыва
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.restore();
    }
}

// Инициализация объектов
const player = new Player();
let bullets = [];
let enemies = [];
let powerUps = [];
let particles = [];
let enemySpawnTimer = 0;

function createExplosion(x, y, color) {
    sounds.playExplosion();
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Игровой цикл
function gameLoop() {
    if (gameState === 'PLAYING') {
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

function update() {
    player.update();

    // Генерация врагов
    enemySpawnTimer++;
    if (enemySpawnTimer > 40) {
        enemies.push(new Enemy());
        enemySpawnTimer = 0;
    }

    // Обновление пуль
    bullets.forEach((b, index) => {
        b.update();
        if (b.y < -10) bullets.splice(index, 1);
    });

    // Обновление врагов и столкновения с пулями
    enemies.forEach((enemy, eIndex) => {
        enemy.update();

        // Враг вышел за экран
        if (enemy.y > canvas.height) {
            enemies.splice(eIndex, 1);
            player.health -= 5;
            healthEl.textContent = Math.max(0, player.health);
            if (player.health <= 0) gameOver();
        }

        // Столкновение с игроком
        if (
            enemy.x < player.x + player.width &&
            enemy.x + enemy.width > player.x &&
            enemy.y < player.y + player.height &&
            enemy.y + enemy.height > player.y
        ) {
            createExplosion(enemy.x, enemy.y, enemy.color);
            enemies.splice(eIndex, 1);

            if (player.shield) {
                player.shield = false;
            } else {
                player.health -= 20;
                healthEl.textContent = Math.max(0, player.health);
                if (player.health <= 0) gameOver();
            }
        }

        // Столкновение пуль с врагом
        bullets.forEach((b, bIndex) => {
            if (
                b.x > enemy.x &&
                b.x < enemy.x + enemy.width &&
                b.y > enemy.y &&
                b.y < enemy.y + enemy.height
            ) {
                bullets.splice(bIndex, 1);
                enemy.hp--;

                if (enemy.hp <= 0) {
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
                    
                    // Шанс выпадения бонуса
                    if (Math.random() < 0.2) {
                        powerUps.push(new PowerUp(enemy.x, enemy.y));
                    }

                    enemies.splice(eIndex, 1);
                    score += 100;
                    scoreEl.textContent = score;
                }
            }
        });
    });

    // Обновление бонусов
    powerUps.forEach((p, index) => {
        p.update();
        if (
            p.x < player.x + player.width &&
            p.x + p.size > player.x &&
            p.y < player.y + player.height &&
            p.y + p.size > player.y
        ) {
            sounds.playPowerup();
            if (p.type === 'shield') player.shield = true;
            if (p.type === 'triple') player.tripleShotTimer = 300;
            if (p.type === 'heal') {
                player.health = Math.min(100, player.health + 30);
                healthEl.textContent = player.health;
            }
            powerUps.splice(index, 1);
        }
        if (p.y > canvas.height) powerUps.splice(index, 1);
    });

    // Частицы
    particles.forEach((p, index) => {
        p.update();
        if (p.life <= 0) particles.splice(index, 1);
    });
}

function draw() {
    // Очистка и эффект неонового следа
    ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    player.draw();
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    powerUps.forEach(p => p.draw());
    particles.forEach(p => p.draw());
}

// Управление состоянием игры
function startGame() {
    sounds.init();
    score = 0;
    scoreEl.textContent = score;
    player.reset();
    healthEl.textContent = player.health;
    bullets = [];
    enemies = [];
    powerUps = [];
    particles = [];
    gameState = 'PLAYING';
    uiOverlay.style.display = 'none';
    pauseBtn.style.display = 'block';
}

function gameOver() {
    gameState = 'GAMEOVER';
    uiTitle.textContent = 'GAME OVER';
    uiSubtitle.textContent = `Ваш счет: ${score}`;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('cyber_runner_highscore', highScore);
        highScoreEl.textContent = highScore;
    }

    startBtn.textContent = 'ИГРАТЬ СНОВА';
    uiOverlay.style.display = 'flex';
    pauseBtn.style.display = 'none';
}

function togglePause() {
    if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        uiTitle.textContent = 'ПАУЗА';
        uiSubtitle.textContent = 'Нажмите СТАРТ для продолжения';
        startBtn.textContent = 'ПРОДОЛЖИТЬ';
        uiOverlay.style.display = 'flex';
    } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        uiOverlay.style.display = 'none';
    }
}

startBtn.addEventListener('click', () => {
    if (gameState === 'PAUSED') {
        togglePause();
    } else {
        startGame();
    }
});

pauseBtn.addEventListener('click', togglePause);

// Запуск анимации
requestAnimationFrame(gameLoop);