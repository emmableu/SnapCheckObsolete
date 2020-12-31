const {_Triggeru, Callback} = require('./trigger');

class Stepper {

    constructor (snapAdapter) {
        /**
         * @type {SnapAdapter}
         */
        this.snapAdapter = snapAdapter;

        /**
         * @type {Trigger[]}
         */
        this.triggers = [];

        /**
         * @type {Boolean}
         */
        this.running = false;

        /**
         * @type {Callback[]}
         */
        this._callbacks = [];

        /**
         * @type {number}
         */
        this._stepDuration = 50;

    }

    reset () {
        this.clearTriggers();
        this.running = false;
    }

    addTrigger (trigger) {
        this.triggers.unshift(trigger);
    }

    removeTriggerByName (name) {
        this.triggers.filter(t => t.name === name).forEach(t => t.withdraw());
    }

    clearTriggers () {
        this.triggers = [];
        this._callbacks = [];
    }

    async run () {
        if (!this.snapAdapter.projectStarted) {
            await this.snapAdapter.start();
        }
        this.running = true;
        this.snapAdapter.state.update();

    }

    stop () {
        console.log('stop stepper');
        this.running = false;
    }

    step () {

        // select triggers with precondition satisfied
        const firingTriggers = this.triggers.filter(t => t.active)
            .filter(t => t.precondition());
        // get the callbacks of these triggers
        const callbacks = firingTriggers
            .map(t => {
                t.deactivate();
                t._callback = new Callback(
                    t.stateSaver(), // save the current state
                    t.delay,
                    t.callback,
                    t);
                return t._callback;
            });
        // add all activated callbacks to the callback queues
        this._callbacks.unshift(...callbacks);

        // fire callback if delay reaches 0
        this._callbacks.forEach(c => c.countdown());

        // cleanup callbacks and triggers that are no longer alive
        this._callbacks = this._callbacks.filter(c => c.alive);
        this.triggers = this.triggers.filter(t => t.alive);

        this.snapAdapter.inputs.tick();
        
        /* this.snapAdapter.resume();
        return new Promise(resolve =>
            setTimeout(() => {
                this.snapAdapter.pause();
                this.snapAdapter.state.update();

                resolve(this.STEP_FINISHED);
            }, this._stepDuration)
        );*/
    }

    static get STEP_FINISHED () {
        return 'step_done';
    }
}

module.exports = Stepper;
