import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, z } from 'zod';
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
  validate(z.object({ body: schema, query: z.object({}).passthrough(), params: z.object({}).passthrough() }));

export const validateQuery = (schema: AnyZodObject) =>
  validate(z.object({ query: schema, body: z.object({}).passthrough(), params: z.object({}).passthrough() }));

export const validateParams = (schema: AnyZodObject) =>
  validate(z.object({ params: schema, body: z.object({}).passthrough(), query: z.object({}).passthrough() }));