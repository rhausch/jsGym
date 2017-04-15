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
            enableMotor: true,
        }, this.chassis, this.wheels[i]));
        this.joints.push(joint);
    }
};

Car.prototype.kill = function () {
    for (var i = 0; i < this.wheels.length; i++) {
        world.destroyBody(this.wheels[i]);
    }
    for (var i = 0; i < this.joints.length; i++) {
        world.destroyJoint(this.joints[i]);
    }
    world.destroyBody(this.chassis);
    this.chassis = null;
    this.wheels = [];
    this.joints = [];
};

Car.prototype.getPosition = function () {
    return this.chassis.getPosition();
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

var bodies = [];
var joints = [];

function Car_createChassis(vectors) {
    var center = Vec2(-10.0, 10.0);
    var body = world.createDynamicBody(center);

    body.createFixture(pl.Polygon(vectors), {density: 1.0, friction: 0.1});

    return body;
}

function Car_createWheel(location, radius) {
    var center = Vec2(-10.0, 10.0);

    var wheel = world.createDynamicBody(Vec2.add(center, location));
    wheel.createFixture(pl.Circle(radius), 1.0);

    return wheel;
}

function initializeGenome(genes)
{
    var genome = [];
    for (var i = 0; i < genes; i++) {
        genome.push(Math.floor(Math.random()*100));
    }
    return genome;
}

var heightMap = [0,0,0,0,0,5,5,0,10,10,15,3,0,15,0,5,20,10,5,0,10,30,50,40,0,10,0,500];
function createGround() {
    var ground = world.createBody();

    ground.createFixture(pl.Edge(Vec2(-50.0, 0.0), Vec2(0.0, 0.0)), {friction: 0.3});

    for (var i = 0; i < heightMap.length - 1; i++) {
        ground.createFixture(pl.Edge(Vec2(i*20.0,heightMap[i]), Vec2((i+1)*20.0,heightMap[i+1])), {friction: 0.9});
    }
}

var maxX = -100;
var staleTurns = 0;

planck.testbed(function (testbed) {
    testbed.speed = 1.4;
    testbed.hz = 1/30;
    testbed.height = 50;
    testbed.width = 100;

    world = planck.World({
        gravity: Vec2(0, -10)
    });

    createGround();

    var genome = initializeGenome(10);
    var car = new Car(genome);

    testbed.step = function () {
        var cp = car.getPosition();
        console.log(maxX, staleTurns);
        if (cp.x > testbed.x + 1) {
            testbed.x = cp.x - 1;
        } else if (cp.x < testbed.x - 1) {
            testbed.x = cp.x + 1;
        }

        if (cp.x > maxX) {
            maxX = cp.x;
            staleTurns = 0;
        } else {
            staleTurns++;
            maxX = maxX + 0.01;
        }

        if (staleTurns > 100) {
            car.kill();
            car = new Car(initializeGenome(10));
            maxX = -100;
            staleTurns = 0;
            testbed.x = 0;
        }

    }

    return world;
})
