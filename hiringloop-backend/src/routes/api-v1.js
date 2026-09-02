import express from 'express';

import { authRouter } from '../modules/auth/auth-module.js';

const apiV1Router = express.Router();

apiV1Router.use('/auth', authRouter);

export default apiV1Router;
