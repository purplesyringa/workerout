let worker = () => {
	onmessage = e => {
		if(e.data.action == "call") {
			try {
				postMessage({
					id: e.data.id,
					result: eval(e.data.func).apply(eval(e.data.root), e.data.args.map(arg => {
						if(arg.indexOf("__self__") == 0) {
							let __self__ = this;
							return eval(arg);
						} else {
							return arg;
						}
					}))
				});
			} catch(err) {
				postMessage({
					id: e.data.id,
					error: err.toString()
				});
			}
		} else if(e.data.action == "exec") {
			try {
				postMessage({
					id: e.data.id,
					result: eval(e.data.code)
				});
			} catch(err) {
				postMessage({
					id: e.data.id,
					error: err.toString()
				});
			}
		} else {
			postMessage({
				id: e.data.id,
				error: "Wrong command"
			});
		}
	};
};

class WorkerOut {
	constructor() {
		this.id = 0;
		this.waiting = {};

		this.url = URL.createObjectURL(new Blob(["(" + worker.toString() + ")();"], {type: "text/javascript"}));
		this.worker = new Worker(this.url);
		this.worker.onmessage = this.onmessage.bind(this);
		return new WorkerOutProxy(this, window, "this");
	}

	onmessage(e) {
		if(!this.waiting[e.data.id]) {
			return;
		}

		if(e.data.error) {
			this.waiting[e.data.id].reject(e.data.error);
		} else {
			this.waiting[e.data.id].resolve(e.data.result);
		}
	}

	postMessage(message) {
		message.id = this.id++;
		this.worker.postMessage(message);
		return new Promise((resolve, reject) => {
			this.waiting[message.id] = {
				resolve: resolve,
				reject: reject
			};
		});
	}
};

class WorkerOutProxy {
	constructor(worker, alternative, root) {
		this.worker = worker;
		this.alternative = alternative;
		this.additional = {};
		this.root = root;

		return new Proxy(this.additional, {
			getOwnPropertyDescriptor: this._getOwnPropertyDescriptor.bind(this),
			ownKeys: this._ownKeys.bind(this),
			defineProperty: this._defineProperty.bind(this),
			deleteProperty: this._deleteProperty.bind(this),
			preventExtensions: this._preventExtensions.bind(this),
			has: this._has.bind(this),
			get: this._get.bind(this),
			set: this._set.bind(this)
		});
	}

	_getOwnPropertyDescriptor(target, name) {
		return Object.getOwnPropertyDescriptor(target, name) || Object.getOwnPropertyDescriptor(this.alternative, name);
	}
	_ownKeys(target) {
		return Object.keys(this.alternative).concat(Object.keys(target)).filter((obj, i, arr) => arr.indexOf(obj) == i);
	}
	_defineProperty(target, name, propertyDescriptor) {
		this.callFunction("Object.defineProperty", "Object", "__self__", name, propertyDescriptor);
		Object.defineProperty(target, name, propertyDescriptor);
	}
	_deleteProperty(target, name) {
		this.exec("delete __self__[" + JSON.stringify(name) + "];");
		delete target[name];
	}
	_preventExtensions(target) {
	}
	_has(target, name) {
		return name in target || name in this.alternative;
	}
	_get(target, name, reciever) {
		if(typeof target[name] == "function" || typeof this.alternative[name] == "function") {
			return (...args) => {
				return this.callFunction(this.root + "[" + JSON.stringify(name) + "]", this.root, ...args);
			};
		} else if(
			(typeof target[name] != "object" && target[name] !== null) &&
			(typeof this.alternative[name] != "object" && this.alternative[name] !== null)
		) {
			return target[name] === undefined ? this.alternative[name] : target[name];
		} else {
			return new WorkerOutProxy(this.worker, target[name] || this.alternative[name], this.root + "[" + JSON.stringify(name) + "]");
		}
	}
	_set(target, name, value, reciever) {
		this.exec("__self__[" + JSON.stringify(name) + "] = " + JSON.stringify(value) + ";");
		target[name] = value;
	}

	callFunction(func, root, ...args) {
		return this.worker.postMessage({
			action: "call",
			func: func,
			root: root,
			args: args.map(arg => arg == "__self__" ? "__self__" + this.root : arg)
		});
	}
	exec(code) {
		return this.worker.postMessage({
			action: "exec",
			code: code.replace(/__self__/g, "__self__" + this.root)
		});
	}
};