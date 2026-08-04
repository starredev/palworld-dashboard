import '@fastify/jwt'
import type { SessionUser } from '@tsuki/types'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    /** Payload we sign into the token. */
    payload: SessionUser
    /** Shape exposed on `request.user` after `jwtVerify()`. */
    user: SessionUser
  }
}
