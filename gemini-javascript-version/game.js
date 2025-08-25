// Wait for the DOM to be fully loaded before starting the game
window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // --- GAME SETUP ---
    canvas.width = 600;
    canvas.height = 600;

    // Helper to convert python-style (r,g,b) tuple to css string
    function toColor(rgb) {
        if (typeof rgb === 'string') return rgb;
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }

    class Game {
        constructor(highscore = 0) {
            this.SCREEN_WIDTH = canvas.width;
            this.SCREEN_HEIGHT = canvas.height;
            this.ctx = ctx;

            this.keysPressed = {};
            this.mousePos = { x: 0, y: 0 };
            this.mouseClickedThisFrame = false;

            this.setupInputHandlers();

            // Game Constants from Python file
            this.PLAYER_SHOT_SPEED = 0.5;
            this.PLAYER_SHOT_SIDE_LENGTH = 15;
            this.PLAYER_SPEED = 0.3;
            this.PLAYER_START_SHOTS = 10;
            this.PLAYER_SHOOT_WAIT_TIME = 1000;
            this.PLAYER_COLOR = [255, 255, 255];
            this.PLAYER_INCINVIBILITY_TIME = 1250;
            
            this.ENEMY1_SIDE_LENGTH = 15;
            this.ENEMY1_COLOR = [125, 125, 125];
            this.ENEMY1_SHOT_SPEED = 0.35;
            this.ENEMY1_SHOT_SIDE_LENGTH = 5;
            this.ENEMY1_SHOOT_WAIT_TIME = 2000;
            this.ENEMY1_SPEED = 0.15;
            this.ENEMY1_ROTATION_SPEED = 0.1;

            this.ENEMY2_SIDE_LENGTH = 20;
            this.ENEMY2_COLOR = [225, 125, 125];
            this.ENEMY2_SHOT_SPEED = 0.5;
            this.ENEMY2_SHOT_SIDE_LENGTH = 3;
            this.ENEMY2_SPEED = 0.2;
            this.ENEMY2_SHOT_RELOAD_TIME = 500;
            this.ENEMY2_RADIANS_BETWEEN_SHOTS = Math.PI / 20;
            this.ENEMY2_SHOTS_ON_EITHER_SIDE = 4;

            this.ENEMY3_SIDE_LENGTH = 25;
            this.ENEMY3_COLOR = [200, 200, 200];
            this.ENEMY3_SPEED = 0.075;
            this.ENEMY3_MINIMUM_WALK_DISTANCE = this.SCREEN_WIDTH * 0.4;
            this.ENEMY3_BOMB_PLACING_TIME = 3000;

            this.BOMB_SIDE_LENGTH = 22.5;
            this.BOMB_COLOR = [150, 0, 0];
            this.BOMB_FUSE_TIME = 2000;

            this.EXPLOSION_FADE_TIME = 2000;

            this.ENEMY4_SIDE_LENGTH = 20;
            this.ENEMY4_COLOR = [25, 25, 150];
            this.ENEMY4_SHOT_SPEED = 0.4;
            this.ENEMY4_SHOT_SIDE_LENGTH = 7;
            this.ENEMY4_SPEED = 0.175;
            this.ENEMY4_SHOOT_WAIT_TIME = 3000;

            this.ENEMY5_SIDE_LENGTH = 20;
            this.ENEMY5_COLOR = [50, 50, 255];
            this.ENEMY5_SHOT_SPEED = 0.3;
            this.ENEMY5_SHOT_SIDE_LENGTH = 14;
            this.ENEMY5_SPEED = 0.2;
            this.ENEMY5_SHOOT_WAIT_TIME = 4000;

            this.ENEMY6_SIDE_LENGTH = 25;
            this.ENEMY6_COLOR = [50, 150, 255];
            this.ENEMY6_SHOT_SPEED = 0.45;
            this.ENEMY6_SHOT_SIDE_LENGTH = 10;
            this.ENEMY6_SPEED = 0.3;
            this.ENEMY6_SHOOT_WAIT_TIME = 2000;
            this.ENEMY6_WAIT_TIME = Math.floor(Math.random() * 2001) + 2000;

            this.ENEMY7_SIDE_LENGTH = 17.5;
            this.ENEMY7_COLOR = [50, 150, 255];
            this.ENEMY7_SHOT_SPEED = 0.45;
            this.ENEMY7_SHOT_SIDE_LENGTH = 10;
            this.ENEMY7_SPEED = 0.15;
            this.ENEMY7_WALK_TIME = 1000;
            this.ENEMY7_WAIT_TIME = 750;

            this.ENEMY8_SHOOT_WAIT_TIME = 1500;

            this.PARTICLE_SIDE_LENGTH = 10;
            this.PARTICLE_DENSITY = 2;

            // Game State
            this.player = new Player(this);
            this.enemy_spawn_timer = 0;
            this.enemy_spawn_time = 4000;
            this.game_total_time = 0;
            
            this.gameObjects = {
                enemies: [], player_shots: [], enemy_shots: [], bombs: [], 
                explosions: [], particles: [], items: [], banners: []
            };

            // Using constructor name as string key
            this.gameObjectMappings = {
                Enemy1: "enemies", Enemy2: "enemies", Enemy3: "enemies",
                Enemy4: "enemies", Enemy5: "enemies", Enemy6: "enemies",
                Enemy7: "enemies", Enemy8: "enemies",
                Player_Shot: "player_shots", Enemy_Shot: "enemy_shots",
                Bomb: "bombs", Explosion: "explosions", Particle: "particles",
                Item1: "items", Item2: "items", Item3: "items", Item4: "items",
                Item5: "items", Item6: "items", Item7: "items", Item8: "items",
                Banner: "banners"
            };

            this.objectsToAdd = new Set();
            this.objectsToRemove = new Set();

            this.gameLogic = this.normal_game_logic;
            this.end_timer = 0;
            this.highscore = highscore;
            this.score = 0;
            this.END_REFLECTION_TIME = 2000;
            
            this.lastTime = 0;
            this.frameTime = 0;
            this.running = true;
            
            this.objectsToAdd.add(new Banner(this, "MOVE WITH ARROW/WASD KEYS, SHOOT WITH MOUSE", 0.05));
        }
        
        setupInputHandlers() {
            window.addEventListener('keydown', e => this.keysPressed[e.key] = true);
            window.addEventListener('keyup', e => delete this.keysPressed[e.key]);
            canvas.addEventListener('mousedown', e => this.mouseClickedThisFrame = true);
            canvas.addEventListener('mousemove', e => {
                const rect = canvas.getBoundingClientRect();
                this.mousePos.x = e.clientX - rect.left;
                this.mousePos.y = e.clientY - rect.top;
            });
        }
        
        start() {
            requestAnimationFrame(this.gameLoop.bind(this));
        }

        gameLoop(currentTime) {
            if (!this.running) return;
            
            this.frameTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            if (isNaN(this.frameTime) || this.frameTime > 100) {
                 this.frameTime = 16.67; // Default frame time on first frame or tab out
            }

            this.gameLogic();
            
            // Clear screen
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
            
            this.drawGameObjects();

            this.mouseClickedThisFrame = false;
            requestAnimationFrame(this.gameLoop.bind(this));
        }
        
        moveGameObjects() {
            this.player.move(this);
            for (const list of Object.values(this.gameObjects)) {
                for (const obj of list) {
                    obj.move(this);
                }
            }
        }
        
        normal_game_logic() {
            this.moveGameObjects();

            this.player.logic(this);
            for (const list of Object.values(this.gameObjects)) {
                for (const obj of list) {
                    obj.logic(this);
                }
            }
            
            this.game_general_logic();
            
            this.player.end_logic(this);
            for (const list of Object.values(this.gameObjects)) {
                for (const obj of list) {
                    obj.end_logic(this);
                }
            }
            
            if (this.player.lives < 1) {
                this.player.explode_into_particles(this, 1);
                this.player.die();
                this.gameLogic = this.end_game_logic;
            }

            // Add/Remove objects
            this.objectsToRemove.forEach(obj => {
                const key = this.gameObjectMappings[obj.constructor.name];
                if (key && this.gameObjects[key]) {
                    const index = this.gameObjects[key].indexOf(obj);
                    if (index > -1) {
                        this.gameObjects[key].splice(index, 1);
                    }
                }
            });
            this.objectsToAdd.forEach(obj => {
                const key = this.gameObjectMappings[obj.constructor.name];
                if (key && this.gameObjects[key]) {
                    this.gameObjects[key].push(obj);
                }
            });

            this.objectsToAdd.clear();
            this.objectsToRemove.clear();
        }
        
        end_game_logic() {
            this.gameObjects.particles.forEach(p => {
                p.move(this);
                p.logic(this);
                p.end_logic(this);
            });
            
            // Handle removal of particles in end game state
            this.objectsToRemove.forEach(obj => {
                const key = this.gameObjectMappings[obj.constructor.name];
                 if (key === "particles") {
                    const index = this.gameObjects.particles.indexOf(obj);
                    if (index > -1) this.gameObjects.particles.splice(index, 1);
                }
            });
            this.objectsToRemove.clear();

            this.end_timer += this.frameTime;

            if (this.end_timer > this.END_REFLECTION_TIME) {
                if (this.score > this.highscore) {
                    this.highscore = this.score;
                }
                // Restart game
                const newGame = new Game(this.highscore);
                Object.assign(this, newGame); // Overwrite current game instance state
            }
        }

        game_general_logic() {
            this.enemy_spawn_timer += this.frameTime;
            this.game_total_time += this.frameTime;
            this.enemy_spawn_time = 4000 / (Math.pow(1.000006, this.game_total_time));

            if (this.enemy_spawn_timer >= this.enemy_spawn_time) {
                this.enemy_spawn_timer = 0;
                const enemyTypes = [Enemy1, Enemy2, Enemy3, Enemy4, Enemy5, Enemy6, Enemy7];
                const EnemyToSpawn = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                this.objectsToAdd.add(new EnemyToSpawn(this));
                this.enemy_spawn_time = Math.floor(Math.random() * 2001) + 3000;
            }

            if (Math.floor(this.game_total_time / 500) % 20 === 0 && this.game_total_time > 5000) {
                 if (Math.random() < 0.5) {
                    this.objectsToAdd.add(new Banner(this, "score: " + this.score));
                 } else {
                    this.objectsToAdd.add(new Banner(this, "highscore: " + this.highscore));
                 }
            }
            
            // Merge enemies
            const en = this.gameObjects.enemies;
            for (let i = 0; i < en.length; i++) {
                for (let j = i + 1; j < en.length; j++) {
                    if (en[i].constructor.name !== 'Enemy8' && en[j].constructor.name !== 'Enemy8') {
                        if (General.collision_between_rects(en[j].x, en[j].y, en[j].width, en[j].height, en[i].x, en[i].y, en[i].width, en[i].height)) {
                            this.objectsToRemove.add(en[i]);
                            this.objectsToRemove.add(en[j]);
                            const en8_side_length = en[i].width + en[j].width;
                            const en8_color = [
                                Math.min(en[i].color[0] + en[j].color[0], 255),
                                Math.min(en[i].color[1] + en[j].color[1], 255),
                                Math.min(en[i].color[2] + en[j].color[2], 255)
                            ];
                            const en8_shot_side_length = (en[i].shot_side_length || 0) + (en[j].shot_side_length || 0);
                            const en8_shot_speed = (en[i].shot_speed || 0) + (en[j].shot_speed || 0);
                            const en8_speed = (en[i].speed + en[j].speed) / 4;
                            const en8_shoot_wait_time = this.ENEMY8_SHOOT_WAIT_TIME;
                            this.objectsToAdd.add(new Enemy8(this, en8_side_length, en8_color, en8_shot_side_length, en8_shot_speed, en8_speed, en8_shoot_wait_time, en[i].x, en[j].y));
                        }
                    }
                }
            }
        }
        
        drawGameObjects() {
            for (const list of Object.values(this.gameObjects)) {
                for (const obj of list) {
                    obj.draw(this);
                }
            }
            this.player.draw(this);
        }
    }
    
    class General {
        static collision_between_rects(x1, y1, w1, h1, x2, y2, w2, h2) {
            return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
        }
    }
    
    class GameObject {
        constructor(x, y, width, height, color) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = color;
        }
        move(game) {}
        logic(game) {}
        end_logic(game) {}
        draw(game) {
            game.ctx.fillStyle = toColor(this.color);
            game.ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        move_inside_screen(game) {
            if (this.x < 0) this.x = 0;
            else if (this.x + this.width > game.SCREEN_WIDTH) this.x = game.SCREEN_WIDTH - this.width;
            if (this.y < 0) this.y = 0;
            else if (this.y + this.height > game.SCREEN_HEIGHT) this.y = game.SCREEN_HEIGHT - this.height;
        }
        explode_into_particles(game, up_or_down) {
            const psl = game.PARTICLE_SIDE_LENGTH;
            for (let x = Math.floor(this.x); x < this.x + this.width; x += game.PARTICLE_DENSITY) {
                for (let y = Math.floor(this.y); y < this.y + this.height; y += game.PARTICLE_DENSITY) {
                    game.objectsToAdd.add(new Particle(game, x, y, this.x + this.width / 2, this.y + this.height / 2, this.color, up_or_down));
                }
            }
        }
        outside_borders(game) {
            return this.x + this.width/2 < 0 || this.x - this.width/2 > game.SCREEN_WIDTH || this.y + this.height/2 < 0 || this.y - this.height/2 > game.SCREEN_HEIGHT;
        }
        shoot_multiple_shots(game, target_x, target_y, shots_on_either_side) {
            const dx = target_x - (this.x + this.width / 2);
            const dy = target_y - (this.y + this.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const x_dir = dx / distance;
            const y_dir = dy / distance;
            this.spawn_shot(game, x_dir, y_dir);

            for (let rotation_dir of [1, -1]) {
                let t_x_dir = x_dir;
                let t_y_dir = y_dir;
                for (let i = 0; i < shots_on_either_side; i++) {
                    const sin_value = Math.sin(game.ENEMY2_RADIANS_BETWEEN_SHOTS);
                    const cos_value = Math.cos(game.ENEMY2_RADIANS_BETWEEN_SHOTS);
                    const before_t_x_dir = t_x_dir;
                    t_x_dir = t_x_dir * cos_value - (rotation_dir) * t_y_dir * sin_value;
                    t_y_dir = (rotation_dir) * before_t_x_dir * sin_value + t_y_dir * cos_value;
                    this.spawn_shot(game, t_x_dir, t_y_dir);
                }
            }
        }
        spawn_shot(game, x_dir, y_dir) {}
    }
    
    class Banner {
        constructor(game, text, x_vel = Math.random() * 0.6 + 0.2) {
            this.x = -game.SCREEN_WIDTH * 0.1;
            this.y = Math.floor(Math.random() * (game.SCREEN_HEIGHT * 0.8)) + (game.SCREEN_HEIGHT * 0.1);
            this.text = text;
            this.x_vel = x_vel;
            this.color = [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 206) + 50];
        }
        move(game) { this.x += this.x_vel * game.frameTime ; } // Adjusted speed for JS frametime
        logic(game) {
            if (this.x > game.SCREEN_WIDTH) {
                this.end_logic = this.remove_self;
            }
        }
        end_logic(game) {}
        remove_self(game) { game.objectsToRemove.add(this); }
        draw(game) {
            game.ctx.font = "30px Arial";
            game.ctx.fillStyle = toColor(this.color);
            game.ctx.fillText(this.text, this.x, this.y);
        }
    }
    
    class Item extends GameObject {
        constructor(game, x, y, text) {
            super(x, y, 20, 20, [0, 255, 0]);
            this.time_alive = 0;
            this.time_to_be_alive = Math.floor(Math.random() * 10001) + 5000;
            this.text = text;
        }
        logic(game) {
            this.time_alive += game.frameTime;
            if (this.time_to_be_alive - this.time_alive < 2000) {
                this.color = (Math.floor(this.time_alive / 150) % 2 === 0) ? [0, 150, 0] : [0, 255, 0];
            }
            if (this.time_alive > this.time_to_be_alive) {
                this.end_logic = this.remove_self;
            }
            if (General.collision_between_rects(this.x, this.y, this.width, this.height, game.player.x, game.player.y, game.player.width, game.player.height)) {
                this.give_to_player(game);
                this.end_logic = this.remove_self;
            }
        }
        give_to_player(game) {}
        remove_self(game) {
            game.objectsToRemove.add(this);
            this.explode_into_particles(game, -1);
        }
        draw(game) {
            super.draw(game);
            game.ctx.font = "20px Arial";
            game.ctx.fillStyle = "black";
            game.ctx.textAlign = "center";
            game.ctx.textBaseline = "middle";
            game.ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2 + 2);
            game.ctx.textAlign = "start"; // Reset alignment
            game.ctx.textBaseline = "alphabetic"; // Reset baseline
        }
    }

    class Item1 extends Item { constructor(game, x, y) { super(game, x, y, "+A"); } give_to_player(game) { game.player.get_item1(); game.objectsToAdd.add(new Banner(game, "received shots")); }}
    class Item2 extends Item { constructor(game, x, y) { super(game, x, y, "SF"); } give_to_player(game) { game.player.get_item2(); game.objectsToAdd.add(new Banner(game, "shooting reload time shortened")); }}
    class Item3 extends Item { constructor(game, x, y) { super(game, x, y, "PS"); } give_to_player(game) { game.player.get_item3(); game.objectsToAdd.add(new Banner(game, "player speed increased")); }}
    class Item4 extends Item { constructor(game, x, y) { super(game, x, y, "PH"); } give_to_player(game) { game.player.get_item4(); game.objectsToAdd.add(new Banner(game, "player health increased")); }}
    class Item5 extends Item { constructor(game, x, y) { super(game, x, y, "SA"); } give_to_player(game) { game.player.get_item5(); game.objectsToAdd.add(new Banner(game, "amount of shots per shot increased")); }}
    class Item6 extends Item { constructor(game, x, y) { super(game, x, y, "SB"); } give_to_player(game) { game.player.get_item6(); game.objectsToAdd.add(new Banner(game, "shot bounciness increased")); }}
    class Item7 extends Item { constructor(game, x, y) { super(game, x, y, "SD"); } give_to_player(game) { game.player.get_item7(); game.objectsToAdd.add(new Banner(game, "shot durability increased")); }}
    class Item8 extends Item { constructor(game, x, y) { super(game, x, y, "SW"); } give_to_player(game) { game.player.get_item8(); game.objectsToAdd.add(new Banner(game, "shot width increased")); }}

    class Particle extends GameObject {
        constructor(game, x, y, central_x, central_y, color, up_or_down) {
            super(x, y, game.PARTICLE_SIDE_LENGTH, game.PARTICLE_SIDE_LENGTH, color);
            this.x_vel = (x + this.width / 2 - central_x) / 40;
            this.y_vel = (y + this.height / 2 - central_y) / 40;
            this.up_or_down = up_or_down;
        }
        move(game) {
            this.x += this.x_vel * game.frameTime ; // Adjusted
            this.y += this.y_vel * game.frameTime ; // Adjusted
        }
        logic(game) {
            this.y_vel += 0.001 * game.frameTime * this.up_or_down;
        }
        end_logic(game) {
            if (this.outside_borders(game)) {
                game.objectsToRemove.add(this);
            }
        }
    }
    
    class Player extends GameObject {
        constructor(game) {
            super(game.SCREEN_WIDTH / 2, game.SCREEN_HEIGHT / 2, 0, 0, game.PLAYER_COLOR);
            this.speed = game.PLAYER_SPEED;
            this.shots = game.PLAYER_START_SHOTS;
            this.previous_shots = this.shots;
            this.lives = 5;
            this.change_size();
            this.shoot_timer = 0;
            this.shoot_wait_time = game.PLAYER_SHOOT_WAIT_TIME;
            this.invincibility_time = game.PLAYER_INCINVIBILITY_TIME;
            this.invincibility_timer = 0;
            this.invincibility_active = false;
            this.hit_by_shot_this_frame = false;
            this.shots_on_either_side = 0;
            this.shot_bounciness = 0;
            this.shot_durability = 1;
            this.shot_side_length = game.PLAYER_SHOT_SIDE_LENGTH;
        }
        move(game) {
            const speed = this.speed * game.frameTime ;
            if (game.keysPressed['ArrowUp'] || game.keysPressed['w']) this.y -= speed;
            if (game.keysPressed['ArrowDown'] || game.keysPressed['s']) this.y += speed;
            if (game.keysPressed['ArrowRight'] || game.keysPressed['d']) this.x += speed;
            if (game.keysPressed['ArrowLeft'] || game.keysPressed['a']) this.x -= speed;
            this.move_inside_screen(game);
        }
        logic(game) {
            this.previous_shots = this.shots;
            this.shoot(game);

            game.gameObjects.enemies.forEach(enemy => {
                if (General.collision_between_rects(this.x, this.y, this.width, this.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                    this.hit_by_shot_this_frame = true;
                    const dx = enemy.x + enemy.width / 2 - (this.x + this.width / 2);
                    const dy = enemy.y + enemy.height / 2 - (this.y + this.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    enemy.got_bounced_by_player(game, dx / dist, dy / dist);
                }
            });

            if (this.invincibility_active) {
                this.invincibility_timer += game.frameTime;
                if (this.invincibility_timer > this.invincibility_time) {
                    this.invincibility_timer = 0;
                    this.invincibility_active = false;
                    this.color = game.PLAYER_COLOR;
                } else {
                    this.color = (Math.floor(this.invincibility_timer / 200) % 2 === 0) ? [255, 0, 0] : game.PLAYER_COLOR;
                }
            }
        }
        end_logic(game) {
            if (this.shots !== this.previous_shots) this.change_size();
            if (this.hit_by_shot_this_frame && !this.invincibility_active) {
                this.lives -= 1;
                this.invincibility_active = true;
                game.objectsToAdd.add(new Banner(game, "you took damage"));
            }
            this.hit_by_shot_this_frame = false;
        }
        shoot(game) {
            this.shoot_timer += game.frameTime;
            if (game.mouseClickedThisFrame && this.shots > 0 && this.shoot_timer > this.shoot_wait_time) {
                this.shoot_multiple_shots(game, game.mousePos.x, game.mousePos.y, this.shots_on_either_side);
                this.shots -= 1;
                this.shoot_timer = 0;
            }
        }
        change_size() {
            const new_side_length = this.shots * 2 + 8;
            this.x += (this.width - new_side_length) / 2;
            this.y += (this.height - new_side_length) / 2;
            this.width = new_side_length;
            this.height = new_side_length;
        }
        hit_by_shot() { this.hit_by_shot_this_frame = true; }
        get_item1() { this.shots += Math.floor(Math.random() * 3) + 2; }
        get_item2() { this.shoot_wait_time *= 0.6; }
        get_item3() { this.speed *= 1.25; }
        get_item4() { this.lives += 1; }
        get_item5() { this.shots_on_either_side += 1; }
        get_item6() { this.shot_bounciness += 1; }
        get_item7() { this.shot_durability += 1; }
        get_item8() { this.shot_side_length *= 1.25; }
        die() { this.draw = () => {}; }
        spawn_shot(game, x_dir, y_dir) {
            const x = this.x + this.width / 2 - this.shot_side_length / 2;
            const y = this.y + this.height / 2 - this.shot_side_length / 2;
            game.objectsToAdd.add(new Player_Shot(x, y, this.shot_side_length, game.PLAYER_SHOT_SPEED, x_dir, y_dir, this.shot_bounciness, this.shot_durability));
        }
        draw(game) {
            super.draw(game);
            game.ctx.font = "20px Arial";
            game.ctx.fillStyle = "black";
            game.ctx.textAlign = "center";
            game.ctx.textBaseline = "middle";
            game.ctx.fillText(this.lives, this.x + this.width / 2, this.y + this.height / 2);
            game.ctx.textAlign = "start";
            game.ctx.textBaseline = "alphabetic";
        }
    }
    
    class Shot extends GameObject {
        constructor(x, y, side_length, speed, x_dir, y_dir) {
            super(x, y, side_length, side_length, [200, 200, 200]);
            this.speed = speed;
            this.x_dir = x_dir;
            this.y_dir = y_dir;
            this.lives = 1;
        }
        move(game) {
            const speed = this.speed * game.frameTime ;
            this.x += this.x_dir * speed;
            this.y += this.y_dir * speed;
        }
        end_logic(game) {
            if (this.lives < 1 || this.outside_borders(game)) {
                game.objectsToRemove.add(this);
            }
        }
    }

    class Player_Shot extends Shot {
        constructor(x, y, side_length, speed, x_dir, y_dir, bounciness, durability) {
            super(x, y, side_length, speed, x_dir, y_dir);
            this.bounciness = bounciness;
            this.lives = durability;
        }
        move(game) {
            super.move(game);
            if (this.bounciness > 0) {
                let bounced = false;
                if (this.x < 0) { this.x = 0; this.x_dir *= -1; bounced = true; }
                else if (this.x + this.width > game.SCREEN_WIDTH) { this.x = game.SCREEN_WIDTH - this.width; this.x_dir *= -1; bounced = true; }
                if (this.y < 0) { this.y = 0; this.y_dir *= -1; bounced = true; }
                else if (this.y + this.height > game.SCREEN_HEIGHT) { this.y = game.SCREEN_HEIGHT - this.height; this.y_dir *= -1; bounced = true; }
                if (bounced) this.bounciness -= 1;
            }
        }
        logic(game) {
            game.gameObjects.enemies.forEach(enemy => {
                if (General.collision_between_rects(this.x, this.y, this.width, this.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
                    this.lives -= 1;
                    enemy.hit_by_shot(game);
                }
            });
        }
        went_into_bomb(game) { this.lives -= 1; }
    }

    class Enemy_Shot extends Shot {
        logic(game) {
            if (General.collision_between_rects(this.x, this.y, this.width, this.height, game.player.x, game.player.y, game.player.width, game.player.height)) {
                this.lives -= 1;
                game.player.hit_by_shot();
            }
        }
    }
    
    class Enemy extends GameObject {
        constructor(game, side_length, color, shot_side_length, shot_speed) {
            super(0, 0, side_length, side_length, color);
            this.shot_side_length = shot_side_length;
            this.shot_speed = shot_speed;
            this.init_enemy_border_position(game);
            this.lives = 1;
            this.speed = 0;

            this.bounce_x_dir = 0;
            this.bounce_y_dir = 0;
            this.bounce_timer = 0;
            this.bounce_speed = 0;
            this.old_move = this.move;
        }
        got_bounced_by_player(game, x_dir, y_dir) {
            this.bounce_x_dir = x_dir;
            this.bounce_y_dir = y_dir;
            this.old_move = this.move;
            this.move = this.bounce_move;
            this.bounce_speed = 0.5;
            this.bounce_timer = 0;
        }
        bounce_move(game) {
            const speed = this.bounce_speed * game.frameTime ;
            this.x += this.bounce_x_dir * speed;
            this.y += this.bounce_y_dir * speed;
            this.bounce_timer += game.frameTime;
            this.bounce_speed *= 0.95;
            if (this.bounce_timer > 1000) {
                this.move = this.old_move;
            }
        }
        init_enemy_border_position(game) {
            if (Math.random() < 0.5) {
                this.x = (Math.random() < 0.5) ? -this.width : game.SCREEN_WIDTH;
                this.y = Math.random() * game.SCREEN_HEIGHT;
            } else {
                this.x = Math.random() * game.SCREEN_WIDTH;
                this.y = (Math.random() < 0.5) ? -this.height : game.SCREEN_HEIGHT;
            }
        }
        move_towards_pos(game, x, y) {
            const dx = x - (this.x + this.width / 2);
            const dy = y - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = this.speed * game.frameTime ;
            this.x += (dx / dist) * speed;
            this.y += (dy / dist) * speed;
        }
        move_nowhere(game) {}
        shoot_towards_player(game) {
            const dx = game.player.x + game.player.width / 2 - (this.x + this.width / 2);
            const dy = game.player.y + game.player.height / 2 - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.spawn_shot(game, dx / dist, dy / dist);
        }
        handle_shooting_player(game) {
            this.shoot_timer += game.frameTime;
            if (this.shoot_timer >= this.shoot_wait_time) {
                this.shoot_timer = 0;
                this.shoot_towards_player(game);
            }
        }
        hit_by_shot(game) { this.lives -= 1; }
        end_logic(game) {
            if (this.lives < 1) {
                game.objectsToRemove.add(this);
                this.explode_into_particles(game, 1);
                this.drop_item(game);
                game.score += 200;
            }
        }
        drop_item(game) {
            const ran_num = Math.random();
            if (ran_num >= 0.4) {
                let item = Item1;
                if (ran_num >= 0.80) {
                    const itemTypes = [Item2, Item3, Item4, Item5, Item6, Item7, Item8];
                    item = itemTypes[Math.floor(Math.random() * itemTypes.length)];
                }
                game.objectsToAdd.add(new item(game, this.x + this.width / 2, this.y + this.height / 2));
            }
        }
        spawn_shot(game, x_dir, y_dir) {
            const x = this.x + this.width / 2 - this.shot_side_length / 2;
            const y = this.y + this.height / 2 - this.shot_side_length / 2;
            game.objectsToAdd.add(new Enemy_Shot(x, y, this.shot_side_length, this.shot_speed, x_dir, y_dir));
        }
    }
    
    class Enemy1 extends Enemy { // Circles player
        constructor(game) {
            super(game, game.ENEMY1_SIDE_LENGTH, game.ENEMY1_COLOR, game.ENEMY1_SHOT_SIDE_LENGTH, game.ENEMY1_SHOT_SPEED);
            this.speed = game.ENEMY1_SPEED;
            this.rotation_speed = game.ENEMY1_ROTATION_SPEED;
            this.radius_from_player = game.SCREEN_WIDTH * (Math.random() * 0.15 + 0.3);
            this.rotation_dir = (Math.random() < 0.5) ? 1 : -1;
            this.shoot_timer = 0;
            this.shoot_wait_time = game.ENEMY1_SHOOT_WAIT_TIME;
        }
        move(game) {
            const dx = game.player.x + game.player.width / 2 - (this.x + this.width / 2);
            const dy = game.player.y + game.player.height / 2 - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = this.speed * game.frameTime ;
            const rotSpeed = this.rotation_speed * game.frameTime ;
            
            if (Math.abs(dist - this.radius_from_player) > this.width) {
                const move_dir = (this.radius_from_player < dist) ? 1 : -1;
                this.x += (dx / dist) * speed * move_dir;
                this.y += (dy / dist) * speed * move_dir;
            }
            this.x += (-dy / dist) * rotSpeed * this.rotation_dir;
            this.y += (dx / dist) * rotSpeed * this.rotation_dir;
        }
        logic(game) { this.handle_shooting_player(game); }
    }
    
    class Enemy2 extends Enemy { // Gets close and shoots burst
        constructor(game) {
            super(game, game.ENEMY2_SIDE_LENGTH, game.ENEMY2_COLOR, game.ENEMY2_SHOT_SIDE_LENGTH, game.ENEMY2_SHOT_SPEED);
            this.radius_to_player_to_attack = game.SCREEN_WIDTH * (Math.random() * 0.05 + 0.05);
            this.shot_reload_timer = 0;
            this.speed = game.ENEMY2_SPEED;
            this.move = this.move_towards_player;
            this.logic = this.moving_logic;
        }
        move_towards_player(game) {
            this.move_towards_pos(game, game.player.x + game.player.width / 2, game.player.y + game.player.height / 2);
        }
        moving_logic(game) {
            const dx = game.player.x + game.player.width / 2 - (this.x + this.width / 2);
            const dy = game.player.y + game.player.height / 2 - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.radius_to_player_to_attack) {
                this.move = this.move_nowhere;
                this.logic = this.attack_logic;
                this.shoot_multiple_shots(game, game.player.x + game.player.width / 2, game.player.y + game.player.height / 2, game.ENEMY2_SHOTS_ON_EITHER_SIDE);
            }
        }
        attack_logic(game) {
            this.shot_reload_timer += game.frameTime;
            if (this.shot_reload_timer > game.ENEMY2_SHOT_RELOAD_TIME) {
                this.move = this.move_towards_player;
                this.logic = this.moving_logic;
                this.shot_reload_timer = 0;
            }
        }
    }

    class Enemy3 extends Enemy { // places bombs
        constructor(game) {
            super(game, game.ENEMY3_SIDE_LENGTH, game.ENEMY3_COLOR, 0, 0);
            this.target_x = 0;
            this.target_y = 0;
            this.speed = game.ENEMY3_SPEED;
            this.set_target_position(game);
            this.move = this.move_towards_target;
            this.logic = this.moving_logic;
            this.placing_bomb_timer = 0;
            this.radius_to_target_to_place_bomb = game.SCREEN_WIDTH * 0.005;
        }
        move_towards_target(game) { this.move_towards_pos(game, this.target_x, this.target_y); }
        set_target_position(game) {
            while (true) {
                this.target_x = Math.random() * game.SCREEN_WIDTH;
                this.target_y = Math.random() * game.SCREEN_HEIGHT;
                const dist = Math.sqrt(Math.pow(this.x - this.target_x, 2) + Math.pow(this.y - this.target_y, 2));
                if (dist > game.ENEMY3_MINIMUM_WALK_DISTANCE) break;
            }
        }
        moving_logic(game) {
            const dx = this.target_x - (this.x + this.width / 2);
            const dy = this.target_y - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.radius_to_target_to_place_bomb) {
                this.move = this.move_nowhere;
                this.logic = this.placing_bomb_logic;
            }
        }
        placing_bomb_logic(game) {
            this.placing_bomb_timer += game.frameTime;
            if (this.placing_bomb_timer > game.ENEMY3_BOMB_PLACING_TIME) {
                this.placing_bomb_timer = 0;
                this.move = this.move_towards_target;
                this.logic = this.moving_logic;
                this.set_target_position(game);
                game.objectsToAdd.add(new Bomb(game, this.x, this.y));
            }
        }
    }

    class Bomb extends GameObject {
        constructor(game, x, y) {
            super(x, y, game.BOMB_SIDE_LENGTH, game.BOMB_SIDE_LENGTH, game.BOMB_COLOR);
            this.logic = this.waiting_logic;
            this.player_distance_which_to_set_off_bomb = this.width * 2;
            this.fuse_timer = 0;
            this.explode = false;
        }
        waiting_logic(game) {
            this.get_shot_by_player_shot(game);
            const dx = game.player.x + game.player.width / 2 - (this.x + this.width / 2);
            const dy = game.player.y + game.player.height / 2 - (this.y + this.height / 2);
            if (Math.sqrt(dx * dx + dy * dy) <= this.player_distance_which_to_set_off_bomb) {
                this.logic = this.waiting_to_explode_logic;
            }
        }
        get_shot_by_player_shot(game) {
            for (const shot of game.gameObjects.player_shots) {
                if (General.collision_between_rects(this.x, this.y, this.width, this.height, shot.x, shot.y, shot.width, shot.height)) {
                    shot.went_into_bomb(game);
                    this.explode = true;
                    break;
                }
            }
        }
        waiting_to_explode_logic(game) {
            this.get_shot_by_player_shot(game);
            this.fuse_timer += game.frameTime;
            const time_ratio = this.fuse_timer / game.BOMB_FUSE_TIME;
            this.color = [255 * (1 - time_ratio), 255 * time_ratio, 255 * time_ratio];
            if (this.fuse_timer > game.BOMB_FUSE_TIME) {
                this.explode = true;
            }
        }
        end_logic(game) {
            if (this.explode) {
                game.objectsToRemove.add(this);
                game.objectsToAdd.add(new Explosion(game, this.x + this.width / 2, this.y + this.height / 2));
            }
        }
        got_hit_by_explosion() { this.explode = true; }
    }

    class Explosion {
        constructor(game, x, y) {
            this.x = x;
            this.y = y;
            this.time_alive = 0;
            this.pattern = [
                [0, 0, 0, 0, 1, 0, 0, 0, 0], [0, 0, 0, 1, 1, 1, 0, 0, 0],
                [0, 0, 1, 1, 1, 1, 1, 0, 0], [0, 1, 1, 1, 1, 1, 1, 1, 0],
                [1, 1, 1, 1, 1, 1, 1, 1, 1], [0, 1, 1, 1, 1, 1, 1, 1, 0],
                [0, 0, 1, 1, 1, 1, 1, 0, 0], [0, 0, 0, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 0, 1, 0, 0, 0, 0]
            ];
            this.color = [255, 155, 0];
            this.tile_side_length = 15;
            this.logic = this.explode_logic;
        }
        move() {}
        end_logic() {}
        fade_logic(game) {
            this.time_alive += game.frameTime;
            if (this.time_alive > game.EXPLOSION_FADE_TIME) {
                game.objectsToRemove.add(this);
            }
        }
        kill_things_in(game, x_pos, y_pos) {
            for (const enemy of game.gameObjects.enemies) {
                if (General.collision_between_rects(x_pos, y_pos, this.tile_side_length, this.tile_side_length, enemy.x, enemy.y, enemy.width, enemy.height)) {
                    enemy.hit_by_shot(game);
                }
            }
            for (const bomb of game.gameObjects.bombs) {
                if (General.collision_between_rects(x_pos, y_pos, this.tile_side_length, this.tile_side_length, bomb.x, bomb.y, bomb.width, bomb.height)) {
                    bomb.got_hit_by_explosion(game);
                }
            }
            if (General.collision_between_rects(x_pos, y_pos, this.tile_side_length, this.tile_side_length, game.player.x, game.player.y, game.player.width, game.player.height)) {
                game.player.hit_by_shot();
            }
        }
        explode_logic(game) {
            this.do_for_tiles(game, this.kill_things_in);
            this.logic = this.fade_logic;
        }
        do_for_tiles(game, func) {
            const x_offset = Math.floor(this.pattern[0].length / 2);
            const y_offset = Math.floor(this.pattern.length / 2);
            for (let y = 0; y < this.pattern.length; y++) {
                for (let x = 0; x < this.pattern[y].length; x++) {
                    if (this.pattern[y][x] === 1) {
                        const x_pos = (x - x_offset) * this.tile_side_length - this.tile_side_length / 2 + this.x;
                        const y_pos = (y - y_offset) * this.tile_side_length - this.tile_side_length / 2 + this.y;
                        func.call(this, game, x_pos, y_pos);
                    }
                }
            }
        }
        draw_tile(game, x_pos, y_pos) {
            game.ctx.fillRect(x_pos, y_pos, this.tile_side_length, this.tile_side_length);
        }
        draw(game) {
            game.ctx.save();
            game.ctx.globalAlpha = 1 - (this.time_alive / game.EXPLOSION_FADE_TIME);
            game.ctx.fillStyle = toColor(this.color);
            this.do_for_tiles(game, this.draw_tile);
            game.ctx.restore();
        }
    }

    class Enemy4 extends Enemy { // walks a line
        constructor(game) {
            super(game, game.ENEMY4_SIDE_LENGTH, game.ENEMY4_COLOR, game.ENEMY4_SHOT_SIDE_LENGTH, game.ENEMY4_SHOT_SPEED);
            this.speed = game.ENEMY4_SPEED * (Math.random() * 0.2 + 0.9);
            this.shoot_timer = 0;
            this.shoot_wait_time = game.ENEMY4_SHOOT_WAIT_TIME;
            this.dir = 1;
            this.up_or_down = Math.random() < 0.5 ? 1 : -1;
            this.distance_to_have_to_player = (Math.random() * 0.15 + 0.25) * game.SCREEN_HEIGHT;
            this.walk_line_length = 0.3 * game.SCREEN_WIDTH;

            if (Math.random() < 0.5) {
                this.move = this.move1; this.logic = this.logic1;
            } else {
                this.move = this.move2; this.logic = this.logic2;
            }
        }
        move1(game) {
            const speed = this.speed * game.frameTime ;
            this.x += speed * this.dir;
            const dy = game.player.y + game.player.height / 2 - (this.y + this.height / 2);
            if (Math.abs(this.distance_to_have_to_player - dy) > this.height) {
                if (dy > this.up_or_down * this.distance_to_have_to_player) this.y += speed;
                else this.y -= speed;
            }
        }
        move2(game) {
            const speed = this.speed * game.frameTime ;
            this.y += speed * this.dir;
            const dx = game.player.x + game.player.width / 2 - (this.x + this.width / 2);
            if (Math.abs(this.distance_to_have_to_player - dx) > this.width) {
                if (dx > this.up_or_down * this.distance_to_have_to_player) this.x += speed;
                else this.x -= speed;
            }
        }
        logic1(game) {
            if (this.dir * (this.x - game.player.x) > this.walk_line_length) this.dir *= -1;
            this.handle_shooting_player(game);
        }
        logic2(game) {
            if (this.dir * (this.y - game.player.y) > this.walk_line_length) this.dir *= -1;
            this.handle_shooting_player(game);
        }
    }

    class Enemy5 extends Enemy { // Bounces around screen
        constructor(game) {
            super(game, game.ENEMY5_SIDE_LENGTH, game.ENEMY5_COLOR, game.ENEMY5_SHOT_SIDE_LENGTH, game.ENEMY5_SHOT_SPEED);
            this.speed = game.ENEMY5_SPEED;
            this.shoot_timer = 0;
            this.shoot_wait_time = game.ENEMY5_SHOOT_WAIT_TIME;
            const rotation = Math.random() * Math.PI * 2;
            this.x_dir = Math.cos(rotation);
            this.y_dir = Math.sin(rotation);
        }
        move(game) {
            const speed = this.speed * game.frameTime ;
            this.x += this.x_dir * speed;
            this.y += this.y_dir * speed;
        }
        logic(game) {
            this.handle_shooting_player(game);
            if (this.x + this.width > game.SCREEN_WIDTH) this.x_dir = -Math.abs(this.x_dir);
            else if (this.x < 0) this.x_dir = Math.abs(this.x_dir);
            if (this.y + this.height > game.SCREEN_HEIGHT) this.y_dir = -Math.abs(this.y_dir);
            else if (this.y < 0) this.y_dir = Math.abs(this.y_dir);
        }
    }

    class Enemy6 extends Enemy { // goes from border to border
        constructor(game) {
            super(game, game.ENEMY6_SIDE_LENGTH, game.ENEMY6_COLOR, game.ENEMY6_SHOT_SIDE_LENGTH, game.ENEMY6_SHOT_SPEED);
            this.speed = game.ENEMY6_SPEED;
            this.shoot_timer = 0;
            this.shoot_wait_time = game.ENEMY6_SHOOT_WAIT_TIME;
            this.wait_timer = 0;
            if (this.x < -this.width / 2) { this.x_dir = 1; this.y_dir = 0; }
            else if (this.x > game.SCREEN_WIDTH - this.width / 2) { this.x_dir = -1; this.y_dir = 0; }
            else if (this.y < -this.height / 2) { this.x_dir = 0; this.y_dir = 1; }
            else { this.x_dir = 0; this.y_dir = -1; }
            this.logic = this.moving_logic;
            this.move = this.move_across_screen;
        }
        move_across_screen(game) {
            const speed = this.speed * game.frameTime ;
            this.x += this.x_dir * speed;
            this.y += this.y_dir * speed;
        }
        moving_logic(game) {
            this.handle_shooting_player(game);
            let changed_dir = false;
            if (this.x > game.SCREEN_WIDTH || this.x + this.width < 0 || this.y > game.SCREEN_HEIGHT || this.y + this.height < 0) {
                changed_dir = true;
                this.x_dir *= -1;
                this.y_dir *= -1;
            }
            if (changed_dir) {
                this.move = this.move_nowhere;
                this.logic = this.waiting_logic;
            }
        }
        waiting_logic(game) {
            this.wait_timer += game.frameTime;
            if (this.wait_timer >= game.ENEMY6_WAIT_TIME) {
                this.move = this.move_across_screen;
                this.logic = this.moving_logic;
                this.wait_timer = 0;
            }
        }
    }

    class Enemy7 extends Enemy { // moves in increments
        constructor(game) {
            super(game, game.ENEMY7_SIDE_LENGTH, game.ENEMY7_COLOR, game.ENEMY7_SHOT_SIDE_LENGTH, game.ENEMY7_SHOT_SPEED);
            this.speed = game.ENEMY7_SPEED;
            this.x_dir = 0; this.y_dir = 0;
            this.set_walk_dir(game);
            this.timer = 0;
            this.move = this.walking_move;
            this.logic = this.walking_logic;
        }
        set_walk_dir(game) {
            const dx = game.player.x + game.player.width / 2 - (this.x + this.width / 2);
            const dy = game.player.y + game.player.height / 2 - (this.y + this.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.x_dir = dx / dist; this.y_dir = dy / dist;

            const rotation = (Math.random() * Math.PI / 3) - (Math.PI / 6); // +/- 30 degrees
            const cos = Math.cos(rotation); const sin = Math.sin(rotation);
            const old_x_dir = this.x_dir;
            this.x_dir = this.x_dir * cos - this.y_dir * sin;
            this.y_dir = old_x_dir * sin + this.y_dir * cos;
        }
        walking_move(game) {
            const speed = this.speed * game.frameTime ;
            this.x += this.x_dir * speed;
            this.y += this.y_dir * speed;
        }
        walking_logic(game) {
            this.timer += game.frameTime;
            if (this.timer > game.ENEMY7_WALK_TIME) {
                this.move = this.move_nowhere;
                this.logic = this.waiting_logic;
                this.timer = 0;
            }
        }
        waiting_logic(game) {
            this.timer += game.frameTime;
            if (this.timer > game.ENEMY7_WAIT_TIME) {
                this.logic = this.walking_logic;
                this.move = this.walking_move;
                this.timer = 0;
                this.set_walk_dir(game);
                this.shoot_towards_player(game);
            }
        }
    }
    
    class Enemy8 extends Enemy { // merged enemy
        constructor(game, side_length, color, shot_side_length, shot_speed, speed, shoot_wait_time, x, y) {
            super(game, side_length, color, shot_side_length, shot_speed);
            this.shoot_timer = 0;
            this.shoot_wait_time = shoot_wait_time;
            this.speed = speed;
            this.x = x; this.y = y;
        }
        move(game) { this.move_towards_pos(game, game.player.x + game.player.width / 2, game.player.y + game.player.height / 2); }
        logic(game) { this.handle_shooting_player(game); }
    }
    
    // --- START GAME ---
    const game = new Game();
    game.start();
});
