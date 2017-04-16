/**
 * Created by robha on 2017-04-08.
 */

var world;
var pl = planck, Vec2 = pl.Vec2;


/********************
 *   Car
 ********************/

var Car = function () {
    this.__constuctor.apply(this, arguments);
};

Car.prototype.chassis = null;
Car.prototype.wheels = [];
Car.prototype.joints = [];

Car.prototype.maxPosition = 0;
Car.prototype.health = 100;
Car.prototype.alive = false;

Car.prototype.__constuctor = function (car_genome) {
    this.genome = car_genome;

    this.config = processGenome(this.genome);

    this.chassis = Car_createChassis(this.config.vectors);

    this.wheels = [];
    this.joints = [];

    for (var i = 0; i < 4; i++) {
        this.wheels[i] = Car_createWheel(this.config.wheels[i].center, this.config.wheels[i].radius);

        var joint = world.createJoint(pl.RevoluteJoint({
            localAnchorA: this.config.vectors[i],
            localAnchorB: Vec2(0.0, 0.0),
            motorSpeed: -10.0,
            maxMotorTorque: 1000.0,
            enableMotor: true
        }, this.chassis, this.wheels[i]));
        this.joints.push(joint);
    }
    this.alive = true;
    this.health = 100;
    this.maxPosition = this.getPosition();
};

Car.prototype.kill = function () {
    if (this.alive == false) {
        return;
    }
    //noinspection JSDuplicatedDeclaration
    for (var i = 0; i < this.wheels.length; i++) {
        world.destroyBody(this.wheels[i]);
    }
    //noinspection JSDuplicatedDeclaration
    for (var i = 0; i < this.joints.length; i++) {
        world.destroyJoint(this.joints[i]);
    }
    world.destroyBody(this.chassis);
    this.chassis = null;
    this.wheels = [];
    this.joints = [];
    this.alive = false;
};

Car.prototype.checkDeath = function () {
    if (!this.alive)
        return;
    if (this.getPosition() > this.maxPosition + 0.002) {
        this.maxPosition = this.getPosition();
        this.health = 100;
    } else {
        //console.log("Not moving fast enough", this.getPosition(), this.maxPosition);
        if (this.getPosition().x > this.maxPosition)
            this.maxPosition = this.getPosition();
        this.health--;
        if (this.health <= 0) {
            this.kill();
        }
    }
};

Car.prototype.getPosition = function () {
    if (this.alive)
        return this.chassis.getPosition().x;
    return this.maxPosition;
};

function processGenome (genome) {
    var carConfig = {};

    carConfig.vectors = [];
    carConfig.wheels = [];

    var angle = 0;
    for (var i = 0; i < 4; i++)
    {
        carConfig.vectors.push(Vec2(Math.cos(angle)*geneToFloat(genome[i]), Math.sin(angle)*geneToFloat(genome[i])));
        angle += Math.PI/2;
        var wheel = {};
        wheel.center = carConfig.vectors[i];
        wheel.radius = genome[i+4]/50.0;
        carConfig.wheels[i] = wheel;
    }

    carConfig.maxTorque = genome[8];

    return carConfig;
}

function geneToFloat(gene) {
    return (gene)/10.0;
}

function Car_createChassis(vectors) {
    var center = Vec2(-10.0, 10.0);
    var body = world.createDynamicBody(center);

    body.createFixture(pl.Polygon(vectors), {density: 1.0, friction: 0.1, filterGroupIndex: -1});

    return body;
}

function Car_createWheel(location, radius) {
    var center = Vec2(-10.0, 10.0);

    var wheel = world.createDynamicBody(Vec2.add(center, location));
    wheel.createFixture(pl.Circle(radius), {density: 1.0, friction: 1.0, filterGroupIndex: -1});

    return wheel;
}

/****************************************************
 * Cars functions                                 *
 ****************************************************/

var Cars = function () {
    this.__constuctor.apply(this, arguments);
};

Cars.prototype.cars = [];

Cars.prototype.__constuctor = function (genomes) {
    //console.log("Generating cars from genepool:", genomes)
    for (var i = 0; i < genomes.length; i++) {
        this.cars[i] = new Car(genomes[i]);
    }
};

Cars.prototype.killAll = function () {
    for (var i = 0; i < this.cars.length; i++) {
        this.cars[i].kill();
    }
    this.cars = [];
};

Cars.prototype.getLeader = function () {
    var leader = null;
    for (var i = 0; i < this.cars.length; i++) {
        if (this.cars[i].alive && (leader == null || leader.getPosition() < this.cars[i].getPosition())) {
            leader = this.cars[i];
        }
    }
    return leader;
};

Cars.prototype.following = -1;

Cars.prototype.getCameraTarget = function () {
    if (this.following == -1) {
        return this.getLeader();
    }
    return this.cars[this.following];
};

Cars.prototype.cameraTargetNext = function () {
    if (this.following == -1) {
        this.following = 0;
    } else {
        this.following = (this.following + 1) % this.cars.length;
        while (!this.cars[this.following].alive) {
            this.following = (this.following + 1) % this.cars.length;
        }
    }
};

Cars.prototype.cameraTargetPrev = function () {
    if (this.following == -1) {
        this.following = this.cars.length - 1;
    } else {
        this.following = (this.following - 1 + this.cars.length) % this.cars.length;
        while (!this.cars[this.following].alive) {
            this.following = (this.following - 1 + this.cars.length) % this.cars.length;
        }
    }
};

Cars.prototype.tick = function () {
    for (var i = 0; i < this.cars.length; i++) {
        if (this.cars[i].alive)
            this.cars[i].checkDeath();
    }
};

Cars.prototype.anyAlive = function () {
    for (var i = 0; i < this.cars.length; i++) {
        if (this.cars[i].alive)
            return true;
    }
    return false;
};

Cars.prototype.getScores = function () {
    var scores = [];
    for (var i = 0; i < this.cars.length; i++) {
        scores[i] = this.cars[i].maxPosition;
    }
    return scores;
};

/****************************************************
 * Genome functions                                 *
 ****************************************************/

const NUM_GENES = 10;

var GenePool = function () {
    this.__constuctor.apply(this, arguments);
};

GenePool.prototype.genes = [];
GenePool.prototype.size = 30;
GenePool.prototype.getGene = function (i) {
    if (i > 0 && i < this.genes.length)
        return this.genes[i];
    return null;
};

GenePool.prototype.getGenes = function () {
    return this.genes;
};

GenePool.prototype.__constuctor = function (size) {
    this.size = size;
    for (var i = 0; i < this.size; i++) {
        this.genes[i] = initializeGenome(NUM_GENES);
    }
};

GenePool.prototype.evolve = function (scores) {
    var randGene;
    var bestIndex = 0;
    //noinspection JSDuplicatedDeclaration
    for (var i = 1; i < scores.length; i++) {
        if (scores[i] > scores[bestIndex]) {
            bestIndex = i;
        }
    }

    var bestGene = this.genes[bestIndex].slice(); //clone

    this.genes[0] = bestGene.slice();

    //noinspection JSDuplicatedDeclaration
    for (var i = 1; i < this.size; i++) { //index 0 holds unmodified version
        this.genes[i] = bestGene.slice();
        var randIndex = Math.floor(Math.random() * NUM_GENES);
        randGene = Math.floor(Math.random() * 100);
        this.genes[i][randIndex] = randGene;
    }
};

function initializeGenome(genes)
{
    var genome = [];
    for (var i = 0; i < genes; i++) {
        genome.push(Math.floor(Math.random()*100));
    }
    return genome;
}

/****************************************************
 * Ground functions                                 *
 ****************************************************/

var Ground = function () {
    this.__constuctor.apply(this, arguments);
};

Ground.prototype.ground = null;
Ground.prototype.heightMap = [];
Ground.prototype.sectionSize = 5;

Ground.prototype.__constuctor = function (heightmap) {
    if (heightmap != null) {
        this.heightMap = heightmap;
    } else {
        this.heightMap = generateHeightMap(1000);
    }

    this.ground = world.createBody();

    this.ground.createFixture(pl.Edge(Vec2(-50.0, 0.0), Vec2(0.0, 0.0)), {friction: 0.3});

    for (var i = 0; i < this.heightMap.length - 1; i++) {
        this.ground.createFixture(pl.Edge(Vec2(i*this.sectionSize,this.heightMap[i]), Vec2((i+1)*this.sectionSize,this.heightMap[i+1])), {friction: 0.9});
    }
};

function generateHeightMap(size) {
    var prev = 0;
    var variance = 0;
    var heights = [];
    for (var i = 0; i < size; i++) {
        prev = Math.random()*variance - variance/2.0;
        variance += 0.1;
        heights.push(prev);
    }
    heights[size - 1] += 500;
    return heights;
}

/****************************************************
 * World functions                                 *
 ****************************************************/

function printStats (scores) {
    var bestIndex = 0;
    var sum = 0;

    for (var i = 0; i < scores.length; i++) {
        sum += scores[i];
        if (scores[i] > scores[bestIndex])
            bestIndex = i;
    }

    console.log(bestIndex, "did best with a scores of ", scores[bestIndex], ". The average score was: ", sum/scores.length);
}

//var heightMap = [0,0,0,0,0,5,5,0,10,10,15,3,0,15,0,5,20,10,5,0,10,30,50,40,0,10,0,500];

planck.testbed(function (testbed) {
    testbed.speed = 1.4;
    testbed.hz = 1/30;
    testbed.height = 50;
    testbed.width = 100;

    world = planck.World({
        gravity: Vec2(0, -10)
    });

    var ground = new Ground();

    var genePool = new GenePool(30);
    //console.log("Initial gene pool", genePool.getGenes());
    var cars = new Cars(genePool.getGenes());

    testbed.keydown = function (keyCode, charCode) {
        if (keyCode == 39) { //Right Arrow
            cars.cameraTargetNext();
        } else if (keyCode == 37) { //Left Arrow
            cars.cameraTargetPrev();
        } else if (keyCode == 36) { //Home
            cars.following = -1;
        }
    };

    testbed.step = function () {
        cars.tick();

        if (!cars.anyAlive()) {
            var scores = cars.getScores();
            printStats(scores);
            genePool.evolve(scores);
            cars = new Cars(genePool.getGenes());
            testbed.x = 0;
        }

        var cp = cars.getCameraTarget().getPosition();

        if (cars.following >= 0 || cp > testbed.x) {
            testbed.x = cp;
        }

    };

    return world;
});
