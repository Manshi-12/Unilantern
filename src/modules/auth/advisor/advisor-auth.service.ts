import { advisorAuthRepository }
from './advisor-auth.repository.js'

import type {
  RegisterAdvisorInput,
  LoginAdvisorInput,
  ChangePasswordInput,
}
from './advisor-auth.schema.js'

import type {
  JWTPayload,
}
from 'jose'

import {
  ValidateInviteResponseDto,
  RegisterAdvisorResponseDto,
  LoginAdvisorResponseDto,
  RefreshTokenResponseDto,
}
from './dto/response.dto.js'

import {
  NotFoundError,
  ConflictError,
  GoneError,
  UnauthorizedError,
}
from '../../../shared/errors/app-error.js'

import {
  hashPassword,
  comparePassword,
}
from '../../../shared/utils/hash.js'

import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
}
from '../../../shared/utils/jwt.js'

export const advisorAuthService = {

  // ============================================
  // API 1 — Validate invite token
  // ============================================

  validateInviteToken: async (
    token: string,
  ): Promise<ValidateInviteResponseDto> => {

    const invite =
      await advisorAuthRepository
        .findInviteByToken(token)

    if (!invite) {

      throw new NotFoundError(
        'Invalid invite link',
      )
    }

    if (
      invite.status === 'accepted'
    ) {

      throw new GoneError(
        'This invite has already been used',
      )
    }

    if (
      invite.status === 'expired'
    ) {

      throw new GoneError(
        'This invite link has expired',
      )
    }

    if (
      invite.expires_at &&
      new Date() > invite.expires_at
    ) {

      throw new GoneError(
        'This invite link has expired',
      )
    }

    const school =
      await advisorAuthRepository
        .findSchoolById(
          invite.school_id,
        )

    if (!school) {

      throw new NotFoundError(
        'School not found',
      )
    }

    return {

      valid: true,

      invited_email:
        invite.invited_email,

      school_name:
        school.school_name,

      school_id:
        invite.school_id,

      expires_at:
        invite.expires_at,
    }
  },

  // ============================================
  // API 2 — Register advisor
  // ============================================

  registerAdvisor: async (
    body: RegisterAdvisorInput,
  ): Promise<RegisterAdvisorResponseDto> => {

    const invite =
      await advisorAuthRepository
        .findInviteByToken(
          body.token,
        )

    if (!invite) {

      throw new NotFoundError(
        'Invalid invite link',
      )
    }

    if (
      invite.status === 'accepted'
    ) {

      throw new GoneError(
        'This invite has already been used',
      )
    }

    if (
      invite.status === 'expired'
    ) {

      throw new GoneError(
        'This invite link has expired',
      )
    }

    if (
      invite.expires_at &&
      new Date() > invite.expires_at
    ) {

      throw new GoneError(
        'This invite link has expired',
      )
    }

    const existing =
      await advisorAuthRepository
        .findAdvisorByEmail(
          invite.invited_email,
        )

    if (existing) {

      throw new ConflictError(
        'An account with this email already exists',
      )
    }

    const password_hash =
      await hashPassword(
        body.password,
      )

    await advisorAuthRepository
      .createAdvisor({

        school_id:
          invite.school_id,

        full_name:
          body.full_name,

        email:
          invite.invited_email,

        password_hash,

        contact_no:
          body.contact_no || null,

        role:
          'advisor',

        is_active:
          true,

        is_email_verified:
          true,
      })

    await advisorAuthRepository
      .markInviteAccepted(
        body.token,
      )

    return {

      message:
        'Account created successfully. Please log in.',

      redirect:
        '/login',
    }
  },

  // ============================================
  // API 3 — Login advisor
  // ============================================

  loginAdvisor: async (
    body: LoginAdvisorInput,
    ip: string | null,
    userAgent: string | null,
  ): Promise<{
    data: LoginAdvisorResponseDto
    accessToken: string
    refreshToken: string
  }> => {

    const advisor =
      await advisorAuthRepository
        .findAdvisorByEmail(
          body.email,
        )

    if (!advisor) {

      throw new UnauthorizedError(
        'Invalid credentials',
      )
    }

    const passwordMatch =
      await comparePassword(
        body.password,
        advisor.password_hash,
      )

    if (!passwordMatch) {

      throw new UnauthorizedError(
        'Invalid credentials',
      )
    }

    if (!advisor.is_active) {

      throw new UnauthorizedError(
        'Your account has been deactivated',
      )
    }

    const school =
      await advisorAuthRepository
        .findSchoolById(
          advisor.school_id,
        )

    const payload = {

      sub:
        String(
          advisor.advisor_id,
        ),

      school_id:
        advisor.school_id,

      role:
        advisor.role,

      email:
        advisor.email,
    }

    const accessToken =
      await signAccessToken(
        payload,
      )

    const refreshToken =
      await signRefreshToken(
        payload,
      )

    const expiresAt =
      new Date()

    expiresAt.setDate(
      expiresAt.getDate() + 7,
    )

    await advisorAuthRepository
      .createSession({

        advisor_id:
          advisor.advisor_id,

        token_hash:
          refreshToken,

        ip_address:
          ip,

        device_info:
          userAgent,

        expires_at:
          expiresAt,
      })

    return {

      data: {

        advisor_id:
          advisor.advisor_id,

        full_name:
          advisor.full_name,

        school_id:
          advisor.school_id,

        school_name:
          school?.school_name || '',

        role:
          advisor.role,
      },

      accessToken,

      refreshToken,
    }
  },

  // ============================================
  // API 4 — Logout advisor
  // ============================================

  logoutAdvisor: async (
    refreshToken: string,
  ): Promise<void> => {

    if (!refreshToken) {
      return
    }

    await advisorAuthRepository
      .invalidateSession(
        refreshToken,
      )
  },

  // ============================================
  // API 5 — Refresh token
  // ============================================

  refreshToken: async (
    refreshToken: string,
  ): Promise<{
    data: RefreshTokenResponseDto
    newAccessToken: string
    newRefreshToken: string
  }> => {

    let payload: JWTPayload

    try {

      payload =
        await verifyRefreshToken(
          refreshToken,
        )

    } catch {

      throw new UnauthorizedError(
        'Invalid or expired refresh token',
      )
    }

    const session =
      await advisorAuthRepository
        .findSessionByTokenHash(
          refreshToken,
        )

    if (!session) {

      throw new UnauthorizedError(
        'Session not found',
      )
    }

    if (
      session.invalidated_at
    ) {

      throw new UnauthorizedError(
        'Session has been invalidated',
      )
    }

    if (
      new Date() >
      session.expires_at
    ) {

      throw new UnauthorizedError(
        'Session has expired',
      )
    }

    const newAccessToken =
      await signAccessToken({

        sub:
          String(payload.sub),

        role:
          String(payload.role),

        school_id:
          payload.school_id as number | null,

        email:
          payload.email as string | undefined,
      })

    const newRefreshToken =
      await signRefreshToken({

        sub:
          String(payload.sub),

        role:
          String(payload.role),

        school_id:
          payload.school_id as number | null,

        email:
          payload.email as string | undefined,
      })

    const newExpiresAt =
      new Date()

    newExpiresAt.setDate(
      newExpiresAt.getDate() + 7,
    )

    await advisorAuthRepository
      .updateSessionToken(
        refreshToken,
        newRefreshToken,
        newExpiresAt,
      )

    return {

      data: {

        advisor_id:
          Number(payload.sub),

        school_id:
          payload.school_id as number,

        role:
          String(payload.role),

        email:
          String(payload.email),
      },

      newAccessToken,

      newRefreshToken,
    }
  },

  // ============================================
  // API 6 — Change password
  // ============================================

  changePassword: async (
    advisorId: number,
    body: ChangePasswordInput,
  ): Promise<{
    message: string
  }> => {

    const advisor =
      await advisorAuthRepository
        .findAdvisorById(
          advisorId,
        )

    if (!advisor) {

      throw new NotFoundError(
        'Advisor not found',
      )
    }

    const passwordMatch =
      await comparePassword(
        body.current_password,
        advisor.password_hash,
      )

    if (!passwordMatch) {

      throw new UnauthorizedError(
        'Current password is incorrect',
      )
    }

    const newHash =
      await hashPassword(
        body.new_password,
      )

    await advisorAuthRepository
      .updateAdvisorPassword(
        advisorId,
        newHash,
      )

    await advisorAuthRepository
      .invalidateAllSessions(
        advisorId,
      )

    return {

      message:
        'Password changed successfully. Please log in again.',
    }
  },
}