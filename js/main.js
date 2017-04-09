/**
 * Created by robha on 2017-04-08.
 */

var pl = planck, Vec2 = pl.Vec2;

function geneToFloat(gene) {
    return (gene)/10.0;
}

var bodies = [];
var joints = [];

function generateBody(world, genome) {
    var center = Vec2(-10.0, 10.0);
    var body = world.createDynamicBody(center);

    bodies.push(body);

    var shape = [];
    var angle = 0;
    for (var i = 0; i < 4; i++)
    {
        shape.push(Vec2(Math.cos(angle)*geneToFloat(genome[i]), Math.sin(angle)*geneToFloat(genome[i])));
        angle += Math.PI/2;
    }


    body.createFixture(pl.Polygon(shape), {density: 1.0, friction: 0.1});

    for (var i = 0; i < 4; i++) {
        var wheel = world.createDynamicBody(Vec2.add(center, shape[i]));
        wheel.createFixture(pl.Circle(genome[i+4]/50.0), 1.0);
        var joint = world.createJoint(pl.WheelJoint({
            motorSpeed: 0-genome[i+8],
            maxMotorTorque: 1000.0,
            enableMotor: true,
            frequency: genome[i+12]/10.0,
            dampingRatio: 0.9
        }, body, wheel, wheel.getPosition(), Vec2(Math.cos(genome[i+16]),Math.sin(genome[i+16]))));
        bodies.push(wheel);
        joints.push(joint);
    }

    return body;

}

function cleanupCreature(world) {
    console.log("Cleaning up creature");
    for (var i = 0; i < bodies.length; i++) {
        world.destroyBody(bodies[i]);
    }
    for (var i = 0; i < joints.length; i++) {
        world.destroyJoint(joints[i]);
    }
    bodies = [];
    joints = [];
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
var creature = 1;

function worldSetup(world) {
    var genome = initializeGenome(32);

    console.log(genome);
    creature = generateBody(world, genome);
}

var maxX = -100;
var staleTurns = 0;

planck.testbed(function (testbed) {
    testbed.speed = 1.4;
    testbed.hz = 1/30;
    testbed.height = 50;
    testbed.width = 100;

    var world = planck.World({
        gravity: Vec2(0, -10)
    });

    var ground = world.createBody();

    ground.createFixture(pl.Edge(Vec2(-50.0, 0.0), Vec2(0.0, 0.0)), {friction: 0.3});

    for (var i = 0; i < heightMap.length - 1; i++) {
        ground.createFixture(pl.Edge(Vec2(i*20.0,heightMap[i]), Vec2((i+1)*20.0,heightMap[i+1])), {friction: 0.9});
    }

    worldSetup(world);

    testbed.step = function () {
        var cp = creature.getPosition();
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
            cleanupCreature(world);
            worldSetup(world);
            maxX = -100;
            staleTurns = 0;
            testbed.x = 0;
        }

    }

    return world;
})
