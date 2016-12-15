import observable = require("data/observable");
import pages = require("ui/page");
import gestures = require("ui/gestures");
import { Image } from "ui/image";
import { View } from "ui/core/view";
import { Button } from "ui/button";
import { LayoutBase } from "ui/layouts/layout-base";
import { TextBase } from "ui/text-base";
import { Color } from "color";
import utils = require("utils/utils");

import { BallWithChain, initPhysicsWorld } from "./balls";

const socialShare = require("nativescript-social-share");
const screenShot = require("nativescript-screenshot");

const Physics = require("./physics/physicsjs-full");
import "./physics/ns-renderer";

const SCENE_WIDTH: number = 300;
const SCENE_HEIGHT: number = 400;
let DENSITY: number;

const DROP_SPOT_SIZE: number = 20;

let selectedBall: BallWithChain;
let selectedDropSpot: DropSpot;

let initialized = false;
let shareBtn: Button;
let star: Image;

interface Vector {
    x: number;
    y: number;
    dist(other: Vector): number;
}

interface DropSpot {
    x: number;
    y: number;
    view?: View;
    pos?: any;
    ball?: BallWithChain;
}

const dropSpots: Array<DropSpot> = [
    { x: 120, y: 180 },
    { x: 190, y: 190 },
    { x: 100, y: 280 },
    { x: 210, y: 290 }
]

const ballsWithChains: Array<BallWithChain> = [
    { anchorX: 30, anchorY: 30, ballX: 20, ballY: 80, image: "~/images/ns-logo.png" },
    { anchorX: 70, anchorY: 30, ballX: 60, ballY: 80, image: "~/images/kendo-ui-logo.png" },
    { anchorX: 230, anchorY: 30, ballX: 240, ballY: 80, image: "~/images/telerik-logo.png" },
    { anchorX: 270, anchorY: 30, ballX: 280, ballY: 80, image: "~/images/progress-logo.png" },
];

// Event handler for Page "loaded" event attached in main-page.xml
export function pageLoaded(args: observable.EventData) {
    DENSITY = utils.layout.getDisplayDensity();
    const page = <pages.Page>args.object;

    const container = <LayoutBase>page.getViewById("container");
    const metaText = <TextBase>page.getViewById("meta");
    star = <Image>page.getViewById("star");
    shareBtn = <Button>page.getViewById("btn-share");

    setTimeout(function () {
        initWorld(container, metaText);
    }, 200);
}

function addDropSpots(container: LayoutBase) {
    for (const dropSpot of dropSpots) {
        const img = new Image();
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
    const width = container.getMeasuredWidth() / DENSITY;
    const height = container.getMeasuredHeight() / DENSITY;

    const offsetX = (width - SCENE_WIDTH) / 2;
    const offsetY = (height - SCENE_HEIGHT) / 2;

    container.width = width;
    container.height = height;

    for (const dropSpot of dropSpots) {
        dropSpot.x += offsetX;
        dropSpot.y += offsetY;
    }

    for (const bwc of ballsWithChains) {
        bwc.anchorX += offsetX;
        bwc.anchorY += offsetY;
        bwc.ballX += offsetX;
        bwc.ballY += offsetY;
    }
}

function initWorld(container: LayoutBase, metaText: TextBase) {
    if (initialized) {
        return;
    }
    initialized = true;

    adjustToContainerSize(container);

    addDropSpots(container);

    initPhysicsWorld(container, metaText, ballsWithChains);
}

function getTouchPosition(args: gestures.PanGestureEventData): Vector {
    let result: Vector;
    if (args.android) {
        result = new Physics.vector(args.android.current.getX() / DENSITY, args.android.current.getY() / DENSITY);
    }
    else if (args.ios) {
        const pos = args.ios.locationInView((<View>args.object).ios);
        result = new Physics.vector(pos.x, pos.y);
    }
    return result;
}

export function onPan(args: gestures.PanGestureEventData) {
    const touch: Vector = getTouchPosition(args);
    if (!touch) {
        return;
    }
    if (args.state === 1) {
        for (const bwc of ballsWithChains) {
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
    let unfinished = false;
    dropSpots.forEach(function (spot) {
        if (spot.ball === selectedBall) {
            spot.ball = undefined;
            unfinished = true;
        }
    });

    if (unfinished) {
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
    for (const dropSpot of dropSpots) {
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
    const container = args.object.page.getViewById("container");
    const imageSrc = screenShot.getImage(container);
    socialShare.shareImage(imageSrc, "Marry Christmas form #NativeScript!");
}

function animateStar() {
    star.animate({
        rotate: 360,
        scale: { x: 1.5, y: 1.5 },
        duration: 500,
        curve: "easeIn"
    }).then(() => {
        return star.animate({
            rotate: 720,
            scale: { x: 1, y: 1 },
            duration: 500,
            curve: "easeOut"
        });
    }).then(() => {
        star.rotate = 0;
    });
}

function animateButton(completed: boolean) {
    const color = new Color(completed ? "#55acee" : "#808080");
    shareBtn.animate({ backgroundColor: color });
}