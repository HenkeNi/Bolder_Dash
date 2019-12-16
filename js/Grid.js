import Tile from './Tile.js'
import { mapsArray } from './Maps.js'
import Enemy from './Enemy.js'
import Player from './Player.js'

export default {

    name: 'grid',

    components: {
        Tile,
    },

    props: ['level'],

    template: `
    <div class="grid-layout">
        <tile
        v-for="(tile, i) in tiles.flat()"
        v-bind:position="tile"
        v-bind:key="'tile' + i + tile.x + tile.y + tile.background"
        v-on:change-background="forceRender"
        ></tile>
    </div>
    `,

    data() {
        return {
            tiles: [],
            customGrid: mapsArray[this.level],
            gridHeight: 20,
            gridWidth: 30,
            playerHasMoved: false,
            diamondsCollected: null,
            maxNumberOfDiamonds: null,
            enableExit: false,
            playerIsStuck: false,
            playerPos: {
                row: null,
                col: null,
            },
            enemyPos: [],
        }
    },

    created() {

        for (let row = 0; row < this.gridHeight; row++) {
            this.tiles[row] = []
            for (let col = 0; col < this.gridWidth; col++) {
                let position = {
                    x: col,
                    y: row,
                    background: Tile.dirt
                }
                // console.log(Enemy.moveRight(position))
                this.tiles[row].push(position)
            }
        }

        this.populateMap()
        this.getTotalNumberOfDiamonds()
        var musicTheme = new Audio('Sound/MainTheme.mp3');
        musicTheme.play();
    },

    updated() {

        this.playerHasMoved = false;
        this.updateRollingStones();

        let enemyPos = this.findEnemy()
        console.log('Enemy Pos = ', enemyPos)
        let newEnemyPos = Enemy.move(enemyPos, this.playerPos, this.tiles, 2)
        this.updateEnemyPosition(enemyPos, newEnemyPos, this.tiles)
        //this.enemyUpdate();

        this.canKill = false;
        this.forceRender()

        if (this.checkIfPlayerIsStuck() && this.playerIsStuck === false) {
            this.playerIsStuck = true

            setTimeout(() => {
                this.$emit('game-over')

                setTimeout(() => {
                    alert("The player got stuck! Game Over")
                    this.$emit('resetGame')
                }, 100);

            }, 1000);
        }
    },

    methods: {
        forceRender: function () {
            // rensar timern efter varje gång en sten har rört sig
            clearTimeout(this.renderTimeout);
            this.renderTimeout = setTimeout(() => {
                // This will make the component re-render
                Vue.set(this.tiles, 0, this.tiles[0]);
            }, 100)
        },

        updatePlayerMovement: function (direction) {

            if (this.playerHasMoved) { return; }
            this.playerHasMoved = true;
            var audio = new Audio('Sound/MovementSound.mp3');
            audio.play()
            switch (direction) {
                case 'right': {
                    let newPlayerPos = Player.right(this.tiles, Tile, this.playerPos)
                    this.playerPos = newPlayerPos
                    this.forceRender();
                }
                    break
                case 'up': {
                    let newPlayerPos = Player.up(this.tiles, Tile, this.playerPos)
                    this.playerPos = newPlayerPos
                    this.forceRender();
                }
                    break
                case 'left': {
                    let newPlayerPos = Player.left(this.tiles, Tile, this.playerPos)
                    this.playerPos = newPlayerPos
                    this.forceRender();
                }

                    break
                case 'down': {
                    let newPlayerPos = Player.down(this.tiles, Tile, this.playerPos)
                    this.playerPos = newPlayerPos
                    this.forceRender();
                }
                    break

            }
        },

        updateRollingStones: function () {
            var boulderFall = new Audio('Sound/BoulderFall.mp3');
            for (let row = this.gridHeight - 1; row >= 0; row--) {
                for (let col = 0; col < this.gridWidth; col++) {
                    const tile = this.tiles[row][col];

                    if (tile.background === Tile.boulder || tile.background === Tile.diamond) {
                        let tempTile = tile.background;
                        const tileUnder = this.tiles[row + 1][col]
                        const tileAbove = this.tiles[row - 1][col]
                        if (tileUnder.background === Tile.boulder || tileUnder.background === Tile.diamond) {
                            const tileLeft = this.tiles[row][col - 1];
                            const tileRight = this.tiles[row][col + 1];
                            tileAbove.canKill = false;
                            tileUnder.canKill = false;
                            tile.canKill = false;
                            if (tileRight.background == Tile.empty) {
                                const tileRightUnder = this.tiles[row + 1][col + 1];
                                if (tileRightUnder.background == Tile.empty) {
                                    tile.background = Tile.empty;
                                    tileRight.background = tempTile;
                                    //tileRight.playerHasMoved = true;
                                    this.forceRender();
                                }
                            } else if (tileLeft.background == Tile.empty) {
                                const tileLeftUnder = this.tiles[row + 1][col - 1];
                                if (tileLeftUnder.background == Tile.empty) {
                                    tile.background = Tile.empty;
                                    tileLeft.background = tempTile;
                                    //tileLeft.playerHasMoved = true;
                                    this.forceRender();
                                }
                            }
                        } else if (tileUnder.background === Tile.empty) {
                            boulderFall.play();
                            tile.canKill = false
                            tileUnder.canKill = true
                            tileUnder.background = tempTile;
                            tile.background = Tile.empty;
                            //tile.playerHasMoved = true
                            this.forceRender();
                        } else if (tileUnder.background === Tile.player && tile.canKill === true) {
                            boulderFall.play();
                            tileUnder.background = tempTile;
                            tile.background = Tile.empty;
                            this.explodes(tileUnder)
                            this.forceRender();

                        } else {
                            tile.canKill = false
                        }
                    }
                }
            }
        },

        explodes() {
            const tile = this.tiles[this.playerPos.row][this.playerPos.col];

            let tileRight = this.tiles[tile.y][tile.x + 1]
            let tileRightDown = this.tiles[tile.y + 1][tile.x + 1]
            let tileDown = this.tiles[tile.y + 1][tile.x]
            let tileLeftDown = this.tiles[tile.y + 1][tile.x - 1]
            let tileLeft = this.tiles[tile.y][tile.x - 1]
            let tileLeftAbove = this.tiles[tile.y - 1][tile.x - 1]
            let tileAbove = this.tiles[tile.y - 1][tile.x]
            let tileRightAbove = this.tiles[tile.y - 1][tile.x + 1]

            tile.background = Tile.explode
            tileRight.background = Tile.explode
            tileRightDown.background = Tile.explode
            tileDown.background = Tile.explode
            tileLeftDown.background = Tile.explode
            tileLeft.background = Tile.explode
            tileLeftAbove.background = Tile.explode
            tileAbove.background = Tile.explode
            tileRightAbove.background = Tile.explode

            setTimeout(() => {
                this.$emit('game-over')

                setTimeout(() => {
                    alert("Game Over")
                    this.$emit('resetGame')
                }, 100);

            }, 2000);
            var deathSound = new Audio('Sound/DeathSound.mp3');
            deathSound.play();
            var explotionSound = new Audio('Sound/Explotion.mp3');
            explotionSound.play();
            this.$emit('game-over')
        },

        populateMap() {
            for (let row = 0; row < this.gridHeight; row++) {
                for (let col = 0; col < this.gridWidth; col++) {
                    switch (this.customGrid[row][col]) {
                        case 'B':
                            this.tiles[row][col].background = Tile.brick
                            break
                        case 'O':
                            this.tiles[row][col].background = Tile.empty
                            break
                        case 'P':
                            this.tiles[row][col].background = Tile.player;
                            this.playerPos = { row, col }
                            break
                        case 'S':
                            this.tiles[row][col].background = Tile.boulder
                            break
                        case 'D':
                            this.tiles[row][col].background = Tile.diamond
                            break
                        case 'E':
                            this.tiles[row][col].background = Tile.enemy
                            this.enemyPos.push({ row, col, heading: 0 })
                            break
                        case ' ':
                            break
                        default:
                            console.error('Unknown tile:', this.customGrid[row][col])
                            break
                            this.tiles[row][col].background = Tile.exit
                        case 'G':
                    }
                    // this.tiles[col][row].type = this.tileType
                    // index++
                    // console.log(index)
                }
            }

        },
        canMove(row, col) {
            return this.tiles[row][col].background === Tile.empty || this.tiles[row][col].background === Tile.player;
        },

        changeEnemyHeading(enemy) {
            switch (enemy.heading) {
                case 0:
                    if (this.canMove(enemy.row, enemy.col - 1)) {
                        enemy.heading = 3;
                    } else if (!this.canMove(enemy.row - 1, enemy.col)) {
                        enemy.heading = 1;
                    }

                    break;
                case 1:
                    if (this.canMove(enemy.row - 1, enemy.col)) {
                        enemy.heading = 0;
                    } else if (!this.canMove(enemy.row, enemy.col + 1)) {
                        enemy.heading = 2;
                    }

                    break;
                case 2:
                    if (this.canMove(enemy.row, enemy.col + 1)) {
                        enemy.heading = 1;
                    } else if (!this.canMove(enemy.row + 1, enemy.col)) {
                        enemy.heading = 3;
                    }

                    break;
                case 3:
                    if (this.canMove(enemy.row + 1, enemy.col)) {
                        enemy.heading = 2;
                    } else if (!this.canMove(enemy.row, enemy.col - 1)) {
                        enemy.heading = 0;
                    }

                    break;
            }
        },

        moveEnemy(enemy) {
            switch (enemy.heading) {
                case 0:
                    if (!this.canMove(enemy.row - 1, enemy.col)) {
                        return;
                    }
                    break;
                case 1:
                    if (!this.canMove(enemy.row, enemy.col + 1)) {
                        return;
                    }
                    break;
                case 2:
                    if (!this.canMove(enemy.row + 1, enemy.col)) {
                        return;
                    }
                    break;
                case 3:
                    if (!this.canMove(enemy.row, enemy.col - 1)) {
                        return;
                    }
                    break;

            }

            this.tiles[enemy.row][enemy.col].background = Tile.empty;

            switch (enemy.heading) {
                case 0:
                    enemy.row -= 1
                    break;
                case 1:
                    enemy.col += 1;
                    break;
                case 2:
                    enemy.row += 1;
                    break;
                case 3:
                    enemy.col -= 1;
                    break;
            }
            this.tiles[enemy.row][enemy.col].background = Tile.enemy;

            this.forceRender();
        },

        enemyUpdate: function () {
            this.enemyPos.forEach((enemy, index) => {
                this.changeEnemyHeading(enemy)
                this.moveEnemy(enemy);
                if (enemy.row === this.playerPos.row && enemy.col === this.playerPos.col) {
                    this.explodes(this.tiles[enemy.row][enemy.col])
                }
            })
        },


        findEnemy() {
            for (let col = 0; col < this.gridWidth; col++) {
                for (let row = 0; row < this.gridHeight; row++) {
                    const tileEnemy = this.tiles[row][col]
                    if (tileEnemy.background === Tile.enemy)
                        return tileEnemy
                }
            }
        },

        updateEnemyPosition(enemyPos, newEnemyPos, grid) {
            let tileAbove = grid[enemyPos.y - 1][enemyPos.x]
            let tileDown = grid[enemyPos.y + 1][enemyPos.x]
            let tileRight = grid[enemyPos.y][enemyPos.x + 1]
            let tileLeft = grid[enemyPos.y][enemyPos.x - 1]

            if (
                tileAbove.background === Tile.player ||
                tileDown.background === Tile.player ||
                tileRight.background === Tile.player ||
                tileLeft.background === Tile.player
            ) {
                this.explodes()
                console.log('Explosion')
            } else if (this.tiles[newEnemyPos.y][newEnemyPos.x].background === Tile.empty) {
                this.tiles[enemyPos.y][enemyPos.x].background = Tile.empty
                this.tiles[newEnemyPos.y][newEnemyPos.x].background = Tile.enemy
            }
        },

        // Check if tile player stands on contains a diamond
        checkForDiamonds() {

            for (let row = 0; row < this.gridHeight; row++) {

                for (let col = 0; col < this.gridWidth; col++) {

                    if (this.customGrid[row][col] == 'D' && this.tiles[row][col].background == Tile.player) {

                        this.diamondsCollected += 1
                        this.$emit('collected', this.diamondsCollected)

                        // Number of diamonds needed to be collected before exit appears
                        if (this.diamondsCollected === this.maxNumberOfDiamonds - 6) {
                            this.enableExit = true
                        }
                    }
                }
            }
        },

        // Check how many diamonds the whole level have
        getTotalNumberOfDiamonds() {
            for (let row = 0; row < this.gridHeight; row++) {
                for (let col = 0; col < this.gridWidth; col++) {
                    if (this.customGrid[row][col] == 'D') {
                        this.maxNumberOfDiamonds += 1
                    }
                }
            }
            this.$emit('total', this.maxNumberOfDiamonds)
        },

        openExit() {

            this.customGrid[15][29] = 'G'
            this.customGrid[14][29] = 'G'

            this.tiles[15][29].background = Tile.exit
            this.tiles[14][29].background = Tile.exit
            this.forceRender()

        },

        checkForExit() {

            if ((this.customGrid[15][29] == 'G' || this.customGrid[14][29] == 'G') && (this.tiles[15][29].background == Tile.player || this.tiles[14][29].background == Tile.player)) {
                this.$emit('gameCompleted', true)
            }
        },

        checkIfPlayerIsStuck() {

            const row = this.playerPos.row;
            const col = this.playerPos.col

            let tileToTheRight = this.tiles[row][col + 1]
            let tile2StepsToTheRight = this.tiles[row][col + 2]
            let tileUnder = this.tiles[row + 1][col]
            let tileToTheLeft = this.tiles[row][col - 1]
            let tile2StepsToTheLeft = this.tiles[row][col - 2]
            let tileAbove = this.tiles[row - 1][col]

            if (
                (tileToTheRight.background === Tile.brick || tileToTheRight.background === Tile.boulder) &&
                (tile2StepsToTheRight.background === Tile.brick || tile2StepsToTheRight.background === Tile.boulder || tile2StepsToTheRight.background === Tile.dirt || tile2StepsToTheLeft.background === Tile.diamonds) &&
                (tileUnder.background === Tile.brick || tileUnder.background === Tile.boulder) &&
                (tileToTheLeft.background === Tile.brick || tileToTheLeft.background === Tile.boulder) &&
                (tile2StepsToTheLeft.background === Tile.brick || tile2StepsToTheLeft.background === Tile.boulder || tile2StepsToTheLeft.background === Tile.dirt || tile2StepsToTheLeft.background === Tile.diamonds) &&
                (tileAbove.background === Tile.brick || tileAbove.background === Tile.boulder)
            ) {
                // console.log(true)
                return true
            }
            // console.log(false)
            return false


        },
    },

    watch: {

        enableExit(val) {
            if (val) {
                this.openExit()
            }
        },



        playerHasMoved(val) {
            if (val) {
                this.checkForDiamonds()
                if (this.enableExit) this.checkForExit()
            }
        }
    },
}
