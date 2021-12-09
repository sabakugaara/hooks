import { z } from 'zod'
import {
  ApiConfig,
  Decorate,
  Get,
  Middleware,
  Post,
  useContext,
  Validate,
  HttpCode,
  SetHeader,
  ContentType,
} from '../../../../../src'
import { createLogger } from '../middleware'

export const hello = () => {
  return 'Hello World!'
}

export const get = Decorate(Get(), async () => {
  const ctx = useContext()
  return ctx.path
})

export const post = Decorate(
  Post(),
  Validate(z.string()),
  async (input: string) => {
    const ctx = useContext()
    return {
      path: ctx.path,
      input,
    }
  }
)

export const config: ApiConfig = {
  middleware: [createLogger('Module')],
}

export const withMiddleware = Decorate(
  Get(),
  Middleware(createLogger('Function')),
  async () => {
    const ctx = useContext()
    return ctx.header
  }
)

export const withHttpDecorator = Decorate(
  Get(),
  HttpCode(201),
  SetHeader('framework', 'koa'),
  SetHeader('from', 'operator'),
  ContentType('text/html'),
  async () => {
    return 'withHttpCode'
  }
)
