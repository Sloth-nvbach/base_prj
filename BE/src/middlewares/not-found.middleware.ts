import { Request, Response } from 'express';

/** Answers any request that no router matched with a JSON 404. */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};
