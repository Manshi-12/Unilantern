export interface SchoolSearchRequestDto {
  q: string;
  state?: string;
  limit?: number;
}

export interface LinkSchoolRequestDto {
  school_id: number;
  school_email?: string;
}

export interface MergeConfirmRequestDto {
  confirmed_student_id: number;
  school_id: number;
}
