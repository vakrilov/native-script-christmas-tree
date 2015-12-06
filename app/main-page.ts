import observable = require("data/observable");
import pages = require("ui/page");
import gestures = require("ui/gestures");
import {Image} from "ui/image";
import {View} from "ui/core/view";
import {Label} from "ui/label";
import {LayoutBase} from "ui/layouts/layout-base";
import {TextBase} from "ui/text-base";
import {screen} from "platform";
import utils = require("utils/utils");

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

interface Point {
    x: number,
    y: number
}
interface BallWithChain {
    ballX: number,
    ballY: number,
    image?: string,
    anchorX: number,
    anchorY: number,
    anchorRef?: any;
}

var ballsWithChains: Array<BallWithChain> = [
    { ballX: 60, ballY: 100, anchorX: 50, anchorY: 50, image: "~/images/ns-logo.png"  },
    { ballX: 40, ballY: 250, anchorX: 50, anchorY: 200, image: "~/images/kendo-ui-logo.png" },
    { ballX: 260, ballY: 100, anchorX: 250, anchorY: 50, image: "~/images/telerik-logo.png" },
    { ballX: 240, ballY: 250, anchorX: 250, anchorY: 200, image: "~/images/progress-logo.png" },
];

function createLink(body1, body2, world, constraints, linkLength: number = 5) {
    let body1X = body1.state.pos.x;
    let body1Y = body1.state.pos.y;
    let body2X = body2.state.pos.x;
    let body2Y = body2.state.pos.y;

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
            mass: 0.1,
            styles: {
                image: "~/images/link.png"
            }
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

var WIDTH: number;
var HEIGHT: number;
var DENSITY: number;

function createBallWithChain(bwc: BallWithChain, world: any, constraints) {
    var ball = Physics.body('circle', {
        x: bwc.ballX,
        y: bwc.ballY,
        radius: 15,
        mass: 2,
        styles: {
            image: bwc.image
        }
    });

    var anchor = Physics.body('circle', {
        x: bwc.anchorX,
        y: bwc.anchorY,
        vx: .2,
        radius: 10,
        mass: 9,
        styles: {
            image: "~/images/anchor.png"
        }
    });
    anchor.treatment = 'static';
    bwc.anchorRef = anchor;
    createLink(anchor, ball, world, constraints);

    world.add(anchor);
    world.add(ball);
}


function initWrold(container: LayoutBase, metaText: TextBase) {
    if (initialized) {
        return;
    }
    initialized = true;

    DENSITY = utils.layout.getDisplayDensity();
    WIDTH = 300; //screen.mainScreen.widthDIPs;
    HEIGHT = 400; //screen.mainScreen.heightDIPs - 60;
    console.log("w: " + WIDTH + " h: " + HEIGHT);

    container.width = WIDTH;
    container.height = HEIGHT;

    var world = Physics();
    var rigidConstraints = Physics.behavior('verlet-constraints', {
        iterations: 1
    });
    
    ballsWithChains.forEach((bwc) => createBallWithChain(bwc, world, rigidConstraints));

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

var initialPos;
var selectedAnchor;
export function onPan(args: gestures.PanGestureEventData) {
    let touchX: number;
    let touchY: number;
    if (args.android) {
        touchX = args.android.current.getX() / DENSITY;
        touchY = args.android.current.getY() / DENSITY;
    }
    else if (args.ios) {
        var pos = args.ios.locationInView((<View>args.object).ios);
        touchX = pos.x;
        touchY = pos.y;
    }

    if (touchX === undefined || touchY === undefined) {
        return;
    }

    var touch = new Physics.vector(touchX, touchY);
    console.log(`PAN state: ${ args.state } touch: ${ touch.toString() }`);

    if (args.state === 1) { // gesture begin
        for (var bwc of ballsWithChains) {
            
            if (touch.dist(bwc.anchorRef.state.pos) < 20) {
                selectedAnchor = bwc.anchorRef;
                break;
            }
        }
    }
    else if (args.state === 3) { // gesture end
        selectedAnchor = undefined;
    }

    if (selectedAnchor) {
        selectedAnchor.state.pos.set(touchX, touchY);
    }
}