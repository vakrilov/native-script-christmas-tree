import observable = require("data/observable");
import pages = require("ui/page");
import gestures = require("ui/gestures");
import {Image, View, Label, LayoutBase, TextBase, Button} from "ui";
import {Color} from "color";
import {screen} from "platform";
import utils = require("utils/utils");

import {BallWithChain, initPhysicsWorld} from "./balls";

var socialShare = require("nativescript-social-share");
var screenShot = require("nativescript-screenshot");

var Physics = require("./physics/physicsjs-full")
var nsRenderer = require("./physics/ns-renderer");

var SCENE_WIDTH: number = 300;
var SCENE_HEIGHT: number = 400;
var DENSITY: number;

var DROP_SPOT_SIZE: number = 20;

var selectedBall: BallWithChain;
var selectedDropSpot: DropSpot;

var initialized = false;
var shareBtn: Button;
var star: Image;

interface Vector {
    x: number,
    y: number,
    dist(other: Vector): number
}

interface DropSpot {
    x: number;
    y: number;
    view?: View;
    pos?: any;
    ball?: BallWithChain;
}

var dropSpots: Array<DropSpot> = [
    { x: 120, y: 180 },
    { x: 190, y: 190 },
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
    DENSITY = utils.layout.getDisplayDensity();
    var page = <pages.Page>args.object;

    var container = <LayoutBase>page.getViewById("container");
    var metaText = <TextBase>page.getViewById("meta");
    star = <Image>page.getViewById("star");
    shareBtn = <Button>page.getViewById("btn-share");

    setTimeout(function() {
        initWrold(container, metaText);
    }, 200);
}

function addDropSpots(container: LayoutBase) {
    for (var dropSpot of dropSpots) {
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

function adjustToContainerSize(container: LayoutBase) {
    var width = container.getMeasuredWidth() / DENSITY;
    var height = container.getMeasuredHeight() / DENSITY;

    var offsetX = (width - SCENE_WIDTH) / 2;
    var offsetY = (height - SCENE_HEIGHT - 60) / 2; // 60 - hieght of the share button
    
    container.width = width;
    container.height = height;

    for (var dropSpot of dropSpots) {
        dropSpot.x += offsetX;
        dropSpot.y += offsetY;
    }

    for (var bwc of ballsWithChains) {
        bwc.anchorX += offsetX;
        bwc.anchorY += offsetY;
        bwc.ballX += offsetX;
        bwc.ballY += offsetY;
    }
}

function initWrold(container: LayoutBase, metaText: TextBase) {
    if (initialized) {
        return;
    }
    initialized = true;

    adjustToContainerSize(container);

    addDropSpots(container);

    initPhysicsWorld(container, metaText, ballsWithChains)
}

function getTouchPosition(args: gestures.PanGestureEventData): Vector {
    var result: Vector;
    if (args.android) {
        result = new Physics.vector(args.android.current.getX() / DENSITY, args.android.current.getY() / DENSITY);
    }
    else if (args.ios) {
        var pos = args.ios.locationInView((<View>args.object).ios);
        result = new Physics.vector(pos.x, pos.y);
    }
    return result;
}

export function onPan(args: gestures.PanGestureEventData) {
    var touch: Vector = getTouchPosition(args);
    if (!touch) {
        return;
    }
    if (args.state === 1) {
        for (var bwc of ballsWithChains) {
            if (touch.dist(bwc.anchorRef.state.pos) < 20) {
                startDragging(bwc);
                break;
            }
        }
    }
    else if (args.state === 3 && selectedBall) {
        endDragging();
    }
    if (selectedBall) {
        drag(touch);
    }
}

function startDragging(ball: BallWithChain) {
    selectedBall = ball;
    selectedBall.anchorRef.view.scaleX = 2;
    selectedBall.anchorRef.view.scaleY = 2;
    var unfinish = false;
    dropSpots.forEach(function(spot) {
        if (spot.ball === selectedBall) {
            spot.ball = undefined;
            unfinish = true;
        }
    });
    
    if(unfinish){
        animateButton(false);
    }
}

function endDragging() {
    if (selectedDropSpot) {
        selectedDropSpot.view.scaleX = 1;
        selectedDropSpot.view.scaleY = 1;
        selectedDropSpot.ball = selectedBall;
    }
    selectedBall.anchorRef.view.scaleX = 1;
    selectedBall.anchorRef.view.scaleY = 1;
    selectedBall = undefined;
    selectedDropSpot = undefined;

    if (dropSpots.every((spot) => !!spot.ball)) {
        animateStar();
        animateButton(true);
    }
}

function drag(touch: Vector) {
    for (var dropSpot of dropSpots) {
        if (dropSpot.ball) {
            //slot taken - move on;
            continue;
        }
        if (touch.dist(dropSpot.pos) < 10) {
            selectedDropSpot = dropSpot;
            selectedDropSpot.view.scaleX = 2.2;
            selectedDropSpot.view.scaleY = 2.2;
            touch.x = dropSpot.x;
            touch.y = dropSpot.y;
        }
        else {
            dropSpot.view.scaleX = 1;
            dropSpot.view.scaleY = 1;
            if (selectedDropSpot === dropSpot) {
                selectedDropSpot = undefined;
            }
        }
    }
    selectedBall.anchorRef.state.pos.set(touch.x, touch.y);
}

export function onShare(args) {
    var outerContainer = args.object.page.getViewById("outer-container");
    var imageSrc = screenShot.getImage(outerContainer);
    socialShare.shareImage(imageSrc, "Marry Christmas form #NativeScript!");
}

var animating: boolean = false;
export function onStarTap(args) {
    animateStar();
}

function animateStar() {
    if (animating) {
        return;
    }
    animating = true;

    star.animate({
        rotate: 720,
        duration: 1500,
        curve: "easeInOut"
    }).then(() => {
        star.rotate = 0;
        animating = false;
    })
}

function animateButton(completed: boolean) {
    var color = new Color(completed ? "#55acee" : "#808080");
    shareBtn.animate({ backgroundColor: color });
}