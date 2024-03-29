const expect = require("chai").expect;
const _require = require("esm")(module);
const { HookContainer } = _require("../mapper/index.js");

describe("HookContainer", function() {
	it("should run hooks", async function() {
		let counter = 0;
		const hooks = new HookContainer();

		function f(n) {
			counter = counter + n;
		}

		hooks.add("test", f);

		expect(counter).to.equal(0);
		await hooks.call("test", 4);
		expect(counter).to.equal(4);
		await hooks.call("test", 3);
		expect(counter).to.equal(7);
	});

	it("should run multiple hooks", async function() {
		let counterA = 0;
		let counterB = 0;
		const hooks = new HookContainer();

		function fA(n) {
			counterA = counterA + n;
		}

		function fB(n) {
			counterB = counterB + n;
		}

		hooks.add("test", fA);
		hooks.add("test2", fA);
		hooks.add("test2", fB);

		await hooks.call("test", 2);
		expect(counterA).to.equal(2);
		expect(counterB).to.equal(0);

		await hooks.call("test2", 3);
		expect(counterA).to.equal(5);
		expect(counterB).to.equal(3);
	});

	it("should have removable hooks", async function() {
		let counter = 0;
		const hooks = new HookContainer();

		function fA(n) {
			counter = counter + n;
		}

		function fB(n) {
			counter = counter + n;
		}

		hooks.add("test", fA);
		hooks.add("test", fB);

		await hooks.call("test", 2);
		expect(counter).to.equal(4);

		await hooks.call("test", 3);
		expect(counter).to.equal(10);

		hooks.remove("test", fB);
		await hooks.call("test", 4);
		expect(counter).to.equal(14);
	});

	it("should have catchall hooks", async function() {
		let counter = 0;
		const hooks = new HookContainer();

		function f(n) {
			counter = counter + n;
		}

		function catchall(hookname, ...args) {
			if(hookname === "test") {
				counter = counter + args[0] * 2;
			}
		}

		hooks.add("test", f);
		hooks.add("", catchall);

		await hooks.call("test", 2);
		expect(counter).to.equal(6);
	});
});

