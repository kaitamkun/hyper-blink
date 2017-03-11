const throttle = require("lodash.throttle")

const BUSY_TIMEOUT = 700;
const BUSY_THROTTLE = BUSY_TIMEOUT / 2;

module.exports.decorateConfig = (config) => {
	return Object.assign({ }, config, { termCSS: `
		${config.termCSS || ""}

		.cursor-node[focus=true]:not([hyper-blink-moving]):not([hyper-blink-hidden]) {
			animation: blink 1s ease infinite;
		}

		@keyframes blink {
			10%, 50% {
				opacity: 0;
			}

			60%, 100% {
				opacity: 1;
			}
		}
	` });
};

module.exports.decorateTerm = (Term, { React, notify }) => {
	return class extends React.Component {
		constructor(props, context) {
			super(props, context);
			this._onTerminal = this._onTerminal.bind(this);
			this._onCursorChange = this._onCursorChange.bind(this);
			this._updateCursorStatus = this._updateCursorStatus.bind(this);
			this._markBusyThrottled = throttle(this._markBusy.bind(this), BUSY_THROTTLE);
			this._markIdle = this._markIdle.bind(this);
		};

		_onTerminal(term) {
			if (this.props.onTerminal) {
				this.props.onTerminal(term);
			};

			this._cursor = term.cursorNode_;
			this._observer = new MutationObserver(this._onCursorChange);
			this._observer.observe(this._cursor, {
				attributes: true,
				childList: false,
				characterData: false,
				attributeOldValue: true,
				attributeFilter: ["style", "title"]
			});
		};

		_onCursorChange(mutations) {
			for (let mutation of mutations) {
				if (mutation.attributeName == "style") {
					let newOpacity = mutation.target.style.opacity,
						oldOpacity = (mutation.oldValue.match(/opacity: (\d)/) || ["", "1"])[1];
					if (oldOpacity == "0" && newOpacity == "1") {
						this._cursor.removeAttribute("hyper-blink-hidden");
					} else if (oldOpacity == "1" && newOpacity == "0") {
						this._cursor.setAttribute("hyper-blink-hidden", true);
					};
				} else if (mutation.attributeName == "title") {
					this._updateCursorStatus();
				};
			};
		};

		_updateCursorStatus() {
			this._markBusyThrottled();
			clearTimeout(this._markingTimer);
			this._markingTimer = setTimeout(this._markIdle, BUSY_TIMEOUT);
		};

		_markBusy() {
			this._cursor.setAttribute("hyper-blink-moving", true);
		};

		_markIdle() {
			this._cursor.removeAttribute("hyper-blink-moving");
		};

		render() {
			return React.createElement(Term, Object.assign({ }, this.props, { onTerminal: this._onTerminal }));
		};

		componentWillUnmount() {
			if (this._observer) {
				this._observer.disconnect();
			};
		};
	};
};