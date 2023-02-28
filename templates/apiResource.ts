import { pascalCase } from "change-case";
import { BaseAPI } from "./client";
import * as ApiClasses from "./client/apis";
import { createResource, Resource, Setter } from "solid-js";

export type ApiOperatorItem = {
  value: Resource<unknown>;
  mutate: Setter<unknown>;
  refetch: (info?: unknown) => unknown | Promise<unknown> | undefined | null;
};

export const ApiEndpoints:Map<string, BaseAPI> = new Map();

export const ApiOperators:Map<string, ApiOperatorItem> = new Map();

export function getEndpointONameFromOpId(operationId: string) {
  return pascalCase(operationId.split("/")[1])+"Api";
}
export function getEndpointFromOpId(operationId: string) {
  const ename = getEndpointONameFromOpId(operationId);
  if (ApiEndpoints.has(ename)) {
    return ApiEndpoints.get(ename);
  } else if (Object.prototype.hasOwnProperty.call(ApiClasses, ename)) {
    ApiEndpoints.set(ename, new ApiClasses[ename]());
    return ApiEndpoints.get(ename);
  } else {
    throw new Error(
      `Endpoint ${ename} for operationId ${operationId} not found`
    );
  }
}

export function apiOperator(operationId: string, requestParameters: unknown) {
  if (ApiOperators.has(operationId)) {
    const op = ApiOperators.get(operationId);
    // @ts-ignore
    op.mutate(requestParameters);
    return op;
  } else {
    const endpoint = getEndpointFromOpId(operationId);
    const opMet = pascalCase(operationId);
    if (endpoint && Object.prototype.hasOwnProperty.call(endpoint, opMet)) {
      const operator = endpoint[pascalCase(opMet)];
      if (typeof operator === "function") {
        const [valFn, { mutate, refetch }] = createResource(
          requestParameters,
          operator
        );
        ApiOperators.set(operationId, {
          value: valFn,
          mutate,
          refetch
        });
        return ApiOperators.get(operationId);
      } else {
        throw new Error(
          `Operator ${operationId} not found in endpoint ${getEndpointONameFromOpId(
            operationId
          )}`
        );
      }
    }
  }
}
