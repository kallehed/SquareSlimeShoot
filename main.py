import asyncio
import pygame, math, random

# Written in Python 3.7, pygame 1.9.6 apparently

class Game:
    def __init__(self, highscore=0):
        self.SCREEN_WIDTH = 600
        self.SCREEN_HEIGHT = 600
        self.screen = pygame.display.set_mode([self.SCREEN_WIDTH, self.SCREEN_HEIGHT])
        self.banner_font = pygame.font.Font(None, 30)
        self.item_font = pygame.font.Font(None, 20)
        self.player_lives_font = pygame.font.Font(None, 20)
        self.clock = pygame.time.Clock()
        self.framerate = 60
        self.frame_time = 1/self.framerate # time between frames
        self.mouse_clicked_this_frame = False

        self.PLAYER_SHOT_SPEED = 0.5
        self.PLAYER_SHOT_SIDE_LENGTH = 15
        self.PLAYER_SPEED = 0.3
        self.PLAYER_START_SHOTS = 10
        self.PLAYER_SHOOT_WAIT_TIME = 1000
        self.PLAYER_COLOR = (255,255,255)
        self.PLAYER_INCINVIBILITY_TIME = 1250
        self.player = Player(self)

        self.ENEMY1_SIDE_LENGTH = 15 # circle
        self.ENEMY1_COLOR = (125,125,125)
        self.ENEMY1_SHOT_SPEED = 0.35
        self.ENEMY1_SHOT_SIDE_LENGTH = 5
        self.ENEMY1_SHOOT_WAIT_TIME = 2000
        self.ENEMY1_SPEED = 0.15
        self.ENEMY1_ROTATION_SPEED = 0.1

        self.ENEMY2_SIDE_LENGTH = 20 # get close shoot multiple
        self.ENEMY2_COLOR = (225,125,125)
        self.ENEMY2_SHOT_SPEED = 0.5
        self.ENEMY2_SHOT_SIDE_LENGTH = 3
        self.ENEMY2_SPEED = 0.2
        self.ENEMY2_SHOT_RELOAD_TIME = 500
        self.ENEMY2_RADIANS_BETWEEN_SHOTS = math.pi/20 # 9 degrees
        self.ENEMY2_SHOTS_ON_EITHER_SIDE = 4
        
        self.ENEMY3_SIDE_LENGTH = 25 # places bombs
        self.ENEMY3_COLOR = (200, 200, 200)
        self.ENEMY3_SPEED = 0.075
        self.ENEMY3_MINIMUM_WALK_DISTANCE = self.SCREEN_WIDTH * 0.4
        self.ENEMY3_BOMB_PLACING_TIME = 3000

        self.BOMB_SIDE_LENGTH = 22.5
        self.BOMB_COLOR = (150,0,0)
        self.BOMB_FUSE_TIME = 2000

        self.EXPLOSION_FADE_TIME = 2000

        self.ENEMY4_SIDE_LENGTH = 20 # walks a line
        self.ENEMY4_COLOR = (25,25,150)
        self.ENEMY4_SHOT_SPEED = 0.4
        self.ENEMY4_SHOT_SIDE_LENGTH = 7
        self.ENEMY4_SPEED = 0.175
        self.ENEMY4_SHOOT_WAIT_TIME = 3000

        self.ENEMY5_SIDE_LENGTH = 20 # bounces around screen
        self.ENEMY5_COLOR = (50,50,255)
        self.ENEMY5_SHOT_SPEED = 0.3
        self.ENEMY5_SHOT_SIDE_LENGTH = 14
        self.ENEMY5_SPEED = 0.2
        self.ENEMY5_SHOOT_WAIT_TIME = 4000

        self.ENEMY6_SIDE_LENGTH = 25 # goes from border to border
        self.ENEMY6_COLOR = (50,150,255)
        self.ENEMY6_SHOT_SPEED = 0.45
        self.ENEMY6_SHOT_SIDE_LENGTH = 10
        self.ENEMY6_SPEED = 0.3
        self.ENEMY6_SHOOT_WAIT_TIME = 2000
        self.ENEMY6_WAIT_TIME = random.randint(2000,4000)
        
        self.ENEMY7_SIDE_LENGTH = 17.5 # goes in increments
        self.ENEMY7_COLOR = (50,150,255)
        self.ENEMY7_SHOT_SPEED = 0.45
        self.ENEMY7_SHOT_SIDE_LENGTH = 10
        self.ENEMY7_SPEED = 0.15
        self.ENEMY7_WALK_TIME = 1000
        self.ENEMY7_WAIT_TIME = 750

        self.ENEMY8_SHOOT_WAIT_TIME = 1500 # merge

        self.PARTICLE_SIDE_LENGTH = 10
        self.PARTICLE_DENSITY = 2

        self.enemy_spawn_timer = 0
        self.enemy_spawn_time = 4000
        self.game_total_time = 0

        self.game_objects = {"enemies":[], "player_shots":[], "enemy_shots":[], "bombs":[], "explosions":[], "particles":[],
                             "items":[], "banners":[]}
        self.game_object_mappings = {Enemy1:"enemies",Enemy2:"enemies",Enemy3:"enemies",
                                     Enemy4:"enemies",Enemy5:"enemies",Enemy6:"enemies",
                                     Enemy7:"enemies",Enemy8:"enemies",
                                     Player_Shot:"player_shots",Enemy_Shot:"enemy_shots",
                                     Bomb:"bombs",Explosion:"explosions",
                                     Particle:"particles",
                                     Item1:"items",Item2:"items",Item3:"items",Item4:"items",
                                     Item5:"items",Item6:"items",Item7:"items",Item8:"items",
                                     Banner:"banners"}

        self.objects_to_add = set() # elements of form: OBJECT
        self.objects_to_remove = set()

        self.running = True
        self.game_logic = self.normal_game_logic
        self.end_timer =  0
        self.highscore = highscore
        self.score = 0
        self.END_REFLECTION_TIME = 2000

        self.objects_to_add.add(Banner(self, "MOVE WITH ARROW KEYS, SHOOT WITH MOUSE",0.05))

        #self.game_loop()

    async def start_main_loop(self):
        await self.game_loop()

    async def game_loop(self):
        while self.running:
            self.mouse_clicked_this_frame = False
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                if event.type == pygame.MOUSEBUTTONDOWN:
                    self.mouse_clicked_this_frame = True

            self.game_logic()

            self.screen.fill((0, 0, 0))

            self.draw_game_objects()

            pygame.display.flip()
            await asyncio.sleep(0)

            self.frame_time = self.clock.tick(self.framerate)
    

    def move_game_objects(self):
        self.player.move(self)
        for list_of_game_objects in list(self.game_objects.values()):
            for game_object in list_of_game_objects:
                game_object.move(self)
    def normal_game_logic(self):
        self.move_game_objects()
        #print(sum([len(i) for i in list(self.game_objects.values())]))
        # player shoot
        self.player.logic(self) # effects active AFTER all logic things
        # game objects
        for list_of_game_objects in list(self.game_objects.values()):
            for game_object in list_of_game_objects:
                game_object.logic(self)
        # spawn enemies
        self.game_general_logic()

        # end logic, where you possibly add yourself to remove set
        self.player.end_logic(self)
        for list_of_game_objects in list(self.game_objects.values()):
            for game_object in list_of_game_objects:
                game_object.end_logic(self)

        if self.player.lives < 1:
            # die
            self.player.explode_into_particles(self, 1)
            self.player.die()
            self.game_logic = self.end_game_logic
        
        # remove elements
        for object_to_remove in self.objects_to_remove:
            self.game_objects[self.game_object_mappings[type(object_to_remove)]].remove(object_to_remove)
        # add elements
        for object_to_add in self.objects_to_add:
            self.game_objects[self.game_object_mappings[type(object_to_add)]].append(object_to_add)

        self.objects_to_add = set()
        self.objects_to_remove = set()

    def end_game_logic(self):
        
        for particle in self.game_objects["particles"]:
            particle.move(self)
            particle.logic(self)
        self.end_timer += self.frame_time
        if self.end_timer > self.END_REFLECTION_TIME:
            if self.score > self.highscore: # set new highscore
                self.highscore = self.score
            self.__init__(self.highscore)
            self.start_main_loop()

    def game_general_logic(self):
        # spawn enemies
        self.enemy_spawn_timer += self.frame_time
        self.game_total_time += self.frame_time
        self.enemy_spawn_time = 4000/(math.pow(1.000006,self.game_total_time))
        #print(self.enemy_spawn_time)
        if self.enemy_spawn_timer >= self.enemy_spawn_time:
            self.enemy_spawn_timer = 0
            self.objects_to_add.add(random.choice((Enemy1,Enemy2,Enemy3,Enemy4,Enemy5,Enemy6,Enemy7))(self))
            self.enemy_spawn_time = random.randint(3000,5000)
        if self.game_total_time//500 % 20 == 0 and self.game_total_time > 5000:
            if random.randint(0,1) == 0:
                self.objects_to_add.add(Banner(self, "score: "+str(self.score)))
            else:
                self.objects_to_add.add(Banner(self, "highscore: "+str(self.highscore)))
        # merge enemies when the accidentally eat each other
        en = self.game_objects["enemies"]
        for i in range(len(en)):
            for j in range(len(en)):
                if i != j and type(en[i]) != Enemy8 and type(en[j]) != Enemy8:
                    if pygame.Rect(int(en[i].x),int(en[i].y),int(en[i].width),int(en[i].height)).contains(pygame.Rect(int(en[j].x),int(en[j].y),int(en[j].width),int(en[j].height))):
                        self.objects_to_remove.add(en[i])
                        self.objects_to_remove.add(en[j])
                        # define properties of enemy8
                        en8_side_length = en[i].width+en[j].width
                        en8_color = (min(en[i].color[0]+en[j].color[0],255),min(en[i].color[1]+en[j].color[1],255),min(en[i].color[2]+en[j].color[2],255))
                        en8_shot_side_length = en[i].shot_side_length + en[j].shot_side_length
                        en8_shot_speed = en[i].shot_speed + en[j].shot_speed
                        en8_speed = (en[i].speed + en[j].speed)/4
                        en8_shoot_wait_time = self.ENEMY8_SHOOT_WAIT_TIME
                        self.objects_to_add.add(Enemy8(self, en8_side_length, en8_color, en8_shot_side_length, en8_shot_speed, en8_speed, en8_shoot_wait_time,en[i].x,en[j].y))
    def draw_game_objects(self):
        for list_of_game_objects in list(self.game_objects.values()):
            for game_object in list_of_game_objects:
                game_object.draw(self)
        self.player.draw(self)
    
class General:
    @staticmethod
    def collision_between_rects(x1,y1,w1,h1,x2,y2,w2,h2):
        if x1+w1 > x2 and x1 < x2+w2 and y1+h1 > y2 and y1 < y2+h2:
            return True
        return False
class Game_Object:
    def __init__(self,x,y,width,height,color):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.color = color
    def move(self, game):
        pass
    def logic(self, game):
        pass
    def end_logic(self, game):
        pass
    def draw(self, game):
        pygame.draw.rect(game.screen, self.color, (int(self.x),int(self.y),int(self.width),int(self.height)))
    def move_inside_screen(self, game): # limit position inside game area
        if self.x < 0: self.x = 0
        elif self.x + self.width > game.SCREEN_WIDTH: self.x = game.SCREEN_WIDTH - self.width
        if self.y < 0: self.y = 0
        elif self.y + self.height > game.SCREEN_HEIGHT: self.y = game.SCREEN_HEIGHT - self.height
    def explode_into_particles(self, game, up_or_down):
        psl = game.PARTICLE_SIDE_LENGTH
        for x in range(math.floor(self.x), math.ceil(self.x+self.width+1 - psl), game.PARTICLE_DENSITY):
            for y in range(math.floor(self.y), math.ceil(self.y+self.height+1 - psl), game.PARTICLE_DENSITY):
                game.objects_to_add.add(Particle(game, x,y, self.x+self.width/2, self.y+self.height/2,self.color, up_or_down))
    def outside_borders(self, game):
        # out of bounds
        if self.x+self.width/2 < 0 or self.x-self.width/2 > game.SCREEN_WIDTH or self.y+self.height/2 < 0 or self.y-self.height/2 > game.SCREEN_HEIGHT:
            return True
        return False
    def shoot_multiple_shots(self, game, target_x, target_y, shots_on_either_side):
        dx = target_x -(self.x+self.width/2)
        dy = target_y -(self.y+self.height/2)
        distance_to_target = math.sqrt(math.pow(dx,2) + math.pow(dy,2))
        x_dir = dx/distance_to_target
        y_dir = dy/distance_to_target
        self.spawn_shot(game, x_dir, y_dir)

        # add shoots rotated
        rotation_dir = 1
        for _ in range(2):
            t_x_dir = x_dir
            t_y_dir = y_dir
            for _ in range(shots_on_either_side):
                sin_value = math.sin(game.ENEMY2_RADIANS_BETWEEN_SHOTS)
                cos_value = math.cos(game.ENEMY2_RADIANS_BETWEEN_SHOTS)
                before_t_x_dir = t_x_dir
                t_x_dir = t_x_dir*cos_value - (rotation_dir)*t_y_dir*sin_value
                t_y_dir = (rotation_dir)*before_t_x_dir*sin_value + t_y_dir*cos_value
                self.spawn_shot(game, t_x_dir, t_y_dir)
            # swap direction
            rotation_dir *= -1
    def spawn_shot(self, game, x_dir, y_dir):
        pass
class Banner: # moves across screen comicly with text
    def __init__(self, game, text, x_vel=random.uniform(0.2,0.8)):
        self.x = -game.SCREEN_WIDTH*0.1
        self.y = random.randint(0.1*game.SCREEN_HEIGHT,0.9*game.SCREEN_HEIGHT)
        self.text = text
        self.x_vel = x_vel
        self.color = (random.randint(0,255),random.randint(0,255),random.randint(50,255))
    def move(self, game):
        self.x += self.x_vel*game.frame_time
    def logic(self, game):
        if self.x > game.SCREEN_WIDTH:
            self.end_logic = self.remove_self
    def end_logic(self, game):
        pass
    def remove_self(self, game):
        game.objects_to_remove.add(self)
    def draw(self, game):
        text_surface = game.banner_font.render(self.text, True, self.color)
        game.screen.blit(text_surface,(int(self.x),int(self.y)))
class Item(Game_Object): # A green square possibly containing things, with text written on it
    def __init__(self, game, x, y, text):
        super().__init__(x, y, 20, 20, (0,255,0))
        self.time_alive = 0
        self.time_to_be_alive = random.randint(5000,15000) # 5 to 15 sek
        self.text = text
        
    def logic(self, game): # if player on item -> pickup item
        self.time_alive += game.frame_time
        if self.time_to_be_alive - self.time_alive  < 2000: # if only small time left, blink
            # change color
            if self.time_alive // 150 % 2 == 0:
                self.color = (0,150,0)
            else:
                self.color = (0,255,0)
        if self.time_alive > self.time_to_be_alive: # only live for enough time
            self.end_logic = self.remove_self
        if General.collision_between_rects(self.x,self.y,self.width,self.height,game.player.x,game.player.y,game.player.width,game.player.height):
            self.give_to_player(game)
            self.end_logic = self.remove_self
    def give_to_player(self, game): # to be defined by children
        pass
    def remove_self(self, game):
        game.objects_to_remove.add(self)
        self.explode_into_particles(game, -1)
    def draw(self, game):
        super().draw(game)
        # draw text
        text_surface = game.item_font.render(self.text, True, (0,0,0))
        game.screen.blit(text_surface,(int(self.x),int(self.y)))

class Item1(Item): # get shots
    def __init__(self, game, x, y):
        super().__init__(game, x, y, "")
    def give_to_player(self, game):
        game.player.get_item1()
        game.objects_to_add.add(Banner(game, "recieved shots"))
class Item2(Item): # increase shooting frequency
    def __init__(self, game, x, y):
        super().__init__(game, x, y, "SF")
    def give_to_player(self, game):
        game.player.get_item2()
        game.objects_to_add.add(Banner(game, "shooting reload time shortened"))
class Item3(Item): # increase player speed
    def __init__(self, game, x, y):
        super().__init__(game, x, y, "PS")
    def give_to_player(self, game):
        game.player.get_item3()
        game.objects_to_add.add(Banner(game, "player speed increased"))
class Item4(Item): # increase player health
    def __init__(self, game, x, y):
        super().__init__(game, x, y, "PH")
    def give_to_player(self, game):
        game.player.get_item4()
        game.objects_to_add.add(Banner(game, "played health increased"))
class Item5(Item): # increase amount of shots shot per shot
    def __init__(self, game, x, y):
        super().__init__(game, x, y, "SA")
    def give_to_player(self, game):
        game.player.get_item5()
        game.objects_to_add.add(Banner(game, "amount of shots per shot increased"))
class Item6(Item): # increase times shots will bounce
    def __init__(self, game, x, y):
        super().__init__(game, x, y, "SB")
    def give_to_player(self, game):
        game.player.get_item6()
        game.objects_to_add.add(Banner(game, "shot bounciness increased"))
class Item7(Item): # increase shot durability
    def __init__(self, game, x, y):
        super().__init__(game, x, y, "SD")
    def give_to_player(self, game):
        game.player.get_item7()
        game.objects_to_add.add(Banner(game, "shot durability increased"))
class Item8(Item): # increase shot side length
    def __init__(self, game, x, y):
        super().__init__(game, x, y, "SW")
    def give_to_player(self, game):
        game.player.get_item8()
        game.objects_to_add.add(Banner(game, "shot width increased"))

class Particle(Game_Object):
    def __init__(self, game, x, y, central_x, central_y, color, up_or_down):
        super().__init__(x, y, game.PARTICLE_SIDE_LENGTH, game.PARTICLE_SIDE_LENGTH, color)
        self.x_vel = (x + self.width/2 - central_x)/40
        self.y_vel = (y + self.height/2 - central_y)/40
        self.up_or_down = up_or_down
    def move(self, game):
        self.x += self.x_vel*game.frame_time
        self.y += self.y_vel*game.frame_time
    def logic(self, game):
        self.y_vel += 0.001*game.frame_time*self.up_or_down
    def end_logic(self, game):
        if self.outside_borders(game):
            game.objects_to_remove.add(self)
class Player(Game_Object):
    def __init__(self, game):
        super().__init__(game.SCREEN_WIDTH/2, game.SCREEN_HEIGHT/2, 0,0, game.PLAYER_COLOR)
        self.speed = game.PLAYER_SPEED
        self.shots = game.PLAYER_START_SHOTS
        self.previous_shots = self.shots
        self.lives = 5
        self.change_size()
        self.shoot_timer = 0
        self.shoot_wait_time = game.PLAYER_SHOOT_WAIT_TIME
        self.invincibility_time = game.PLAYER_INCINVIBILITY_TIME
        self.invincibility_timer = 0
        self.invincibility_active = False
        self.hit_by_shot_this_frame = False
        self.shots_on_either_side = 0
        self.shot_bounciness = 0 # how many times a shot will bounce
        self.shot_durability = 1 # how many enemies a shot can kill
        self.shot_side_length = game.PLAYER_SHOT_SIDE_LENGTH
    def move(self, game):
        pressed_keys = pygame.key.get_pressed()
        if pressed_keys[pygame.K_UP] or pressed_keys[pygame.K_w]:
            self.y -= self.speed*game.frame_time
        if pressed_keys[pygame.K_DOWN] or pressed_keys[pygame.K_s]:
            self.y += self.speed*game.frame_time
        if pressed_keys[pygame.K_RIGHT] or pressed_keys[pygame.K_d]:
            self.x += self.speed*game.frame_time
        if pressed_keys[pygame.K_LEFT] or pressed_keys[pygame.K_a]:
            self.x -= self.speed*game.frame_time
        self.move_inside_screen(game)
    def logic(self, game):
        self.previous_shots = self.shots
        self.shoot(game)

        # collide into enemy
        for enemy in game.game_objects["enemies"]:
            if General.collision_between_rects(self.x,self.y,self.width,self.height,enemy.x,enemy.y,enemy.width,enemy.height):
                self.hit_by_shot_this_frame = True
                dx = enemy.x + enemy.width/2 - (self.x + self.width/2)
                dy = enemy.y + enemy.height/2 - (self.y + self.height/2)
                distance_between_player_and_enemy = math.sqrt(dx*dx + dy*dy)
                x_dir = dx/distance_between_player_and_enemy
                y_dir = dy/distance_between_player_and_enemy
                enemy.got_bounced_by_player(game, x_dir, y_dir)
        
        if self.invincibility_active:
            # invincibility logic

            self.invincibility_timer += game.frame_time
            if self.invincibility_timer > self.invincibility_time:
                # end invincibility
                self.invincibility_timer = 0
                self.invincibility_active = False
                self.color = game.PLAYER_COLOR
            else:
                # change color
                if self.invincibility_timer // 200 % 2 == 0:
                    self.color = (255,0,0)
                else:
                    self.color = game.PLAYER_COLOR
    def end_logic(self, game):
        if self.shots != self.previous_shots:
            self.change_size()
        if self.hit_by_shot_this_frame and not self.invincibility_active: # actually take damage
            self.lives -= 1
            self.invincibility_active = True
            self.hit_by_shot_this_frame = False
            game.objects_to_add.add(Banner(game, "you took damage"))
    def shoot(self, game): # shoot shot if mouse clicked
        self.shoot_timer += game.frame_time
        if game.mouse_clicked_this_frame and self.shots > 0 and self.shoot_timer > self.shoot_wait_time:
            mouse_pos = pygame.mouse.get_pos()
            self.shoot_multiple_shots(game, mouse_pos[0],mouse_pos[1],self.shots_on_either_side)
            self.shots -= 1
            self.shoot_timer = 0
    def change_size(self):
        new_side_length = self.shots*2 + 8
        self.x =  (self.width - new_side_length)/2 + self.x
        self.y =  (self.height - new_side_length)/2 + self.y
        self.width = new_side_length
        self.height = new_side_length
    def hit_by_shot(self):
        self.hit_by_shot_this_frame = True
    def get_item1(self): # get shots
        self.shots += random.randint(2,4)
    def get_item2(self): # increase shooting frequency
        self.shoot_wait_time *= 0.6
    def get_item3(self): # increase speed
        self.speed *= 1.25
    def get_item4(self): # increase health
        self.lives += 1
    def get_item5(self): # increase shots shot per shot
        self.shots_on_either_side += 1
    def get_item6(self): # increase shot bounciness
        self.shot_bounciness += 1
    def get_item7(self): # increase shot durability
        self.shot_durability += 1
    def get_item8(self): # increase shot side length
        self.shot_side_length *= 1.25
    def die(self): # die
        self.draw = self.move
    def spawn_shot(self, game, x_dir, y_dir):
        x = self.x+self.width/2 - game.PLAYER_SHOT_SIDE_LENGTH/2
        y = self.y+self.height/2 - game.PLAYER_SHOT_SIDE_LENGTH/2
        game.objects_to_add.add(Player_Shot(x,y,self.shot_side_length, game.PLAYER_SHOT_SPEED, x_dir, y_dir, self.shot_bounciness, self.shot_durability))
    def draw(self, game):
        super().draw(game)
        # draw lives
        text_surface = game.player_lives_font.render(str(self.lives), True, (0,0,0))
        game.screen.blit(text_surface,(int(self.x),int(self.y)))

class Shot(Game_Object): # should not be initalized
    def __init__(self, x, y, side_length, speed, x_dir, y_dir):
        super().__init__(x, y, side_length, side_length, (200,200,200))
        self.speed = speed
        self.x_dir = x_dir
        self.y_dir = y_dir
        self.lives = 1
    def move(self, game):
        self.x += self.x_dir*self.speed*game.frame_time
        self.y += self.y_dir*self.speed*game.frame_time
    
    def end_logic(self, game):
        if self.lives < 1 or self.outside_borders(game):
            game.objects_to_remove.add(self)

class Player_Shot(Shot):
    def __init__(self, x, y, side_length, speed, x_dir, y_dir, bounciness, durability):
        super().__init__(x, y, side_length, speed, x_dir, y_dir)
        self.bounciness = bounciness
        self.lives = durability
    def move(self, game):
        super().move(game) # move lika a shot should
        # extra bouncy stuff
        if self.bounciness > 0:
            bounced = False
            if self.x < 0:
                self.x = 0
                self.x_dir *= -1
                bounced = True
            elif self.x + self.width > game.SCREEN_WIDTH:
                self.x = game.SCREEN_WIDTH - self.width
                self.x_dir *= -1
                bounced = True
            if self.y < 0:
                self.y = 0
                self.y_dir *= -1
                bounced = True
            elif self.y+self.height > game.SCREEN_HEIGHT:
                self.y = game.SCREEN_HEIGHT - self.height
                self.y_dir *= -1
                bounced = True
            if bounced:
                self.bounciness -= 1

    def logic(self, game):
        # check if in enemy => kill self and enemy
        for enemy in game.game_objects["enemies"]:
            if self.x+self.width > enemy.x and self.x < enemy.x+enemy.width and self.y+self.height > enemy.y and self.y < enemy.y+enemy.height:
                self.lives -= 1
                enemy.hit_by_shot(game)
    def went_into_bomb(self, game): # called by bomb
        self.lives -= 1
class Enemy_Shot(Shot):
    def __init__(self, x, y, side_length, speed, x_dir, y_dir):
        super().__init__(x, y, side_length, speed, x_dir, y_dir)
    def logic(self, game):
        # check if in player => kill self, hurt player
        if self.x+self.width > game.player.x and self.x < game.player.x+game.player.width and self.y+self.height > game.player.y and self.y < game.player.y+game.player.height:
            self.lives -= 1
            game.player.hit_by_shot() # hurt player

class Enemy(Game_Object): # General, not to be used
    def __init__(self, game, side_length, color, shot_side_length, shot_speed):
        super().__init__(0,0,side_length,side_length,color)
        self.shot_side_length = shot_side_length
        self.shot_speed = shot_speed
        self.init_enemy_border_position(game)
        self.lives = 1

        self.bounce_x_dir = 0
        self.bounce_y_dir = 0
        self.bounce_timer = 0
        self.bounce_speed = 0
        self.old_move = self.move_nowhere
    def got_bounced_by_player(self, game, x_dir, y_dir):
        self.bounce_x_dir = x_dir
        self.bounce_y_dir = y_dir
        self.old_move = self.move
        self.move = self.bounce_move
        self.bounce_speed = 0.5
    def bounce_move(self, game):
        
        self.x += self.bounce_x_dir * game.frame_time * self.bounce_speed
        self.y += self.bounce_y_dir * game.frame_time * self.bounce_speed
        self.bounce_timer += game.frame_time
        self.bounce_speed *= 0.95
        if self.bounce_timer > 1000:
            self.move = self.old_move
            self.bounce_timer = 0
    def init_enemy_border_position(self, game):
        if random.randint(0,1) == 0: # x is set to either side
            self.x = -self.width if random.randint(0,1) == 0 else game.SCREEN_WIDTH
            self.y = random.randint(0, game.SCREEN_HEIGHT)
        else: # y is set to either side
            self.x = random.randint(0, game.SCREEN_WIDTH)
            self.y = -self.height if random.randint(0,1) == 0 else game.SCREEN_HEIGHT
    def move_towards_pos(self,game, x, y): # requires self.speed
        # move towards player
        dx = x -(self.x+self.width/2) 
        dy = y -(self.y+self.height/2)
        distance_to_pos = math.sqrt(math.pow(dx,2) + math.pow(dy,2))
        self.x += (dx/distance_to_pos)*game.frame_time*self.speed
        self.y += (dy/distance_to_pos)*game.frame_time*self.speed
    def move_nowhere(self, game):
        pass
    def shoot_towards_player(self, game):
        dx = game.player.x + game.player.width/2 - (self.x + self.width/2) # normalize vector from enemy to player
        dy = game.player.y + game.player.height/2 - (self.y + self.height/2)
        x_dir = dx/math.sqrt(dx*dx + dy*dy)
        y_dir = dy/math.sqrt(dx*dx + dy*dy)
        game.objects_to_add.add(Enemy_Shot(self.x+self.width/2, self.y+self.height/2, self.shot_side_length, self.shot_speed, x_dir, y_dir))
    def handle_shooting_player(self, game): # wont work without initalized self shoot timer
        self.shoot_timer += game.frame_time
        if self.shoot_timer >= self.shoot_wait_time: # shoot
            self.shoot_timer = 0
            self.shoot_towards_player(game)
    def hit_by_shot(self, game):
        self.lives -= 1
    def end_logic(self, game):
        if self.lives < 1:
            game.objects_to_remove.add(self)
            self.explode_into_particles(game, 1)
            self.drop_item(game)
            game.score += 200
    def drop_item(self, game):
        ran_num = random.uniform(0, 1)
        if ran_num >= 0.4:
        #if True:
            item = Item1
            if ran_num >= 0.80:
                # drop upgrade
                item = random.choice((Item2,Item3,Item4,Item5,Item6,Item7,Item8))
            game.objects_to_add.add(item(game, self.x+self.width/2, self.y+self.height/2))
    def spawn_shot(self, game, x_dir, y_dir):
        x = self.x+self.width/2 - self.shot_side_length/2
        y = self.y+self.height/2 - self.shot_side_length/2
        game.objects_to_add.add(Enemy_Shot(x,y,self.shot_side_length, self.shot_speed, x_dir, y_dir))
            
class Enemy1(Enemy): # Circels around player
    def __init__(self, game):
        super().__init__(game, game.ENEMY1_SIDE_LENGTH, game.ENEMY1_COLOR, game.ENEMY1_SHOT_SIDE_LENGTH, game.ENEMY1_SHOT_SPEED)
        
        self.speed = game.ENEMY1_SPEED
        self.rotation_speed = game.ENEMY1_ROTATION_SPEED
        self.radius_from_player = game.SCREEN_WIDTH*random.uniform(0.3,0.45)
        self.rotation_dir = 1 if random.randint(0,1) == 0 else -1
        
        self.shoot_timer = 0
        self.shoot_wait_time = game.ENEMY1_SHOOT_WAIT_TIME
    
    def move(self, game):
        dx = game.player.x+game.player.width/2 -(self.x+self.width/2)
        dy = game.player.y+game.player.height/2 -(self.y+self.height/2)
        distance_to_player = math.sqrt(math.pow(dx,2) + math.pow(dy,2))
        
        if not abs(distance_to_player - self.radius_from_player) < self.width: # to not wobble
            x_move = (dx/distance_to_player)*game.frame_time*self.speed
            y_move = (dy/distance_to_player)*game.frame_time*self.speed
            if self.radius_from_player < distance_to_player: # if far away: get closer
                self.x += x_move
                self.y += y_move
            else:
                self.x -= x_move # move away
                self.y -= y_move
        # rotate around
        self.x += (-dy/distance_to_player)*game.frame_time*self.rotation_speed*self.rotation_dir
        self.y += (dx/distance_to_player)*game.frame_time*self.rotation_speed*self.rotation_dir
    def logic(self, game):
        self.handle_shooting_player(game)
class Enemy2(Enemy): # Goes close and gets dangerous
    def __init__(self, game):
        super().__init__(game, game.ENEMY2_SIDE_LENGTH,game.ENEMY2_COLOR, game.ENEMY2_SHOT_SIDE_LENGTH, game.ENEMY2_SHOT_SPEED)

        self.radius_to_player_to_attack = game.SCREEN_WIDTH*random.uniform(0.05,0.1)
        self.shot_reload_timer = 0
        self.speed = game.ENEMY2_SPEED
        self.move = self.move_towards_player
        self.logic = self.moving_logic
    
    def move_towards_player(self, game):
        self.move_towards_pos(game, game.player.x+game.player.width/2, game.player.y+game.player.height/2)
    def moving_logic(self, game):
        dx = game.player.x+game.player.width/2 -(self.x+self.width/2)
        dy = game.player.y+game.player.height/2 -(self.y+self.height/2)
        distance_to_player = math.sqrt(math.pow(dx,2) + math.pow(dy,2))
        if distance_to_player <= self.radius_to_player_to_attack:
            # turn on attack mode
            self.move = self.move_nowhere
            self.logic = self.attack_logic
            self.shoot_multiple_shots(game,game.player.x + game.player.width/2, game.player.y + game.player.height/2, game.ENEMY2_SHOTS_ON_EITHER_SIDE)
    def attack_logic(self, game):
        self.shot_reload_timer += game.frame_time
        if self.shot_reload_timer > game.ENEMY2_SHOT_RELOAD_TIME:
            self.move = self.move_towards_player
            self.shot_reload_timer = 0
            self.logic = self.moving_logic
            
class Enemy3(Enemy): # places bombs
    def __init__(self, game):
        super().__init__(game, game.ENEMY3_SIDE_LENGTH,game.ENEMY3_COLOR, 0, 0)
        self.target_x = 0
        self.target_y = 0
        self.speed = game.ENEMY3_SPEED
        self.set_target_position(game)
        self.move = self.move_towards_target
        self.logic = self.moving_logic
        self.placing_bomb_timer = 0
        self.radius_to_target_to_place_bomb = game.SCREEN_WIDTH*0.005
    
    def move_towards_target(self, game):
        self.move_towards_pos(game, self.target_x, self.target_y)
    def set_target_position(self, game):
        while True:
            self.target_x = random.randint(0,game.SCREEN_WIDTH)
            self.target_y = random.randint(0,game.SCREEN_HEIGHT)
            if math.sqrt(math.pow(self.x-self.target_x,2) + math.pow(self.y-self.target_y,2)) > game.ENEMY3_MINIMUM_WALK_DISTANCE:
                break
    def moving_logic(self, game):
        dx = self.target_x -(self.x+self.width/2) 
        dy = self.target_y -(self.y+self.height/2)
        distance_to_target = math.sqrt(math.pow(dx,2) + math.pow(dy,2))
        if distance_to_target <= self.radius_to_target_to_place_bomb:
            # turn on placíng bomb mode
            self.move = self.move_nowhere
            self.logic = self.placing_bomb_logic
    def placing_bomb_logic(self, game):
        self.placing_bomb_timer += game.frame_time
        if self.placing_bomb_timer > game.ENEMY3_BOMB_PLACING_TIME:
            # place bomb
            self.placing_bomb_timer = 0
            self.move = self.move_towards_target
            self.logic = self.moving_logic
            self.set_target_position(game) # get new target
            game.objects_to_add.add(Bomb(game, self.x, self.y))
class Bomb(Game_Object):
    def __init__(self, game, x, y):
        super().__init__(x,y, game.BOMB_SIDE_LENGTH, game.BOMB_SIDE_LENGTH, game.BOMB_COLOR)
        self.logic = self.waiting_logic
        self.player_distance_which_to_set_off_bomb = self.width*2
        self.fuse_timer = 0
        self.explode = False
    def waiting_logic(self, game):
        self.get_shot_by_player_shot(game)
        # see if player is close enough for explosion to take place
        dx = game.player.x+game.player.width/2 - (self.x+self.width/2)
        dy = game.player.y+game.player.height/2 - (self.y+self.height/2)
        if math.sqrt(dx*dx + dy*dy) <= self.player_distance_which_to_set_off_bomb:
            self.logic = self.waiting_to_explode_logic # set off bomb
    def get_shot_by_player_shot(self, game):
        # get hit by any player bullets => set off
        for player_shot in game.game_objects["player_shots"]:
            if self.x+self.width > player_shot.x and self.x < player_shot.x+player_shot.width and self.y+self.height > player_shot.y and self.y < player_shot.y+player_shot.height:
                # you are shot
                player_shot.went_into_bomb(game)
                self.explode = True
                #break # could make things faster, but makes things more complex
    def waiting_to_explode_logic(self, game):
        self.get_shot_by_player_shot(game)
        self.fuse_timer += game.frame_time
        time_ratio = self.fuse_timer/game.BOMB_FUSE_TIME
        self.color = (255*(1 - time_ratio),255*time_ratio,255*time_ratio)
        if self.fuse_timer > game.BOMB_FUSE_TIME:
            # explode
            self.explode = True
    def end_logic(self, game):
        if self.explode:
            game.objects_to_remove.add(self) # remove this object, create other objects if needed
            game.objects_to_add.add(Explosion(game, self.x+self.width/2, self.y+self.height/2))
            self.exploded = True
    def got_hit_by_explosion(self,game): # used by Explosion class
        self.explode = True
class Explosion(): # kills in star-like pattern on first frame, then fades
    def __init__(self, game, x, y):
        self.x = x
        self.y = y
        self.time_alive = 0
        self.pattern =[[0,0,0,0,1,0,0,0,0],
                       [0,0,0,1,1,1,0,0,0],
                       [0,0,1,1,1,1,1,0,0],
                       [0,1,1,1,1,1,1,1,0],
                       [1,1,1,1,1,1,1,1,1],
                       [0,1,1,1,1,1,1,1,0],
                       [0,0,1,1,1,1,1,0,0],
                       [0,0,0,1,1,1,0,0,0],
                       [0,0,0,0,1,0,0,0,0]]
        self.color = (255,155,0)
        self.tile_side_length = 15
        self.logic = self.explode_logic
    def move(self, game): pass
    def end_logic(self, game): pass
    def fade_logic(self, game):
        self.time_alive += game.frame_time
        if self.time_alive > game.EXPLOSION_FADE_TIME:
            game.objects_to_remove.add(self)
    def kill_things_in(self, game, x, y, x_pos, y_pos):
        for enemy in game.game_objects["enemies"]:
            if General.collision_between_rects(x_pos,y_pos,self.tile_side_length,self.tile_side_length,enemy.x,enemy.y,enemy.width,enemy.height):
                enemy.hit_by_shot(game)
        for bomb in game.game_objects["bombs"]:
            if General.collision_between_rects(x_pos,y_pos,self.tile_side_length,self.tile_side_length,bomb.x,bomb.y,bomb.width,bomb.height):
                bomb.got_hit_by_explosion(game)
        if General.collision_between_rects(x_pos,y_pos,self.tile_side_length,self.tile_side_length,game.player.x,game.player.y,game.player.width,game.player.height):
            game.player.hit_by_shot()
    def explode_logic(self, game):
        # kill
        self.do_for_tiles(game, self.kill_things_in)
        self.logic = self.fade_logic

    def do_for_tiles(self, game, func):
        x_offset = len(self.pattern[0])//2
        y_offset = len(self.pattern)//2
        for y in range(len(self.pattern)):
            for x in range(len(self.pattern[0])):
                if self.pattern[y][x] == 1:
                    x_pos = (x-x_offset)*self.tile_side_length - self.tile_side_length/2 + self.x
                    y_pos = (y-y_offset)*self.tile_side_length - self.tile_side_length/2 + self.y
                    func( game, x, y, x_pos, y_pos)
    def draw_tile(self, game, x, y, x_pos, y_pos):
        s = pygame.Surface((self.tile_side_length,self.tile_side_length))
        s.set_alpha(255* (1 - self.time_alive/game.EXPLOSION_FADE_TIME))
        s.fill(self.color)
        game.screen.blit(s, (int(x_pos),int(y_pos)))        
    def draw(self, game):
        self.do_for_tiles(game, self.draw_tile)
class Enemy4(Enemy): # walks a line
    def __init__(self, game):
        super().__init__(game, game.ENEMY4_SIDE_LENGTH, game.ENEMY4_COLOR, game.ENEMY4_SHOT_SIDE_LENGTH, game.ENEMY4_SHOT_SPEED)
        self.speed = game.ENEMY4_SPEED * random.uniform(0.9,1.1)

        self.shoot_timer = 0
        self.dir = 1
        self.up_or_down = 1 if random.randint(0,1) == 0 else -1
        self.distance_to_have_to_player = random.uniform(0.25,0.4)*game.SCREEN_HEIGHT
        self.walk_line_length = 0.3*game.SCREEN_WIDTH
        self.shoot_wait_time = game.ENEMY4_SHOOT_WAIT_TIME
        if random.randint(0,1) == 0:
            self.move = self.move1
            self.logic = self.logic1
        else:
            self.move = self.move2
            self.logic = self.logic2

    def move1(self, game):
        self.x += self.speed*game.frame_time*self.dir
        dy = game.player.y + game.player.height/2 - (self.y + self.height/2)
        if not abs(self.distance_to_have_to_player - dy) < self.height: # to not wobble
            if dy > self.up_or_down*self.distance_to_have_to_player:
                self.y += self.speed*game.frame_time
            else:
                self.y -= self.speed*game.frame_time
    def move2(self, game):
        self.y += self.speed*game.frame_time*self.dir
        dx = game.player.x + game.player.width/2 - (self.x + self.width/2)
        if not abs(self.distance_to_have_to_player - dx) < self.width: # to not wobble
            if dx > self.up_or_down*self.distance_to_have_to_player:
                self.x += self.speed*game.frame_time
            else:
                self.x -= self.speed*game.frame_time
    def logic1(self, game):
        if self.dir*(self.x - game.player.x) > self.walk_line_length:
            self.dir *= -1
        self.rest_logic(game)
    def logic2(self, game):
        if self.dir*(self.y - game.player.y) > self.walk_line_length:
            self.dir *= -1
        self.rest_logic(game)
    def rest_logic(self, game):
        self.handle_shooting_player(game)
class Enemy5(Enemy): # Bounces around screen
    def __init__(self, game):
        super().__init__(game, game.ENEMY5_SIDE_LENGTH, game.ENEMY5_COLOR, game.ENEMY5_SHOT_SIDE_LENGTH, game.ENEMY5_SHOT_SPEED)
        self.speed = game.ENEMY5_SPEED
        self.shoot_timer = 0
        self.shoot_wait_time = game.ENEMY5_SHOOT_WAIT_TIME

        self.rotation_radians = random.uniform(0, math.pi*2)
        self.x_dir = math.cos(self.rotation_radians)
        self.y_dir = math.sin(self.rotation_radians)
    def move(self, game):
        self.x += self.x_dir*game.frame_time*self.speed
        self.y += self.y_dir*game.frame_time*self.speed
    def logic(self, game):
        self.handle_shooting_player(game)
        if self.x + self.width > game.SCREEN_WIDTH:
            self.x_dir = -abs(self.x_dir)
        elif self.x < 0:
            self.x_dir = abs(self.x_dir)
        if self.y + self.height > game.SCREEN_HEIGHT:
            self.y_dir = -abs(self.y_dir)
        elif self.y < 0:
            self.y_dir = abs(self.y_dir)
class Enemy6(Enemy): # goes from border to border
    def __init__(self, game):
        super().__init__(game, game.ENEMY6_SIDE_LENGTH, game.ENEMY6_COLOR, game.ENEMY6_SHOT_SIDE_LENGTH, game.ENEMY6_SHOT_SPEED)
        self.speed = game.ENEMY6_SPEED
        self.shoot_timer = 0
        self.shoot_wait_time = game.ENEMY6_SHOOT_WAIT_TIME
        self.wait_timer = 0
        if self.x+self.width == 0:
            self.x_dir = 1
            self.y_dir = 0
        elif self.x == game.SCREEN_WIDTH:
            self.x_dir = -1
            self.y_dir = 0
        elif self.y+self.height == 0:
            self.x_dir = 0
            self.y_dir = 1
        elif self.y == game.SCREEN_HEIGHT:
            self.x_dir = 0
            self.y_dir = -1
        self.logic = self.moving_logic
        self.move = self.move_across_screen

    def move_across_screen(self, game):
        self.x += self.x_dir*game.frame_time*self.speed
        self.y += self.y_dir*game.frame_time*self.speed
    def moving_logic(self, game):
        self.handle_shooting_player(game)
        changed_dir = False
        if self.x > game.SCREEN_WIDTH:
            changed_dir = True
            self.x_dir *= -1
            self.y += self.height*random.uniform(-1,1)
        elif self.x + self.width < 0:
            changed_dir = True
            self.x_dir *= -1
            self.y += self.height*random.uniform(-1,1)
        elif self.y > game.SCREEN_HEIGHT:
            changed_dir = True
            self.y_dir *= -1
            self.x += self.width*random.uniform(-1,1)
        elif self.y + self.height < 0:
            changed_dir = True
            self.y_dir *= -1
            self.x += self.width*random.uniform(-1,1)
        if changed_dir:
            self.move = self.move_nowhere
            self.logic = self.waiting_logic
    def waiting_logic(self, game):
        self.wait_timer += game.frame_time
        if self.wait_timer >= game.ENEMY6_WAIT_TIME:
            self.move = self.move_across_screen
            self.logic = self.moving_logic
            self.wait_timer = 0

class Enemy7(Enemy): # moves in increments towards player
    def __init__(self, game):
        super().__init__(game, game.ENEMY7_SIDE_LENGTH, game.ENEMY7_COLOR, game.ENEMY7_SHOT_SIDE_LENGTH, game.ENEMY7_SHOT_SPEED)
        self.speed = game.ENEMY7_SPEED
        self.x_dir = 0
        self.y_dir = 0
        self.set_walk_dir(game)
        self.timer = 0
        self.move = self.walking_move
        self.logic = self.walking_logic
    def set_walk_dir(self, game):

        dx = game.player.x+game.player.width/2 - (self.x+self.width/2)
        dy = game.player.y+game.player.height/2 - (self.y+self.height/2)
        distance_to_player = math.sqrt(dx*dx+dy*dy)
        self.x_dir = dx/distance_to_player
        self.y_dir = dy/distance_to_player
        
        # rotate
        rotation_radians = random.uniform(-math.pi/6, math.pi/6) # 30 degrees = pi/6
        sin_value = math.sin(rotation_radians)
        cos_value = math.cos(rotation_radians)
        before_x_dir = self.x_dir
        self.x_dir = self.x_dir*cos_value - self.y_dir*sin_value
        self.y_dir = before_x_dir*sin_value + self.y_dir*cos_value
        
    def walking_move(self, game):
        self.x += self.x_dir*game.frame_time*self.speed
        self.y += self.y_dir*game.frame_time*self.speed
    def walking_logic(self, game):
        self.timer += game.frame_time
        if self.timer > game.ENEMY7_WALK_TIME:
            self.move = self.move_nowhere
            self.logic = self.waiting_logic
            self.timer = 0
    def waiting_logic(self, game):
        self.timer += game.frame_time
        if self.timer > game.ENEMY7_WAIT_TIME:
            self.logic = self.walking_logic
            self.move = self.walking_move
            self.timer = 0
            self.set_walk_dir(game)
            self.shoot_towards_player(game)

class Enemy8(Enemy):
    def __init__(self, game, side_length, color, shot_side_length, shot_speed, speed, shoot_wait_time, x, y):
        super().__init__(game, side_length, color, shot_side_length, shot_speed)
        self.shoot_timer = 0
        self.shoot_wait_time = shoot_wait_time
        self.speed = speed
        self.x = x
        self.y = y
    def move(self, game):
        self.move_towards_pos(game, game.player.x+game.player.width/2,game.player.y+game.player.height/2)
    def logic(self, game):
        self.handle_shooting_player(game)
def main():
    pygame.init()
    game = Game()
    asyncio.run(game.start_main_loop())

    pygame.quit()

if __name__ == "__main__":
    main()

