declare module 'express-validator' {
  import { Request, Response, NextFunction } from 'express';
  
  export interface ValidationChain {
    run(req: Request): Promise<any>;
  }
  
  export function validationResult(req: Request): {
    isEmpty(): boolean;
    array(): any[];
  };
  
  export function body(field: string): ValidationChain;
  export function param(field: string): ValidationChain;
  export function query(field: string): ValidationChain;
}