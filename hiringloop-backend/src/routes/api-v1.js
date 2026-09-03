import express from 'express';

import { authRouter } from '../modules/auth/auth-module.js';
import { organizationRouter } from '../modules/organizations/organization-module.js';

const apiV1Router = express.Router();

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/organizations', organizationRouter);

export default apiV1Router;
