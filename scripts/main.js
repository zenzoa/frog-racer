let SCREEN_WIDTH = 400
let SCREEN_HEIGHT = 240
let SCREEN_SCALE = 2
let HORIZON_Y = 60
let SLOWDOWN_POINT = 160

let AVATAR_SCREEN_X = 200
let AVATAR_SCREEN_Y = 160

let offsetX = 0
let offsetY = 0

let farthestPoint = 0
let lastPointStuffAdded = 0

let avatar = null
let entities = []

let ENTITY_TYPES = {
    NONE: -1,
    OBSTACLE: 0,
    SLOW_DOWN: 1,
    SPEED_UP: 2,
    JUMP: 3,
    SAFE_POINT: 4,
    KILLER: 5
}

class Entity {

    constructor(x, y) {
        this.x = x || 0
        this.y = y || 0
        this.w = floor(random(8, 32))
        this.h = this.w
        this.vx = 0
        this.vy = 0
        this.behindHorizon = true
        this.type = ENTITY_TYPES.NONE
    }

    draw() {
        let x = this.x - offsetX
        let y = this.y - offsetY
        
        if (y + this.h < SLOWDOWN_POINT) {
            let percentAcrossScreen = (y + this.h) / SLOWDOWN_POINT
            let easeFn = 1 - cos((percentAcrossScreen * 180) / 2)
            let diff = ((SLOWDOWN_POINT - HORIZON_Y) * easeFn)
            if (this.behindHorizon) {
                diff *= 0.5
            }
            y = Math.max(y, HORIZON_Y + diff - this.h)
        }

        if (this.type === ENTITY_TYPES.OBSTACLE) fill('#fc9d92')
        else if (this.type === ENTITY_TYPES.SLOW_DOWN) fill('#fcd292')
        else if (this.type === ENTITY_TYPES.SPEED_UP) fill('#d7fc92')
        else if (this.type === ENTITY_TYPES.JUMP) fill('#92fcb7')
        else if (this.type === ENTITY_TYPES.SAFE_POINT) fill('#4d33f4')
        else if (this.type === ENTITY_TYPES.KILLER) fill('#f4338d')
        circle(floor(x) + this.w / 2, floor(y) + this.h / 2, this.w)

        if (this.y + this.h + 74 - offsetY >= HORIZON_Y) {
            this.behindHorizon = false
        }
    }

    update() {
    }

}

class Avatar extends Entity {

    constructor() {

        super()

        this.x = 0
        this.y = 0
        this.w = 16
        this.h = 16
        this.vx = 0
        this.vy = 0

        this.safePointX = this.x
        this.safePointY = this.y

        this.baseSpeed = 0.5
        this.speedBoost = 0
        this.maxSpeedBoost = 2.5

        this.angle = 0
        this.lastTurn = 'none'

        this.isJumping = false
        this.jumpTimer = 0
        this.maxJumpTimer = 60

        this.behindHorizon = false

    }

    draw() {
        let x = AVATAR_SCREEN_X - this.w / 2
        let y = AVATAR_SCREEN_Y - this.h / 2
        fill('#fff')
        if (this.isJumping) {
            rect(floor(x) - 6, floor(y) - 6, this.w + 12, this.h + 12)
        } else {
            rect(floor(x), floor(y), this.w, this.h)
        }
    }

    update() {

        let speed = this.baseSpeed + this.speedBoost

        if (this.angle === 0) {
            this.speedBoost += 0.01
        } else if (abs(this.angle) <= 30) {
            if (this.speedBoost < this.maxSpeedBoost * 0.67) this.speedBoost += 0.01
            else this.speedBoost -= 0.01
        } else if (abs(this.angle) <= 60) {
            if (this.speedBoost < this.maxSpeedBoost * 0.33) this.speedBoost += 0.01
            else this.speedBoost -= 0.01
        } else if (abs(this.angle) <= 90) {
            this.speedBoost -= 0.01
        }
        if (this.speedBoost < 0) this.speedBoost = 0
        if (this.speedBoost > this.maxSpeedBoost) this.speedBoost = this.maxSpeedBoost

        if (this.angle === 180) {
            if (abs(this.vx) < 0.01) this.vx = 0
            else this.vx *= 0.7
        } else if (abs(this.angle) === 90) {
            this.vy = 0
            this.vx *= 0.9
            if (abs(this.vx) < 0.01) this.vx = 0
        } else if (abs(this.angle) <= 90) {
            this.vx = cos(this.angle + 90) * speed
        }
        
        if (this.angle === 180) {
            if (abs(this.vy) < 0.01) this.vy = 0
            else this.vy *= 0.7
        } else if (abs(this.angle) <= 90) {
            this.vy = sin(this.angle + 90) * speed
        } else if (this.vy < 0) {
            this.vy = 0
        } else if (this.vy > this.baseSpeed) {
            this.vy *= 0.9
        }

        this.x = this.x + this.vx
        this.y = this.y - this.vy
        farthestPoint = min(this.y, farthestPoint)

        if (this.isJumping) {
            this.jumpTimer++
            if (this.jumpTimer > this.maxJumpTimer) {
                this.isJumping = false
            }
        } else {
            this.checkCollisions()
        }

    }

    turnLeft() {
        if (this.angle === 180) {
            this.angle = 90
        } else {
            this.angle += 30
            if (this.angle > 90) {
                this.angle = 90
                this.vx = -1
            }
        }
    }

    turnRight() {
        if (this.angle === 180) {
            this.angle = -90
        } else {
            this.angle -= 30
            if (this.angle < -90) {
                this.angle = -90
                this.vx = 1
            }
        }
    }

    turnStraight() {
        this.angle = 0
    }

    checkCollisions() {

        for (let i = 0; i < entities.length; i++) {
            let entity = entities[i]
            if (entity instanceof Avatar) continue
            let theyCollide = abs(sq(entity.x - this.x) + sq(entity.y - this.y)) < sq(entity.w * 0.5 + this.w * 0.5)
            if (theyCollide) {
                if (entity.type === ENTITY_TYPES.OBSTACLE) {
                    this.collideWithObstacle(entity)
                } else if (entity.type === ENTITY_TYPES.SPEED_UP) {
                    this.collideWithSpeedUp(entity)
                } else if (entity.type === ENTITY_TYPES.SLOW_DOWN) {
                    this.collideWithSlowDown(entity)
                } else if (entity.type === ENTITY_TYPES.JUMP) {
                    this.collideWithJump(entity)
                } else if (entity.type === ENTITY_TYPES.SAFE_POINT) {
                    this.collideWithSafePoint(entity)
                } else if (entity.type === ENTITY_TYPES.KILLER) {
                    this.collideWithKiller(entity)
                }
            }
        }

    }

    collideWithObstacle(entity) {
        let angleBetween = atan2((entity.y - this.y), (entity.x - this.x))
        let dist = sqrt(sq(entity.x - this.x) + sq(entity.y - this.y))
        let midpointX = (entity.x + this.x) / 2
        let midpointY = (entity.y + this.y) / 2
        this.x = midpointX + (max(this.w, entity.w) * 0.45) * (this.x - entity.x) / dist
        this.y = midpointY + (max(this.h, entity.h) * 0.45) * (this.y - entity.y) / dist
        this.vx = -cos(angleBetween) * (2 + this.speedBoost)
        this.vy = sin(angleBetween) * (2 + this.speedBoost)
        this.speedBoost = 0
        this.angle = 180
    }

    collideWithSpeedUp(entity) {
        this.speedBoost *= 1.1
    }

    collideWithSlowDown(entity) {
        this.speedBoost *= 0.9
    }

    collideWithJump(entity) {
        this.isJumping = true
        this.jumpTimer = 0
    }

    collideWithSafePoint(entity) {
        // DO ANIMATION ON SAFE POINT
        this.safePointX = entity.x + entity.w / 2
        this.safePointY = entity.y + entity.h / 2
        // remove entities before safe point
        entities.forEach(e => {
            if (e.y > entity.y + SCREEN_HEIGHT) {
                e.killMe = true
            }
        })
        this.collideWithSlowDown(entity)
    }

    collideWithKiller(entity) {
        // DO SOME DEATH ANIMATION + FADE TO BLACK; going to need to remember entities seen since last save point
        this.x = this.safePointX - this.w / 2
        this.y = this.safePointY - this.h / 2
        this.vx = 0
        this.vy = 0
        this.speedBoost = 0
        this.angle = 180
        offsetX = floor(avatar.x + avatar.w / 2 - AVATAR_SCREEN_X)
        offsetY = floor(avatar.y + avatar.h / 2 - AVATAR_SCREEN_Y)
        entities.forEach(e => {
            if (!(entity instanceof Avatar)) {
                e.behindHorizon = !(e.y + e.h + 74 - offsetY >= HORIZON_Y)
            }
        })
    }
}

function addStuffToWorld(y) {
    lastPointStuffAdded = y
    for (let i = 0; i < 100; i++) {
        let newEntity = new Entity()
        newEntity.x = random(-SCREEN_WIDTH - newEntity.w / 2, SCREEN_WIDTH + newEntity.w / 2)
        newEntity.y = y - (SCREEN_HEIGHT + 200 + random(0, 1000))
        newEntity.type = floor(random(0, 6))
        entities.push(newEntity)
    }
}

function keyLeft() {
    return keyIsDown(LEFT_ARROW) || keyIsDown(65)
}

function keyRight() {
    return keyIsDown(RIGHT_ARROW) || keyIsDown(68)
}

function keyUp() {
    return keyIsDown(UP_ARROW) || keyIsDown(87)
}

function preload() {

}

function setup() {

    createCanvas(SCREEN_WIDTH * SCREEN_SCALE, SCREEN_HEIGHT * SCREEN_SCALE)
    frameRate(60)
    angleMode(DEGREES)

    avatar = new Avatar()
    entities.push(avatar)

    addStuffToWorld(SCREEN_HEIGHT + 200)

}

function draw() {

    background('#444')
    scale(SCREEN_SCALE)

    offsetX = floor(avatar.x + avatar.w / 2 - AVATAR_SCREEN_X)
    offsetY = floor(avatar.y + avatar.h / 2 - AVATAR_SCREEN_Y)

    let needToDrawGround = true
    let drawGround = () => {
        fill('#ccc')
        rect(0, HORIZON_Y, SCREEN_WIDTH, SCREEN_HEIGHT)
        needToDrawGround = false
    }

    entities.sort((a, b) => {
        return b.y - a.y
    })

    for (let i = entities.length - 1; i >= 0; i--) {
        let entity = entities[i]
        if (entity) {
            entity.update()
            if (!entity.behindHorizon && needToDrawGround) {
                drawGround()
            }
            if (entity.y + entity.h + 200 - offsetY >= HORIZON_Y && entity.y - offsetY <= SCREEN_HEIGHT) {
                entity.draw()
            }
        }
    }

    for (let i = entities.length - 1; i >= 0; i--) {
        if (entities[i].killMe) {
            entities.splice(i, 1)
        }
    }

    if (avatar.y < farthestPoint) {
        farthestPoint = avatar.y
    }

    if (avatar.y < lastPointStuffAdded - 1000) {
        addStuffToWorld(avatar.y)
    }

    if (avatar.y < -10000) {
        farthestPoint += 10000
        lastPointStuffAdded += 10000
        avatar.safePointY += 10000
        entities.forEach(e => {
            e.y += 10000
        })
    }

}

function keyPressed() {
    if (keyLeft()) {
        avatar.turnLeft()
    } else if (keyRight()) {
        avatar.turnRight()
    } else if (keyUp()) {
        avatar.turnStraight()
    }
}
