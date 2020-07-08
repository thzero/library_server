class DoubleLinkedList {
	constructor() {
		this._map = new Map();
		this._head = null;
		this._pointer = null;
		this._tail = null;
	}

	add(processId, proxy) {
		const node = { processId: processId, proxy: proxy };
		this._map.set(processId, node);

		// no element in list
		if (!this._head) {
			this._head = node;
			this._pointer = node;
			this._tail = node;
			return;
		}

		// adding to the tail
		this._tail.next = node;
		node.previous = this._tail;
		this._tail = node;
	}

	decrementPointer() {
		this._pointer = this._pointer.previous ? this._pointer.previous : this._tail;
		return this._pointer;
	}

	get(processId) {
		return this._map.get(processId);
	}

	has(processId) {
		return this._map.has(processId);
	}

	incrementPointer() {
		this._pointer = this._pointer.next ? this._pointer.next : this._head;

		return this._pointer;
	}

	remove(processId) {
		const node = this.get(processId);
		if (!node)
			return;

		if (node.previous)
			node.previous.next = node.next;
		if (node.next)
			node.next.previous = node.previous;

		if (this._head === node)
			this._head = node.next;
		if (this._tail === node)
			this._tail = node.previous;

		if (this._pointer === node) {
			this._pointer = node.next;
			if (!this._pointer)
				this._pointer = this._head;
		}

		this._map.delete(processId);
	}

	setPointer(processId) {
		const node = this._map.get(processId);
		if (!node)
			return;

		this._pointer = node;
		return this._pointer;
	}

	get length() {
		return this._map.size;
	}

	get pointer() {
		return this._pointer;
	}
}

export default DoubleLinkedList;
