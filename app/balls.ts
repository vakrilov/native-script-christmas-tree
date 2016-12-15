import { LayoutBase } from "ui/layouts/layout-base";
import { TextBase } from "ui/text-base";
const Physics = require("./physics/physicsjs-full");

const DEBUG = false;
const LINK_STIFFNESS: number = 0.5;

export interface BallWithChain {
    ballX: number;
    ballY: number;
    image?: string;
    anchorX: number;
    anchorY: number;
    anchorRef?: any;
}

function createLinkNode(x: number, y: number) {
    return Physics.body('circle', {
        x: x,
        y: y,
        radius: 2,
        mass: 0.1,
        styles: { image: "~/images/link.png" }
    });
}

function createLink(body1, body2, world, constraints, linkLength: number = 8) {
    const body1X = body1.state.pos.x;
    const body1Y = body1.state.pos.y;
    const body2X = body2.state.pos.x;
    const body2Y = body2.state.pos.y;

    const dx = body2X - body1X;
    const dy = body2Y - body1Y;
    const distance = Math.sqrt(dx * dx + dy * dy) - body1.radius - body2.radius;
    if (distance < 0) {
        throw Error("Bodies are too close");
    }
    const count = Math.floor(distance / linkLength) - 1;
    if (count === 0) {
        //direct link
        constraints.distanceConstraint(body1, body2, 0.5);
        return;
    }

    const angle = Math.atan2(dx, dy);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    const startX = body1X + body1.radius * sin;
    const startY = body1Y + body1.radius * cos;
    const xInc = (sin * distance) / (count + 1);
    const yInc = (cos * distance) / (count + 1);

    const links = [];
    for (let i = 0; i < count; i++) {
        const link = createLinkNode(
            startX + (i + 1) * xInc,
            startY + (i + 1) * yInc);

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
    const ball = Physics.body('circle', {
        x: bwc.ballX,
        y: bwc.ballY,
        radius: 15,
        mass: 2,
        restitution: 0.3,
        styles: {
            image: bwc.image
        }
    });

    const anchor = Physics.body('circle', {
        x: bwc.anchorX,
        y: bwc.anchorY,
        vx: .2,
        radius: 10,
        mass: 9,
        restitution: 0.3,
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



export function initPhysicsWorld(container: LayoutBase, metaText: TextBase, ballsWithChains: Array<BallWithChain>) {
    const world = Physics();
    const rigidConstraints = Physics.behavior('verlet-constraints', {
        iterations: 1
    });

    ballsWithChains.forEach((bwc) => createBallWithChain(bwc, world, rigidConstraints));

    world.add(rigidConstraints);

    const renderer = Physics.renderer('ns', {
        container: container,
        metaText: metaText,
        // width: SCENE_WIDTH,
        // height: SCENE_HEIGHT,
        meta: DEBUG
    });

    world.add([
        // Physics.behavior('edge-collision-detection', { aabb: Physics.aabb(0, 0, WIDTH, HEIGHT) }),
        Physics.behavior('body-collision-detection'),
        Physics.behavior('body-impulse-response'),
        Physics.behavior('sweep-prune'),
        Physics.behavior('constant-acceleration'),
        renderer
    ]);

    world.on('step', function () {
        world.render();
    });

    Physics.util.ticker.on(function (t) {
        world.step(t);
    }).start();

    setInterval(() => {
        world.step(Date.now());
    }, 20);
}