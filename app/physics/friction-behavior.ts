var Physics = require('./physicsjs-full');

Physics.behavior('friction', function(parent) {
    var defaults = {
        factor: 0.98
    };

    return {

        // extended
        init: function(options) {
            parent.init.call(this);
            this.options.defaults(defaults);
            this.options(options);
            this.factor = this.options.factor;
        },

        // extended
        behave: function(data) {
            var bodies = this.getTargets();
            for (var i = 0, l = bodies.length; i < l; ++i) {
                bodies[i].state.vel.mult(this.factor);
            }
        }
    };
});