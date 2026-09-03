import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from './errorHandler';

export const validate = (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw AppError.badRequest('Validation failed', err.errors);
      }
      next(err);
    }
  };

export const validateBody = (schema: AnyZodObject) =>
  validate(schema.pick({ body: true }));

export const validateQuery = (schema: AnyZodObject) =>
  validate(schema.pick({ query: true }));

export const validateParams = (schema: AnyZodObject) =>
  validate(schema.pick({ params: true }));