import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import DoubleLinkedList from '../utility/list/doubleLinked.js';
import PriorityQueue from '../utility/list/priorityQueue.js';

const walk = (list) => {
	const ids = [];
	const start = list.pointer;
	if (!start)
		return ids;
	let node = start;
	do {
		ids.push(node.processId);
		node = list.incrementPointer();
	} while (node !== start);
	return ids;
};

describe('DoubleLinkedList', () => {
	it('cycles through the nodes in order', () => {
		const list = new DoubleLinkedList();
		list.add('a', 1);
		list.add('b', 2);
		list.add('c', 3);
		assert.deepEqual(walk(list), [ 'a', 'b', 'c' ]);
	});

	// Regression: the old node stayed linked after its map entry was replaced, so
	// it could never be removed.
	it('replaces a node added again under the same id', () => {
		const list = new DoubleLinkedList();
		list.add('a', 1);
		list.add('b', 2);
		list.add('a', 3);
		assert.equal(list.length, 2);
		assert.deepEqual(walk(list).sort(), [ 'a', 'b' ]);
		assert.equal(list.get('a').proxy, 3);

		list.remove('a');
		list.remove('b');
		assert.equal(list.length, 0);
		assert.equal(list.pointer, null);
	});

	// Regression: both threw on an empty list.
	it('moving the pointer on an empty list returns null', () => {
		const list = new DoubleLinkedList();
		assert.equal(list.incrementPointer(), null);
		assert.equal(list.decrementPointer(), null);
	});

	it('moves the pointer on when the node under it is removed', () => {
		const list = new DoubleLinkedList();
		list.add('a', 1);
		list.add('b', 2);
		list.remove('a');
		assert.equal(list.pointer.processId, 'b');
		assert.deepEqual(walk(list), [ 'b' ]);
	});
});

describe('PriorityQueue', () => {
	it('dequeues lowest priority first', () => {
		const queue = new PriorityQueue();
		for (const priority of [ 5, 1, 4, 2, 3 ])
			queue.enqueue({ priority });
		const out = [];
		while (queue.length() > 0)
			out.push(queue.dequeue().priority);
		assert.deepEqual(out, [ 1, 2, 3, 4, 5 ]);
	});

	// Regression: dequeue on an empty queue wrote index 0 and a stray '-1'
	// property onto the backing array.
	it('dequeue on an empty queue returns undefined and leaves the queue clean', () => {
		const queue = new PriorityQueue();
		assert.equal(queue.dequeue(), undefined);
		assert.equal(queue.length(), 0);
		assert.deepEqual(Object.keys(queue._values), []);
	});
});
