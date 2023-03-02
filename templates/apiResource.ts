import { camelCase } from "change-case";
import * as apis from "./client";
import { createResource, Resource, Setter } from "solid-js";
import { ApiResponse } from "oazapfts/lib/runtime";

export type ApiOperatorItem = {
  value: Resource<unknown>;
  mutate: Setter<unknown>;
  refetch: (info?: unknown) => unknown | Promise<unknown> | undefined | null;
};

export const ApiOperators: Map<string, ApiOperatorItem> = new Map();

export function apiHandleResponse(operator: Function) {
  return (requestParameters: unknown) => {
    return new Promise((resolve, reject) => {
      operator(requestParameters).then((response: ApiResponse) => {
        if (response.status >= 200 && response.status < 300) {
          resolve(response.data);
        } else {
          reject(response.data);
        }
      });
    });
  };
}

export function apiOperator(
  operationId: string,
  requestParameters?: unknown
): ApiOperatorItem {
  const ccOp = camelCase(operationId);
  let opName = ccOp;
  if (requestParameters) {
    switch (typeof requestParameters) {
      case "object":
        opName += btoa(JSON.stringify(requestParameters));
        break;
      default:
        opName += btoa(requestParameters.toString());
        break;
    }
  }

  if (ApiOperators.has(opName)) {
    const op = ApiOperators.get(opName);
    if (op) {
      return op;
    }
  } else {
    if (Object.prototype.hasOwnProperty.call(apis, ccOp)) {
      // @ts-ignore
      const operator = apis[ccOp];
      if (typeof operator === "function") {
        const [value, { mutate, refetch }] = createResource(
          requestParameters,
          apiHandleResponse(operator)
        );
        ApiOperators.set(opName, {
          value,
          mutate,
          refetch,
        });

        // stupid typescript, i did fucking set it just fucking above !!!
        const grrr = ApiOperators.get(opName);
        if (grrr) {
          return grrr;
        }
      } else {
        throw new Error(
          `Operator ${operationId} not found with parameters :
${JSON.stringify(requestParameters, null, 2)}`
        );
      }
    }
  }
  throw new Error(
    `Operator ${operationId} not found with parameters :
${JSON.stringify(requestParameters, null, 2)}`
  );
}
