/** Get an array from an asynchronous iterable.
 * @param asyncIterable {AsyncIterable} any async interable (like an asynchronous generator)
 * @param mapFunction {AsyncFunction|function|undefined} a callback to map values from the asyncIterable to final return values in the array
 * @returns {Array}
 */
async function asyncFrom(asyncIterable, mapFunction) {
	const values = [];
	if(mapFunction === undefined) {
		for await (const value of asyncIterable) {
			values.push(value);
		}
	}
	else if(mapFunction.constructor.name === "AsyncFunction") {
		for await (const value of asyncIterable) {
			values.push(await mapFunction(value));
		}
	}
	else {
		for await (const value of asyncIterable) {
			values.push(mapFunction(value));
		}
	}
	return values;
}

/** Calculate modulo with behavior for negative dividends.
 * E.g. mod(7, 4) === 3 && mod(-11, 7) === 3
 * @param n {number} the dividend
 * @param m {number} the divisor
 * @returns {number} the modulo (m % n)
 */
function mod(n, m) {
	return ((n % m) + m) % m;
}

/** Merge multiply associative array objects together into a new object.
 * Properties in later objects will override properties in earlier objects.
 * @param ...args Objects to merge together
 * @returns {Object} the merged object
 */
function merge(...args) {
	const r = {};
	for(const arg of args) {
		if(arg) {
			for(const k in arg) {
				r[k] = arg[k];
			}
		}
	}
	return r;
}

function weightedRandom(weightedPairs) {
	let weightSum = 0;
	for(const weightedPair of weightedPairs) {
		if(weightedPair[1] === Infinity) {
			return weightedPair[0];
		}
		weightSum += weightedPair[1];
	}

	let random = Math.random() * weightSum;

	for(const weightedPair of weightedPairs) {
		random -= weightedPair[1];
		if(random <= 0) {
			return weightedPair[0];
		}
	}
}

export { asyncFrom, mod, merge, weightedRandom };
