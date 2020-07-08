import LibraryConstants from '../../constants';

import AdminRoute from './index'

class UsersAdminRoute extends AdminRoute {
	constructor(urlFragment, role, serviceKey) {
		urlFragment = urlFragment ? urlFragment : 'users';
		role = role ? role : 'users';
		serviceKey = serviceKey ? serviceKey : LibraryConstants.InjectorKeys.SERVICE_ADMIN_USERS;
		super(urlFragment, role, serviceKey);
	}

	_allowsCreate() {
		return false;
	}
}

export default UsersAdminRoute;
