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

var SCENE_WIDTH: number = 300;
var SCENE_HEIGHT: number = 400;
var OFFSET_X: number;
var OFFSET_Y: number;
var WIDTH: number;
var HEIGHT: number;
var DENSITY: number;
var LINK_STIFFNESS: number = 0.5;
var DROP_SPOT_SIZE: number = 20;

var selectedAnchor;
var selectedDropSpot: DropSpot;

var initialized = false;

interface BallWithChain {
    ballX: number,
    ballY: number,
    image?: string,
    anchorX: number,
    anchorY: number,
    anchorRef?: any;
}

interface DropSpot {
    x: number;
    y: number;
    view?: View;
    pos?: any;
}

var dropSpots: Array<DropSpot> = [
    { x: 130, y: 170 },
    { x: 180, y: 180 },
    { x: 100, y: 280 },
    { x: 210, y: 290 }
]

var ballsWithChains: Array<BallWithChain> = [
    { anchorX: 30, anchorY: 30, ballX: 20, ballY: 80, image: "~/images/ns-logo.png" },
    { anchorX: 70, anchorY: 30, ballX: 60, ballY: 80, image: "~/images/kendo-ui-logo.png" },
    { anchorX: 230, anchorY: 30, ballX: 240, ballY: 80, image: "~/images/telerik-logo.png" },
    { anchorX: 270, anchorY: 30, ballX: 280, ballY: 80, image: "~/images/progress-logo.png" },
];

// Event handler for Page "loaded" event attached in main-page.xml
export function pageLoaded(args: observable.EventData) {
    var page = <pages.Page>args.object;

    var container = <LayoutBase>page.getViewById("container");
    var metaText = <TextBase>page.getViewById("meta");

    setTimeout(function() {
        initWrold(container, metaText);
    }, 100);
}

function createLink(body1, body2, world, constraints, linkLength: number = 8) {
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
            constraints.distanceConstraint(links[i - 1], links[i], LINK_STIFFNESS);
        }
    }
    constraints.distanceConstraint(body1, links[0], LINK_STIFFNESS);
    constraints.distanceConstraint(links[count - 1], body2, LINK_STIFFNESS);
}


function createBallWithChain(bwc: BallWithChain, world: any, constraints) {
    var ball = Physics.body('circle', {
        x: OFFSET_X + bwc.ballX,
        y: OFFSET_Y + bwc.ballY,
        radius: 15,
        mass: 2,
        styles: {
            image: bwc.image
        }
    });

    var anchor = Physics.body('circle', {
        x: OFFSET_X + bwc.anchorX,
        y: OFFSET_Y + bwc.anchorY,
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

function addDropSpots(container: LayoutBase) {
    for (var dropSpot of dropSpots) {
        dropSpot.x += OFFSET_X;
        dropSpot.y += OFFSET_Y;

        var img = new Image();
        img.width = DROP_SPOT_SIZE;
        img.height = DROP_SPOT_SIZE;
        img.translateX = dropSpot.x - DROP_SPOT_SIZE / 2;
        img.translateY = dropSpot.y - DROP_SPOT_SIZE / 2;
        img.src = "~/images/anchor.png";
        img.stretch = "aspectFit";

        dropSpot.view = img;
        dropSpot.pos = new Physics.vector(dropSpot.x, dropSpot.y);
        container.addChild(img);
    }
}

function initConstants(container: LayoutBase) {
    DENSITY = utils.layout.getDisplayDensity();
    WIDTH = container.getMeasuredWidth() / DENSITY;
    HEIGHT = container.getMeasuredHeight() / DENSITY;
    OFFSET_X = (WIDTH - SCENE_WIDTH) / 2;
    OFFSET_Y = (HEIGHT - SCENE_HEIGHT - 60) / 2; // 60 - hieght of the share button
    container.width = WIDTH;
    container.height = HEIGHT;

    console.log("w: " + WIDTH + " h: " + HEIGHT);
}

function initWrold(container: LayoutBase, metaText: TextBase) {
    if (initialized) {
        return;
    }
    initialized = true;

    initConstants(container);
    addDropSpots(container);

    var world = Physics();
    var rigidConstraints = Physics.behavior('verlet-constraints', {
        iterations: 1
    });

    ballsWithChains.forEach((bwc) => createBallWithChain(bwc, world, rigidConstraints));

    world.add(rigidConstraints);

    var renderer = Physics.renderer('ns', {
        container: container,
        metaText: metaText,
        width: SCENE_WIDTH,
        height: SCENE_HEIGHT,
        meta: true
    });

    world.add([
        // Physics.behavior('edge-collision-detection', { aabb: Physics.aabb(0, 0, WIDTH, HEIGHT) }),
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
    // console.log(`PAN state: ${ args.state } touch: ${ touch.toString() }`);

    if (args.state === 1) { // gesture begin
        for (var bwc of ballsWithChains) {
            if (touch.dist(bwc.anchorRef.state.pos) < 20) {
                selectedAnchor = bwc.anchorRef;
                break;
            }
        }
        if (selectedAnchor) {
            selectedAnchor.view.scaleX = 2;
            selectedAnchor.view.scaleY = 2;
        }
    }
    else if (args.state === 3 && selectedAnchor) { // gesture end
        selectedAnchor.view.scaleX = 1;
        selectedAnchor.view.scaleY = 1;
        selectedAnchor = undefined;
        if (selectedDropSpot) {
            selectedDropSpot.view.scaleX = 1;
            selectedDropSpot.view.scaleY = 1;
        }
    }

    if (selectedAnchor) {
        for (var dropSpot of dropSpots) {
            if (touch.dist(dropSpot.pos) < 10) {
                selectedDropSpot = dropSpot;
                selectedDropSpot.view.scaleX = 2.2;
                selectedDropSpot.view.scaleY = 2.2;

                touchX = dropSpot.x;
                touchY = dropSpot.y;
            }
            else {
                dropSpot.view.scaleX = 1;
                dropSpot.view.scaleY = 1;
            }
        }
        selectedAnchor.state.pos.set(touchX, touchY);
    }
}



export function onShare() {
    console.log("Share tapped !!!");
    // Todo use screenshot && social share plugins to share
}