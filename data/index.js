import LibraryCommonUtility from '@thzero/library_common/utility/index.js';

class Data {
	constructor() {
		this.id = LibraryCommonUtility.generateId();
		this.createdTimestamp = CommonUtility.getTimestamp();
		this.createdUserId = null;
		this.updatedTimestamp = CommonUtility.getTimestamp();
		this.updatedUserId = null;
	}

	map(requested) {
		if (!requested)
			return;

		this.id = requested.id;
		this.createdTimestamp = requested.createdTimestamp;
		this.createdUserId = requested.createdUserId;
		this.updatedTimestamp = requested.updatedTimestamp;
		this.updatedUserId = requested.updatedUserId;
	}
}

export default Data;
