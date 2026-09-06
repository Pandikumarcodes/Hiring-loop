import express from 'express';

import { authRouter } from '../modules/auth/auth-module.js';
import {
  invitationAcceptanceRouter,
  organizationRouter,
} from '../modules/organizations/organization-module.js';
import { publicCareerRouter } from '../modules/public-careers/public-career-module.js';

const apiV1Router = express.Router();

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/public', publicCareerRouter);
apiV1Router.use('/organizations', organizationRouter);
apiV1Router.use('/invitations', invitationAcceptanceRouter);

export default apiV1Router;
