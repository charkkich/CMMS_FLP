import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// Role hierarchy: admin > supervisor > technician > requester
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  TECHNICIAN: 'technician',
  REQUESTER: 'requester',
} as const;

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== ROLES.ADMIN) {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
};

export const isAdminOrSupervisor = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || ![ROLES.ADMIN, ROLES.SUPERVISOR].includes(req.user.role as any)) {
    res.status(403).json({ message: 'Supervisor or Admin access required' });
    return;
  }
  next();
};

export const isTechnicianOrAbove = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || ![ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.TECHNICIAN].includes(req.user.role as any)) {
    res.status(403).json({ message: 'Technician or above access required' });
    return;
  }
  next();
};
