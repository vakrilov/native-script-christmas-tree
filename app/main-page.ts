import observable = require("data/observable");
import pages = require("ui/page");
import {Image} from "ui/image";
import {View} from "ui/core/view";
import {Label} from "ui/label";
import {LayoutBase} from "ui/layouts/layout-base";
import {TextBase} from "ui/text-base";
import {screen} from "platform";

var Physics = require("./physics/physicsjs-full")
var nsRenderer = require("./physics/ns-renderer");

var initialized = false;
// Event handler for Page "loaded" event attached in main-page.xml
export function pageLoaded(args: observable.EventData) {
    var page = <pages.Page>args.object;

    var container = <LayoutBase>page.getViewById("container");
    var metaText = <TextBase>page.getViewById("meta");

    initWrold(container, metaText);
}

function createLink(body1, body2, world, constraints, linkLength: number = 10) {
    let body1X = body1.state.pos.get(0);
    let body1Y = body1.state.pos.get(1);
    let body2X = body2.state.pos.get(0);
    let body2Y = body2.state.pos.get(1);

    let dx = body2X - body1X;
    let dy = body2Y - body1Y;
    let distance = Math.sqrt(dx * dx + dy * dy) - body1.radius - body2.radius;
    if (distance < 0) {
        throw Error("Bodies are too close");
    }
    let count = Math.floor(distance / linkLength) - 1;
    if (count === 0) {
        //direct link
        constraints.distanceConstraint(body1, body2, 0.5);
        return;
    }

    let angle = Math.atan2(dx, dy);
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);

    let xInc = (sin * distance) / (count + 1);
    let yInc = (cos * distance) / (count + 1);
    let links = [];
    for (let i = 0; i < count; i++) {
        let link = Physics.body('circle', {
            x: body1X + body1.radius * sin + (i + 1) * xInc,
            y: body1Y + body1.radius * cos + (i + 1) * yInc,
            radius: 2,
            mass: 0.1
        });
        links.push(link);
        world.add(link);
        if (i > 0) {
            constraints.distanceConstraint(links[i - 1], links[i], 0.5);
        }
    }
    constraints.distanceConstraint(body1, links[0], 0.5);
    constraints.distanceConstraint(links[count - 1], body2, 0.5);
}


function initWrold(container: LayoutBase, metaText: TextBase) {
    if (initialized) {
        return;
    }
    initialized = true;

    var WIDTH = 300; //screen.mainScreen.widthDIPs;
    var HEIGHT = 400; //screen.mainScreen.heightDIPs - 60;
    console.log("w: " + WIDTH + " h: " + HEIGHT);
    
    container.width = WIDTH;
    container.height = HEIGHT;

    var world = Physics();

    var ball = Physics.body('circle', {
        x: 250,
        y: 60,
        radius: 20,
        mass: 2
    });

    var anchor = Physics.body('circle', {
        x: 150,
        y: 100,
        vx: .2,
        radius: 10,
        mass: 9
    });
    anchor.treatment = 'static';

    var rigidConstraints = Physics.behavior('verlet-constraints', {
        iterations: 1
    });

    createLink(anchor, ball, world, rigidConstraints, 5);

    world.add(anchor);
    world.add(ball);
    world.add(rigidConstraints);

    var renderer = Physics.renderer('ns', {
        container: container,
        metaText: metaText,
        width: WIDTH,
        height: HEIGHT,
        meta: true
    });

    world.add([
        Physics.behavior('edge-collision-detection', { aabb: Physics.aabb(0, 0, WIDTH, HEIGHT) }),
        Physics.behavior('body-collision-detection'),
        Physics.behavior('body-impulse-response'),
        Physics.behavior('sweep-prune'),
        Physics.behavior('constant-acceleration'),
        renderer
    ]);

    world.on('step', function() {
        world.render();
    });


    Physics.util.ticker.on(function(t) {
        world.step(t);
    }).start();

    setInterval(() => {
        world.step(Date.now());
    }, 20);
}

