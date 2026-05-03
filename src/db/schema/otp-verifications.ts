/**
 * `otp_verifications` table — MSSQL.
 * Same drizzle-adapter caveat as students.ts.
 */

export const OTP_VERIFICATIONS_TABLE = "otp_verifications";

export const otpVerificationsColumns = {
  otp_id: "otp_id",
  phone_number: "phone_number",
  purpose: "purpose",
  otp_code_hash: "otp_code_hash",
  is_used: "is_used",
  attempts: "attempts",
  expires_at: "expires_at",
  created_at: "created_at",
} as const;

export const OTP_VERIFICATIONS_DDL = `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'otp_verifications')
BEGIN
  CREATE TABLE otp_verifications (
    otp_id        INT IDENTITY(1,1) PRIMARY KEY,
    phone_number  VARCHAR(25) NOT NULL,
    purpose       VARCHAR(30) NOT NULL
                    CHECK (purpose IN ('signup','login','phone_change')),
    otp_code_hash VARCHAR(255) NOT NULL,
    is_used       BIT NOT NULL DEFAULT 0,
    attempts      SMALLINT NOT NULL DEFAULT 0,
    expires_at    DATETIMEOFFSET NOT NULL,
    created_at    DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
  );

  CREATE INDEX IX_otp_verifications_phone ON otp_verifications(phone_number);
  CREATE INDEX IX_otp_verifications_expires ON otp_verifications(expires_at);
END;
`;
