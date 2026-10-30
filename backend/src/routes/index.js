import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import * as s from '../validators/schemas.js';
import { trackerController as tracker } from '../controllers/tracker.controller.js';
import { itemsController as items } from '../controllers/items.controller.js';
import { groupsController as groups } from '../controllers/groups.controller.js';
import { authController as auth } from '../controllers/auth.controller.js';
import { requireAuth, loginLimiter } from '../middlewares/auth.js';
import { resumesController as resumes, rawFileBody } from '../controllers/resumes.controller.js';

/** /api/v1 — Express 5 forwards rejected promises from async handlers to the error handler. */
export const apiRouter = Router();

apiRouter.get('/health', tracker.health);

// Public: account status, first-run sign-up, logging in and out.
// Everything registered after requireAuth needs a session.
apiRouter.get('/auth/status', auth.status);
apiRouter.post('/auth/signup', loginLimiter, validate({ body: s.signup }), auth.signup);
apiRouter.post('/auth/login', loginLimiter, validate({ body: s.login }), auth.login);
apiRouter.post('/auth/logout', auth.logout);
apiRouter.use(requireAuth);
apiRouter.get('/auth/me', auth.me);
apiRouter.post('/auth/password', loginLimiter, validate({ body: s.changePassword }), auth.changePassword);

apiRouter.get('/tracker', tracker.snapshot);
apiRouter.get('/export', tracker.exportFile);
apiRouter.post('/import', validate({ body: s.importDocument }), tracker.importFile);
apiRouter.post('/reset', tracker.reset);
apiRouter.post('/restore', validate({ body: s.restore }), tracker.restore);

apiRouter.get('/settings', tracker.getSettings);
apiRouter.patch('/settings', validate({ body: s.settingsPatch }), tracker.updateSettings);

apiRouter.post('/groups', validate({ body: s.groupCreate }), groups.create);
apiRouter.patch('/groups/positions', validate({ body: s.positions }), groups.reorder);
apiRouter.patch('/groups/:id', validate({ params: s.idParams, body: s.groupUpdate }), groups.update);
apiRouter.delete('/groups/:id', validate({ params: s.idParams }), groups.remove);

apiRouter.post('/items', validate({ body: s.itemCreate }), items.create);
apiRouter.post('/items/bulk', validate({ body: s.bulkAdd }), items.bulkAdd);
apiRouter.patch('/items/positions', validate({ body: s.positions }), items.reorder);
apiRouter.patch('/items/:id', validate({ params: s.idParams, body: s.itemUpdate }), items.update);
apiRouter.patch('/items/:id/done', validate({ params: s.idParams, body: s.itemDone }), items.setDone);
apiRouter.delete('/items/:id', validate({ params: s.idParams }), items.remove);

apiRouter.get('/resumes', resumes.list);
apiRouter.post('/resumes', rawFileBody, resumes.upload);
apiRouter.get('/resumes/:id/file', validate({ params: s.idParams }), resumes.file);
apiRouter.patch('/resumes/:id', validate({ params: s.idParams, body: s.resumeRename }), resumes.rename);
apiRouter.delete('/resumes/:id', validate({ params: s.idParams }), resumes.remove);
