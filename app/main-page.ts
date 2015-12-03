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

// Event handler for Page "loaded" event attached in main-page.xml
export function pageLoaded(args: observable.EventData) {
    var WIDTH = 300; //screen.mainScreen.widthDIPs;
    var HEIGHT = 400; //screen.mainScreen.heightDIPs - 60;
    console.log("w: " + WIDTH + " h: " + HEIGHT);
    // Get the event sender
    var page = <pages.Page>args.object;
    
    var container = <LayoutBase>page.getViewById("container");
    var metaText = <TextBase>page.getViewById("meta");
    container.width = WIDTH;
    container.height = HEIGHT;

    var world = Physics();

    world.add(Physics.body('circle', {
        x: 50,
        y: 60,
        vx: .2,
        radius: 30
    }));

    world.add(Physics.body('circle', {
        x: 30,
        y: 60,
        radius: 10
    }));


    world.add(Physics.body('circle', {
        x: 70,
        y: 20,
        vx: -0.1,
        radius: 20
    }));

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

