import { Image } from "ui/image";
import { View } from "ui/core/view";
import { LayoutBase } from "ui/layouts/layout-base";
import { TextBase } from "ui/text-base";

const Physics = require('./physicsjs-full');

Physics.renderer('ns', function (parent) {
    const defaults = {
        width: 200,
        height: 200,
        fontSize: 4
    };

    let container: LayoutBase;
    let metaText: TextBase;

    return {
        init: function (options) {
            options = Physics.util.extend(defaults, options);

            //parent.init.call(this, options);
            parent.options = Physics.util.options(defaults);
            parent.options(options);

            container = options.container;
            metaText = options.metaText;
        },
        // extended
        createView: function (geometry, styles) {
            const img = new Image();
            if (styles && styles.image) {
                img.src = styles.image;
            }
            else {

            }
            img.width = geometry.radius * 2;
            img.height = geometry.radius * 2;

            container.addChild(img);
            // console.log("geometry: " + JSON.stringify(geometry));
            // console.log("styles: " + JSON.stringify(styles));
            return img;
        },
        drawMeta: function (meta) {
            if (metaText) {
                metaText.text = "fps: " + meta.fps.toFixed(2) + " ipf: " + meta.ipf;
            }
        },
        drawBody: function (
            body: { state: { pos: any, vel: any, angular: any }, view: View, radius: number }
        ) {
            // "t" is the "leftover" time between timesteps. You can either ignore it, 
            // or use it to interpolate the position by multiplying it by the velocity 
            // and adding it to the position. This ensures smooth motion during "bullet-time"
            const t = this._interpolateTime;
            const view = body.view;
            const x = body.state.pos.get(0) + t * body.state.vel.get(0) - body.radius;
            const y = body.state.pos.get(1) + t * body.state.vel.get(1) - body.radius;
            const angle = body.state.angular.pos + t * body.state.angular.vel;


            // render "view" at (x, y) with a rotation of "angle"...
            view.translateX = x;
            view.translateY = y;
            view.rotate = angle;
        },

    };
});
