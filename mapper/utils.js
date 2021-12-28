async function asyncFrom(asyncIterable, mapFunction) {
	const values = []
	if(mapFunction === undefined) {
		for await (const value of asyncIterable) {
			values.push(value);
		}
	}
	else {
		for await (const value of asyncIterable) {
			values.push(mapFunction(value));
		}
	}
	return values;
}

export { asyncFrom };
