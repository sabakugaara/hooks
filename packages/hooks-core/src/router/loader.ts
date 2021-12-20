import parseFunctionArgs from 'fn-args'
import isFunction from 'lodash/isFunction'
import pickBy from 'lodash/pickBy'
import { run } from '@midwayjs/glob'
import {
  ApiModule,
  EXPORT_DEFAULT_FUNCTION_ALIAS,
  FunctionId,
  HooksMiddleware,
} from '../'
import { HAS_METADATA_INPUT } from '../common/const'
import { Decorate } from '../decorate/decorate'
import {
  Get,
  HTTPTrigger,
  HttpTriggerType,
  Post,
} from '../decorate/operator/http'
import { BaseTrigger, OperatorType } from '../decorate/type'
import { Route } from '../types'
import { AbstractRouter } from './base'

export type LoadConfig = {
  root: string
  source: string
  routes: Route[]
}

export type AsyncFunction = (...args: any[]) => Promise<any>

type Trigger = BaseTrigger & HTTPTrigger

export type ApiRoute = {
  fn: AsyncFunction
  file: string
  functionName: string

  trigger: Trigger
  middleware: HooksMiddleware[]
  functionId: FunctionId

  // route: Route
  hasMetadataInput?: boolean
}

export function loadApiRoutes(
  source: string,
  router: AbstractRouter
): ApiRoute[] {
  const files = run(['**/*.{ts,tsx,js,jsx,mjs}'], {
    cwd: source,
    ignore: [
      '**/*.test.{ts,tsx,js,jsx,mjs}',
      '**/*.spec.{ts,tsx,js,jsx,mjs}',
      '**/*.d.{ts,tsx}',
      '**/node_modules/**',
    ],
  }).filter((file) => router.isApiFile(file))

  const routes: ApiRoute[] = []
  for (const file of files) {
    const fileRoutes = loadApiRoutesFromFile(require(file), file, router)
    routes.push(...fileRoutes)
  }

  return routes
}

export function loadApiRoutesFromFile(
  mod: ApiModule,
  file: string,
  router: AbstractRouter
) {
  const apiRoutes: ApiRoute[] = []
  const funcs = pickBy(mod, isFunction)

  for (let [name, fn] of Object.entries(funcs)) {
    const exportDefault = name === 'default'
    const functionName = exportDefault ? EXPORT_DEFAULT_FUNCTION_ALIAS : name
    const functionId = router.getFunctionId(file, functionName, exportDefault)

    // default is http trigger
    let trigger: Trigger = Reflect.getMetadata(OperatorType.Trigger, fn)

    if (!trigger) {
      // default is http
      const Method = parseFunctionArgs(fn).length === 0 ? Get : Post
      // wrap pure function
      fn = Decorate(Method(), fn)
      // get trigger
      trigger = Reflect.getMetadata(OperatorType.Trigger, fn)
    }

    if (trigger.type === HttpTriggerType) {
      trigger.path ??= router.functionToHttpPath(
        file,
        functionName,
        exportDefault
      )
    }

    const fnMiddleware = Reflect.getMetadata(OperatorType.Middleware, fn) || []
    const fileMiddleware = mod?.config?.middleware || []
    const middleware = [...fnMiddleware, ...fileMiddleware]

    apiRoutes.push({
      fn,
      file,
      functionName,
      functionId,
      trigger,
      middleware,
      hasMetadataInput: Reflect.getMetadata(HAS_METADATA_INPUT, fn),
    })
  }

  return apiRoutes
}