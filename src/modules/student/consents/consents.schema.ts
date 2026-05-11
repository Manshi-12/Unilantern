import { z } from "zod";
import { ConsentType } from "./consents.types.js";

export const grantConsentSchema = z.object({
  consent_type: z.nativeEnum(ConsentType),
});

export const revokeConsentSchema = z.object({
  consent_type: z.nativeEnum(ConsentType),
});

export const updateCollegeDataSharingSchema = z.object({
  enabled: z.boolean(),
});
