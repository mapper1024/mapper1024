/* Abstract mapper backend, i.e. what map is being presented.
 * The backend translates between the concept of a map and a database, a file, an API, or whatever else is actually being used to store the data.
 */
class MapBackend {
}

/* Most basic backend implementation; all data is stored in memory. */
class MemoryMapBackend extends MapBackend {
}

export { MapBackend, MemoryMapBackend };
