import type {
  AccessTokenPayload,
}
from '../utils/jwt.js'

declare global {

  namespace Express {

    interface Request {

      advisor?:
        AccessTokenPayload
    }
  }
}

export {}