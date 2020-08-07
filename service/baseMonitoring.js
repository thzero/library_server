import Service from './index';

class BaseMonitoringService extends Service {
	async init(injector) {
		super.init(injector);

		this._initialize();
	}

	check(name, status, options, tags, callback) {
	}

	decrement(stat, value, sampleRate, tags, callback) {
	}

	distribution(stat, value, sampleRate, tags, callback) {
	}

	event(title, text, options, tags, callback) {
	}

	gauge(stat, value, sampleRate, tags, callback) {
	}

	histogram(stat, value, sampleRate, tags, callback) {
	}

	increment(stat, value, sampleRate, tags, callback) {
	}

	set(stat, value, sampleRate, tags, callback) {
	}

	unique(stat, value, sampleRate, tags, callback) {
	}

	_handleCpu(process, system) {
		if (process)
			this.gauge('cpu.process', process);
		if (system)
			this.gauge('cpu.system', system);
	}

	_handleEventLoop(min, max, avg) {
		if (min)
			this.gauge('eventloop.latency.min', min);
		if (max)
			this.gauge('eventloop.latency.max', max);
		if (avg)
			this.gauge('eventloop.latency.avg', avg);
	}

	_handleGC(size, used, duration) {
		if (size)
			this.gauge('gc.size', size);
		if (used)
			this.gauge('gc.used', used);
		if (duration)
			this.gauge('gc.duration', duration);
	}

	_handleMemory(private, physical, virtual, physical_used, total) {
		if (private)
			this.gauge('memory.process.private', private);
		if (physical)
			this.gauge('memory.process.physical', physical);
		if (virtual)
			this.gauge('memory.process.virtual', virtual);
		if (physical_used)
			this.gauge('memory.system.used', physical_used);
		if (total)
			this.gauge('memory.system.total', total);
	}

	_initialize() {
	}
}

export default BaseMonitoringService;
