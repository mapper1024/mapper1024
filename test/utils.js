const expect = require("chai").expect;
const _require = require("esm")(module);
const { asyncFrom, HookContainer } = _require("../mapper/index.js");

describe("asyncFrom", function() {
	async function* asyncGenerator() {
		for(const x of [1, 2, 3]) {
			yield x;
		}
	};

	it("should turn async generator into an array", async function() {
		expect(await asyncFrom(asyncGenerator())).to.have.members([1, 2, 3]);
	});

	it("should accept a synchronous map function", async function() {
		expect(await asyncFrom(asyncGenerator(), x => x * 2)).to.have.members([2, 4, 6]);
	});

	it("should accept an asynchronous map function", async function() {
		expect(await asyncFrom(asyncGenerator(), async x => x * 2)).to.have.members([2, 4, 6]);
	});
});

describe("HookContainer", function() {
	it("should run hooks", async function() {
		let counter = 0;
		const hooks = new HookContainer();

		function f(n) {
			counter = counter + n;
		}

		hooks.add("test", f);

		expect(counter).to.equal(0);
		hooks.call("test", 4);
		expect(counter).to.equal(4);
		hooks.call("test", 3);
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

		hooks.call("test", 2);
		expect(counterA).to.equal(2);
		expect(counterB).to.equal(0);

		hooks.call("test2", 3);
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

		hooks.call("test", 2);
		expect(counter).to.equal(4);

		hooks.call("test", 3);
		expect(counter).to.equal(10);

		hooks.remove("test", fB);
		hooks.call("test", 4);
		expect(counter).to.equal(14);
	});
});
