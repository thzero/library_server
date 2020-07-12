class PriorityQueue {
	constructor() {
		this._values = []
	}

	dequeue() {
		// swap first and last element
		this._swap(0, this._values.length - 1);
		// pop max value off of values
		let poppedNode = this._values.pop();
		// re-adjust heap if length is greater than 1
		if (this._values.length > 1)
			this._bubbleDown();

		return poppedNode;
	}

	//  method that pushes new value onto the end and calls the bubble helper
	enqueue(value) {
		this._values.push(value)
		// calculate parent, if parent is greater swap
		// while loop or recurse
		this._bubbleUp();
		return this._values
	}

	length() {
		return this._values.length;
	}

	_bubbleDown() {
		let parentIndex = 0;
		const length = this._values.length;
		const elementPriority = this._values[0].priority;
		// loop breaks if no swaps are needed
		while (true) {
			// get indexes of child elements by following formula
			let leftChildIndex = (2 * parentIndex) + 1;
			let rightChildIndex = (2 * parentIndex) + 2;
			let leftChildPriority, rightChildPriority;
			let indexToSwap = null;

			//  if left child exists, and is greater than the element, plan to swap with the left child index
			if (leftChildIndex < length) {
				leftChildPriority = this._values[leftChildIndex].priority
				if (leftChildPriority < elementPriority)
					indexToSwap = leftChildIndex;

			}

			// if right child exists
			if (rightChildIndex < length) {
				rightChildPriority = this._values[rightChildIndex].priority

				if (
					// if right child is greater than element and there are no plans to swap
					(rightChildPriority < elementPriority && indexToSwap === null) ||
					// OR if right child is greater than left child and there ARE plans to swap
					(rightChildPriority < leftChildPriority && indexToSwap !== null))
				{
					// plan to swap with the right child
					indexToSwap = rightChildIndex
				}
			}

			// if there are no plans to swap, break out of the loop
			if (indexToSwap === null)
				break

			// swap with planned element
			this._swap(parentIndex, indexToSwap);
			// starting index is now index that we swapped with
			parentIndex = indexToSwap;
		}
	}

	// helper methods that bubbles up values from end
	_bubbleUp() {
		// get index of inserted element
		let index = this._values.length - 1
		// loop while index is not 0 or element no loger needs to bubble
		while (index > 0) {
			// get parent index via formula
			let parentIndex = Math.floor((index - 1)/2);
			// if values is greater than parent, swap the two
			if (this._values[parentIndex].priority > this._values[index].priority) {
				// swap with helper method
				this._swap(index, parentIndex);
				// change current index to parent index
				index = parentIndex;
				continue;
			}

			break;
		}

		return 0;
	}

	_swap(index1, index2) {
		let temp = this._values[index1];
		this._values[index1] = this._values[index2];
		this._values[index2] = temp;
		return this._values;
	}
}

export default PriorityQueue
