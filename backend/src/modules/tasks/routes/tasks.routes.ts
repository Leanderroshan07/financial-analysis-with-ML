import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { tasksController } from '../controller/tasks.controller';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => tasksController.list(req, res));
router.post('/', (req, res) => tasksController.create(req, res));
router.put('/:id', (req, res) => tasksController.update(req, res));
router.delete('/:id', (req, res) => tasksController.delete(req, res));
router.patch('/:id/toggle', (req, res) => tasksController.toggleComplete(req, res));

router.get('/:id/subtasks', (req, res) => tasksController.listSubtasks(req, res));
router.post('/:id/subtasks', (req, res) => tasksController.createSubtask(req, res));
router.put('/:id/subtasks/:subtaskId', (req, res) => tasksController.updateSubtask(req, res));
router.delete('/:id/subtasks/:subtaskId', (req, res) => tasksController.deleteSubtask(req, res));

export default router;
