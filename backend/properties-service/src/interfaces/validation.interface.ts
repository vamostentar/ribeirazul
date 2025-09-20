export interface IValidator<T> {
  validate(data: unknown): T;
  validatePartial(data: unknown): Partial<T>;
}

export interface IValidationFactory {
  createPropertyValidator(): IValidator<any>;
  createPropertyUpdateValidator(): IValidator<any>;
  createPropertyFiltersValidator(): IValidator<any>;
}
