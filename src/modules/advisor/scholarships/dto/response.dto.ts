import { FlaggedScholarship }
  from '../scholarships.types.js'

export interface FlaggedScholarshipsResponseDto {
  student_id: number
  flagged: FlaggedScholarship[]
}

export interface FlagScholarshipResponseDto {
  message: string
  flag_id: number
  scholarship_id: number
  student_id: number
}

export interface UnflagScholarshipResponseDto {
  message: string
  scholarship_id: number
  student_id: number
}