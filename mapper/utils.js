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

function mod(n, m) {
	return ((n % m) + m) % m;
}

export { asyncFrom, mod };
