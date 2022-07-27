const expect = require("chai").expect;
const _require = require("esm")(module);
const { testGenericBackend } = _require("./generic_backend.js");
const { SqlJsMapBackend } = _require("../mapper/index.js");

describe("SqlJsMapBackend", function() {
	beforeEach(async function() {
		this.backend = new SqlJsMapBackend();
		await this.backend.load();
	});

	testGenericBackend();
});
