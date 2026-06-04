import express from 'express';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import authRoutes from './modules/auth/school-admin/routes/auth.routes';
import dashboardRoutes from './modules/school-admin/dashboard/routes/dashboard_route';
import calibrationRoutes from './modules/school-admin/calibrations/routes/calibration.routes';
import governanceRoutes from './modules/school-admin/governance/routes/governance.routes';
import studentsRoutes from './modules/school-admin/students/routes/students.routes';
import notificationsRoutes from './modules/school-admin/notifications/routes/notifications.routes';
import notification_preferencesRoutes from './modules/school-admin/notifications/routes/notification_preferences.routes';
import profileRoutes from './modules/school-admin/profile/routes/profile.routes';
import feedbackRouter from './modules/school-admin/feedback/routes/feedback.routes';
import publicRoutes from './modules/school-admin/Public APIs/routes/public.routes';
import exportRoutes from './modules/school-admin/export/routes/export.routes';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Attach request_id to every request for tracing
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  (req as any).requestId = uuidv4();
  next();
});

// Auth routes
app.use('/v1/auth/school-admin', authRoutes);
app.use('/v1/school-admin/sections', dashboardRoutes);
app.use('/v1/school-admin/calibration', calibrationRoutes);
app.use('/v1/school-admin/governance', governanceRoutes);
app.use('/v1/school-admin/students', studentsRoutes);
app.use('/v1/school-admin/notifications',            notificationsRoutes);
app.use('/v1/school-admin/notification-preferences', notification_preferencesRoutes);
app.use('/v1/school-admin', profileRoutes);
app.use('/v1/school-admin/feedback', feedbackRouter);
app.use('/v1', publicRoutes);
app.use('/v1/school-admin/exports', exportRoutes);  

// Global error handler — §1.4 standard error format (includes request_id)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred.',
      request_id: (req as any).requestId || uuidv4(),
      details: err.details || {},
    },
  });
});

export default app;
